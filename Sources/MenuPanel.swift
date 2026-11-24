// 메뉴 막대 아이콘을 눌렀을 때 뜨는 패널과, 처음 켰을 때 뜨는 환영 창.
// 둘 다 같은 부품(스위치, 선택 막대, 줄)을 쓴다. 부품은 직접 그린다:
//  - 메뉴 막대 패널 안에서 기본 컨트롤보다 작고 조용해야 하고,
//  - 화면 없이 그림으로 저장해(--render-menu, --render-welcome) 확인할 수 있어야 하기 때문이다.

import AppKit
import SwiftUI

/// 레이아웃은 4pt 격자를 따른다: 여백·간격·크기·모서리는 4의 배수. (예외: 선택 막대·스위치 안쪽의 2pt, 1pt 구분선, 환영 창 그림)
enum LH {
    static let accent = Color(red: 0.05, green: 0.6, blue: 1.0)          // Figma 선택 파랑 #0D99FF
    static let panelWidth: CGFloat = 332
    static let pad: CGFloat = 16
    static func fill(_ o: Double) -> Color { Color.primary.opacity(o) }
    /// 선택 막대에서 고른 칸: 밝은 테마에서는 흰 칸, 어두운 테마에서는 바탕보다 밝은 칸
    static let segmentSelected = Color(nsColor: NSColor(name: nil) { a in
        a.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? NSColor(white: 1, alpha: 0.2) : .white
    })
}

// MARK: - 부품

/// 아이콘 한 칸. playing 이면 움직이고(Core Animation, 앱 CPU를 쓰지 않는다), 아니면 장면 00.
struct MarkImage: View {
    let id: String
    var playing: Bool
    var size: CGFloat = 18
    var color: NSColor = .labelColor
    var library: MarkLibrary = .shared

    var body: some View {
        Group {
            if let s = library.sprite(id) {
                SpriteRepresentable(strips: s.strips, frames: s.frames, fps: library.fps, playing: playing, color: color)
            } else {
                Image(nsImage: library.still(id)).renderingMode(.template).resizable().interpolation(.high)
                    .foregroundStyle(Color(nsColor: color))
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

private struct SpriteRepresentable: NSViewRepresentable {
    let strips: MarkLibrary.Strips
    let frames: Int
    let fps: Double
    let playing: Bool
    let color: NSColor

    func makeNSView(context: Context) -> MarkSpriteView { MarkSpriteView(frame: .zero) }
    func updateNSView(_ v: MarkSpriteView, context: Context) {
        v.color = color
        let key = "\(ObjectIdentifier(strips.one).hashValue)-\(playing)"
        if v.identifier?.rawValue != key {            // 같은 그림·같은 상태면 움직임을 처음부터 다시 걸지 않는다
            v.identifier = NSUserInterfaceItemIdentifier(key)
            v.show(strips, frames: frames, fps: fps, playing: playing)
        }
    }
}

struct LHToggle: View {
    let isOn: Bool
    let label: String
    var large = false
    let action: () -> Void

    var body: some View {
        let w: CGFloat = large ? 36 : 30, h: CGFloat = large ? 21 : 18
        Button(action: action) {
            Capsule()
                .fill(isOn ? LH.accent : LH.fill(0.18))
                .frame(width: w, height: h)
                .overlay(alignment: isOn ? .trailing : .leading) {
                    Circle().fill(Color.white).frame(width: h - 4, height: h - 4).padding(2)
                        .shadow(color: .black.opacity(0.2), radius: 1, y: 0.5)
                }
                .animation(.easeOut(duration: 0.15), value: isOn)
                .frame(minWidth: 40, minHeight: 28, alignment: .trailing)     // 누를 수 있는 곳은 28pt 이상
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityValue(isOn ? L("켬", "On") : L("끔", "Off"))
        .accessibilityAddTraits(.isButton)
    }
}

struct LHSegmented: View {
    let options: [String]
    let selection: Int?
    let label: String
    var height: CGFloat = 24
    var fontSize: CGFloat = 11.5
    let action: (Int) -> Void

    var body: some View {
        HStack(spacing: 2) {
            ForEach(options.indices, id: \.self) { i in
                Button { action(i) } label: {
                    Text(options[i])
                        .font(.system(size: fontSize, weight: selection == i ? .semibold : .regular))
                        .foregroundStyle(selection == i ? Color.primary : Color.secondary)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity)
                        .frame(height: height)
                        .background { if selection == i { GlassFill(radius: 6, lift: 2) } }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(label): \(options[i])")
                .accessibilityAddTraits(selection == i ? [.isButton, .isSelected] : .isButton)
            }
        }
        .padding(2)
        .background(GlassFill(radius: 8, lift: 0.4))      // 오목한 유리 홈 위에 고른 칸이 떠 있다
    }
}

/// 단축키 표시 — 누르는 것이 아니라 알려 주는 것이라 상자 없이 흐린 글자로만 쓴다
/// (버튼 안에 버튼처럼 보이는 상자를 두지 않는다).
struct Keycap: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .medium, design: .rounded))
            .foregroundStyle(.tertiary)
            .accessibilityLabel(L("단축키 \(text)", "Shortcut \(text)"))
    }
}

/// 설정 한 줄: 왼쪽에 이름(과 설명), 오른쪽에 스위치
struct ToggleRow: View {
    let title: String
    var note: String? = nil
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(size: 12.5)).fixedSize(horizontal: false, vertical: true)
                if let note { Text(note).font(.system(size: 10.5)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true) }
            }
            Spacer(minLength: 8)
            LHToggle(isOn: isOn, label: title, action: action)
        }
        .frame(minHeight: 24)
        .padding(.vertical, 4)
    }
}

struct SectionTitle: View {
    let text: String
    var body: some View {
        Text(text).font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary)
            .accessibilityAddTraits(.isHeader)
    }
}

/// 눌렀을 때와 마우스를 올렸을 때 바탕이 살짝 변하는 조용한 버튼
struct QuietButtonStyle: ButtonStyle {
    var prominent = false
    var flat = false        // 평소엔 바탕 없이, 마우스를 올리면 바탕이 생긴다 (패널 아래 줄)
    func makeBody(configuration: Configuration) -> some View {
        QuietButtonBody(configuration: configuration, prominent: prominent, flat: flat)
    }
}

