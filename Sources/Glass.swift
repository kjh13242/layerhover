// 유리 재질 — 앱 전체가 같은 유리를 쓴다.
//
// macOS 26 이상: 시스템 Liquid Glass(SwiftUI glassEffect). 뒤 화면을 실제로 굴절시키고(렌즈), 빛이 맺히고,
//   마우스를 올리거나 누르면 유리가 반응한다(interactive). 조각은 하나씩 따로 그린다:
//   GlassEffectContainer로 묶으면 렌즈(가장자리 굴절)가 사라지고 뿌연 회색 덩어리가 된다 (2026-11-24 화면 실측).
// macOS 13–25: 창 뒤를 흐리게 비추는 재질 위에, 같은 물리 모델로 계산한 '유리 두께의 빛'(GlassLight)을 얹는다.
//
// 규칙 (Apple Liquid Glass 원칙):
//  - 유리 위에 유리를 겹치지 않는다. 유리는 바탕(바탕화면·다른 앱) 바로 위에 뜬다.
//  - 글자와 기호는 늘 유리 위에만 둔다 (맨 바탕 위에 글자를 두지 않는다).
//  - 색 유리(tint)는 '고른 것' 하나에만 쓴다.

import AppKit
import CoreImage
import SwiftUI

/// 시스템 유리를 쓸 수 있는가. 그림으로 저장할 때(--render-…)는 화면 밖에서 그려 시스템 유리가 안 보이므로 쓰지 않는다.
let useSystemGlass: Bool = {
    if #available(macOS 26.0, *) { return !args.contains { $0.hasPrefix("--render") } }
    return false
}()
/// 화면 확인 모드에서만: LAYERHOVER_REDUCE_TRANSPARENCY=1 이면 '투명도 줄이기'를 켠 것처럼 그린다
let previewReduceTransparency = ProcessInfo.processInfo.environment["LAYERHOVER_UI_PREVIEW"] == "1"
    && ProcessInfo.processInfo.environment["LAYERHOVER_REDUCE_TRANSPARENCY"] == "1"
/// 화면 밖에서 그림으로 저장하는 중 (창 뒤를 비추는 재질도 그려지지 않는다)
let renderingOffscreen = args.contains { $0.hasPrefix("--render") }

// MARK: - 유리 조각

