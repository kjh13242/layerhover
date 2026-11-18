// 메뉴 막대 아이콘을 눌렀을 때 뜨는 패널과, 처음 켰을 때 뜨는 환영 창.
// 둘 다 같은 부품(스위치, 선택 막대, 줄)을 쓴다. 부품은 직접 그린다:
//  - 메뉴 막대 패널 안에서 기본 컨트롤보다 작고 조용해야 하고,
//  - 화면 없이 그림으로 저장해(--render-menu, --render-welcome) 확인할 수 있어야 하기 때문이다.

import AppKit
import SwiftUI

enum LH {
    static let accent = Color(red: 0.05, green: 0.6, blue: 1.0)          // Figma 선택 파랑 #0D99FF
    static let panelWidth: CGFloat = 328
    static let pad: CGFloat = 20
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
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Capsule()
                .fill(isOn ? LH.accent : LH.fill(0.18))
                .frame(width: 30, height: 18)
                .overlay(alignment: isOn ? .trailing : .leading) {
                    Circle().fill(Color.white).frame(width: 14, height: 14).padding(2)
                        .shadow(color: .black.opacity(0.2), radius: 1, y: 0.5)
                }
                .animation(.easeOut(duration: 0.15), value: isOn)
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
    let action: (Int) -> Void

    var body: some View {
        HStack(spacing: 2) {
            ForEach(options.indices, id: \.self) { i in
                Button { action(i) } label: {
                    Text(options[i])
                        .font(.system(size: 11, weight: selection == i ? .semibold : .regular))
                        .foregroundStyle(selection == i ? Color.primary : Color.secondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 20)
                        .background(RoundedRectangle(cornerRadius: 5)
                            .fill(selection == i ? LH.segmentSelected : Color.clear)
                            .shadow(color: .black.opacity(selection == i ? 0.14 : 0), radius: 1, y: 0.5))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(label): \(options[i])")
                .accessibilityAddTraits(selection == i ? [.isButton, .isSelected] : .isButton)
            }
        }
        .padding(2)
        .background(RoundedRectangle(cornerRadius: 7).fill(LH.fill(0.07)))
    }
}

struct Keycap: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 10.5, weight: .medium, design: .rounded))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 5).frame(height: 17)
            .background(RoundedRectangle(cornerRadius: 4).fill(LH.fill(0.07)))
            .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(LH.fill(0.08)))
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
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.system(size: 12.5)).fixedSize(horizontal: false, vertical: true)
                if let note { Text(note).font(.system(size: 10.5)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true) }
            }
            Spacer(minLength: 8)
            LHToggle(isOn: isOn, label: title, action: action)
        }
        .frame(minHeight: 24)
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
    @State private var hovering = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(RoundedRectangle(cornerRadius: 8)
                .fill(prominent ? LH.accent.opacity(configuration.isPressed ? 0.8 : 1)
                                : LH.fill(configuration.isPressed ? 0.14 : hovering ? 0.1 : 0.06)))
            .onHover { hovering = $0 }
    }
}

// MARK: - 메뉴 패널

final class MenuModel: ObservableObject {
    @Published var trusted = true
    @Published var enabled = true
    @Published var figmaRunning = true
    @Published var version = ""
    @Published var marks: [MarkInfo] = []
    @Published var selectedMark = MarkLibrary.defaultID
    @Published var animateMark = true
    @Published var weatherOn = false
    @Published var weatherStatus = ""
    @Published var weatherDenied = false
    @Published var weatherTemp = true
    @Published var motionBlocked: String? = nil       // 움직임이 켜져 있어도 멈춰 있는 이유 (동작 줄이기, 저전력)
    @Published var reveal: Int? = 1
    @Published var collapse: Int? = 1
    @Published var rightEdge = false
    @Published var minimizeByDefault = true
    @Published var showChip = true
    @Published var shortcutsOn = true
    @Published var coverPanel = false
    @Published var coverNeedsPermission = false
    @Published var workLog = true
    @Published var launchAtLogin = false
    @Published var settingsOpen = false

