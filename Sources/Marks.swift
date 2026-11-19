// 메뉴 막대 아이콘 (기획안: menu-bar-icon.spec.md).
// 그림과 움직임은 모두 Figma에서 만들고(Figma 파일 "Layerhover Menu Bar Icons"), tools/marks-tool.swift 가
// 아이콘마다 장면을 가로로 이어 붙인 이미지(1배·2배)와 manifest.json 으로 구워 Resources/Marks 에 넣는다.
// 앱은 그 파일을 읽어 순서대로 보여 주기만 한다. 그림을 계산하는 코드는 대체 그림 하나뿐이다.
//
//   MarkLibrary  목록과 장면 읽기 (읽기 실패를 구분해서 알려 준다)
//   MarkRules    지금 무엇을 보여 줄지 정하는 규칙 (화면 없이 시험할 수 있는 순수 함수)
//   MarkPlayer   메뉴 막대 버튼에 규칙의 결과를 그리고, 움직일 때만 타이머를 돌린다

import AppKit

struct MarkInfo: Equatable, Identifiable {
    let id: String
    let ko: String
    let en: String
    let frames: Int
    var name: String { L(ko, en) }
}

/// 한 아이콘의 장면을 읽은 결과
enum MarkAsset {
    case complete([NSImage])      // 모든 장면
    case stillOnly(NSImage)       // 장면 00만 쓸 수 있다 (일부 장면을 읽지 못함)
    case missing                  // 장면 00도 없다

    var state: MarkRules.AssetState {
        switch self { case .complete: return .complete; case .stillOnly: return .stillOnly; case .missing: return .missing }
    }
    var still: NSImage? {
        switch self { case .complete(let f): return f.first; case .stillOnly(let i): return i; case .missing: return nil }
    }
}

final class MarkLibrary {
    static let defaultID = "buddha"
    /// "날씨"는 고르기 칸에 없고 패널의 "날씨" 줄로 켠다. 켜면 고른 아이콘 대신 지금 날씨의 wx-* 장면이 보인다 (weatherMark).
    static let weatherID = "weather"
    var weatherMark = "wx-partly"
    static let shared = MarkLibrary(directory: Bundle.main.resourceURL?.appendingPathComponent("Marks"))

    let directory: URL?
    private(set) var marks: [MarkInfo] = []           // 고르기 칸에 보이는 목록 (날씨 장면들은 "날씨" 한 칸으로)
    private var all: [MarkInfo] = []                   // manifest 의 모든 장면 묶음
    private(set) var fps: Double = 8
    private var cache: [String: MarkAsset] = [:]       // 고른 아이콘과 기본 아이콘만 남긴다
    private var reported = Set<String>()                // 같은 문제를 기록에 되풀이해 남기지 않는다

    /// 목록을 읽지 못하면 marks 가 비어 있다. 그때 앱은 대체 그림을 쓴다.
    init(directory: URL?) {
        self.directory = directory
        guard let directory,
              let data = try? Data(contentsOf: directory.appendingPathComponent("manifest.json")),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let list = json["marks"] as? [[String: Any]] else {
            report("manifest", "manifest.json")
            return
        }
        if let f = json["fps"] as? Double, f > 0 { fps = f }
        all = list.compactMap { m in
            guard let id = m["id"] as? String, let ko = m["ko"] as? String, let en = m["en"] as? String,
                  let frames = m["frames"] as? Int, frames > 0 else { return nil }
            return MarkInfo(id: id, ko: ko, en: en, frames: frames)
        }
        marks = all.filter { !$0.id.hasPrefix("wx-") }
        if marks.isEmpty { report("manifest", "manifest.json") }
    }

    var isLoaded: Bool { !marks.isEmpty }
    /// "weather" → 지금 날씨 장면의 ID. 나머지는 그대로.
    func resolve(_ id: String) -> String { id == MarkLibrary.weatherID ? weatherMark : id }
    func info(_ id: String) -> MarkInfo? { let r = resolve(id); return all.first { $0.id == r } }
    func contains(_ id: String) -> Bool { marks.contains { $0.id == id } }   // 고르기 칸에 있는 아이콘만

    /// 아이콘의 장면. 고른 아이콘의 것만 메모리에 둔다 (기본 아이콘은 대체용으로 함께 둔다).
    func asset(_ id: String) -> MarkAsset {
        let id = resolve(id)
        if let hit = cache[id] { return hit }
        let result = load(id)
        cache = cache.filter { $0.key == MarkLibrary.defaultID }
        cache[id] = result
        return result
    }

    /// 메뉴의 고르기 칸에 쓰는 정지 그림 (장면 00). 캐시에 올리지 않는다.
    func still(_ id: String) -> NSImage {
        if let hit = cache[resolve(id)]?.still { return hit }
        guard let info = info(id), let strips = strips(info) else { return MarkLibrary.fallbackImage }
        return frame(0, of: strips) ?? MarkLibrary.fallbackImage
    }