/// 떠 있는 유리 조각 하나. `.liquidGlass(RoundedRectangle(...))`
struct LiquidGlass<S: Shape>: ViewModifier {
    let shape: S
    var tint: Color? = nil
    var strength: Double = 0.5   // 색 유리의 진하기: 고른 칸 0.5, 주요 단추(손쉬운 사용 열기 등) 0.9
    var interactive = false
    var hovered = false          // macOS 13–25에서만 쓴다 (시스템 유리는 스스로 반응한다)
    @Environment(\.colorScheme) private var scheme
    @Environment(\.lhPanelGlass) private var panelGlass
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    func body(content: Content) -> some View {
        if #available(macOS 26.0, *), useSystemGlass {
            // 메뉴 막대 패널(어두운 테마)은 제어 센터처럼 투명한(clear) 유리에 어두운 막(35%)을 한 겹 입힌다:
            // 가장자리가 밝게 맺히고 굴절하며, 뒤가 흐릿하게 비친다. 서리 낀 regular 유리는 뿌옇게 막혀 보인다.
            // (2026-11-24 화면 기록과 같은 바탕을 깔고 칸마다 잰 값: 밝은 바탕 145·159·176 ↔ 146·163·167,
            //  파란 바탕 11·37·144 ↔ 14·36·157)
            content
                .background { if clearPanel { shape.fill(Color.black.opacity(0.35)) } }
                .glassEffect(glass, in: shape)
                .background { if panelGlass { haloReport } }
        } else {
            content.background { legacy }
        }
    }

    /// 고른 칸은 색 유리: 이 macOS에서 기본(regular) 유리는 색을 받지 않아(실측), 투명(clear) 유리에 색을 입힌다.
    /// 색이 몸을 채워 주므로 투명 유리여도 글씨가 읽힌다. 진하기는 파랑이 튀지 않을 만큼 (0.5).
    @available(macOS 26.0, *)
    private var glass: Glass {
        if let tint { return Glass.clear.tint(tint.opacity(strength)).interactive(interactive) }
        if clearPanel { return Glass.clear.interactive(interactive) }
        return Glass.regular.interactive(interactive)
    }
    /// 패널 안의 색 없는 유리 (어두운 테마): 투명한 유리 + 어두운 막.
    /// '투명도 줄이기'를 켠 사람에게는 쓰지 않는다: 시스템이 그 설정에 맞춰 그리는 regular 유리를 그대로 둔다 (Apple 지침).
    private var clearPanel: Bool { panelGlass && tint == nil && scheme == .dark && !reduceTransparency && !previewReduceTransparency }

    /// 이 조각의 자리를 패널 뒤 흐림(PanelHalo)에 알린다
    private var haloReport: some View {
        GeometryReader { g in
            Color.clear.preference(key: HaloShapesKey.self,
                                   value: [HaloShape(rect: g.frame(in: .named(PanelHalo.space)), radius: cornerRadius(g.size))])
        }
    }
    private func cornerRadius(_ size: CGSize) -> CGFloat {
        if let r = shape as? RoundedRectangle { return r.cornerSize.width }
        return min(size.width, size.height) / 2      // 알약, 동그라미
    }

    /// macOS 13–25 (그리고 그림 저장): 흐린 재질 + 유리 두께의 빛 + 그림자 (옅은 창 색으로 제어 센터의 서리 낀 밝기에 맞춘다)
    private var legacy: some View {
        let dark = scheme == .dark
        return ZStack {
            shape.fill(Color.black.opacity(0.001)).shadow(color: .black.opacity(dark ? 0.35 : 0.14), radius: 8, y: 4)
            if renderingOffscreen {
                shape.fill(Color(nsColor: .windowBackgroundColor).opacity(0.92))
            } else {
                VisualEffect(material: .popover).clipShape(shape)
            }
            shape.fill(tint.map { $0.opacity(strength > 0.7 ? 0.9 : dark ? 0.32 : 0.22) }
                       ?? Color(nsColor: .windowBackgroundColor).opacity(hovered ? 0.05 : 0.22))
            if hovered { shape.fill(Color.primary.opacity(0.05)) }
            GlassLightView(shape: shape)
        }
    }
}

extension View {
    func liquidGlass<S: Shape>(_ shape: S, tint: Color? = nil, strength: Double = 0.5, interactive: Bool = false, hovered: Bool = false) -> some View {
        modifier(LiquidGlass(shape: shape, tint: tint, strength: strength, interactive: interactive, hovered: hovered))
    }
}

// MARK: - 유리 두께의 빛 (macOS 13–25)

/// 유리 두께의 빛을 한 번 계산해 그림으로 만든다 (크기·모서리·밝기 테마마다 한 번, 캐시).
/// 모델 (Liquid Glass 재현 연구들이 수렴한 방식):
///  1. 모양: iOS 연속 모서리 둥근 사각형의 거리장
///  2. 가장자리 단면: h(t) = ⁴√(1 − (1 − t)⁴) — 가운데는 평평하고 가장자리에서만 둥글게 내려간다
///  3. 단면 기울기로 표면 방향(법선)을 구해, 왼쪽 위 빛과 그 반대쪽 약한 빛의 반사, 프레넬(가장자리일수록 밝음)
///  4. 빨강·초록·파랑마다 기울기를 조금씩 달리해(분산) 테두리에 아주 옅은 무지갯빛
///  5. 빛 쪽 가장자리에 한 줄 빛(림), 반대쪽 안쪽에 옅은 그림자 — 두께로 읽힌다
enum GlassLight {
    private struct Key: Hashable { let w: Int, h: Int, r: Int, bezel: Int, dark: Bool }
    private static var cache: [Key: CGImage] = [:]
    static let scale = 2