private struct QuietButtonBody: View {
    let configuration: ButtonStyle.Configuration
    let prominent: Bool
    let flat: Bool
    @State private var hovering = false
    var body: some View {
        configuration.label
            .background {
                if prominent && useSystemGlass {
                    Color.clear      // 아래 liquidGlass 가 진한 파란 유리로 그린다
                } else if prominent {
                    RoundedRectangle(cornerRadius: 8).fill(LH.accent.opacity(configuration.isPressed ? 0.8 : 1))
                } else if !flat || hovering || configuration.isPressed {
                    GlassFill(radius: 8, lift: configuration.isPressed ? 2 : hovering ? 1.6 : 1)
                }
            }
            .modifier(ProminentGlass(on: prominent && useSystemGlass))
            .onHover { hovering = $0 }
    }
}

/// 주요 단추(파랑 채움)는 macOS 26 이상에서 진한 파란 유리가 된다
private struct ProminentGlass: ViewModifier {
    let on: Bool
    func body(content: Content) -> some View {
        if on { content.liquidGlass(RoundedRectangle(cornerRadius: 10, style: .continuous), tint: LH.accent, strength: 0.9, interactive: true) }
        else { content }
    }
}

/// 아이콘 — 디자인 시스템에서처럼 기호 자체 크기가 아니라 "칸" 크기로 다룬다.
/// 칸은 16 · 20 · 24 · 32 중 하나. 기호는 칸 안쪽에 1/8 여백을 두고 비율을 지켜 맞춘다.
/// 그래서 어느 자리에 넣어도 같은 정렬선과 여백을 가진다 (글자 크기를 바꿔 기호 크기를 맞추지 않는다).
struct LHIcon: View {
    static let s16: CGFloat = 16, s20: CGFloat = 20, s24: CGFloat = 24, s32: CGFloat = 32
    let symbol: String
    var size: CGFloat = LHIcon.s16
    var weight: Font.Weight = .regular
    var body: some View {
        Image(systemName: symbol)
            .resizable().scaledToFit()
            .fontWeight(weight)
            .padding(size / 8)
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

/// 유리 칸 — 소개 페이지와 같은 재질: 반투명 흰 바탕 + 위쪽에서 빛을 받는 테두리 + 옅은 그림자.
/// 뒤가 비치되 글씨가 묻히지 않도록, 패널·창 바탕은 시스템의 두꺼운 반투명 재질을 쓰고 그 위에 이 칸을 얹는다.
/// macOS 26 이상에서는 시스템 Liquid Glass(굴절·빛 맺힘·가장자리 하이라이트)를 쓴다.
/// 그림으로 저장할 때(--render-…)는 화면 밖에서 그려 시스템 유리가 안 보이므로 예전 유리를 쓴다.
struct GlassFill: View {
    var radius: CGFloat = 8
    var tint: Color? = nil          // 고른 칸: 파랑
    var lift: Double = 1            // 마우스를 올리면 1.6, 누르면 2
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        if useSystemGlass {
            // Apple 규칙: 유리 위에 유리를 겹치지 않는다. 패널·창 바탕이 이미 시스템 유리이므로
            // 그 위의 칸은 유리가 아니라 유리를 통과해 보이는 옅은 채움(시스템 컨트롤과 같은 층)으로 그린다.
            let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
            shape
                .fill(tint.map { $0.opacity(0.18) } ?? Color.primary.opacity(min(0.16, 0.06 * lift)))
                .overlay(shape.strokeBorder(Color.primary.opacity(tint == nil ? 0.06 : 0), lineWidth: 0.5))
        } else {
            legacy
        }
    }
    /// macOS 13–25: 반투명 흰 바탕 + 위쪽 빛 테두리 + 옅은 그림자로 흉내 낸 유리
    private var legacy: some View {
        let dark = scheme == .dark
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        return shape
            .fill(tint.map { $0.opacity(dark ? 0.14 : 0.08) } ?? Color.white.opacity(min(1, (dark ? 0.07 : 0.46) * lift)))
            .overlay(shape.strokeBorder(LinearGradient(colors: [Color.white.opacity(dark ? 0.2 : 0.95), Color.white.opacity(dark ? 0.03 : 0.25)],
                                                       startPoint: .top, endPoint: .bottom), lineWidth: 1))
            .overlay(shape.strokeBorder(Color.black.opacity(dark ? 0.3 : 0.06), lineWidth: 0.5).padding(-0.5))
            .shadow(color: .black.opacity(dark ? 0.22 : 0.05), radius: 3, y: 1)
    }
}

/// 창 전체의 유리 바탕(설정 창, 환영 창): 창 뒤(바탕화면·다른 앱)를 흐리게 비추고, 창 색을 얇게 한 겹 깐다.
/// 창은 isOpaque = false, backgroundColor = .clear 여야 뒤가 비친다.
/// 창 바탕은 유리가 아니라 서리 낀 창 재질이다: 뒤가 은은히 비치되 글씨는 늘 또렷하다.
/// 유리(Liquid Glass)는 그 위에 뜨는 옆줄 판 같은 '길잡이' 층에만 쓴다 (Apple 규칙: 내용 층에는 유리를 쓰지 않는다).
struct WindowGlass: View {
    var body: some View {
        ZStack {
            VisualEffect(material: .popover)
            Color(nsColor: .windowBackgroundColor).opacity(0.4)
        }
    }
}

/// 패널·창의 바탕: 두꺼운 반투명 재질(뒤가 흐릿하게 비친다) + 아주 옅은 창 색 한 겹(밝은 그림 위에서도 글씨가 또렷하게)
struct FrostedBackdrop: View {
    var body: some View {
        if useSystemGlass {
            Color.clear          // macOS 26 이상: 팝오버 자체가 시스템 Liquid Glass라 그대로 비친다
        } else {
            ZStack {
                Rectangle().fill(.thickMaterial)
                Color(nsColor: .windowBackgroundColor).opacity(0.35)
            }
        }
    }
}

// MARK: - 메뉴 패널

/// 설정 창의 칸 (SettingsWindow.swift)
enum SettingsPane: String, CaseIterable, Identifiable {
    case reveal, pages, general, about
    var id: String { rawValue }
}

final class MenuModel: ObservableObject {
    @Published var trusted = true
    @Published var enabled = true
    /// 뽀모도로가 끝나는 때 (nil 이면 쉬는 중)
    @Published var focusEnd: Date?
    @Published var cheer = ""
    @Published var dayProgress: Double = 0      // 오늘 작업 시간 / 6시간 (아이콘 둘레 링)
    @Published var restHint = false             // 쉬자고 권할 때: 링이 따뜻한 색
    @Published var working = false              // 지금 작업이 이어지는 중 (링 끝 점이 숨 쉰다)
    @Published var panelOpen = false            // 패널이 화면에 떠 있는 동안만 움직임을 돌린다
    @Published var menuBarDetail = false        // 패널에서 '메뉴 막대' 칸을 펼쳐 세부 설정을 보는 중 (제어 센터의 칸 펼치기)
    @Published var figmaRunning = true
    @Published var version = ""
    @Published var marks: [MarkInfo] = []
    @Published var selectedMark = MarkLibrary.defaultID
    @Published var animateMark = true
    @Published var weatherMode = 0      // 0 끔, 1 아이콘, 2 온도와 함께
    @Published var weatherStatus = ""
    @Published var weatherDenied = false
    @Published var weatherTemp: Int?
    @Published var weatherShowTemp = true     // 날씨를 고를 때 온도도 붙일지 (날씨를 꺼도 기억한다)
    @Published var motionBlocked: String? = nil       // 움직임이 켜져 있어도 멈춰 있는 이유 (동작 줄이기, 저전력)
    @Published var reveal: Int? = 1
    @Published var collapse: Int? = 1
    @Published var rightEdge = false
    @Published var minimizeByDefault = true
    @Published var showChip = true
    @Published var chipPlace = 0           // PageChipPlace: 0 왼쪽 아래 · 1 왼쪽 위 · 2 가운데 위
    @Published var workLog = true
    @Published var launchAtLogin = false
    @Published var settingsPane: SettingsPane = .reveal
    @Published var autoUpdate = true
    @Published var updateStatus = ""
    @Published var updateVersion: String?       // 받을 수 있는 새 버전 (자동 설치를 껐을 때 패널에 알린다)
    @Published var updateBusy = false