    typealias Strips = (one: CGImage, two: CGImage?)

    /// 움직임용: 장면을 이어 붙인 이미지 그대로 (모든 장면을 읽을 수 있을 때만)
    /// 장면을 하나씩 잘라 두지 않으므로 가볍다 (이미지 파일 두 장). 패널의 고르기 칸 13개가 모두 이것을 쓴다.
    func sprite(_ id: String) -> (strips: Strips, frames: Int)? {
        let id = resolve(id)
        if let hit = spriteCache[id] { return hit }
        guard let info = info(id), let s = strips(info),
              s.one.width == info.frames * 18, s.two == nil || s.two!.width == info.frames * 36 else { return nil }
        spriteCache[id] = (s, info.frames)
        return (s, info.frames)
    }
    private var spriteCache: [String: (strips: Strips, frames: Int)] = [:]

    private func strips(_ info: MarkInfo) -> Strips? {
        guard let directory else { return nil }
        func cg(_ name: String) -> CGImage? {
            guard let src = CGImageSourceCreateWithURL(directory.appendingPathComponent(name) as CFURL, nil) else { return nil }
            return CGImageSourceCreateImageAtIndex(src, 0, nil)
        }
        guard let one = cg("\(info.id).png"), one.height == 18 else { return nil }
        let two = cg("\(info.id)@2x.png")
        return (one, two?.height == 36 ? two : nil)
    }

    private func frame(_ index: Int, of s: Strips) -> NSImage? {
        guard let a = s.one.cropping(to: CGRect(x: index * 18, y: 0, width: 18, height: 18)), a.width == 18 else { return nil }
        let image = NSImage(size: NSSize(width: 18, height: 18))
        let rep1 = NSBitmapImageRep(cgImage: a); rep1.size = image.size
        image.addRepresentation(rep1)
        if let two = s.two, let b = two.cropping(to: CGRect(x: index * 36, y: 0, width: 36, height: 36)), b.width == 36 {
            let rep2 = NSBitmapImageRep(cgImage: b); rep2.size = image.size
            image.addRepresentation(rep2)
        }
        image.isTemplate = true
        image.accessibilityDescription = "Layerhover"
        return image
    }

    private func load(_ id: String) -> MarkAsset {
        guard let info = all.first(where: { $0.id == id }), let s = strips(info) else { report(id, "\(id).png"); return .missing }
        guard let first = frame(0, of: s) else { report(id, "\(id).png"); return .missing }
        // 장면 수가 목록과 다르거나 2배 이미지가 짧으면 일부만 읽힌 것이다: 장면 00으로 멈춘다
        let whole = s.one.width == info.frames * 18 && (s.two == nil || s.two!.width == info.frames * 36)
        guard whole else { report(id, "\(id).png (\(s.one.width / 18)/\(info.frames))"); return .stillOnly(first) }
        var all = [first]
        for i in 1..<info.frames {
            guard let f = frame(i, of: s) else { report(id, "\(id).png (#\(i))"); return .stillOnly(first) }
            all.append(f)
        }
        return .complete(all)
    }

    private func report(_ id: String, _ file: String) {
        guard reported.insert(id + file).inserted else { return }
        log("mark asset problem: \(id) \(file)")       // 아이콘 ID와 파일 이름만 남긴다
    }

    /// 장면 파일을 하나도 읽지 못할 때 쓰는 그림: 화면 끝선과 거기서 나온 패널. 움직이지 않는다.
    static let fallbackImage: NSImage = {
        let img = NSImage(size: NSSize(width: 18, height: 18), flipped: false) { _ in
            NSColor.black.setFill()
            NSBezierPath(roundedRect: NSRect(x: 1, y: 2, width: 1.6, height: 14), xRadius: 0.8, yRadius: 0.8).fill()
            let panel = NSBezierPath()
            panel.move(to: NSPoint(x: 4, y: 4)); panel.line(to: NSPoint(x: 12.2, y: 4))
            panel.appendArc(withCenter: NSPoint(x: 12.2, y: 6.8), radius: 2.8, startAngle: 270, endAngle: 360)
            panel.line(to: NSPoint(x: 15, y: 11.2))
            panel.appendArc(withCenter: NSPoint(x: 12.2, y: 11.2), radius: 2.8, startAngle: 0, endAngle: 90)
            panel.line(to: NSPoint(x: 4, y: 14)); panel.close(); panel.fill()
            return true
        }
        img.isTemplate = true
        img.accessibilityDescription = "Layerhover"
        return img
    }()
}

/// 메뉴 막대에 무엇을 보여 줄지 정하는 규칙. 입력이 같으면 결과가 같다.
enum MarkRules {
    enum AssetState { case complete, stillOnly, missing }