    struct Actions {
        var toggleEnabled: () -> Void = {}
        var openAccessibility: () -> Void = {}
        var openPalette: () -> Void = {}
        var showSummary: () -> Void = {}
        var selectMark: (String) -> Void = { _ in }
        var toggleAnimate: () -> Void = {}
        var setWeatherTemp: (Bool) -> Void = { _ in }
        var openLocationSettings: () -> Void = {}
        var setReveal: (Int) -> Void = { _ in }
        var setCollapse: (Int) -> Void = { _ in }
        var toggleRightEdge: () -> Void = {}
        var toggleMinimize: () -> Void = {}
        var toggleChip: () -> Void = {}
        var toggleShortcuts: () -> Void = {}
        var toggleCover: () -> Void = {}
        var toggleWorkLog: () -> Void = {}
        var toggleLogin: () -> Void = {}
        var connectClaude: () -> Void = {}
        var showGuide: () -> Void = {}
        var showLog: () -> Void = {}
        var quit: () -> Void = {}
        var setSettingsOpen: (Bool) -> Void = { _ in }
    }
    var actions = Actions()

    var status: (text: String, color: Color) {
        if !trusted { return (L("손쉬운 사용 권한이 필요해요", "Accessibility permission needed"), .orange) }
        if !enabled { return (L("일시 정지됨", "Paused"), .gray) }
        if !figmaRunning { return (L("Figma를 기다리는 중", "Waiting for Figma"), .yellow) }
        return (L("동작 중", "Running"), .green)
    }
}