    struct Actions {
        var toggleEnabled: () -> Void = {}
        var toggleFocus: () -> Void = {}
        var openAccessibility: () -> Void = {}
        var openPalette: () -> Void = {}
        var showSummary: () -> Void = {}
        var selectMark: (String) -> Void = { _ in }
        var toggleAnimate: () -> Void = {}
        var setWeatherMode: (Int) -> Void = { _ in }
        var setWeatherTemp: (Bool) -> Void = { _ in }
        var checkUpdate: () -> Void = {}
        var installUpdate: () -> Void = {}
        var toggleAutoUpdate: () -> Void = {}
        var openLocationSettings: () -> Void = {}
        var setReveal: (Int) -> Void = { _ in }
        var setCollapse: (Int) -> Void = { _ in }
        var toggleRightEdge: () -> Void = {}
        var toggleMinimize: () -> Void = {}
        var toggleChip: () -> Void = {}
        var setChipPlace: (Int) -> Void = { _ in }
        var toggleWorkLog: () -> Void = {}
        var toggleLogin: () -> Void = {}
        var setLanguage: (String) -> Void = { _ in }
        var connectClaude: () -> Void = {}
        var showGuide: () -> Void = {}
        var showLog: () -> Void = {}
        var showSettings: () -> Void = {}
        var quit: () -> Void = {}
    }
    var actions = Actions()

    var status: (text: String, color: Color) {
        if !trusted { return (L("손쉬운 사용 권한이 필요해요", "Accessibility permission needed"), .orange) }
        if !enabled { return (L("일시 정지됨", "Paused"), .gray) }
        if !figmaRunning { return (L("Figma를 기다리는 중", "Waiting for Figma"), .yellow) }
        return (L("동작 중", "Running"), .green)
    }
}


/// 패널 머리 아래 한 줄: 오늘 Figma를 쓴 만큼에 맞춰 응원하거나 쉬자고 권한다. 짧게 (두 줄 안).
enum Cheer {
    static func duration(_ s: Double) -> String {
        let m = Int(s / 60), h = m / 60, r = m % 60
        if h == 0 { return L("\(m)분", "\(m) min") }
        return r == 0 ? L("\(h)시간", "\(h) hr") : L("\(h)시간 \(r)분", "\(h) hr \(r) min")
    }
    /// 한 줄에 반드시 들어가게 짧게 (패널 머리 폭 기준 한글 14자 안팎). 자세한 양은 아이콘 둘레 링이 보여 준다.
    static func line(trusted: Bool, awake: Bool, figmaRunning: Bool, logging: Bool,
                     active: Double, streak: Double, hour: Int) -> String {
        if !trusted { return L("권한이 필요해요", "Needs permission") }
        if !awake { return L("일시정지 중", "Paused") }
        if logging {
            if streak >= 90 * 60 { return L("\(duration(streak))째 · 쉬어요", "\(duration(streak)) · take a break") }
            if streak >= 50 * 60 { return L("\(duration(streak))째 집중 중", "\(duration(streak)) in focus") }
            if hour >= 22 && active > 0 { return L("늦었어요 · 마무리해요", "It's late · wrap up") }
            if active >= 6 * 3600 { return L("오늘 \(duration(active)) · 충분해요", "\(duration(active)) today · enough") }
            if active >= 60 { return L("오늘 \(duration(active))", "\(duration(active)) today") }
        }
        if !figmaRunning { return L("Figma를 기다려요", "Waiting for Figma") }
        return L("준비됐어요", "Ready")
    }
    /// 쉬자고 권할 때인지 (아이콘 둘레 링이 따뜻한 색으로 바뀐다)
    static func restHint(active: Double, streak: Double, hour: Int) -> Bool {
        streak >= 50 * 60 || active >= 6 * 3600 || (hour >= 22 && active > 0)
    }
}

/// 오늘 작업 링: 시계처럼 12시에서 시작해 시계 방향으로 차오른다 (6시간 = 한 바퀴).
/// 지금 작업이 이어지는 동안에는 링 끝의 점이 천천히 숨 쉬듯 밝아졌다 어두워진다 — 시간이 흐르고 있다는 표시.
/// 링 전체를 깜빡이지는 않는다 (깜빡임은 경고로 읽혀 마음을 급하게 만든다).
struct DayRing: View {
    let progress: Double
    let warm: Bool
    let live: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// 둥근 네모 둘레를 12시(위 가운데)에서 시작해 시계 방향으로 한 바퀴 도는 길
    var round = false       // 둥근 아이콘 둘레 (패널 머리): 원을 12시에서 시계 방향으로