    struct Inputs: Equatable {
        var selected: String
        var selectedAsset: AssetState
        var defaultAsset: AssetState       // 기본 아이콘(좌불상)을 읽을 수 있는가
        var animateSetting = true          // "아이콘 움직임"
        var trusted = true                 // 손쉬운 사용 권한
        var paused = false                 // 일시 정지
        var reduceMotion = false           // macOS 동작 줄이기
        var lowPower = false               // macOS 저전력 모드
        var screenAwake = true             // 화면이 켜져 있고 잠기지 않았는가
    }

    enum Display: Equatable {
        case fallback                              // 장면 파일을 전혀 못 읽음: 대체 그림
        case still(String, dimmed: Bool)           // 장면 00 (dimmed: 권한 없음 또는 일시 정지)
        case animate(String)                       // 장면을 넘긴다
    }

    static func decide(_ i: Inputs) -> Display {
        // 보여 줄 아이콘: 고른 것을 못 읽으면 기본 아이콘, 그것도 못 읽으면 대체 그림
        let id: String, asset: AssetState
        if i.selectedAsset != .missing { (id, asset) = (i.selected, i.selectedAsset) }
        else if i.defaultAsset != .missing { (id, asset) = (MarkLibrary.defaultID, i.defaultAsset) }
        else { return .fallback }
        // 권한이 없거나 일시 정지면 고른 아이콘을 흐리게 멈춰 보여 준다.
        // (1.5.0 초안은 권한이 없을 때 경고 삼각형을 보였는데, 아이콘이 사라진 것처럼 보여 바꿨다.
        //  권한 안내는 켤 때 뜨는 환영 창과 패널의 주황색 카드가 맡는다.)
        if !i.trusted || i.paused { return .still(id, dimmed: true) }
        let mayMove = i.animateSetting && !i.reduceMotion && !i.lowPower && i.screenAwake && asset == .complete
        return mayMove ? .animate(id) : .still(id, dimmed: false)
    }
}

/// 장면을 이어 붙인 이미지에서 한 칸씩 보여 주는 뷰.
/// 움직임은 Core Animation 이 한다: 이미지를 마스크로 한 번 올려 두고, 보여 줄 칸(contentsRect)만 단계적으로 옮긴다.
/// 장면마다 이미지를 갈아 끼우면 그때마다 앱이 메뉴 막대를 다시 그려 CPU를 5%쯤 쓰지만, 이 방식은 앱이 할 일이 없다.
final class MarkSpriteView: NSView {
    private let tint = CALayer()
    private let mask = CALayer()
    private var strips: MarkLibrary.Strips?
    private var frames = 0
    private var fps = 8.0
    private var playing = false
    /// 칠할 색. 지금 겉모습(밝은·어두운 메뉴 막대)에 맞춰 풀어서 쓴다.
    var color: NSColor = .labelColor { didSet { applyColor() } }

    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layer?.addSublayer(tint)
        tint.mask = mask
        tint.actions = ["backgroundColor": NSNull(), "bounds": NSNull(), "position": NSNull()]
        mask.actions = ["contents": NSNull(), "bounds": NSNull(), "position": NSNull(), "contentsRect": NSNull()]
        setAccessibilityElement(false)
    }
    required init?(coder: NSCoder) { fatalError() }

    override var isFlipped: Bool { false }
    override func hitTest(_ point: NSPoint) -> NSView? { nil }        // 클릭은 아래 버튼이 받는다
    override func layout() {
        super.layout()
        tint.frame = bounds
        mask.frame = tint.bounds
    }
    override func viewDidChangeEffectiveAppearance() { super.viewDidChangeEffectiveAppearance(); applyColor() }
    override func viewDidChangeBackingProperties() { super.viewDidChangeBackingProperties(); applyImage() }
    override func viewDidMoveToWindow() { super.viewDidMoveToWindow(); applyImage(); applyColor(); if playing { startAnimation() } }

    func show(_ strips: MarkLibrary.Strips, frames: Int, fps: Double, playing: Bool) {
        self.strips = strips; self.frames = frames; self.fps = fps; self.playing = playing
        applyImage()
        applyColor()
        mask.removeAnimation(forKey: "frames")
        mask.contentsRect = CGRect(x: 0, y: 0, width: 1 / CGFloat(max(frames, 1)), height: 1)
        if playing { startAnimation() }
    }

    func stop() {
        playing = false
        mask.removeAnimation(forKey: "frames")
    }

    private func startAnimation() {
        guard frames > 1, window != nil else { return }
        let a = CAKeyframeAnimation(keyPath: "contentsRect")
        let w = 1 / CGFloat(frames)
        a.values = (0..<frames).map { NSValue(rect: CGRect(x: CGFloat($0) * w, y: 0, width: w, height: 1)) }
        a.calculationMode = .discrete
        a.duration = Double(frames) / fps
        a.repeatCount = .infinity
        a.isRemovedOnCompletion = false
        mask.add(a, forKey: "frames")
    }

    private func applyImage() {
        guard let strips else { return }
        let scale = window?.backingScaleFactor ?? NSScreen.main?.backingScaleFactor ?? 2
        mask.contents = scale >= 1.5 ? (strips.two ?? strips.one) : strips.one
        mask.contentsGravity = .resize
        mask.contentsScale = scale
    }

    private func applyColor() {
        var resolved = NSColor.black.cgColor
        effectiveAppearance.performAsCurrentDrawingAppearance { resolved = self.color.cgColor }
        tint.backgroundColor = resolved
    }
}