struct MenuPanelView: View {
    @ObservedObject var model: MenuModel
    @State private var hoveredMark: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if !model.trusted { permissionCard.padding(.top, 14) }
            quickActions.padding(.top, 14)
            divider
            iconPicker
            divider
            settingsToggle
            if model.settingsOpen { settings.padding(.top, 12) }
            divider
            footer
        }
        .padding(LH.pad)
        .frame(width: LH.panelWidth)
    }

    private var divider: some View {
        Rectangle().fill(LH.fill(0.08)).frame(height: 1).padding(.vertical, 14)
    }

    // 머리: 지금 아이콘, 이름과 상태, 켜고 끄는 스위치
    private var header: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10).fill(LH.fill(0.06)).frame(width: 44, height: 44)
                .overlay {
                    if model.trusted {
                        MarkImage(id: model.selectedMark, playing: model.enabled && model.animateMark && model.motionBlocked == nil, size: 27,
                                  color: model.enabled ? .labelColor : .tertiaryLabelColor)
                    } else {
                        Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 18)).foregroundStyle(.orange)
                    }
                }
            VStack(alignment: .leading, spacing: 3) {
                Text("Layerhover").font(.system(size: 15, weight: .semibold))
                HStack(spacing: 5) {
                    Circle().fill(model.status.color).frame(width: 7, height: 7)
                    Text(model.status.text).font(.system(size: 11.5)).foregroundStyle(.secondary).lineLimit(1)
                }
                .accessibilityElement(children: .combine)
            }
            Spacer(minLength: 4)
            if model.trusted {
                LHToggle(isOn: model.enabled, label: L("Layerhover 동작", "Layerhover active"), action: model.actions.toggleEnabled)
                    .help(model.enabled ? L("일시 정지", "Pause") : L("다시 켜기", "Resume"))
            }
        }
    }

    private var permissionCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L("Figma의 접기·펼치기 버튼을 대신 누르려면 손쉬운 사용 권한이 필요해요. 켜면 Layerhover가 스스로 다시 시작해요.",
                   "Layerhover needs Accessibility permission to press Figma's minimize and expand buttons. It restarts itself once you turn it on."))
                .font(.system(size: 11.5)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            Button(action: model.actions.openAccessibility) {
                Text(L("손쉬운 사용 설정 열기", "Open Accessibility Settings"))
                    .font(.system(size: 12, weight: .semibold)).foregroundStyle(.white)
                    .frame(maxWidth: .infinity).frame(height: 28)
            }
            .buttonStyle(QuietButtonStyle(prominent: true))
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 10).fill(Color.orange.opacity(0.1)))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Color.orange.opacity(0.25)))
    }

    private var quickActions: some View {
        HStack(spacing: 8) {
            Button(action: model.actions.openPalette) {
                HStack(spacing: 6) {
                    Image(systemName: "doc.text.magnifyingglass").font(.system(size: 12))
                    Text(L("페이지로 이동", "Go to Page")).font(.system(size: 12, weight: .medium))
                    Spacer(minLength: 0)
                    Keycap(text: "⌃⌥P")
                }
                .padding(.horizontal, 10).frame(maxWidth: .infinity).frame(height: 32)
            }
            .buttonStyle(QuietButtonStyle())
            .disabled(!model.trusted || !model.figmaRunning)
            .opacity(model.trusted && model.figmaRunning ? 1 : 0.45)
            Button(action: model.actions.showSummary) {
                HStack(spacing: 6) {
                    Image(systemName: "chart.bar.xaxis").font(.system(size: 12))
                    Text(L("이번 주 작업", "This Week")).font(.system(size: 12, weight: .medium))
                }
                .padding(.horizontal, 10).frame(height: 32)
            }
            .buttonStyle(QuietButtonStyle())
        }
    }

    // 아이콘 고르기: 7칸 격자. 마우스를 올리면 그 아이콘이 움직이고 이름이 아래에 나온다.
    private var iconPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                SectionTitle(text: L("메뉴 막대 아이콘", "Menu Bar Icon"))
                Spacer()
                Text(model.marks.first { $0.id == (hoveredMark ?? model.selectedMark) }?.name ?? "")
                    .font(.system(size: 11)).foregroundStyle(hoveredMark == nil ? .secondary : .primary)
            }
            if model.marks.isEmpty {
                Text(L("아이콘을 불러오지 못했어요", "Couldn't load the icons"))
                    .font(.system(size: 11.5)).foregroundStyle(.secondary)
            } else {
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(36), spacing: 6), count: 7), alignment: .leading, spacing: 6) {
                    ForEach(model.marks) { m in
                        let selected = m.id == model.selectedMark
                        Button { model.actions.selectMark(m.id) } label: {
                            MarkImage(id: m.id, playing: hoveredMark == m.id, size: 20,
                                      color: selected ? NSColor(LH.accent) : .labelColor)
                                .frame(width: 36, height: 36)
                                .background(RoundedRectangle(cornerRadius: 8)
                                    .fill(selected ? LH.accent.opacity(0.14) : LH.fill(hoveredMark == m.id ? 0.1 : 0.05)))
                                .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(selected ? LH.accent : .clear, lineWidth: 1.5))
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .onHover { inside in if inside { hoveredMark = m.id } else if hoveredMark == m.id { hoveredMark = nil } }
                        .accessibilityLabel(m.name)
                        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
                    }
                }
            }
            if model.weatherOn { weatherOptions }
            ToggleRow(title: L("아이콘 움직임", "Animate icon"), note: model.animateMark ? model.motionBlocked : nil,
                      isOn: model.animateMark, action: model.actions.toggleAnimate)
        }
    }

    // 날씨 아이콘을 골랐을 때만: 보이는 방식, 지금 상태, 권한 안내
    private var weatherOptions: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 12) {
                Text(L("날씨 표시", "Weather")).font(.system(size: 12.5))
                Spacer(minLength: 8)
                LHSegmented(options: [L("아이콘만", "Icon"), L("온도와 함께", "With temp")], selection: model.weatherTemp ? 1 : 0,
                            label: L("날씨 표시", "Weather"), action: { model.actions.setWeatherTemp($0 == 1) }).frame(width: 168)
            }
            HStack(spacing: 6) {
                Text(model.weatherStatus).font(.system(size: 10.5)).foregroundStyle(.secondary)
                if model.weatherDenied {
                    Button(L("시스템 설정 열기", "Open Settings"), action: model.actions.openLocationSettings)
                        .buttonStyle(.link).font(.system(size: 10.5))
                }
            }
        }
    }

    private var settingsToggle: some View {
        Button { model.actions.setSettingsOpen(!model.settingsOpen) } label: {
            HStack {
                SectionTitle(text: L("설정", "Settings"))
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold)).foregroundStyle(.secondary)
                    .rotationEffect(.degrees(model.settingsOpen ? 90 : 0))
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(L("설정", "Settings"))
        .accessibilityValue(model.settingsOpen ? L("펼침", "Expanded") : L("접힘", "Collapsed"))
    }

    private var settings: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                Text(L("패널 꺼내기", "Panel reveal")).font(.system(size: 11)).foregroundStyle(.tertiary)
                speedRow(L("펼치는 속도", "Reveal"), [L("바로", "Instant"), L("빠르게", "Quick"), L("천천히", "Slow")], model.reveal, model.actions.setReveal)
                speedRow(L("접히는 속도", "Fold away"), [L("바로", "Instant"), L("빠르게", "Quick"), L("여유 있게", "Relaxed")], model.collapse, model.actions.setCollapse)
                ToggleRow(title: L("오른쪽 끝에서도 펼치기", "Also reveal at right edge"), isOn: model.rightEdge, action: model.actions.toggleRightEdge)
                ToggleRow(title: L("새 파일을 최소화 모드로 맞추기", "Minimize UI in new files"), isOn: model.minimizeByDefault, action: model.actions.toggleMinimize)
            }
            VStack(alignment: .leading, spacing: 8) {
                Text(L("페이지 바로가기", "Pages")).font(.system(size: 11)).foregroundStyle(.tertiary)
                ToggleRow(title: L("왼쪽 아래 페이지 버튼", "Page button at bottom left"), isOn: model.showChip, action: model.actions.toggleChip)
                ToggleRow(title: L("단축키", "Shortcuts"), note: "⌃⌥P · ⌃⌥← · ⌃⌥→", isOn: model.shortcutsOn, action: model.actions.toggleShortcuts)
                ToggleRow(title: L("이동할 때 패널 가리기", "Hide panel while switching"),
                          note: model.coverNeedsPermission ? L("화면 기록 권한이 필요해요", "Needs Screen Recording permission") : nil,
                          isOn: model.coverPanel && !model.coverNeedsPermission, action: model.actions.toggleCover)
            }
            VStack(alignment: .leading, spacing: 8) {
                Text(L("그 밖에", "More")).font(.system(size: 11)).foregroundStyle(.tertiary)
                ToggleRow(title: L("작업 기록 남기기", "Record activity"), note: L("이 Mac에만 저장해요", "Stored only on this Mac"),
                          isOn: model.workLog, action: model.actions.toggleWorkLog)
                ToggleRow(title: L("로그인할 때 자동 실행", "Launch at login"), isOn: model.launchAtLogin, action: model.actions.toggleLogin)
                Button(action: model.actions.connectClaude) {
                    HStack {
                        Text(L("Claude Code와 연결하기…", "Connect Claude Code…")).font(.system(size: 12.5))
                        Spacer()
                        Image(systemName: "arrow.up.right").font(.system(size: 10, weight: .semibold)).foregroundStyle(.secondary)
                    }
                    .frame(minHeight: 24).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func speedRow(_ title: String, _ options: [String], _ selection: Int?, _ action: @escaping (Int) -> Void) -> some View {
        HStack(spacing: 12) {
            Text(title).font(.system(size: 12.5))
            Spacer(minLength: 8)
            LHSegmented(options: options, selection: selection, label: title, action: action).frame(width: 168)
        }
    }

    private var footer: some View {
        HStack(spacing: 14) {
            footerLink(L("사용법", "How it works"), model.actions.showGuide)
            footerLink(L("문제 기록", "Log"), model.actions.showLog)
            Spacer()
            Text(model.version).font(.system(size: 11)).foregroundStyle(.tertiary).monospacedDigit()
            Button(action: model.actions.quit) {
                Text(L("종료", "Quit")).font(.system(size: 11.5, weight: .medium)).padding(.horizontal, 10).frame(height: 24)
            }
            .buttonStyle(QuietButtonStyle())
            .keyboardShortcut("q")
            .accessibilityLabel(L("Layerhover 종료", "Quit Layerhover"))
        }
    }

    private func footerLink(_ title: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) { Text(title).font(.system(size: 11.5)).foregroundStyle(.secondary) }
            .buttonStyle(.plain)
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

            permissionCard.padding(.top, 18)

            VStack(alignment: .leading, spacing: 12) {
                tip("cursorarrow.motionlines", L("레이어 꺼내기", "Reveal layers"),
                    L("마우스를 화면 왼쪽 끝에 대면 펼쳐지고, 패널을 벗어나면 접혀요.", "Push the pointer against the left edge. Move off the panel and it folds away."), nil)
                tip("doc.text.magnifyingglass", L("페이지로 바로 이동", "Jump to a page"),
                    L("패널을 열지 않고 이름으로 찾아 이동해요.", "Find a page by name without opening the panel."), ["⌃⌥P"])
                tip("arrow.left.arrow.right", L("이전·다음 페이지", "Back and forward"),
                    L("방금 보던 페이지를 오가요.", "Hop between the pages you were just on."), ["⌃⌥←", "⌃⌥→"])
            }
            .padding(.top, 20)

            Rectangle().fill(LH.fill(0.08)).frame(height: 1).padding(.vertical, 18)

            HStack(spacing: 12) {
                LHToggle(isOn: model.launchAtLogin, label: L("로그인할 때 자동 실행", "Launch at login")) { model.setLaunchAtLogin(!model.launchAtLogin) }
                Text(L("로그인할 때 자동 실행", "Launch at login")).font(.system(size: 12.5))
                Spacer()
                Button(action: close) {
                    Text(model.trusted ? L("시작하기", "Get Started") : L("닫기", "Close"))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(model.trusted ? Color.white : Color.primary)
                        .padding(.horizontal, 18).frame(height: 30)
                }
                .buttonStyle(QuietButtonStyle(prominent: model.trusted))
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding(24)
        .frame(width: 480)
    }

    private var permissionCard: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle().fill((model.trusted ? Color.green : Color.orange).opacity(0.16)).frame(width: 32, height: 32)
                Image(systemName: model.trusted ? "checkmark" : "hand.raised.fill")
                    .font(.system(size: 14, weight: .semibold)).foregroundStyle(model.trusted ? Color.green : Color.orange)
            }
            VStack(alignment: .leading, spacing: 3) {
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
                            .padding(.horizontal, 14).frame(height: 28)
                    }
                    .buttonStyle(QuietButtonStyle(prominent: true))
                    .padding(.top, 6)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 12).fill((model.trusted ? Color.green : Color.orange).opacity(0.07)))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder((model.trusted ? Color.green : Color.orange).opacity(0.2)))
        .accessibilityElement(children: .contain)
    }

    private func tip(_ symbol: String, _ title: String, _ text: String, _ keys: [String]?) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol).font(.system(size: 14, weight: .medium)).foregroundStyle(LH.accent)
                .frame(width: 32, height: 32)
                .background(RoundedRectangle(cornerRadius: 8).fill(LH.accent.opacity(0.1)))
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(title).font(.system(size: 13, weight: .semibold))
                    if let keys { ForEach(keys, id: \.self) { Keycap(text: $0) } }
                }
                Text(text).font(.system(size: 12)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
    }
}