    private func outline(_ r: CGRect) -> Path {
        if round {
            var p = Path()
            p.addArc(center: CGPoint(x: r.midX, y: r.midY), radius: min(r.width, r.height) / 2,
                     startAngle: .degrees(-90), endAngle: .degrees(270), clockwise: false)
            return p
        }
        let c: CGFloat = 14
        var p = Path()
        p.move(to: CGPoint(x: r.midX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX - c, y: r.minY))
        p.addArc(center: CGPoint(x: r.maxX - c, y: r.minY + c), radius: c, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - c))
        p.addArc(center: CGPoint(x: r.maxX - c, y: r.maxY - c), radius: c, startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
        p.addLine(to: CGPoint(x: r.minX + c, y: r.maxY))
        p.addArc(center: CGPoint(x: r.minX + c, y: r.maxY - c), radius: c, startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
        p.addLine(to: CGPoint(x: r.minX, y: r.minY + c))
        p.addArc(center: CGPoint(x: r.minX + c, y: r.minY + c), radius: c, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
        p.closeSubpath()
        return p
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30, paused: !live || reduceMotion)) { ctx in
            Canvas { g, size in
                let r = CGRect(origin: .zero, size: size).insetBy(dx: 1, dy: 1)
                let path = outline(r)
                let color = warm ? Color.orange : Color.primary
                g.stroke(path, with: .color(Color.primary.opacity(0.08)), lineWidth: 2)                 // 하루 눈금 (바탕 선)
                let done = path.trimmedPath(from: 0, to: max(0.01, min(1, progress)))
                g.stroke(done, with: .color(color.opacity(warm ? 0.85 : 0.45)), style: StrokeStyle(lineWidth: 2, lineCap: .round))
                if live, let tip = done.currentPoint {
                    let t = ctx.date.timeIntervalSinceReferenceDate
                    let breath = reduceMotion ? 1 : 0.55 + 0.45 * (0.5 + 0.5 * sin(t * 2 * .pi / 2.4))   // 2.4초에 한 번
                    let d: CGFloat = 5
                    g.fill(Path(ellipseIn: CGRect(x: tip.x - d / 2, y: tip.y - d / 2, width: d, height: d)),
                           with: .color(color.opacity(breath)))
                }
            }
        }
        .accessibilityHidden(true)
    }
}

/// 메뉴 막대 패널: 자주 쓰는 것만 담고, 높이가 바뀌지 않는다 (펼치고 접는 부분이 없다). 바탕 없는 유리 조각들로 이뤄진다.
/// 나머지 설정은 "설정…"(⌘,)으로 여는 창(SettingsWindow.swift)에 있다.
struct MenuPanelView: View {
    @ObservedObject var model: MenuModel
    @State private var hoveredMark: String?
    @State private var hoveredRow: String?
    @Namespace private var morph
    @Environment(\.colorScheme) private var scheme

    // 제어 센터를 그대로 따른다 (2배 해상도 캡처에서 잰 값):
    //  한 단위 64 · 사이 12 · 폭 4단위 292 · 메뉴 막대 아래 12
    //  모양: 높이 64 칸은 알약, 1×1은 동그라미, 2×2는 둥글기 30
    //  안쪽: 2×1 칸은 동그라미 36이 왼쪽 14에서, 글자는 57에서 · 큰 칸 여백 15
    //  글자: 제목 13 굵게 흰색 92% · 아래 줄 12.5 흰색 75%
    //  칸을 누르면 펼쳐지는 세부 화면: 폭 307 · 둥글기 26 · 제목 15 굵게 · 줄 32 · 동그라미 26 · 여백 14
    static let unit: CGFloat = 64
    static let gap: CGFloat = 12
    static func span(_ n: CGFloat) -> CGFloat { unit * n + gap * (n - 1) }
    static let column: CGFloat = span(2)                  // 140
    static let width: CGFloat = span(4)                   // 292
    static let detailWidth: CGFloat = 307
    private let pill = Capsule()
    private let big = RoundedRectangle(cornerRadius: 30, style: .circular)
    private let sheet = RoundedRectangle(cornerRadius: 26, style: .continuous)

    var body: some View {
        // 패널 바탕은 없다: 제어 센터처럼 유리 칸들이 바탕화면 위에 바로 뜬다 (유리 위에 유리를 겹치지 않는다).
        // 왼쪽 위 상태 칸을 누르면 그 칸이 제자리(왼쪽 위 모서리 고정)에서 커져 세부 화면이 되고, 나머지 칸은 흐려지며 사라진다.
        GlassGroup {
            ZStack(alignment: .topLeading) {
                if model.menuBarDetail {
                    menuBarDetail.transition(.opacity)
                } else {
                    grid.transition(.opacity)
                }
            }
        }
    }

    private func toggleDetail(_ on: Bool) {
        withAnimation(.spring(response: 0.36, dampingFraction: 0.88)) { model.menuBarDetail = on }
    }

    // MARK: 첫 화면

    private var grid: some View {
        VStack(alignment: .leading, spacing: MenuPanelView.gap) {
            HStack(alignment: .top, spacing: MenuPanelView.gap) {
                statusModule
                VStack(spacing: MenuPanelView.gap) { pageModule; activityModule }
            }
            if !model.trusted { permissionCard }
            HStack(spacing: MenuPanelView.gap) { pauseModule; focusModule }
            updateRow
            // 맨 아래: 작은 알약(설정) 하나. 제어 센터의 '위젯 편집' 자리. 종료는 아이콘 우클릭 메뉴에 있다
            settingsPill.frame(maxWidth: .infinity)
        }
        .frame(width: MenuPanelView.width)
    }

    /// 켜진(고른) 동그라미: 어두운 유리에선 흰 동그라미에 파란 기호, 밝은 유리에선 파란 동그라미에 흰 기호 (제어 센터와 같다)
    /// 꺼진 동그라미: 제어 센터 실측(검은 바탕 위 칸 41 → 동그라미 108) = 흰색 30%
    private func discFill(_ on: Bool) -> Color { on ? (scheme == .dark ? .white : LH.accent) : LH.fill(scheme == .dark ? 0.3 : 0.12) }
    private func glyphColor(_ on: Bool) -> Color { on ? (scheme == .dark ? LH.accent : .white) : .primary }
    private func glyphNSColor(_ on: Bool) -> NSColor {
        on ? (scheme == .dark ? NSColor(red: 0.05, green: 0.6, blue: 1.0, alpha: 1) : .white) : .labelColor
    }
    private var titleStyle: Color { Color.primary.opacity(0.92) }
    private var noteStyle: Color { Color.primary.opacity(0.75) }