    static func sd(_ px: Double, _ py: Double, _ bx: Double, _ by: Double, _ r: Double) -> Double {
        let qx = abs(px) - bx + r, qy = abs(py) - by + r
        let mx = max(qx, 0), my = max(qy, 0)
        let c = pow(pow(mx, 2.7) + pow(my, 2.7), 1 / 2.7)          // 연속 모서리 (슈퍼타원)
        return c + min(max(qx, qy), 0) - r
    }

    static func image(width: CGFloat, height: CGFloat, radius: CGFloat, bezel: CGFloat, dark: Bool) -> CGImage? {
        let key = Key(w: Int(width.rounded()), h: Int(height.rounded()), r: Int(radius.rounded()), bezel: Int(bezel.rounded()), dark: dark)
        if let c = cache[key] { return c }
        let s = Double(scale)
        let W = key.w * scale, H = key.h * scale
        guard W > 0, H > 0, W * H < 4_000_000 else { return nil }
        var buf = [UInt8](repeating: 0, count: W * H * 4)
        let bx = Double(key.w) / 2, by = Double(key.h) / 2
        let r = min(Double(radius), min(bx, by)), bz = max(Double(bezel), 1)
        let ang = -0.75 * Double.pi                     // 왼쪽 위에서 오는 빛 (화면 좌표, y 아래)
        let lx = cos(ang), ly = sin(ang)
        let H1 = norm(lx, ly, 1.6), H2 = norm(-lx, -ly, 1.6)    // 빛과 눈 사이 방향 (빛 z 0.6 + 눈 1)
        let k = dark ? 0.55 : 1.0
        // 평평한 가운데에서의 값: 이만큼은 빼서 단면이 끝나는 곳에 경계선이 생기지 않게 한다
        let flat1 = pow(H1.2, 28), flat2 = pow(H2.2, 28) * 0.25
        for y in 0..<H {
            let py = (Double(y) + 0.5) / s - by
            for x in 0..<W {
                let px = (Double(x) + 0.5) / s - bx
                let d = sd(px, py, bx, by, r)
                if d > 0.5 || d < -bz - 1 { continue }
                let e = 0.35
                var gx = sd(px + e, py, bx, by, r) - sd(px - e, py, bx, by, r)
                var gy = sd(px, py + e, bx, by, r) - sd(px, py - e, bx, by, r)
                let gl = (gx * gx + gy * gy).squareRoot()
                if gl > 1e-6 { gx /= gl; gy /= gl }
                let t = min(max(-d / bz, 0), 1), u = 1 - t
                let dh = pow(max(1 - pow(u, 4), 1e-3), -0.75) * pow(u, 3)      // 단면 기울기
                var rgb = [0.0, 0.0, 0.0]
                for c in 0..<3 {
                    let sl = min(dh * (0.55 + 0.022 * Double(c)), 8)         // 분산: 파장마다 조금 다른 굴절
                    let n = norm(gx * sl, gy * sl, 1)
                    let s1 = max(pow(max(dot(n, H1), 0), 28) - flat1, 0)
                    let s2 = max(pow(max(dot(n, H2), 0), 28) * 0.25 - flat2, 0)
                    let fres = 0.96 * pow(1 - n.2, 5)
                    rgb[c] = (s1 + s2) * 0.85 + fres * 0.3
                }
                let facing = gx * lx + gy * ly
                let rim = exp(min(d, 0) / 0.6) * (0.35 + 0.65 * max(facing, 0))
                let shade = u * u * max(-facing, 0) * 0.10
                var a = 0.0
                for c in 0..<3 { rgb[c] = min((rgb[c] + rim * 0.5) * k, 1); a = max(a, rgb[c]) }
                a = min(a + shade, 1)
                let cover = min(max(-d * s + 0.5, 0), 1)       // 가장자리 반 픽셀은 부드럽게
                let i = (y * W + x) * 4
                buf[i] = UInt8(rgb[0] * cover * 255); buf[i + 1] = UInt8(rgb[1] * cover * 255)
                buf[i + 2] = UInt8(rgb[2] * cover * 255); buf[i + 3] = UInt8(a * cover * 255)
            }
        }
        guard let cs = CGColorSpace(name: CGColorSpace.sRGB),
              let ctx = CGContext(data: &buf, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: cs,
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
              let img = ctx.makeImage() else { return nil }
        cache[key] = img
        return img
    }
    private static func norm(_ x: Double, _ y: Double, _ z: Double) -> (Double, Double, Double) {
        let l = (x * x + y * y + z * z).squareRoot(); return (x / l, y / l, z / l)
    }
    private static func dot(_ a: (Double, Double, Double), _ b: (Double, Double, Double)) -> Double { a.0 * b.0 + a.1 * b.1 + a.2 * b.2 }
}

/// 유리 조각 위에 얹는 빛 한 겹. 모양에서 모서리 반지름을 읽어 같은 곡선으로 그린다.
struct GlassLightView<S: Shape>: View {
    let shape: S
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        GeometryReader { g in
            let r = GlassLightView.radius(of: shape, in: g.size)
            if let img = GlassLight.image(width: g.size.width, height: g.size.height, radius: r,
                                          bezel: min(14, max(6, min(g.size.width, g.size.height) * 0.22)), dark: scheme == .dark) {
                Image(decorative: img, scale: CGFloat(GlassLight.scale)).resizable()
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
    static func radius(of shape: S, in size: CGSize) -> CGFloat {
        if let rr = shape as? RoundedRectangle { return rr.cornerSize.width }
        if shape is Capsule { return min(size.width, size.height) / 2 }
        if shape is Circle { return min(size.width, size.height) / 2 }
        return 0
    }
}

// MARK: - 유리 단추

/// 누를 수 있는 유리 조각. macOS 26 이상은 시스템 유리가 마우스·누름에 스스로 반응하고,
/// 그 아래 버전은 마우스를 올리면 밝아지고 누르면 살짝 작아진다.
struct GlassKeyStyle<S: Shape>: ButtonStyle {
    let shape: S
    var tint: Color? = nil
    func makeBody(configuration: Configuration) -> some View {
        GlassKeyBody(configuration: configuration, shape: shape, tint: tint)
    }
}

private struct GlassKeyBody<S: Shape>: View {
    let configuration: ButtonStyle.Configuration
    let shape: S
    let tint: Color?
    @State private var hovering = false
    @Environment(\.isEnabled) private var enabled
    var body: some View {
        configuration.label
            // 마우스를 올리면 유리 안쪽이 살짝 밝아진다 (유리 위에 덧대지 않고 유리 속 내용으로 그린다)
            .background { if useSystemGlass && enabled && (hovering || configuration.isPressed) {
                shape.fill(Color.primary.opacity(configuration.isPressed ? 0.12 : 0.07)) } }
            .contentShape(shape)
            .liquidGlass(shape, tint: tint, interactive: enabled, hovered: hovering && enabled)
            .scaleEffect(!useSystemGlass && configuration.isPressed ? 0.97 : 1)
            .onHover { hovering = $0 }
            .animation(.easeOut(duration: 0.12), value: hovering)
            .animation(.easeOut(duration: 0.08), value: configuration.isPressed)
    }
}

/// 유리 알약 하나 안에 든 여러 단추 중 하나 (예: ‹ 이번 주 ›). 알약 전체가 유리 한 조각이고, 단추는 그 속 내용이다.
struct GlassSegmentStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View { GlassSegmentBody(configuration: configuration) }
}

private struct GlassSegmentBody: View {
    let configuration: ButtonStyle.Configuration
    @State private var hovering = false
    var body: some View {
        configuration.label
            .background { if hovering || configuration.isPressed {
                Capsule().fill(Color.primary.opacity(configuration.isPressed ? 0.12 : 0.07)) } }
            .contentShape(Capsule())
            .onHover { hovering = $0 }
            .animation(.easeOut(duration: 0.12), value: hovering)
    }
}

// MARK: - 메뉴 막대 패널 뒤 흐림

/// 메뉴 막대 패널 안의 유리인가 (패널에서만: 어두운 테마의 옅은 막, 뒤 흐림 자리 알리기)
private struct PanelGlassKey: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    var lhPanelGlass: Bool {
        get { self[PanelGlassKey.self] }
        set { self[PanelGlassKey.self] = newValue }
    }
}

/// 패널의 유리 조각 하나가 차지하는 자리 (PanelHalo 좌표: 패널 내용의 왼쪽 위가 0)
struct HaloShape: Equatable {
    var rect: CGRect
    var radius: CGFloat
}
struct HaloShapesKey: PreferenceKey {
    static let defaultValue: [HaloShape] = []
    static func reduce(value: inout [HaloShape], nextValue: () -> [HaloShape]) { value.append(contentsOf: nextValue()) }
}

/// 패널 뒤 흐림: 제어 센터처럼 유리 칸들의 둘레와 사이로 보이는 뒤 화면을 살짝 흐린다. 색은 입히지 않는다.
/// (화면 기록 실측: 제어 센터는 칸 둘레 약 10pt 안쪽의 뒤 화면을 흐리고, 밝기는 거의 그대로 둔다. 칸 속 유리는 그 흐린 화면을 비춘다.)
/// NSVisualEffectView에서 흐림 층(backdrop)만 남기고 색 층(fill·tone·바탕화면 색)과 채도 올림을 끈다.
/// 시스템 구조가 달라 색 층을 끄지 못하면 어두운 얼룩이 되므로, 그때는 아예 보이지 않게 한다.
final class PanelHalo: NSVisualEffectView {
    static let space = "lhPanelHalo"
    let radius: Double                   // 흐림 반경
    let saturation: Double?              // 채도 (nil 이면 그대로)
    let expand: CGFloat                  // 칸 둘레로 넓히는 폭
    let feather: CGFloat                 // 가장자리가 사라지는 폭
    let dim: CGFloat                     // 어두운 테마에서 흐린 자리를 덮는 검은 막 (0 이면 없음)
    private(set) var usable = false
    private var shapes: [HaloShape] = []
    private var origin: CGPoint = .zero  // 패널 내용의 왼쪽 위 (창 안, 위에서부터)
    private var topFade: CGFloat = 8     // 창 위 끝 여백: 흐림이 창 끝에서 잘려 보이지 않게 이 폭 안에서 사라진다
    private var maskedFor: (CGSize, [HaloShape], CGPoint)?
    private static let ci = CIContext()