final class MarkPlayer {
    private let library: MarkLibrary
    private weak var button: NSStatusBarButton?
    private var sprite: MarkSpriteView?
    private(set) var display: MarkRules.Display?
    private(set) var screenAwake = true
    private var observers: [(NotificationCenter, NSObjectProtocol)] = []
    /// 시스템 상태(화면, 저전력, 동작 줄이기)가 바뀌면 부른다. 앱이 입력을 다시 모아 update 를 부른다.
    var onSystemChange: (() -> Void)?

    /// 움직이는 동안 버튼 자리를 잡아 두는 빈 그림 (그림은 위에 얹은 MarkSpriteView 가 그린다)
    private static let blank: NSImage = {
        let i = NSImage(size: NSSize(width: 18, height: 18)); i.isTemplate = true
        i.accessibilityDescription = "Layerhover"; return i
    }()

    init(library: MarkLibrary, button: NSStatusBarButton?) {
        self.library = library
        self.button = button
        let ws = NSWorkspace.shared.notificationCenter
        func watch(_ center: NotificationCenter, _ name: Notification.Name, awake: Bool?) {
            let o = center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                if let awake { self?.screenAwake = awake }
                self?.onSystemChange?()
            }
            observers.append((center, o))
        }
        watch(ws, NSWorkspace.screensDidSleepNotification, awake: false)
        watch(ws, NSWorkspace.screensDidWakeNotification, awake: true)
        watch(ws, NSWorkspace.sessionDidResignActiveNotification, awake: false)
        watch(ws, NSWorkspace.sessionDidBecomeActiveNotification, awake: true)
        watch(ws, NSWorkspace.accessibilityDisplayOptionsDidChangeNotification, awake: nil)
        watch(.default, .NSProcessInfoPowerStateDidChange, awake: nil)
        // 화면 잠금·해제 (세션 전환 없이 잠글 때)
        let dn = DistributedNotificationCenter.default()
        watch(dn, Notification.Name("com.apple.screenIsLocked"), awake: false)
        watch(dn, Notification.Name("com.apple.screenIsUnlocked"), awake: true)
    }

    deinit { for (c, o) in observers { c.removeObserver(o) } }

    /// 움직이는 그림을 버튼이 그림을 그리는 자리에 맞춘다 (옆에 온도 글자가 붙으면 가운데가 아니다).
    func relayout() {
        guard let button, let view = sprite else { return }
        var x = ((button.bounds.width - 18) / 2).rounded()
        if !button.title.isEmpty, let cell = button.cell as? NSButtonCell {
            x = cell.imageRect(forBounds: button.bounds).midX.rounded() - 9
        }
        view.frame = NSRect(x: x, y: ((button.bounds.height - 18) / 2).rounded(), width: 18, height: 18)
    }

    var isAnimating: Bool { if case .animate = display { return true }; return false }

    func update(_ inputs: MarkRules.Inputs) {
        let next = MarkRules.decide(inputs)
        guard next != display else { return }
        display = next
        sprite?.stop()
        sprite?.isHidden = true
        guard let button else { return }
        button.appearsDisabled = false
        switch next {
        case .fallback:
            button.image = MarkLibrary.fallbackImage
        case .still(let id, let dimmed):
            button.image = library.asset(id).still ?? MarkLibrary.fallbackImage
            button.appearsDisabled = dimmed
        case .animate(let id):
            guard let s = library.sprite(id) else { button.image = library.asset(id).still ?? MarkLibrary.fallbackImage; return }
            button.image = MarkPlayer.blank
            let view = sprite ?? {
                let v = MarkSpriteView(frame: NSRect(x: 0, y: 0, width: 18, height: 18))
                v.autoresizingMask = [.minXMargin, .maxXMargin, .minYMargin, .maxYMargin]
                button.addSubview(v)
                sprite = v
                return v
            }()
            sprite = view
            relayout()
            view.isHidden = false
            view.show(s.strips, frames: s.frames, fps: library.fps, playing: true)
        }
    }
}