    private func pillLabel<Disc: View>(title: String, note: String? = nil, width: CGFloat = MenuPanelView.column, @ViewBuilder disc: () -> Disc) -> some View {
        HStack(spacing: 7) {
            disc().frame(width: 36, height: 36)
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.system(size: 13, weight: .bold)).foregroundStyle(titleStyle).lineLimit(1).minimumScaleFactor(0.85)
                if let note { Text(note).font(.system(size: 12.5)).foregroundStyle(noteStyle).lineLimit(1).minimumScaleFactor(0.8) }
            }
            Spacer(minLength: 0)
        }
        .padding(.leading, 14).padding(.trailing, 10)
        .frame(width: width, height: MenuPanelView.unit)
        .contentShape(pill)
    }

    private func symbolDisc(_ symbol: String, on: Bool = false) -> some View {
        Circle().fill(discFill(on))
            .overlay(Image(systemName: symbol).font(.system(size: 16, weight: .semibold)).foregroundStyle(glyphColor(on)).accessibilityHidden(true))
    }

    /// 2×2 지금 상태 (제어 센터의 '재생 중' 칸 자리): 지금 메뉴 막대 아이콘(둘레에 오늘 작업 링), 이름, 한 줄 상태.
    /// 누르면 이 칸이 '메뉴 막대 아이콘' 세부 화면으로 커진다. 마우스를 올리면 오른쪽 위에 › 가 나타난다 (제어 센터 Wi‑Fi 칸과 같다).
    private var statusModule: some View {
        Button { toggleDetail(true) } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top, spacing: 0) {
                    ZStack {
                        Circle().fill(discFill(false))
                        if model.trusted {
                            MarkImage(id: shownMark, playing: model.enabled && model.animateMark && model.motionBlocked == nil, size: 26,
                                      color: model.enabled ? .labelColor : .tertiaryLabelColor)
                        } else {
                            LHIcon(symbol: "exclamationmark.triangle.fill", size: LHIcon.s24).foregroundStyle(.orange)
                        }
                        // 오늘 작업한 만큼 차오르는 링 (6시간 = 한 바퀴). 쉬자고 권할 때는 따뜻한 색.
                        if model.trusted && model.enabled && model.dayProgress > 0 {
                            DayRing(progress: model.dayProgress, warm: model.restHint, live: model.working && model.panelOpen, round: true)
                                .frame(width: 54, height: 54)
                        }
                    }
                    .frame(width: 48, height: 48)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold)).foregroundStyle(noteStyle)
                        .opacity(hoveredRow == "status" ? 1 : 0)
                        .padding(.top, 2)
                }
                Spacer(minLength: 0)
                Text("Layerhover").font(.system(size: 13, weight: .bold)).foregroundStyle(titleStyle).lineLimit(1)
                Text(model.cheer.isEmpty ? model.status.text : model.cheer)
                    .font(.system(size: 12.5)).foregroundStyle(noteStyle)
                    .lineLimit(1).minimumScaleFactor(0.8)
                    .padding(.top, 1)
            }
            .padding(15)
            .frame(width: MenuPanelView.column, height: MenuPanelView.span(2), alignment: .topLeading)
            .contentShape(big)
        }
        .buttonStyle(GlassKeyStyle(shape: big))
        .matchedGeometryEffect(id: "sheet", in: morph, anchor: .topLeading, isSource: !model.menuBarDetail)
        .onHover { inside in if inside { hoveredRow = "status" } else if hoveredRow == "status" { hoveredRow = nil } }
        .animation(.easeOut(duration: 0.12), value: hoveredRow)
        .help(L("메뉴 막대 아이콘 바꾸기 · 지금: \(shownName)", "Change the menu bar icon · now: \(shownName)"))
        .accessibilityLabel(L("메뉴 막대 아이콘: \(shownName)", "Menu bar icon: \(shownName)"))
    }

    private var permissionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(L("손쉬운 사용 권한을 켜 주세요", "Turn on Accessibility permission"))
                    .font(.system(size: 13, weight: .bold)).foregroundStyle(titleStyle)
                Text(L("Figma 패널을 대신 접고 펼치는 데만 써요.\n켜면 Layerhover가 스스로 다시 시작해요.",
                       "Used only to fold and reveal Figma's panels. Layerhover restarts itself once it's on."))
                    .font(.system(size: 12)).foregroundStyle(noteStyle).lineSpacing(1.5).fixedSize(horizontal: false, vertical: true)
            }
            Button(action: model.actions.openAccessibility) {
                Text(L("손쉬운 사용 설정 열기", "Open Accessibility Settings"))
                    .font(.system(size: 12.5, weight: .semibold)).foregroundStyle(.white)
                    .frame(maxWidth: .infinity).frame(height: 36)
            }
            .buttonStyle(QuietButtonStyle(prominent: true))
        }
        .padding(16)
        .frame(width: MenuPanelView.width, alignment: .leading)
        .liquidGlass(big, tint: .orange)
    }

    private var pageModule: some View {
        let canGo = model.trusted && model.figmaRunning
        return Button(action: model.actions.openPalette) {
            // 다른 앱을 보다가 Figma의 원하는 페이지로 바로 들어가는 단추 (Figma를 앞으로 가져온 뒤 페이지 찾기 창을 연다)
            pillLabel(title: L("Figma 페이지", "Figma Page"), note: L("이름으로 찾기", "Find by name")) { symbolDisc("doc.text.magnifyingglass") }
                .opacity(canGo ? 1 : 0.4)
        }
        .buttonStyle(GlassKeyStyle(shape: pill))
        .disabled(!canGo)
        .help(canGo ? L("Figma를 앞으로 가져와 원하는 페이지를 이름으로 찾아 열어요", "Brings Figma forward and finds a page by name")
                    : L("Figma가 켜져 있을 때 쓸 수 있어요", "Available while Figma is open"))
        .accessibilityLabel(L("Figma 페이지로", "Go to a Figma page"))
    }

    private var activityModule: some View {
        Button(action: model.actions.showSummary) {
            pillLabel(title: L("작업 기록", "Activity"), note: L("이번 주", "This week")) { symbolDisc("chart.bar.xaxis") }
        }
        .buttonStyle(GlassKeyStyle(shape: pill))
        .help(L("이번 주 Figma 작업 시간을 봐요", "See this week's time in Figma"))
    }

    /// 메뉴 막대에 지금 보이는 것: 날씨를 켰으면 날씨, 아니면 고른 아이콘
    private var shownMark: String { model.weatherMode > 0 ? MarkLibrary.weatherID : model.selectedMark }
    /// 지금 메뉴 막대 모습의 이름 (칸의 아래 줄)
    private var shownName: String {
        if model.weatherMode == 1 { return model.weatherDenied ? L("위치 권한 꺼짐", "Location off") : L("날씨", "Weather") }
        if model.weatherMode == 2 { return model.weatherDenied ? L("위치 권한 꺼짐", "Location off") : L("날씨와 온도", "Weather + °") }
        return model.marks.first { $0.id == model.selectedMark }?.name ?? ""
    }

    /// 2×1 일시정지: 켜고 끄는 스위치 대신 제어 센터 칸 (켜면 흰 동그라미 + 파란 기호). 화면 끝에 닿아도 패널이 나오지 않게 잠깐 멈춘다.
    private var pauseModule: some View {
        let paused = !model.enabled
        return Button(action: model.actions.toggleEnabled) {
            pillLabel(title: L("일시정지", "Pause"), note: paused ? L("켬", "On") : L("끔", "Off")) {
                Circle().fill(discFill(paused))
                    .overlay(Image(systemName: "pause.fill").font(.system(size: 15, weight: .semibold)).foregroundStyle(glyphColor(paused)))
                    .animation(.smooth(duration: 0.2), value: paused)
            }
        }
        .buttonStyle(GlassKeyStyle(shape: pill))
        .disabled(!model.trusted)
        .help(paused ? L("일시정지 중이에요. 누르면 다시 화면 끝에서 패널이 나와요.", "Paused. Click to bring panels back at the screen edge.")
                     : L("잠깐 멈춰요. 화면 끝에 닿아도 패널이 나오지 않아요.", "Pause for a while. Panels won't open at the screen edge."))
        .accessibilityLabel(L("일시정지", "Pause"))
        .accessibilityValue(paused ? L("켬", "On") : L("끔", "Off"))
    }

    /// 2×1 뽀모도로: 누르면 25분이 흐르고 끝나면 알린다. 도는 중에 누르면 멈춘다.
    /// 시간을 고르게 하지 않는다 — 한 번 집중하기에 알맞은 25분 하나만.
    private var focusModule: some View {
        let end = model.focusEnd
        return Button(action: model.actions.toggleFocus) {
            TimelineView(.periodic(from: .now, by: 1)) { ctx in
                let left = max(0, end.map { $0.timeIntervalSince(ctx.date) } ?? 0)
                let running = end != nil && left > 0
                pillLabel(title: L("뽀모도로", "Pomodoro"),
                          note: running ? String(format: "%d:%02d", Int(left) / 60, Int(left) % 60) : L("25분", "25 min")) {
                    ZStack {
                        Circle().fill(discFill(running))
                        if running {
                            // 남은 시간만큼 줄어드는 둘레
                            Circle().trim(from: 0, to: left / Focus.length)
                                .stroke(glyphColor(true).opacity(0.85), style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                                .rotationEffect(.degrees(-90)).padding(3)
                        }
                        Image(systemName: "timer").font(.system(size: 15, weight: .semibold)).foregroundStyle(glyphColor(running))
                    }
                    .animation(.smooth(duration: 0.2), value: running)
                }
                .monospacedDigit()
            }
        }
        .buttonStyle(GlassKeyStyle(shape: pill))
        .help(end == nil ? L("25분 집중해요. 끝나면 알려 드려요.", "Focus for 25 minutes. You'll hear when it's done.")
                         : L("누르면 멈춰요", "Click to stop"))
        .accessibilityLabel(L("뽀모도로", "Pomodoro"))
        .accessibilityValue(end == nil ? L("꺼짐", "Off") : L("진행 중", "Running"))
    }

    /// 맨 아래 작은 알약: 설정
    private var settingsPill: some View {
        Button(action: model.actions.showSettings) {
            Text(L("설정", "Settings")).font(.system(size: 12, weight: .medium)).foregroundStyle(noteStyle)
                .padding(.horizontal, 16).frame(height: 28)
        }
        .buttonStyle(GlassKeyStyle(shape: pill))
        .keyboardShortcut(",", modifiers: .command)
        .help(L("설정 (⌘,)", "Settings (⌘,)"))
    }

    /// 자동 설치를 꺼 두었을 때만: 받을 수 있는 새 버전 (4단위 알약)
    @ViewBuilder private var updateRow: some View {
        if let v = model.updateVersion, !model.autoUpdate {
            Button(action: model.actions.installUpdate) {
                HStack(spacing: 7) {
                    symbolDisc("arrow.down", on: true).frame(width: 36, height: 36)
                    Text(L("\(v)으로 업데이트", "Update to \(v)")).font(.system(size: 13, weight: .bold)).foregroundStyle(titleStyle)
                    Spacer(minLength: 0)
                }
                .padding(.leading, 14).frame(width: MenuPanelView.width, height: MenuPanelView.unit)
                .contentShape(pill)
            }
            .buttonStyle(GlassKeyStyle(shape: pill))
            .help(L("받아서 바꿔 끼우고 다시 시작해요", "Downloads, replaces and restarts Layerhover"))
        }
    }

    // MARK: 펼친 화면: 메뉴 막대 (제어 센터의 집중 모드·사운드 세부 화면과 같은 짜임)

    private var menuBarDetail: some View {
        VStack(alignment: .leading, spacing: 0) {
            // 제목 = 돌아가기 (‹ 메뉴 막대). esc 로도 돌아간다
            Button { toggleDetail(false) } label: {
                HStack(spacing: 6) {
                    Image(systemName: "chevron.left").font(.system(size: 12, weight: .bold)).foregroundStyle(noteStyle)
                    Text(L("메뉴 막대 아이콘", "Menu Bar Icon")).font(.system(size: 15, weight: .bold)).foregroundStyle(titleStyle)
                    Spacer(minLength: 0)
                }
                .frame(height: 28).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .help(L("돌아가기 (esc)", "Back (esc)"))
            detailDivider
            sectionLabel(L("아이콘", "Icon"))
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 6) {
                ForEach(model.marks) { m in iconDisc(m) }
            }
            .padding(.bottom, 4)
            detailDivider
            sectionLabel(L("날씨", "Weather"))
            weatherRow(temp: false)
            weatherRow(temp: true)
            if model.weatherMode > 0 && model.weatherDenied {
                HStack(spacing: 8) {
                    Text(model.weatherStatus).foregroundStyle(noteStyle)
                    Spacer(minLength: 4)
                    Button(action: model.actions.openLocationSettings) {
                        Text(L("위치 설정 열기…", "Open Settings…")).foregroundStyle(LH.accent).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                .font(.system(size: 12)).lineLimit(1)
                .frame(height: 28)
            }
        }
        .padding(.horizontal, 14).padding(.top, 12).padding(.bottom, 10)
        .frame(width: MenuPanelView.detailWidth, alignment: .leading)
        .liquidGlass(sheet)
        .matchedGeometryEffect(id: "sheet", in: morph, anchor: .topLeading, isSource: model.menuBarDetail)
    }

    private var detailDivider: some View {
        Rectangle().fill(Color.primary.opacity(0.1)).frame(height: 1).padding(.vertical, 8)
    }

    private func sectionLabel(_ s: String) -> some View {
        Text(s).font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.primary.opacity(0.45))
            .frame(height: 20, alignment: .leading)
    }

    /// 칸 안의 아이콘 단추: 기호만. 고른 것만 흰 동그라미(+파란 기호), 마우스를 올리면 옅은 동그라미.
    private func iconDisc(_ m: MarkInfo) -> some View {
        let selected = model.weatherMode == 0 && m.id == model.selectedMark
        let hovered = hoveredMark == m.id
        return Button { model.actions.selectMark(m.id) } label: {
            ZStack {
                if selected { Circle().fill(discFill(true)) }
                else if hovered { Circle().fill(LH.fill(scheme == .dark ? 0.14 : 0.08)) }
                MarkImage(id: m.id, playing: hovered || model.motionBlocked == nil, size: 20, color: glyphNSColor(selected))
                    .opacity(model.weatherMode > 0 && !hovered ? 0.55 : 1)
            }
            .frame(width: 34, height: 34)
            .contentShape(Circle())
            .animation(.smooth(duration: 0.2), value: selected)
            .animation(.easeOut(duration: 0.12), value: hovered)
        }
        .buttonStyle(.plain)
        .onHover { inside in if inside { hoveredMark = m.id } else if hoveredMark == m.id { hoveredMark = nil } }
        .help(model.weatherMode > 0 ? L("\(m.name) · 고르면 날씨 대신 이 아이콘이 보여요", "\(m.name) · Choose to show it instead of the weather") : m.name)
        .accessibilityLabel(m.name)
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }

    /// 세부 화면의 한 줄: 동그라미 26 + 이름 (+ 오른쪽 작은 글씨). 마우스를 올리면 줄 전체에 옅은 바탕 (제어 센터 사운드 목록과 같다)
    private func weatherRow(temp: Bool) -> some View {
        let selected = model.weatherMode == (temp ? 2 : 1)
        let id = temp ? "wx-temp" : MarkLibrary.weatherID
        let hovered = hoveredRow == id
        return Button { model.actions.setWeatherMode(temp ? 2 : 1) } label: {
            HStack(spacing: 8) {
                ZStack {
                    Circle().fill(discFill(selected))
                    MarkImage(id: MarkLibrary.weatherID, playing: hovered || model.motionBlocked == nil, size: 16, color: glyphNSColor(selected))
                }
                .frame(width: 26, height: 26)
                Text(temp ? L("날씨와 온도", "Weather and temperature") : L("날씨", "Weather"))
                    .font(.system(size: 13)).foregroundStyle(titleStyle)
                Spacer(minLength: 4)
                // 메뉴 막대에 붙는 모양: 온도 줄은 예시 온도
                Text(temp ? "☀︎ 20°" : "☀︎").font(.system(size: 12).monospacedDigit()).foregroundStyle(noteStyle)
            }
            .padding(.horizontal, 7)
            .frame(height: 32)
            .background { if hovered { RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.primary.opacity(0.08)) } }
            .contentShape(Rectangle())
            .padding(.horizontal, -7)
            .animation(.smooth(duration: 0.2), value: selected)
        }
        .buttonStyle(.plain)
        .onHover { inside in if inside { hoveredRow = id } else if hoveredRow == id { hoveredRow = nil } }
        .help(temp ? L("지금 위치의 날씨를 온도와 함께 보여요", "Weather here, with the temperature")
                   : L("지금 위치의 날씨를 보여요", "Weather here"))
        .accessibilityLabel(temp ? L("날씨와 온도", "Weather and temperature") : L("날씨", "Weather"))
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }
}