    /// 칸 둘레의 흐림: 반경 6, 채도 그대로, 칸 밖 8pt까지 흐리고 10pt에 걸쳐 사라진다.
    /// 칸 속 채도: 칸 모양 그대로, 같은 반경으로 흐리고 채도를 1.8배 (제어 센터는 파란 바탕 위 칸만 더 선명하고 칸 사이는 그대로다).
    init(radius: Double, saturation: Double?, expand: CGFloat, feather: CGFloat, dim: CGFloat = 0) {
        self.radius = radius; self.saturation = saturation; self.expand = expand; self.feather = feather; self.dim = dim
        super.init(frame: .zero)
        material = .hudWindow
        blendingMode = .behindWindow
        state = .active
        alphaValue = 0
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    override func layout() { super.layout(); strip(); updateMask() }
    override func viewDidMoveToWindow() { super.viewDidMoveToWindow(); strip() }
    override func viewDidChangeEffectiveAppearance() { super.viewDidChangeEffectiveAppearance(); strip() }

    func set(shapes: [HaloShape], origin: CGPoint, topFade: CGFloat) {
        self.shapes = shapes; self.origin = origin; self.topFade = topFade
        updateMask()
    }

    /// 색 층을 끄고 흐림만 남긴다
    func strip() {
        guard let root = layer else { usable = false; return }
        var hidFill = false, blurred = false
        let dark = effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        func walk(_ l: CALayer) {
            switch l.name ?? "" {
            case "fill", "tone", "desktop tint", "Chameleon":
                l.isHidden = true
                if l.name == "fill" {
                    hidFill = true
                    // 재질의 색 대신 옅은 검은 막만 (제어 센터는 칸 둘레를 약 10% 어둡게 한다: 밝은 바탕 218 → 194)
                    if dim > 0 && dark {
                        l.isHidden = false
                        l.backgroundColor = NSColor.black.withAlphaComponent(dim).cgColor
                        l.compositingFilter = nil
                    }
                }
            case "backdrop":
                // 필터는 복사본을 고쳐 바꿔 끼운다 (원래 필터를 그 자리에서 고치면 화면에 반영되지 않는다: 실측)
                if var f = l.filters {
                    if saturation == nil { f.removeAll { "\($0)" == "colorSaturate" } }
                    for (i, x) in f.enumerated() {
                        switch "\(x)" {
                        case "gaussianBlur":
                            let c = (x as AnyObject).copy() as AnyObject
                            c.setValue(radius, forKey: "inputRadius")
                            f[i] = c
                            blurred = true
                        case "colorSaturate":
                            if let s = saturation {
                                let c = (x as AnyObject).copy() as AnyObject
                                c.setValue(s, forKey: "inputAmount")
                                f[i] = c
                            }
                        default: break
                        }
                    }
                    l.filters = f
                }
            default: break
            }
            if String(describing: type(of: l)) == "CAChameleonLayer" { l.isHidden = true }
            l.sublayers?.forEach(walk)
        }
        walk(root)
        usable = hidFill && blurred
        if !usable { alphaValue = 0 }
    }

    /// 칸들을 넓히고 가장자리를 흐린 모양으로 가린다 (창 위 끝으로는 사라지게)
    private func updateMask() {
        let size = bounds.size
        guard size.width > 1, size.height > 1, !shapes.isEmpty else { return }
        if let m = maskedFor, m.0 == size, m.1 == shapes, m.2 == origin { return }
        maskedFor = (size, shapes, origin)
        let scale = window?.backingScaleFactor ?? 2
        let W = Int(size.width * scale), H = Int(size.height * scale)
        guard let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                                  space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return }
        ctx.setFillColor(gray: 0, alpha: 1)
        ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
        ctx.setFillColor(gray: 1, alpha: 1)
        let e = expand
        for s in shapes where s.rect.width > 1 && s.rect.height > 1 {
            let r = s.rect.offsetBy(dx: origin.x, dy: origin.y).insetBy(dx: -e, dy: -e)
            let cg = CGRect(x: r.minX * scale, y: (size.height - r.maxY) * scale, width: r.width * scale, height: r.height * scale)
            let rad = min((s.radius + e) * scale, min(cg.width, cg.height) / 2)
            ctx.addPath(CGPath(roundedRect: cg, cornerWidth: rad, cornerHeight: rad, transform: nil))
        }
        ctx.fillPath()
        guard let base = ctx.makeImage() else { return }
        let extent = CGRect(x: 0, y: 0, width: W, height: H)
        var img = CIImage(cgImage: base).clampedToExtent()
            .applyingGaussianBlur(sigma: Double(feather * scale / 2)).cropped(to: extent)
        if let ramp = CIFilter(name: "CILinearGradient", parameters: [
            "inputPoint0": CIVector(x: 0, y: CGFloat(H)), "inputColor0": CIColor.black,
            "inputPoint1": CIVector(x: 0, y: CGFloat(H) - max(1, topFade * scale)), "inputColor1": CIColor.white,
        ])?.outputImage?.cropped(to: extent) {
            img = img.applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: ramp])
        }
        img = img.applyingFilter("CIMaskToAlpha")
        guard let out = PanelHalo.ci.createCGImage(img, from: extent) else { return }
        maskImage = NSImage(cgImage: out, size: size)
    }
}
