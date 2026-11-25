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
    /// 장면 00 을 SwiftUI 이미지로 그린다 (사선을 그을 때: 움직이는 그림은 AppKit 층이라 가리기가 먹지 않을 수 있다)
    var still = false

    var body: some View {
        Group {
            if !still, let s = library.sprite(id) {
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

/// 패널 안에서 펼치는 세부 화면 (제어 센터에서 항목 이름을 누르면 옵션이 펼쳐지는 것과 같다)
enum PanelDetail: Hashable {
    case icon, reveal
    /// 이 세부 화면이 커져 나오는 칸
    var tile: String { self == .icon ? "icon" : "reveal" }
}

final class MenuModel: ObservableObject {
    @Published var trusted = true
    @Published var enabled = true
    @Published var cheer = ""
    @Published var todayActive: Double = 0      // 오늘 작업 시간 (초)
    @Published var streak: Double = 0           // 쉬지 않고 이어진 지금 작업 구간 (초)
    @Published var panelOpen = false            // 패널이 화면에 떠 있는 동안만 움직임을 돌린다
    @Published var detail: PanelDetail? = nil    // 패널에서 칸을 펼쳐 세부 화면을 보는 중 (제어 센터에서 항목 이름을 누른 것)
    @Published var figmaRunning = true
    @Published var version = ""
    @Published var marks: [MarkInfo] = []
    @Published var selectedMark = MarkLibrary.defaultID
    @Published var animateMark = true
    @Published var menuBarIconShown = true     // 메뉴 막대 아이콘이 보이는지 (숨겨도 Layerhover는 그대로 돈다)
    @Published var morphing = false             // 칸이 세부 화면으로 커지거나 줄어드는 중 (뒤 흐림을 바로 따라 바꾸고, 칸 속 채도 층은 잠깐 내린다)
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
        var openAccessibility: () -> Void = {}
        var openPalette: () -> Void = {}
        var showSummary: () -> Void = {}
        var selectMark: (String) -> Void = { _ in }
        var toggleAnimate: () -> Void = {}
        var toggleMenuBarIcon: () -> Void = {}
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
        if !enabled { return (L("쉬는 중", "Paused"), .gray) }
        if !figmaRunning { return (L("Figma를 기다리는 중", "Waiting for Figma"), .yellow) }
        return (L("작동 중", "Running"), .green)
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
        if !awake { return L("쉬는 중", "Paused") }
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
    /// 쉬지 않고 이만큼 이어지면 쉬어 갈 때 (50분)
    static let breakAt: Double = 50 * 60
    /// 적정 근무시간: 하루 8시간 (근로기준법의 하루 기준). 큰 칸의 바탕 막대가 여기서 가득 찬다
    static let workDay: Double = 8 * 3600
}

/// 메뉴 막대 패널: 자주 쓰는 것만 담고, 높이가 바뀌지 않는다 (펼치고 접는 부분이 없다). 바탕 없는 유리 조각들로 이뤄진다.
/// 나머지 설정은 "설정…"(⌘,)으로 여는 창(SettingsWindow.swift)에 있다.
struct MenuPanelView: View {
    @ObservedObject var model: MenuModel
    @State private var hoveredMark: String?
    @State private var hoveredRow: String?
    @State private var hoveredTile: String?
    /// 칸 → 세부 화면 (제어 센터와 같은 짜임): 누른 칸의 유리가 제자리에서 커져 세부 화면 한 장이 된다.
    /// 칸의 얼굴(동그라미·이름)은 앞쪽에서 사라지고, 세부 내용은 유리 안에서 나타난다. 나머지 칸은 그 아래에서 흐려진다.
    /// 닫을 때는 거꾸로 줄어들어 칸으로 돌아간다. morph 0 = 첫 화면, 1 = 세부 화면.
    @State private var morph: CGFloat
    @State private var card: PanelDetail?            // 커지거나 줄어드는 중이거나 펼쳐진 세부 화면
    @State private var tileFrames: [String: CGRect] = [:]
    @State private var detailSizes: [String: CGSize] = [:]
    @State private var gridHeight: CGFloat = 0
    @Environment(\.colorScheme) private var scheme

    /// hover: 그림으로 확인할 때만 — 이 칸에 마우스가 올라간 모습으로 그린다 (--render-menu --hover reveal|log|icon)
    init(model: MenuModel, hover: String? = nil) {
        self.model = model
        _hoveredTile = State(initialValue: hover)
        _card = State(initialValue: model.detail)
        _morph = State(initialValue: model.detail == nil ? 0 : 1)
    }

    // 제어 센터를 그대로 따른다 (2배 해상도 캡처에서 잰 값):
    //  한 단위 64 · 사이 12 · 폭 4단위 292 · 메뉴 막대 아래 12
    //  모양: 높이 64 칸은 알약, 1×1은 동그라미, 2×2는 둥글기 30
    //  안쪽: 2×1 칸은 동그라미 36이 왼쪽 14에서, 글자는 57에서 · 큰 칸 여백 15
    //  글자: 제목 12 semibold 흰색 92% · 아래 줄 12 흰색 75%
    //   (제어 센터 Bluetooth·AirDrop 칸 2배 캡처: "AirDrop" 잉크 89×23px, "Bluetooth" 111px, "끔" 19×20px 가
    //    SF 12 semibold / 12 regular 로 그린 것과 정확히 같다)
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
        // 유리 조각은 하나씩 따로 그린다 (GlassEffectContainer로 묶으면 렌즈가 사라져 뿌옇게 된다).
        // 칸 둘레와 사이의 뒤 화면은 창이 깐 PanelHalo가 흐린다: 각 조각이 자기 자리를 알린다.
        ZStack(alignment: .topLeading) {
            grid
                .background(GeometryReader { g in Color.clear.onAppear { gridHeight = g.size.height }
                    .onChange(of: g.size.height) { gridHeight = $0 } })
                .modifier(GridFade(progress: morph))
                // 다 펼친 뒤에는 가려진 칸들이 뒤 흐림을 남기지 않게 한다
                .environment(\.lhHaloReport, card == nil || morph < 0.999)
                .allowsHitTesting(card == nil)
            if detailSizes.count < 2 {
                // 세부 화면 크기를 처음 한 번 미리 잰다 (보이지 않는다): 처음 열 때 카드가 커지는 도중에 목표가 바뀌지 않게
                ZStack(alignment: .topLeading) {
                    menuBarDetail.fixedSize().background(sizeReader("icon"))
                    revealDetail.fixedSize().background(sizeReader("reveal"))
                }
                .hidden().allowsHitTesting(false).accessibilityHidden(true)
                .environment(\.lhHaloReport, false)
            }
            if let d = card {
                Color.clear.modifier(MorphCard(
                    progress: morph,
                    from: tileFrames[d.tile],
                    natural: detailSizes[d.tile],
                    face: AnyView(tileFace(d)),
                    detail: AnyView(detailContent(d)),
                    onSize: { size in if detailSizes[d.tile] != size { detailSizes[d.tile] = size } }))
            }
        }
        // 창은 늘 세부 화면 폭(307)이고, 세부 화면이 있는 동안 높이는 첫 화면과 세부 화면 중 큰 쪽으로 고정한다:
        // 여닫는 동안 창 크기가 바뀌지 않아 내용이 밀리거나 튀지 않는다 (남는 자리는 투명하다)
        .frame(width: MenuPanelView.detailWidth, alignment: .topLeading)
        .frame(minHeight: card == nil ? nil : max(gridHeight, card.flatMap { detailSizes[$0.tile]?.height } ?? 0), alignment: .topLeading)
        .environment(\.lhPanelGlass, true)
        .coordinateSpace(name: PanelHalo.space)
        .onPreferenceChange(TileFramesKey.self) { tileFrames = $0 }
        .onChange(of: model.detail) { moveCard(to: $0) }
    }

    /// 칸의 이름 쪽을 누르면 그 칸이 제자리에서 커져 세부 화면이 된다 (nil 이면 첫 화면으로)
    private func openDetail(_ d: PanelDetail?) { model.detail = d }

    private func sizeReader(_ key: String) -> some View {
        GeometryReader { g in Color.clear.onAppear { if detailSizes[key] == nil { detailSizes[key] = g.size } } }
    }

    /// 제어 센터처럼: 튀지 않는 용수철(되튐 없음)로 열 때 0.34초, 닫을 때 0.3초쯤
    private func moveCard(to d: PanelDetail?) {
        guard model.panelOpen else {                      // 보이지 않을 때(패널을 다시 열 때)는 바로 맞춘다
            card = d; morph = d == nil ? 0 : 1; return
        }
        hoveredTile = nil
        model.morphing = true
        if let d {
            card = d
            withAnimation(.spring(response: 0.34, dampingFraction: 1)) { morph = 1 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { if model.detail == d { model.morphing = false } }
        } else {
            withAnimation(.spring(response: 0.3, dampingFraction: 1)) { morph = 0 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                guard model.detail == nil else { return }
                card = nil
                model.morphing = false
            }
        }
    }

    /// 세부 화면이 커져 나오는 칸의 얼굴 (첫 화면의 그 칸과 똑같이 그린다)
    @ViewBuilder private func tileFace(_ d: PanelDetail) -> some View {
        switch d {
        case .reveal:
            pillLabel(title: L("패널 꺼내기", "Edge Peek"), note: model.enabled ? L("켬", "On") : L("끔", "Off")) { revealDisc }
                .opacity(model.trusted ? 1 : 0.4)
        case .icon:
            pillLabel(title: L("아이콘", "Icon"), note: model.menuBarIconShown ? shownName : L("숨김", "Hidden")) { iconDiscFace }
        }
    }

    @ViewBuilder private func detailContent(_ d: PanelDetail) -> some View {
        switch d {
        case .reveal: revealDetail
        case .icon: menuBarDetail
        }
    }

    private func hoverTile(_ id: String, _ inside: Bool) {
        if inside { hoveredTile = id } else if hoveredTile == id { hoveredTile = nil }
    }

    // MARK: 첫 화면

    private var grid: some View {
        VStack(alignment: .leading, spacing: MenuPanelView.gap) {
            HStack(alignment: .top, spacing: MenuPanelView.gap) {
                statusModule
                // 오른쪽: 켜고 끄는 칸끼리 (패널 꺼내기, 작업 기록)
                VStack(spacing: MenuPanelView.gap) { revealModule; activityModule }
            }
            if !model.trusted { permissionCard }
            // 아래 줄: Figma 페이지 검색, 아이콘
            HStack(spacing: MenuPanelView.gap) { pageModule; iconModule }
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

    private func pillLabel<Disc: View>(title: String, note: String? = nil, width: CGFloat = MenuPanelView.column, chevron: Bool = false,
                                       @ViewBuilder disc: () -> Disc) -> some View {
        HStack(spacing: 7) {
            disc().frame(width: 36, height: 36)
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.system(size: 12, weight: .semibold)).foregroundStyle(titleStyle).lineLimit(1).minimumScaleFactor(0.9)
                // 긴 이름은 제어 센터 Wi‑Fi 칸처럼 두 줄로 (잘라 내거나 칸 여백을 넘지 않게)
                // 아래 줄만 0.5pt 내린다: 제어 센터 AirDrop 칸 실측과 글자선이 같아진다 (제목 글자선은 이미 같다: 가운데 위 3.5pt,
                // 아래 줄 끝은 가운데 아래 13.5pt). 배치가 아니라 그릴 때 옮겨야 화소 맞춤에 묻히지 않는다.
                if let note { Text(note).font(.system(size: 12)).foregroundStyle(noteStyle).lineLimit(2).minimumScaleFactor(0.85)
                    .fixedSize(horizontal: false, vertical: true).offset(y: 0.5) }
            }
            // 글자 칸 = 동그라미 오른쪽부터 오른쪽 여백 14 앞까지 (Spacer를 두면 간격 7을 한 번 더 먹어 글자가 잘렸다)
            .frame(maxWidth: .infinity, alignment: .leading)
            // › 가 떠 있는 동안: 제어 센터처럼 글자가 › 앞에서 흐려진다 (2배 캡처 실측: 칸 오른쪽 끝에서 27.5pt 앞에서 끝나고
            // 그 앞 19pt 동안 흐려진다). 제어 센터는 끝에서 44%로 끊지만, 한글은 글자가 반쯤 잘려 보여 끝에서 0이 되게 한다.
            // 글자 배치는 그대로 두고 가리기만 한다 (줄바꿈이 바뀌지 않게).
            .mask {
                GeometryReader { g in
                    let w = max(g.size.width, 1), cut = g.size.width - 13.5
                    LinearGradient(stops: chevron ? [
                        .init(color: .black, location: 0),
                        .init(color: .black, location: max(0, (cut - 19) / w)),
                        .init(color: .clear, location: max(0, cut / w)),
                        .init(color: .clear, location: 1)
                    ] : [.init(color: .black, location: 0), .init(color: .black, location: 1)],
                    startPoint: .leading, endPoint: .trailing)
                }
            }
        }
        // 글자는 양쪽 여백 14 안에만 (오른쪽도 왼쪽과 같게)
        .padding(.horizontal, 14)
        .frame(width: width, height: MenuPanelView.unit)
        // 자세히로 들어가는 칸: 마우스를 올리면 › 가 뜬다 (제어 센터 Bluetooth 칸 2배 캡처 실측:
        // 보이는 획 5.5×10.5pt·굵기 2pt = chevron.right 12pt semibold, 보이는 오른쪽 끝이 칸 끝에서 14.85pt,
        // 세로 가운데, 흰색 46%)
        .overlay(alignment: .trailing) {
            if chevron {
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.primary.opacity(0.46))
                    .padding(.trailing, 12.5).transition(.opacity).accessibilityHidden(true)   // 기호 틀 안쪽 여유까지 재서 맞춘 값
            }
        }
        .animation(.easeOut(duration: 0.12), value: chevron)
        .contentShape(pill)
    }

    /// 2×1 칸 — 제어 센터 규칙 (Apple 사용 설명서: '아이콘을 클릭하여 기능을 켜거나 끄기 · 항목을 클릭하여 옵션 표시하기').
    ///  동그라미를 누르면 그 기능을 켜고 끈다 (채워진 동그라미 = 켜짐). 나머지(이름 쪽)를 누르면 자세히로 들어간다.
    ///  칸 전체 유리는 아래의 '자세히' 단추가 맡고, 그 위 같은 자리에 동그라미 단추를 얹는다.
    private func splitTile<Disc: View>(id: String, title: String, note: String, isOn: Bool, dimmed: Bool = false,
                                       toggle: @escaping () -> Void, open: @escaping () -> Void,
                                       @ViewBuilder disc: () -> Disc) -> some View {
        ZStack(alignment: .leading) {
            Button(action: open) {
                pillLabel(title: title, note: note, chevron: hoveredTile == id) { Color.clear }
                    .opacity(dimmed ? 0.4 : 1)
            }
            .buttonStyle(GlassKeyStyle(shape: pill))
            .accessibilityLabel(L("\(title) 자세히", "\(title) details"))
            Button(action: toggle) {
                disc().frame(width: 36, height: 36).contentShape(Circle())
                    .animation(.smooth(duration: 0.2), value: isOn)
            }
            .buttonStyle(DiscKeyStyle())
            .opacity(dimmed ? 0.4 : 1)
            .padding(.leading, 14)
            .accessibilityLabel(title)
            .accessibilityValue(isOn ? L("켬", "On") : L("끔", "Off"))
        }
        .onHover { hoverTile(id, $0) }
        .background(GeometryReader { g in
            Color.clear.preference(key: TileFramesKey.self, value: [id: g.frame(in: .named(PanelHalo.space))])
        })
        // 이 칸이 세부 화면으로 커져 있는 동안 자리는 커지는 유리가 맡는다
        .opacity(card?.tile == id ? 0 : 1)
        .environment(\.lhHaloReport, card?.tile != id)
    }

    private func symbolDisc(_ symbol: String, on: Bool = false, slashed: Bool = false) -> some View {
        Circle().fill(discFill(on))
            .overlay(Image(systemName: symbol).font(.system(size: 16, weight: .semibold)).foregroundStyle(glyphColor(on))
                .offSlash(slashed, length: 22, angle: 40).accessibilityHidden(true))     // chart.bar.xaxis 잉크 18×15pt
    }

    /// 2×2 오늘 작업 칸 (제어 센터의 '재생 중' 칸 자리). 누르면 작업 기록 창이 열린다 (작업 기록 칸의 이름 쪽과 같다).
    ///  바탕: 적정 근무시간(하루 8시간) 막대 — 오늘 작업한 만큼 칸 바탕이 아래에서부터 차오른다. 8시간을 넘기면 주황으로 가득 찬다.
    ///  위: 오늘 Figma에서 작업한 시간을 크게 (건강·스크린 타임처럼 숫자는 크게, 단위는 작게).
    ///  아래 한 줄: 쉬지 않고 이어서 일한 시간. 50분을 넘기면 주황 '쉬어 갈 때예요', 8시간을 넘기면 주황 '오늘은 충분해요'.
    ///  이어서 일한 게 1분도 안 됐으면 비운다. 작업 기록을 끄면 그때까지 센 시간을 흐리게 두고 '기록 꺼짐'.
    private var statusModule: some View {
        let logging = model.workLog
        let streaking = logging && streakMinutes > 0
        let over = logging && model.todayActive >= Cheer.workDay
        let note: (text: String, warn: Bool)? =
            !logging ? (L("기록 꺼짐", "Not recording"), false)
            : over ? (L("오늘은 충분해요", "Enough for today"), true)
            : needsBreak ? (L("쉬어 갈 때예요", "Time for a break"), true)
            : streaking ? (L("쉬지 않고 \(streakMinutes)분", "\(streakMinutes) min nonstop"), false) : nil
        return Button(action: model.actions.showSummary) {
            VStack(alignment: .leading, spacing: 0) {
                Text(L("오늘 작업", "Today"))
                    .font(.system(size: 12.5, weight: .medium)).foregroundStyle(noteStyle).lineLimit(1).minimumScaleFactor(0.85)
                durationText(model.todayActive)
                    .foregroundStyle(titleStyle).opacity(logging ? 1 : 0.4)
                    .lineLimit(1).minimumScaleFactor(0.7)
                    .padding(.top, 2)
                Spacer(minLength: 0)
                if let note {
                    Text(note.text)
                        .font(.system(size: 12.5, weight: note.warn ? .semibold : .regular))
                        // 칸이 이미 주황으로 찼으면(8시간 넘음) 글자는 주황이 아니라 제목 색으로 (주황 위 주황은 읽히지 않는다)
                        .foregroundStyle(over ? titleStyle : note.warn ? warnColor : noteStyle).lineLimit(1).minimumScaleFactor(0.85)
                }
            }
            // 제어 센터 '재생 중' 칸 실측: 내용이 왼쪽·위 14에서, 아래 끝은 바닥에서 19
            .padding(.top, 14).padding(.horizontal, 14).padding(.bottom, 18)
            .frame(width: MenuPanelView.column, height: MenuPanelView.span(2), alignment: .topLeading)
            .background { dayBar(min(1, model.todayActive / Cheer.workDay), over: over).opacity(logging ? 1 : 0.4) }
            .contentShape(big)
        }
        .buttonStyle(GlassKeyStyle(shape: big))
        .accessibilityLabel(L("오늘 작업", "Worked today"))
        .accessibilityValue([Cheer.duration(model.todayActive),
                             L("적정 근무시간 8시간 중 \(Int(min(1, model.todayActive / Cheer.workDay) * 100))%",
                               "\(Int(min(1, model.todayActive / Cheer.workDay) * 100))% of an 8-hour day"),
                             !logging ? L("기록 꺼짐", "Not recording")
                             : over ? L("오늘은 충분해요", "Enough for today")
                             : needsBreak ? L("쉬지 않고 \(Cheer.duration(model.streak)), 쉬어 갈 때예요", "\(Cheer.duration(model.streak)) without a break, time for a break")
                             : streaking ? L("쉬지 않고 \(streakMinutes)분", "\(streakMinutes) min without a break") : nil]
                            .compactMap { $0 }.joined(separator: ", "))
        .accessibilityHint(L("작업 기록 창을 열어요", "Opens the activity window"))
    }

    /// 적정 근무시간 막대: 칸 바탕 자체가 막대다. 제어 센터의 큰 밝기·소리 막대처럼 아래에서부터 차오르고, 칸 모양으로 잘린다.
    ///  (가로로 차게 하면 경계가 큰 숫자를 세로로 갈라 읽기 어렵다. 세로는 경계가 줄 사이를 지난다)
    private func dayBar(_ fraction: Double, over: Bool) -> some View {
        let dark = scheme == .dark
        let color = over ? Color.orange.opacity(dark ? 0.42 : 0.24) : LH.accent.opacity(dark ? 0.3 : 0.2)
        return GeometryReader { g in
            Rectangle().fill(color).frame(height: g.size.height * fraction)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
        .clipShape(big)
        .animation(.smooth(duration: 0.6), value: fraction)
        .accessibilityHidden(true)
    }

    /// 시간 길이: 숫자는 크게, 단위는 작게 (건강·스크린 타임과 같은 표기). 2시간 40분 · 2h 40m
    private func durationText(_ seconds: Double) -> Text {
        let m = Int(seconds / 60), h = m / 60, r = m % 60
        func n(_ v: Int) -> Text { Text(verbatim: "\(v)").font(.system(size: 30, weight: .bold, design: .rounded)).monospacedDigit() }
        func u(_ s: String) -> Text { Text(verbatim: s).font(.system(size: 17, weight: .semibold, design: .rounded)) }
        if h == 0 { return n(m) + u(L("분", "m")) }
        if r == 0 { return n(h) + u(L("시간", "h")) }
        return n(h) + u(L("시간 ", "h ")) + n(r) + u(L("분", "m"))
    }

    private var streakMinutes: Int { Int(model.streak / 60) }
    private var needsBreak: Bool { model.streak >= Cheer.breakAt }
    /// 주황 경고 글자: 밝은 유리 위에서도 읽히게 밝은 화면에서는 진한 주황 (#C2570C, 흰 바탕 대비 4.6:1)
    private var warnColor: Color { scheme == .dark ? .orange : Color(red: 0.76, green: 0.34, blue: 0.05) }

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
            // 다른 앱을 보다가 Figma의 원하는 페이지로 바로 들어가는 단추 (Figma를 앞으로 가져온 뒤 페이지 검색 창을 연다)
            pillLabel(title: "Figma", note: L("페이지 검색", "Find page")) { symbolDisc("doc.text.magnifyingglass") }
                .opacity(canGo ? 1 : 0.4)
        }
        .buttonStyle(GlassKeyStyle(shape: pill))
        .disabled(!canGo)
        .accessibilityLabel(L("Figma 페이지 검색", "Find a Figma page"))
    }

    /// 2×1 아이콘: 동그라미 = 메뉴 막대 아이콘 보이기·숨기기 (숨겨도 패널 꺼내기·작업 기록은 그대로 돈다.
    /// 숨긴 뒤에는 Layerhover를 다시 열면 아이콘이 돌아온다), 이름 쪽 = 자세히 (아이콘 고르기).
    /// 아래 줄은 지금 아이콘 이름, 숨겼으면 '숨김'. 숨기면 기호에 사선을 긋는다.
    private var iconModule: some View {
        let shown = model.menuBarIconShown
        return splitTile(id: "icon", title: L("아이콘", "Icon"), note: shown ? shownName : L("숨김", "Hidden"),
                         isOn: shown, toggle: model.actions.toggleMenuBarIcon, open: { openDetail(.icon) }) { iconDiscFace }
    }

    private var iconDiscFace: some View {
        let shown = model.menuBarIconShown
        return ZStack {
            Circle().fill(discFill(shown))
            MarkImage(id: shownMark, playing: shown && model.enabled && model.animateMark && model.motionBlocked == nil, size: 20,
                      color: shown ? glyphNSColor(true) : .labelColor, still: !shown)
                .offSlash(!shown, length: 23, angle: 45)                               // 아이콘 그림은 정사각형
        }
    }

    /// 메뉴 막대에 지금 보이는 것: 날씨를 켰으면 날씨, 아니면 고른 아이콘
    private var shownMark: String { model.weatherMode > 0 ? MarkLibrary.weatherID : model.selectedMark }
    /// 지금 메뉴 막대 모습의 이름 (칸의 아래 줄)
    private var shownName: String {
        if model.weatherMode == 1 { return model.weatherDenied ? L("위치 권한 꺼짐", "Location off") : L("날씨", "Weather") }
        if model.weatherMode == 2 { return model.weatherDenied ? L("위치 권한 꺼짐", "Location off") : L("날씨와 온도", "Weather + °") }
        return model.marks.first { $0.id == model.selectedMark }?.name ?? ""
    }

    /// 2×1 패널 꺼내기: 동그라미 = 켜고 끄기 (채워지면 켜짐, 끄면 화면 끝에 닿아도 패널이 나오지 않는다),
    /// 이름 쪽 = 자세히 (속도·꺼내는 곳). 권한이 없으면 누를 수 없으니 Figma 칸처럼 흐리게.
    private var revealModule: some View {
        let on = model.enabled
        return splitTile(id: "reveal", title: L("패널 꺼내기", "Edge Peek"), note: on ? L("켬", "On") : L("끔", "Off"),
                         isOn: on, dimmed: !model.trusted,
                         toggle: model.actions.toggleEnabled, open: { openDetail(.reveal) }) { revealDisc }
        .disabled(!model.trusted)
    }

    private var revealDisc: some View {
        let on = model.enabled
        return Circle().fill(discFill(on))
            .overlay(Image(systemName: "sidebar.left").font(.system(size: 15, weight: .semibold)).foregroundStyle(glyphColor(on))
                .offSlash(!on, length: 21, angle: 39))                                     // sidebar.left 잉크 17.5×14pt
    }

    /// 2×1 작업 기록: 동그라미 = 기록 켜고 끄기 (채워지면 기록 중), 이름 쪽 = 자세히 (이번 주 작업 기록 창 — 패널에 담기엔 커서 창으로 연다)
    private var activityModule: some View {
        let on = model.workLog
        return splitTile(id: "log", title: L("작업 기록", "Activity"), note: on ? L("기록 중", "On") : L("끔", "Off"),
                         isOn: on, toggle: model.actions.toggleWorkLog, open: model.actions.showSummary) {
            symbolDisc("chart.bar.xaxis", on: on, slashed: !on)
        }
    }

    /// 맨 아래 작은 알약: 설정
    private var settingsPill: some View {
        Button(action: model.actions.showSettings) {
            Text(L("설정", "Settings")).font(.system(size: 12, weight: .medium)).foregroundStyle(noteStyle)
                .padding(.horizontal, 16).frame(height: 28)
        }
        .buttonStyle(GlassKeyStyle(shape: pill))
        .keyboardShortcut(",", modifiers: .command)
    }

    /// 자동 설치를 꺼 두었을 때만: 받을 수 있는 새 버전 (4단위 알약)
    @ViewBuilder private var updateRow: some View {
        if let v = model.updateVersion, !model.autoUpdate {
            Button(action: model.actions.installUpdate) {
                HStack(spacing: 7) {
                    symbolDisc("arrow.down", on: true).frame(width: 36, height: 36)
                    Text(L("\(v)\(Updater.ro(v)) 업데이트", "Update to \(v)")).font(.system(size: 12, weight: .semibold)).foregroundStyle(titleStyle)
                    Spacer(minLength: 0)
                }
                .padding(.leading, 14).frame(width: MenuPanelView.width, height: MenuPanelView.unit)
                .contentShape(pill)
            }
            .buttonStyle(GlassKeyStyle(shape: pill))
        }
    }

    // MARK: 펼친 화면: 메뉴 막대 (제어 센터의 집중 모드·사운드 세부 화면과 같은 짜임)

    private var menuBarDetail: some View {
        VStack(alignment: .leading, spacing: 0) {
            detailHeader(L("메뉴 막대 아이콘", "Menu Bar Icon"))
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
    }

    // MARK: 펼친 화면: 패널 꺼내기 (제어 센터 Wi‑Fi 세부 화면과 같은 짜임: 제목 줄에 켜고 끄기, 아래에 옵션, 맨 아래 설정…)

    private var revealDetail: some View {
        let speeds = [L("바로", "Instant"), L("보통", "Normal"), L("느긋하게", "Relaxed")]
        let onOff = [L("켬", "On"), L("끔", "Off")]
        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                detailHeader(L("패널 꺼내기", "Edge Peek"))
                LHSegmented(options: onOff, selection: model.enabled ? 0 : 1, label: L("패널 꺼내기", "Edge Peek"), height: 24, fontSize: 12) { i in
                    if (i == 0) != model.enabled { model.actions.toggleEnabled() }
                }
                .frame(width: 96)
            }
            detailDivider
            sectionLabel(L("속도", "Speed"))
            choiceRow(L("꺼낼 때", "Reveal"), options: speeds, selection: model.reveal, width: 186, action: model.actions.setReveal)
            choiceRow(L("넣을 때", "Fold away"), options: speeds, selection: model.collapse, width: 186, action: model.actions.setCollapse)
            detailDivider
            sectionLabel(L("꺼내는 곳", "Where"))
            choiceRow(L("오른쪽 끝 · 속성 패널", "Right edge · Properties"), options: onOff, selection: model.rightEdge ? 0 : 1, width: 96) { i in
                if (i == 0) != model.rightEdge { model.actions.toggleRightEdge() }
            }
            choiceRow(L("새 파일은 패널을 접고 시작", "Start new files minimized"), options: onOff, selection: model.minimizeByDefault ? 0 : 1, width: 96) { i in
                if (i == 0) != model.minimizeByDefault { model.actions.toggleMinimize() }
            }
            detailDivider
            linkRow(L("패널 꺼내기 설정…", "Edge Peek Settings…")) {
                model.settingsPane = .reveal
                model.actions.showSettings()
            }
        }
        .padding(.horizontal, 14).padding(.top, 12).padding(.bottom, 8)
        .frame(width: MenuPanelView.detailWidth, alignment: .leading)
    }

    /// 세부 화면 제목 = 돌아가기 (‹ 이름). esc 로도 돌아간다
    private func detailHeader(_ title: String) -> some View {
        Button { openDetail(nil) } label: {
            HStack(spacing: 6) {
                Image(systemName: "chevron.left").font(.system(size: 12, weight: .bold)).foregroundStyle(noteStyle)
                Text(title).font(.system(size: 15, weight: .bold)).foregroundStyle(titleStyle).lineLimit(1)
                Spacer(minLength: 0)
            }
            .frame(height: 28).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    /// 세부 화면의 고르기 한 줄: 왼쪽 이름, 오른쪽 선택 막대 (설정 창과 같은 조작 방식)
    private func choiceRow(_ title: String, options: [String], selection: Int?, width: CGFloat, action: @escaping (Int) -> Void) -> some View {
        HStack(spacing: 8) {
            Text(title).font(.system(size: 13)).foregroundStyle(titleStyle).lineLimit(1).minimumScaleFactor(0.85)
                .frame(maxWidth: .infinity, alignment: .leading)
            LHSegmented(options: options, selection: selection, label: title, height: 24, fontSize: 12, action: action)
                .frame(width: width)
        }
        .frame(height: 34)
    }

    /// 세부 화면 맨 아래: 설정 창의 그 칸을 연다 (제어 센터의 'Wi‑Fi 설정…'과 같다)
    private func linkRow(_ title: String, action: @escaping () -> Void) -> some View {
        let hovered = hoveredRow == "link"
        return Button(action: action) {
            Text(title).font(.system(size: 13)).foregroundStyle(titleStyle).lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 7)
                .frame(height: 30)
                .background { if hovered { RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.primary.opacity(0.08)) } }
                .contentShape(Rectangle())
                .padding(.horizontal, -7)
        }
        .buttonStyle(.plain)
        .onHover { inside in if inside { hoveredRow = "link" } else if hoveredRow == "link" { hoveredRow = nil } }
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
                tip("cursorarrow.motionlines", L("패널 꺼내기", "Edge Peek"),
                    L("화면 왼쪽 끝에 마우스를 대면 나오고, 벗어나면 다시 들어가요.", "Push the pointer against the left edge. Move off the panel and it folds away."), nil)
                tip("doc.text.magnifyingglass", L("페이지 이동", "Pages"),
                    L("왼쪽 아래 페이지 이름을 눌러 이름으로 찾아 이동해요.", "Click the page name at the bottom left to find a page by name."), nil)
                tip("arrow.left.arrow.right", L("이전·다음 페이지", "Back and forward"),
                    L("페이지 이름 옆 ‹ › 로 방금 보던 페이지를 오가요.", "Use ‹ › next to the page name to hop between recent pages."), nil)
            }
            .padding(.top, 20)

            Rectangle().fill(LH.fill(0.08)).frame(height: 1).padding(.vertical, 16)

            HStack(spacing: 12) {
                Text(L("로그인할 때 열기", "Open at login")).font(.system(size: 12.5))
                SettingSwitch(isOn: model.launchAtLogin, label: L("로그인할 때 열기", "Open at login")) { model.setLaunchAtLogin(!model.launchAtLogin) }
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

// MARK: - 꺼진 기능의 사선

/// 꺼진 기능의 기호: 왼쪽 위에서 오른쪽 아래로 사선을 긋는다 (macOS의 '…slash' 기호와 같은 표시).
/// 사선 양옆은 기호를 비워 사선이 기호와 떨어져 또렷하게 보인다.
///  제어 센터 AirDrop 꺼짐 칸 2배 캡처 실측: 사선 길이 22pt·굵기 1.6pt, 양옆 비운 틈 1.5pt, 기울기는 기호 잉크 상자의
///  대각선을 따른다 (AirDrop 49°, SF 기호 wifi.slash 39°·bell.slash 47°) — 그래서 기호마다 angle 을 따로 준다.
struct OffSlash: ViewModifier {
    let off: Bool
    var length: CGFloat = 22
    var angle: Double = 45            // 가로에서 아래로 기운 각도 (왼쪽 위 → 오른쪽 아래)
    var color: Color = .primary
    func body(content: Content) -> some View {
        content
            .mask {
                ZStack {
                    Rectangle().padding(-8)
                    if off {
                        Capsule().frame(width: length + 8, height: 4.6).rotationEffect(.degrees(angle)).blendMode(.destinationOut)
                    }
                }
                .compositingGroup()
            }
            .overlay {
                // 1.5pt (2배 화면 3px): 덮은 양이 제어 센터 사선(1.62pt)과 거의 같다
                if off { Capsule().fill(color).frame(width: length, height: 1.5).rotationEffect(.degrees(angle)).allowsHitTesting(false) }
            }
            .animation(.smooth(duration: 0.2), value: off)
    }
}

extension View {
    func offSlash(_ off: Bool, length: CGFloat = 22, angle: Double = 45, color: Color = .primary) -> some View {
        modifier(OffSlash(off: off, length: length, angle: angle, color: color))
    }
}

// MARK: - 칸 → 세부 화면 (제어 센터처럼 칸이 커진다)

/// 칸마다 패널 안 자리 (커지는 카드의 출발점)
struct TileFramesKey: PreferenceKey {
    static let defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) { value.merge(nextValue()) { $1 } }
}

/// 세부 화면이 커지는 동안 첫 화면의 다른 칸들: 열 때는 앞 30% 안에 사라지고, 닫을 때는 카드가 거의 칸 크기로
/// 돌아온 마지막 30%에서야 나타난다 (유리 위에 유리가 겹쳐 어두운 얼룩이 비치지 않게 — 제어 센터도 겹쳐 보이지 않는다)
struct GridFade: ViewModifier, Animatable {
    var progress: CGFloat
    var animatableData: CGFloat { get { progress } set { progress = newValue } }
    func body(content: Content) -> some View {
        content.opacity(Double(max(0, min(1, 1 - progress / 0.3))))
    }
}

/// 누른 칸의 유리가 세부 화면으로 커지는 카드. progress 0 이면 칸 자리·알약 모양, 1 이면 세부 화면 자리(패널 왼쪽 위)·둥글기 26.
/// 자리·크기·둥글기가 함께 움직이고, 칸 얼굴은 앞 30% 안에 사라지며, 세부 내용은 20%~70% 사이에 유리 안에서 나타난다.
/// 내용은 제 크기로 왼쪽 위에 붙어 있고 유리 모양으로 잘린다 (늘었다 줄었다 하지 않는다).
struct MorphCard: ViewModifier, Animatable {
    var progress: CGFloat
    let from: CGRect?                // 칸 자리 (모르면 세부 화면 자리에서 시작)
    let natural: CGSize?             // 세부 내용의 제 크기 (처음 한 번 재고 나면 안다)
    let face: AnyView
    let detail: AnyView
    let onSize: (CGSize) -> Void
    var animatableData: CGFloat { get { progress } set { progress = newValue } }

    func body(content _: Content) -> some View {
        let p = max(0, min(1, progress))
        if natural == nil && p >= 0.999 {
            // 아직 크기를 재기 전에 다 펼친 채로 그릴 때(그림 저장 등): 제 크기 그대로
            return AnyView(detail.fixedSize()
                .background(GeometryReader { g in Color.clear.onAppear { onSize(g.size) }.onChange(of: g.size) { onSize($0) } })
                .liquidGlass(RoundedRectangle(cornerRadius: 26, style: .continuous)))
        }
        let to = CGRect(origin: .zero, size: natural ?? CGSize(width: MenuPanelView.detailWidth, height: 280))
        let a = from ?? to
        func mix(_ x: CGFloat, _ y: CGFloat) -> CGFloat { x + (y - x) * p }
        let r = CGRect(x: mix(a.minX, to.minX), y: mix(a.minY, to.minY), width: mix(a.width, to.width), height: mix(a.height, to.height))
        let shape = RoundedRectangle(cornerRadius: mix(a.height / 2, 26), style: .continuous)
        return AnyView(ZStack(alignment: .topLeading) {
            face
                .opacity(Double(max(0, 1 - p / 0.3)))
                .allowsHitTesting(false)
            detail
                .fixedSize()
                .background(GeometryReader { g in Color.clear.onAppear { onSize(g.size) }.onChange(of: g.size) { onSize($0) } })
                .opacity(Double(max(0, min(1, (p - 0.2) / 0.5))))
                .allowsHitTesting(p > 0.98)
        }
        .frame(width: max(1, r.width), height: max(1, r.height), alignment: .topLeading)
        .clipShape(shape)
        .liquidGlass(shape)
        .padding(EdgeInsets(top: r.minY, leading: r.minX, bottom: 0, trailing: 0)))
    }
}