// MARK: - 환영 창

/// 이 앱이 하는 일을 한 장면으로 보여 주는 그림: 어두운 Figma 화면에서 포인터가 왼쪽 끝에 닿으면 레이어 패널이 나온다.
/// phase 0~1 이 한 바퀴. 멈춘 그림이 필요하면 phase 를 정해 준다.
struct EdgeDemo: View {
    var fixedPhase: Double? = nil
    private let period = 4.2

    var body: some View {
        if let fixedPhase { scene(fixedPhase) }
        else if NSWorkspace.shared.accessibilityDisplayShouldReduceMotion { scene(0.5) }     // 동작 줄이기: 패널이 나온 장면으로 멈춘다
        else {
            // 초당 20번이면 느린 움직임에 끊김이 없고, 창이 떠 있는 동안의 CPU가 30번일 때보다 3분의 1 줄어든다
            TimelineView(.animation(minimumInterval: 1.0 / 20)) { ctx in
                scene(ctx.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: period) / period)
            }
        }
    }

    private func ease(_ x: Double) -> Double { let c = min(1, max(0, x)); return c * c * (3 - 2 * c) }

    private func scene(_ t: Double) -> some View {
        // 0~0.25 포인터가 끝으로 간다 · 0.25~0.4 패널이 나온다 · 0.4~0.65 머문다 · 0.65~0.8 포인터가 나간다 · 0.8~0.92 패널이 접힌다
        let toEdge = ease(t / 0.25), away = ease((t - 0.62) / 0.18)
        let open = ease((t - 0.22) / 0.16) * (1 - ease((t - 0.8) / 0.12))
        let pointerX = 150 - 142 * toEdge + 150 * away
        let pointerY = 70 + 14 * toEdge - 20 * away
        return ZStack(alignment: .topLeading) {
            LinearGradient(colors: [Color(white: 0.17), Color(white: 0.1)], startPoint: .top, endPoint: .bottom)
            // 캔버스 위 프레임과 선택 상자
            RoundedRectangle(cornerRadius: 3).fill(Color(white: 0.96)).frame(width: 118, height: 84).offset(x: 196, y: 30)
            RoundedRectangle(cornerRadius: 2).fill(Color(white: 0.84)).frame(width: 92, height: 26).offset(x: 209, y: 42)
            RoundedRectangle(cornerRadius: 2).fill(Color(white: 0.88)).frame(width: 56, height: 8).offset(x: 209, y: 78)
            Rectangle().strokeBorder(LH.accent, lineWidth: 1.5).frame(width: 118, height: 84).offset(x: 196, y: 30)
            // 아래 도구 막대와 오른쪽 속성 패널 (Figma 화면 짜임)
            Capsule().fill(Color(white: 0.2)).frame(width: 120, height: 20).offset(x: 190, y: 128)
            Circle().fill(LH.accent).frame(width: 12, height: 12).offset(x: 196, y: 132)
            RoundedRectangle(cornerRadius: 8).fill(Color(white: 0.2)).frame(width: 64, height: 132).offset(x: 356, y: 12)
            // 왼쪽 끝에서 나오는 레이어 패널
            VStack(alignment: .leading, spacing: 7) {
                ForEach(0..<5, id: \.self) { i in
                    HStack(spacing: 5) {
                        RoundedRectangle(cornerRadius: 1.5).fill(Color.white.opacity(i == 1 ? 0.95 : 0.4)).frame(width: 6, height: 6)
                        Capsule().fill(Color.white.opacity(i == 1 ? 0.95 : 0.4)).frame(width: [58, 44, 66, 38, 52][i], height: 5)
                    }
                    .padding(.horizontal, 6).frame(width: 96, height: 15, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: 4).fill(i == 1 ? LH.accent.opacity(0.9) : .clear))
                }
            }
            .padding(8)
            .background(RoundedRectangle(cornerRadius: 9).fill(Color(white: 0.2)))
            .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(Color.white.opacity(0.08)))
            .offset(x: 8 - 130 * (1 - open), y: 12)
            // 닿는 순간 끝선이 빛난다
            Rectangle().fill(LH.accent).frame(width: 2, height: 156).opacity(toEdge * (1 - away) * 0.9)
            // 포인터
            PointerShape().fill(Color.black)
                .overlay(PointerShape().stroke(Color.white, style: StrokeStyle(lineWidth: 1.6, lineJoin: .round)))
                .frame(width: 13, height: 20)
                .shadow(color: .black.opacity(0.4), radius: 2, y: 1)
                .offset(x: pointerX, y: pointerY)
        }
        .frame(width: 432, height: 156)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.primary.opacity(0.1)))
        .accessibilityHidden(true)
    }
}

