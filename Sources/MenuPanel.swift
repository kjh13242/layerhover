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
                        .background(RoundedRectangle(cornerRadius: 6)
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
        .background(RoundedRectangle(cornerRadius: 8).fill(LH.fill(0.07)))
    }
}

struct Keycap: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 10.5, weight: .medium, design: .rounded))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 4).frame(height: 16)
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
            .background(RoundedRectangle(cornerRadius: 8)
                .fill(prominent ? LH.accent.opacity(configuration.isPressed ? 0.8 : 1)
                                : LH.fill(configuration.isPressed ? 0.14 : hovering ? 0.09 : flat ? 0 : 0.06)))
            .onHover { hovering = $0 }
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
    @Published var shortcutsOn = true
    @Published var coverPanel = false
    @Published var coverNeedsPermission = false
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
        var toggleShortcuts: () -> Void = {}
        var toggleCover: () -> Void = {}
        var toggleWorkLog: () -> Void = {}
        var toggleLogin: () -> Void = {}
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

/// 메뉴 막대 패널: 자주 쓰는 것만 담고, 높이가 바뀌지 않는다 (펼치고 접는 부분이 없다).
/// 나머지 설정은 "설정…"(⌘,)으로 여는 창(SettingsWindow.swift)에 있다.
struct MenuPanelView: View {
    @ObservedObject var model: MenuModel
    @State private var hoveredMark: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if !model.trusted { permissionCard.padding(.top, 16) }
            quickActions.padding(.top, 16)
            divider
            menuBar
            divider
            footer
        }
        .padding(.horizontal, LH.pad).padding(.top, LH.pad).padding(.bottom, 12)
        .frame(width: LH.panelWidth)
        .fixedSize(horizontal: false, vertical: true)
    }

    private var divider: some View {
        Rectangle().fill(LH.fill(0.08)).frame(height: 1).padding(.vertical, 16)
    }

    // 머리: 지금 아이콘, 이름과 상태, 켜고 끄는 스위치
    private var header: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 12).fill(LH.fill(0.06)).frame(width: 44, height: 44)
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(LH.fill(0.05)))
                .overlay {
                    if model.trusted {
                        MarkImage(id: shownMark, playing: model.enabled && model.animateMark && model.motionBlocked == nil, size: 26,
                                  color: model.enabled ? .labelColor : .tertiaryLabelColor)
                    } else {
                        Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 18)).foregroundStyle(.orange)
                    }
                }
            VStack(alignment: .leading, spacing: 4) {
                Text("Layerhover").font(.system(size: 15, weight: .semibold))
                HStack(spacing: 4) {
                    Circle().fill(model.status.color).frame(width: 8, height: 8)
                    Text(model.status.text).font(.system(size: 11.5)).foregroundStyle(.secondary).lineLimit(1)
                }
                .accessibilityElement(children: .combine)
            }
            Spacer(minLength: 4)
            if model.trusted {
                LHToggle(isOn: model.enabled, label: L("Layerhover 동작", "Layerhover active"), large: true, action: model.actions.toggleEnabled)
                    .help(model.enabled ? L("일시 정지", "Pause") : L("다시 켜기", "Resume"))
            }
        }
    }

    private var permissionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(L("손쉬운 사용 권한을 켜 주세요", "Turn on Accessibility permission"))
                    .font(.system(size: 12.5, weight: .semibold))
                Text(L("Figma 패널을 대신 접고 펼치는 데만 써요.\n켜면 Layerhover가 스스로 다시 시작해요.",
                       "Used only to fold and reveal Figma's panels. Layerhover restarts itself once it's on."))
                    .font(.system(size: 11.5)).foregroundStyle(.secondary).lineSpacing(1.5).fixedSize(horizontal: false, vertical: true)
            }
            Button(action: model.actions.openAccessibility) {
                Text(L("손쉬운 사용 설정 열기", "Open Accessibility Settings"))
                    .font(.system(size: 12, weight: .semibold)).foregroundStyle(.white)
                    .frame(maxWidth: .infinity).frame(height: 32)
            }
            .buttonStyle(QuietButtonStyle(prominent: true))
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.orange.opacity(0.1)))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.orange.opacity(0.25)))
    }

    // 자주 하는 두 가지: 페이지로 이동, 작업 기록
    private var quickActions: some View {
        let canGo = model.trusted && model.figmaRunning
        return HStack(spacing: 8) {
            Button(action: model.actions.openPalette) {
                HStack(spacing: 8) {
                    Image(systemName: "doc.text.magnifyingglass").font(.system(size: 13)).frame(width: 16)
                    Text(L("페이지로 이동", "Go to Page")).font(.system(size: 12.5, weight: .medium)).lineLimit(1)
                    Spacer(minLength: 4)
                    Keycap(text: "⌃⌥P")
                }
                .padding(.horizontal, 12).frame(maxWidth: .infinity).frame(height: 36)
                .contentShape(Rectangle())
            }
            .buttonStyle(QuietButtonStyle())
            .disabled(!canGo)
            .opacity(canGo ? 1 : 0.45)
            .help(canGo ? L("이름으로 찾아 페이지를 옮겨요", "Find a page by name and jump to it") : L("Figma가 켜져 있을 때 쓸 수 있어요", "Available while Figma is open"))
            Button(action: model.actions.showSummary) {
                HStack(spacing: 8) {
                    Image(systemName: "chart.bar.xaxis").font(.system(size: 13)).frame(width: 16)
                    Text(L("작업 기록", "Activity")).font(.system(size: 12.5, weight: .medium)).lineLimit(1)
                }
                .padding(.horizontal, 12).frame(height: 36)
                .contentShape(Rectangle())
            }
            .buttonStyle(QuietButtonStyle())
            .help(L("이번 주 Figma 작업 시간을 봐요", "See this week's time in Figma"))
        }
    }

    /// 메뉴 막대에 지금 보이는 것: 날씨를 켰으면 날씨, 아니면 고른 아이콘
    private var shownMark: String { model.weatherMode > 0 ? MarkLibrary.weatherID : model.selectedMark }

    // 메뉴 막대 꾸미기: 아이콘 격자, 날씨는 격자 맨 아래의 긴 칸. (아이콘 움직이기는 설정 창 "일반"에 있다)
    // 제목은 두지 않는다: 지금 메뉴 막대에 있는 아이콘이 격자에서 하이라이트되어 있어 그것으로 충분하다.
    // 날씨를 켜면 격자의 선택이 풀리고, 아이콘을 누르면 날씨가 꺼진다.
    private var menuBar: some View {
        VStack(alignment: .leading, spacing: 0) {
            if model.marks.isEmpty {
                Text(L("아이콘을 불러오지 못했어요", "Couldn't load the icons"))
                    .font(.system(size: 11.5)).foregroundStyle(.secondary).frame(height: 80)
            } else {
                grid
            }
            weather.padding(.top, 8)
        }
    }

    private var grid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.fixed(36), spacing: 8), count: 7), alignment: .leading, spacing: 8) {
            ForEach(model.marks) { m in
                let selected = model.weatherMode == 0 && m.id == model.selectedMark
                let hovered = hoveredMark == m.id
                Button { model.actions.selectMark(m.id) } label: {
                    MarkImage(id: m.id, playing: hovered || model.motionBlocked == nil, size: 20,
                              color: selected ? NSColor(LH.accent) : .labelColor)
                        .frame(width: 36, height: 36)
                        .background(RoundedRectangle(cornerRadius: 8)
                            .fill(selected ? LH.accent.opacity(0.14) : LH.fill(hovered ? 0.1 : 0.05)))
                        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(selected ? LH.accent : .clear, lineWidth: 1.5))
                        .opacity(model.weatherMode > 0 && !hovered ? 0.5 : 1)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .onHover { inside in if inside { hoveredMark = m.id } else if hoveredMark == m.id { hoveredMark = nil } }
                .help(model.weatherMode > 0 ? L("\(m.name) · 고르면 날씨 대신 이 아이콘이 보여요", "\(m.name) · Choose to show it instead of the weather") : m.name)
                .accessibilityLabel(m.name)
                .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
            }
        }
    }

    // 날씨: 격자 맨 아래의 긴 칸 하나. 다른 아이콘처럼 누르면 고른 것이 되고(파란 테두리), 다른 아이콘을 누르면 풀린다.
    // 칸 왼쪽은 메뉴 막대에 보일 모습(☀ 또는 ☀ 4°), 오른쪽은 온도를 붙일지 정하는 스위치.
    // 아래 한 줄은 늘 자리를 지켜, 고르고 풀어도 패널 높이가 그대로다.
    private var weather: some View {
        let selected = model.weatherMode > 0
        let hovered = hoveredMark == MarkLibrary.weatherID
        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 0) {
                Button { model.actions.setWeatherMode(model.weatherShowTemp ? 2 : 1) } label: {
                    HStack(spacing: 4) {
                        MarkImage(id: MarkLibrary.weatherID, playing: hovered || model.motionBlocked == nil, size: 20,
                                  color: selected ? NSColor(LH.accent) : .labelColor)
                            .frame(width: 36, height: 36)       // 위 격자의 아이콘과 같은 자리
                        // 온도를 받았고 온도도 붙이면 "4°", 아니면 "날씨" (칸이 비어 보이지 않게)
                        if model.weatherShowTemp, let t = model.weatherTemp {
                            Text("\(t)°").font(.system(size: 13, weight: .medium).monospacedDigit())
                                .foregroundStyle(selected ? LH.accent : Color.primary)
                        } else {
                            Text(L("날씨", "Weather")).font(.system(size: 12.5))
                                .foregroundStyle(selected ? LH.accent : Color.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help(L("날씨 · 고르면 아이콘 대신 지금 위치의 날씨가 보여요", "Weather · Shows the weather here instead of an icon"))
                .accessibilityLabel(L("날씨", "Weather"))
                .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
                HStack(spacing: 4) {
                    Text(L("온도", "Temp")).font(.system(size: 11.5)).foregroundStyle(.secondary)
                    LHToggle(isOn: model.weatherShowTemp, label: L("온도 함께 보이기", "Show temperature"),
                             action: { model.actions.setWeatherTemp(!model.weatherShowTemp) })
                }
                .padding(.trailing, 8)
            }
            .frame(height: 36)
            .background(RoundedRectangle(cornerRadius: 8)
                .fill(selected ? LH.accent.opacity(0.14) : LH.fill(hovered ? 0.1 : 0.05)))
            .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(selected ? LH.accent : .clear, lineWidth: 1.5))
            .onHover { inside in if inside { hoveredMark = MarkLibrary.weatherID } else if hoveredMark == MarkLibrary.weatherID { hoveredMark = nil } }

            HStack(spacing: 8) {
                if !selected {
                    Text(L("날씨를 고르면 위치 권한을 한 번 물어요", "Choosing weather asks for location once"))
                } else {
                    Text(model.weatherStatus.isEmpty ? L("날씨를 받는 중…", "Getting the weather…") : model.weatherStatus)
                    if model.weatherDenied {
                        Button(action: model.actions.openLocationSettings) {
                            Text(L("위치 설정 열기", "Open Settings")).foregroundStyle(LH.accent)
                                .padding(.vertical, 8).contentShape(Rectangle())     // 글자보다 넓게 눌리도록
                        }
                        .buttonStyle(.plain)
                        .padding(.vertical, -8)
                    }
                }
            }
            .font(.system(size: 10.5)).foregroundStyle(.secondary).lineLimit(1)
            .frame(height: 16)
        }
    }

    // 아래: 설정 창 열기(⌘,)와 종료(⌘Q)
    private var footer: some View {
        HStack(spacing: 8) {
            Button(action: model.actions.showSettings) {
                HStack(spacing: 8) {
                    Image(systemName: "gearshape").font(.system(size: 13)).frame(width: 16)
                    Text(L("설정…", "Settings…")).font(.system(size: 12.5, weight: .medium))
                    Spacer(minLength: 4)
                    Keycap(text: "⌘,")
                }
                .padding(.horizontal, 12).frame(maxWidth: .infinity).frame(height: 32)
                .contentShape(Rectangle())
            }
            .buttonStyle(QuietButtonStyle(flat: true))
            .keyboardShortcut(",", modifiers: .command)
            .help(L("펼치는 속도, 페이지 버튼, 로그인 시 열기 등", "Reveal speed, page button, open at login and more"))
            if let v = model.updateVersion, !model.autoUpdate {
                Button(action: model.actions.installUpdate) {
                    Text(L("\(v) 업데이트", "Update to \(v)")).font(.system(size: 12, weight: .semibold)).foregroundStyle(LH.accent)
                        .padding(.horizontal, 12).frame(height: 32).contentShape(Rectangle())
                }
                .buttonStyle(QuietButtonStyle(flat: true))
                .help(L("받아서 바꿔 끼우고 다시 시작해요", "Downloads, replaces and restarts Layerhover"))
            }
            Button(action: model.actions.quit) {
                Text(L("종료", "Quit")).font(.system(size: 12.5)).foregroundStyle(.secondary)
                    .padding(.horizontal, 12).frame(height: 32)
                    .contentShape(Rectangle())
            }
            .buttonStyle(QuietButtonStyle(flat: true))
            .keyboardShortcut("q")
            .accessibilityLabel(L("Layerhover 종료", "Quit Layerhover"))
        }
        .padding(.horizontal, -8)      // 바탕 없는 버튼의 글자가 위 내용과 줄을 맞추도록
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
                    L("패널을 열지 않고 이름으로 찾아 이동해요.", "Find a page by name without opening the panel."), ["⌃⌥P"])
                tip("arrow.left.arrow.right", L("이전·다음 페이지", "Back and forward"),
                    L("방금 보던 페이지를 오가요.", "Hop between the pages you were just on."), ["⌃⌥←", "⌃⌥→"])
            }
            .padding(.top, 20)

            Rectangle().fill(LH.fill(0.08)).frame(height: 1).padding(.vertical, 16)

            HStack(spacing: 12) {
                LHToggle(isOn: model.launchAtLogin, label: L("로그인할 때 자동 실행", "Launch at login")) { model.setLaunchAtLogin(!model.launchAtLogin) }
                Text(L("로그인할 때 자동 실행", "Launch at login")).font(.system(size: 12.5))
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
    }

    private var permissionCard: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle().fill((model.trusted ? Color.green : Color.orange).opacity(0.16)).frame(width: 32, height: 32)
                Image(systemName: model.trusted ? "checkmark" : "hand.raised.fill")
                    .font(.system(size: 14, weight: .semibold)).foregroundStyle(model.trusted ? Color.green : Color.orange)
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
        .background(RoundedRectangle(cornerRadius: 12).fill((model.trusted ? Color.green : Color.orange).opacity(0.07)))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder((model.trusted ? Color.green : Color.orange).opacity(0.2)))
        .accessibilityElement(children: .contain)
    }

    private func tip(_ symbol: String, _ title: String, _ text: String, _ keys: [String]?) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol).font(.system(size: 14, weight: .medium)).foregroundStyle(LH.accent)
                .frame(width: 32, height: 32)
                .background(RoundedRectangle(cornerRadius: 8).fill(LH.accent.opacity(0.1)))
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(title).font(.system(size: 13, weight: .semibold))
                    if let keys { ForEach(keys, id: \.self) { Keycap(text: $0) } }
                }
                Text(text).font(.system(size: 12)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
    }
}