struct PointerShape: Shape {
    func path(in r: CGRect) -> Path {
        let pts: [(CGFloat, CGFloat)] = [(0, 0), (0, 0.86), (0.34, 0.66), (0.57, 1.0), (0.81, 0.93), (0.58, 0.6), (1.0, 0.59)]
        var p = Path()
        for (i, pt) in pts.enumerated() {
            let q = CGPoint(x: r.minX + pt.0 * r.width, y: r.minY + pt.1 * r.height)
            if i == 0 { p.move(to: q) } else { p.addLine(to: q) }
        }
        p.closeSubpath()
        return p
    }
}

struct WelcomeView: View {
    @ObservedObject var model: GuideModel
    var demoPhase: Double? = nil
    let openSettings: () -> Void
    let close: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            EdgeDemo(fixedPhase: demoPhase)

            VStack(alignment: .leading, spacing: 4) {
                Text("Layerhover").font(.system(size: 22, weight: .bold))
                Text(L("Figma 패널은 접어 두고, 필요할 때만 화면 끝에서 꺼내 보세요.",
                       "Keep Figma's panels folded away. Bring them out from the screen edge only when you need them."))
                    .font(.system(size: 13)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, 20)

            permissionCard.padding(.top, 16)

            VStack(alignment: .leading, spacing: 12) {
                tip("cursorarrow.motionlines", L("레이어 꺼내기", "Reveal layers"),
                    L("마우스를 화면 왼쪽 끝에 대면 펼쳐지고, 패널을 벗어나면 접혀요.", "Push the pointer against the left edge. Move off the panel and it folds away."), nil)
                tip("doc.text.magnifyingglass", L("페이지로 바로 이동", "Jump to a page"),
                    L("왼쪽 아래 페이지 이름을 눌러 이름으로 찾아 이동해요.", "Click the page name at the bottom left to find a page by name."), nil)
                tip("arrow.left.arrow.right", L("이전·다음 페이지", "Back and forward"),
                    L("페이지 이름 옆 ‹ › 로 방금 보던 페이지를 오가요.", "Use ‹ › next to the page name to hop between recent pages."), nil)
            }
            .padding(.top, 20)

            Rectangle().fill(LH.fill(0.08)).frame(height: 1).padding(.vertical, 16)

            HStack(spacing: 12) {
                Text(L("로그인할 때 자동 실행", "Launch at login")).font(.system(size: 12.5))
                SettingSwitch(isOn: model.launchAtLogin, label: L("로그인할 때 자동 실행", "Launch at login")) { model.setLaunchAtLogin(!model.launchAtLogin) }
                Spacer()
                Button(action: close) {
                    Text(model.trusted ? L("시작하기", "Get Started") : L("닫기", "Close"))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(model.trusted ? Color.white : Color.primary)
                        .padding(.horizontal, 16).frame(height: 32)
                }
                .buttonStyle(QuietButtonStyle(prominent: model.trusted))
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding(24)
        .frame(width: 480)
        .background { if demoPhase == nil { WindowGlass().ignoresSafeArea() } }
    }

    private var permissionCard: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle().fill((model.trusted ? Color.green : Color.orange).opacity(0.16)).frame(width: 32, height: 32)
                LHIcon(symbol: model.trusted ? "checkmark" : "hand.raised.fill", weight: .semibold).foregroundStyle(model.trusted ? Color.green : Color.orange)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(model.trusted ? L("준비됐어요", "You're all set") : L("먼저 손쉬운 사용 권한을 켜 주세요", "First, turn on Accessibility permission"))
                    .font(.system(size: 13, weight: .semibold))
                Text(model.trusted
                     ? L("Figma로 가서 마우스를 화면 왼쪽 끝에 대 보세요.", "Switch to Figma and push the pointer against the left edge.")
                     : L("Figma의 접기·펼치기 버튼을 대신 누르는 데만 써요. 켜면 앱이 스스로 다시 시작해요.",
                         "Used only to press Figma's minimize and expand buttons. Layerhover restarts itself once it's on."))
                    .font(.system(size: 12)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                if !model.trusted {
                    Button(action: openSettings) {
                        Text(L("손쉬운 사용 설정 열기", "Open Accessibility Settings"))
                            .font(.system(size: 12, weight: .semibold)).foregroundStyle(.white)
                            .padding(.horizontal, 16).frame(height: 28)
                    }
                    .buttonStyle(QuietButtonStyle(prominent: true))
                    .padding(.top, 8)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .background(GlassFill(radius: 12, tint: model.trusted ? .green : .orange))
        .accessibilityElement(children: .contain)
    }

    private func tip(_ symbol: String, _ title: String, _ text: String, _ keys: [String]?) -> some View {
        HStack(alignment: .center, spacing: 12) {
            LHIcon(symbol: symbol, size: LHIcon.s20, weight: .medium).foregroundStyle(.primary)
                .frame(width: 32, height: 32)
                .background(GlassFill(radius: 8))
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(title).font(.system(size: 13, weight: .semibold))
                    if let keys { ForEach(keys, id: \.self) { Keycap(text: $0) } }
                }
            }
            Spacer(minLength: 0)
        }
    }
}

/// 뽀모도로 한 번의 길이: 널리 쓰는 25분
enum Focus { static let length: TimeInterval = 25 * 60 }
