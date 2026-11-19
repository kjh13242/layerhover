// 설정 창: 메뉴 막대 패널의 "설정…"(⌘,)으로 연다.
// 시스템 설정처럼 왼쪽에 칸 목록, 오른쪽에 그 칸의 설정 묶음. 모든 줄은 무엇이 달라지는지 한 줄로 알려 준다.
// 값과 동작은 메뉴 패널과 같은 MenuModel 을 쓴다 (main.swift 의 syncMenuModel, wireMenuActions).

import AppKit
import SwiftUI

extension SettingsPane {
    var title: String {
        switch self {
        case .reveal: return L("패널 펼치기", "Edge Reveal")
        case .pages: return L("페이지 이동", "Pages")
        case .general: return L("일반", "General")
        case .about: return L("정보", "About")
        }
    }
    var subtitle: String {
        switch self {
        case .reveal: return L("Figma 화면 끝에 마우스를 대면 접어 둔 패널이 나와요.", "Push the pointer against Figma's edge to bring hidden panels out.")
        case .pages: return L("패널을 열지 않고도 페이지를 찾고 오가요.", "Find and switch pages without opening the panel.")
        case .general: return L("시작, 메뉴 막대, 작업 기록, Claude 연결을 정해요.", "Startup, menu bar, activity log and Claude.")
        case .about: return L("버전과 업데이트, 권한, 사용법과 진단 기록.", "Version, updates, permissions, help and diagnostics.")
        }
    }
    var symbol: String {
        switch self {
        case .reveal: return "sidebar.left"
        case .pages: return "doc.text.magnifyingglass"
        case .general: return "gearshape.fill"
        case .about: return "info"
        }
    }
    var tint: Color {
        switch self {
        case .reveal: return LH.accent
        case .pages: return Color(red: 1.0, green: 0.58, blue: 0.0)
        case .general: return Color(white: 0.55)
        case .about: return Color(red: 0.45, green: 0.42, blue: 0.95)
        }
    }
}

enum SettingsStyle {
    static let size = CGSize(width: 700, height: 500)
    static let sidebarWidth: CGFloat = 200
    static func dynamic(light: NSColor, dark: NSColor) -> Color {
        Color(nsColor: NSColor(name: nil) { a in a.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark : light })
    }
    /// 설정 묶음의 바탕: 밝은 테마에선 창보다 밝게, 어두운 테마에선 살짝 떠 보이게
    static let card = dynamic(light: NSColor(white: 1, alpha: 0.7), dark: NSColor(white: 1, alpha: 0.05))
    static let cardBorder = dynamic(light: NSColor(white: 0, alpha: 0.07), dark: NSColor(white: 1, alpha: 0.07))
    static let detail = dynamic(light: NSColor(white: 0.955, alpha: 1), dark: NSColor(white: 0.155, alpha: 1))
    static let separator = dynamic(light: NSColor(white: 0, alpha: 0.1), dark: NSColor(white: 0, alpha: 0.6))
    static let sidebar = dynamic(light: NSColor(white: 0.905, alpha: 1), dark: NSColor(white: 0.2, alpha: 1))
}

// MARK: - 부품

/// 시스템 설정의 칸 아이콘: 색 있는 둥근 네모 안의 흰 기호
struct PaneIcon: View {
    let pane: SettingsPane
    var size: CGFloat = 20
    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.25, style: .continuous)
            .fill(LinearGradient(colors: [pane.tint.opacity(0.85), pane.tint], startPoint: .top, endPoint: .bottom))
            .frame(width: size, height: size)
            .overlay(Image(systemName: pane.symbol).font(.system(size: size * 0.52, weight: .semibold)).foregroundStyle(.white))
            .accessibilityHidden(true)
    }
}

/// 설정 묶음: 작은 제목, 둥근 바탕 안의 줄들, (있으면) 아래 설명
struct SettingsCard<Content: View>: View {
    var title: String? = nil
    var footnote: String? = nil
    @ViewBuilder let content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title {
                Text(title).font(.system(size: 12, weight: .semibold)).foregroundStyle(.secondary)
                    .padding(.horizontal, 4).accessibilityAddTraits(.isHeader)
            }
            VStack(alignment: .leading, spacing: 0) { content }
                .padding(.horizontal, 16)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(SettingsStyle.card))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(SettingsStyle.cardBorder))
            if let footnote {
                Text(footnote).font(.system(size: 11)).foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true).padding(.horizontal, 4).padding(.top, 4)
            }
        }
    }
}

struct CardDivider: View {
    var body: some View { Rectangle().fill(SettingsStyle.cardBorder).frame(height: 1) }
}

/// 설정 한 줄: 왼쪽에 이름과 하는 일, 오른쪽에 조절하는 것
struct SettingRow<Trailing: View>: View {
    let title: String
    var note: String? = nil
    var warning: String? = nil
    @ViewBuilder let trailing: Trailing
    var body: some View {
        HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(size: 13)).fixedSize(horizontal: false, vertical: true)
                if let note {
                    Text(note).font(.system(size: 11)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                }
                if let warning {
                    Label(warning, systemImage: "exclamationmark.triangle.fill")
                        .font(.system(size: 11)).foregroundStyle(.orange).fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            trailing
        }
        .frame(minHeight: 32)
        .padding(.vertical, 8)
        .accessibilityElement(children: .contain)
    }
}

/// 시스템 설정과 같은 작은 스위치
struct SettingSwitch: View {
    let isOn: Bool
    let label: String
    let action: () -> Void
    var body: some View {
        Toggle(label, isOn: Binding(get: { isOn }, set: { _ in action() }))
            .toggleStyle(.switch).controlSize(.small).labelsHidden()
            .frame(minWidth: 40, minHeight: 28, alignment: .trailing)
    }
}

struct SettingSegments: View {
    let options: [String]
    let selection: Int?
    let label: String
    let action: (Int) -> Void
    var body: some View {
        LHSegmented(options: options, selection: selection, label: label, height: 24, fontSize: 12, action: action)
        .frame(width: 216)
    }
}

// MARK: - 창 내용

struct SettingsView: View {
    @ObservedObject var model: MenuModel
    var close: () -> Void = {}
    /// PNG로 그릴 때(--render-menu --settings): 창 테두리 대신 신호등 단추와 단색 옆줄을 직접 그린다
    var rendering = false
    /// 창이 뒤로 가면 시스템 설정처럼 고른 칸이 회색으로 바뀐다
    @Environment(\.controlActiveState) private var activeState

    var body: some View {
        HStack(spacing: 0) {
            sidebar
            Rectangle().fill(SettingsStyle.separator).frame(width: 1)
            detail
        }
        .frame(width: SettingsStyle.size.width, height: SettingsStyle.size.height)
        .ignoresSafeArea()          // 투명 제목 막대 밑까지 채운다 (안 하면 28pt 밀려 내려가 아래가 잘린다)
        .background(hiddenShortcuts)
    }

    /// 메뉴가 없는 메뉴 막대 앱이라 ⌘W 를 직접 받는다
    private var hiddenShortcuts: some View {
        Button("", action: close).keyboardShortcut("w").opacity(0).allowsHitTesting(false).accessibilityHidden(true)
    }

    // MARK: 옆줄

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 4) {
            if rendering {
                HStack(spacing: 8) {
                    ForEach([Color(red: 1, green: 0.37, blue: 0.34), Color(red: 1, green: 0.74, blue: 0.18), Color(red: 0.16, green: 0.79, blue: 0.25)], id: \.self) {
                        Circle().fill($0).frame(width: 12, height: 12)
                    }
                }
                .padding(.leading, 8).frame(height: 52)
            } else {
                Color.clear.frame(height: 52)        // 창의 신호등 단추 자리
            }
            ForEach(SettingsPane.allCases) { pane in sidebarRow(pane) }
            Spacer()
            HStack(spacing: 8) {
                Circle().fill(model.status.color).frame(width: 8, height: 8)
                Text(model.status.text).lineLimit(1)
            }
            .font(.system(size: 11)).foregroundStyle(.secondary)
            .padding(.horizontal, 12).padding(.bottom, 16)
        }
        .padding(.horizontal, 12)
        .frame(width: SettingsStyle.sidebarWidth)
        .frame(maxHeight: .infinity)
        .background {
            if rendering { SettingsStyle.sidebar } else { VisualEffect(material: .sidebar) }
        }
    }

    private func sidebarRow(_ pane: SettingsPane) -> some View {
        let selected = model.settingsPane == pane
        let active = rendering || activeState == .key || activeState == .active
        return Button { model.settingsPane = pane } label: {
            HStack(spacing: 8) {
                PaneIcon(pane: pane)
                Text(pane.title).font(.system(size: 13)).lineLimit(1)
                    .foregroundStyle(selected && active ? Color.white : Color.primary)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 8).frame(height: 32)
            .background(RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(selected ? (active ? Color.accentColor : LH.fill(0.1)) : .clear))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(pane.title)
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }

    // MARK: 오른쪽

    private var detail: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                PaneIcon(pane: model.settingsPane, size: 36)
                VStack(alignment: .leading, spacing: 4) {
                    Text(model.settingsPane.title).font(.system(size: 17, weight: .bold))
                    Text(model.settingsPane.subtitle).font(.system(size: 12)).foregroundStyle(.secondary).lineLimit(1)
                }
            }
            .padding(.horizontal, 28).padding(.top, 32).padding(.bottom, 20)
            ScrollView {
                VStack(alignment: .leading, spacing: 24) { pane }
                    .padding(.horizontal, 28).padding(.bottom, 28)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(SettingsStyle.detail)
    }

    @ViewBuilder private var pane: some View {
        switch model.settingsPane {
        case .reveal: revealPane
        case .pages: pagesPane
        case .general: generalPane
        case .about: aboutPane
        }
    }

    private var speeds: [String] { [L("바로", "Instant"), L("보통", "Normal"), L("느긋하게", "Relaxed")] }

    private var revealPane: some View {
        Group {
            SettingsCard(title: L("속도", "Speed"),
                         footnote: L("느긋하게 두면 마우스가 화면 끝을 스치기만 할 때는 펼쳐지지 않아요.",
                                     "Relaxed keeps panels shut when the pointer only brushes past the edge.")) {
                SettingRow(title: L("펼칠 때", "Reveal"),
                           note: [L("화면 끝에 닿자마자 펼쳐요", "Opens the moment the pointer touches the edge"),
                                  L("끝에 0.06초 머물면 펼쳐요", "Opens after 0.06 s at the edge"),
                                  L("끝에 0.3초 머물면 펼쳐요", "Opens after 0.3 s at the edge")][model.reveal ?? 1]) {
                    SettingSegments(options: speeds, selection: model.reveal, label: L("펼칠 때", "Reveal"), action: model.actions.setReveal)
                }
                CardDivider()
                SettingRow(title: L("접을 때", "Fold away"),
                           note: [L("패널을 벗어나는 즉시 접어요", "Folds as soon as the pointer leaves"),
                                  L("벗어나고 0.12초 뒤 접어요", "Folds 0.12 s after the pointer leaves"),
                                  L("벗어나고 0.4초 뒤 접어요", "Folds 0.4 s after the pointer leaves")][model.collapse ?? 1]) {
                    SettingSegments(options: speeds, selection: model.collapse, label: L("접을 때", "Fold away"), action: model.actions.setCollapse)
                }
            }
            SettingsCard(title: L("펼치는 곳", "Where")) {
                SettingRow(title: L("오른쪽 끝에서도 펼치기", "Right edge too"),
                           note: L("화면 오른쪽 끝에 대면 속성 패널도 나와요", "The right edge brings out the properties panel")) {
                    SettingSwitch(isOn: model.rightEdge, label: L("오른쪽 끝에서도 펼치기", "Right edge too"), action: model.actions.toggleRightEdge)
                }
                CardDivider()
                SettingRow(title: L("새 파일은 패널을 접고 시작", "Start new files minimized"),
                           note: L("처음 여는 파일을 최소화 모드(⇧⌘\\)로 열어요", "Files you open for the first time start in Minimize UI (⇧⌘\\)")) {
                    SettingSwitch(isOn: model.minimizeByDefault, label: L("새 파일은 패널을 접고 시작", "Start new files minimized"), action: model.actions.toggleMinimize)
                }
            }
        }
    }

    private var pagesPane: some View {
        Group {
            SettingsCard(title: L("찾기와 이동", "Find and switch")) {
                SettingRow(title: L("페이지 버튼", "Page button"),
                           note: L("Figma 왼쪽 아래에 지금 페이지 이름과 ‹ › 버튼을 띄워요", "Shows the current page and ‹ › at Figma's bottom left")) {
                    SettingSwitch(isOn: model.showChip, label: L("페이지 버튼", "Page button"), action: model.actions.toggleChip)
                }
                CardDivider()
                SettingRow(title: L("단축키", "Keyboard shortcuts"),
                           note: L("⌃⌥P 로 페이지를 찾고, ⌃⌥← → 로 이전·다음 페이지를 오가요", "⌃⌥P finds a page; ⌃⌥← → go back and forward")) {
                    SettingSwitch(isOn: model.shortcutsOn, label: L("단축키", "Keyboard shortcuts"), action: model.actions.toggleShortcuts)
                }
            }
            SettingsCard(title: L("화면", "Display"),
                         footnote: L("이동하기 직전의 Figma 화면을 잠깐 덮어 두는 방식이라 화면 기록 권한이 필요해요.",
                                     "Briefly covers Figma with a snapshot taken just before the switch, so it needs Screen Recording permission.")) {
                SettingRow(title: L("이동할 때 깜빡임 가리기", "Hide the flicker when switching"),
                           note: L("페이지를 옮길 때 패널이 잠깐 펼쳐지는 모습을 덮어요", "Hides the panel that briefly opens while switching pages"),
                           warning: model.coverNeedsPermission ? L("화면 기록 권한을 켠 뒤 Layerhover를 다시 열어 주세요", "Turn on Screen Recording, then reopen Layerhover") : nil) {
                    SettingSwitch(isOn: model.coverPanel && !model.coverNeedsPermission, label: L("이동할 때 깜빡임 가리기", "Hide the flicker when switching"),
                                  action: model.actions.toggleCover)
                }
            }
        }
    }

    private var generalPane: some View {
        Group {
            SettingsCard(title: L("시작", "Startup")) {
                SettingRow(title: L("로그인할 때 열기", "Open at login"),
                           note: L("Mac에 로그인하면 메뉴 막대에 자동으로 떠요", "Starts in the menu bar when you log in")) {
                    SettingSwitch(isOn: model.launchAtLogin, label: L("로그인할 때 열기", "Open at login"), action: model.actions.toggleLogin)
                }
            }
            SettingsCard(title: L("메뉴 막대", "Menu Bar")) {
                SettingRow(title: L("아이콘 움직이기", "Animate icon"),
                           note: model.motionBlocked ?? L("끄면 메뉴 막대 아이콘이 멈춘 그림으로 보여요", "Turn off to keep the menu bar icon still")) {
                    SettingSwitch(isOn: model.animateMark, label: L("아이콘 움직이기", "Animate icon"), action: model.actions.toggleAnimate)
                }
            }
            SettingsCard(title: L("작업 기록", "Activity")) {
                SettingRow(title: L("작업 시간 기록하기", "Record time in Figma"),
                           note: L("파일별 작업 시간을 이 Mac에만 저장해요", "Keeps time per file on this Mac only")) {
                    SettingSwitch(isOn: model.workLog, label: L("작업 시간 기록하기", "Record time in Figma"), action: model.actions.toggleWorkLog)
                }
                CardDivider()
                SettingRow(title: L("이번 주 작업 기록", "This week's activity"),
                           note: L("요일·파일별로 모아 보고 내보낼 수 있어요", "By day and by file, with export")) {
                    Button(L("열기…", "Open…"), action: model.actions.showSummary).controlSize(.regular)
                }
            }
            SettingsCard(title: "Claude",
                         footnote: L("~/.claude/settings.json 에 붙여 넣을 내용만 복사해요. 파일은 고치지 않아요.",
                                     "Copies what to paste into Claude Code's ~/.claude/settings.json. Layerhover never edits the file itself.")) {
                SettingRow(title: L("Claude 작업 상태 보기", "Show Claude activity"),
                           note: L("Claude가 Figma를 고치는 동안 페이지 버튼에 ✦ 가 떠요", "The page button shows ✦ while Claude edits Figma")) {
                    Button(L("설정 복사…", "Copy Settings…"), action: model.actions.connectClaude).controlSize(.regular)
                }
            }
        }
    }

    private var aboutPane: some View {
        Group {
            HStack(spacing: 16) {
                RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LH.fill(0.06)).frame(width: 52, height: 52)
                    .overlay(MarkImage(id: model.weatherMode > 0 ? MarkLibrary.weatherID : model.selectedMark, playing: false, size: 30))
                VStack(alignment: .leading, spacing: 4) {
                    Text("Layerhover").font(.system(size: 15, weight: .semibold))
                    Text(L("버전 \(model.version)", "Version \(model.version)")).font(.system(size: 12)).foregroundStyle(.secondary).monospacedDigit()
                }
            }
            SettingsCard(title: L("업데이트", "Updates")) {
                SettingRow(title: L("자동으로 업데이트", "Update automatically"),
                           note: L("새 버전이 나오면 받아서 다시 시작해요. Figma를 쓰는 중이면 기다려요", "Installs new versions and restarts. Waits while you're in Figma")) {
                    SettingSwitch(isOn: model.autoUpdate, label: L("자동으로 업데이트", "Update automatically"), action: model.actions.toggleAutoUpdate)
                }
                CardDivider()
                SettingRow(title: L("새 버전 확인", "Check for updates"), note: model.updateStatus) {
                    if model.updateVersion != nil && !model.updateBusy {
                        Button(L("설치", "Install"), action: model.actions.installUpdate).controlSize(.regular)
                    } else {
                        Button(L("지금 확인", "Check Now"), action: model.actions.checkUpdate).controlSize(.regular).disabled(model.updateBusy)
                    }
                }
            }
            SettingsCard(title: L("권한", "Permissions")) {
                SettingRow(title: L("손쉬운 사용", "Accessibility"),
                           note: L("Figma의 접기·펼치기 버튼을 대신 누르는 데만 써요", "Used only to press Figma's minimize and expand buttons")) {
                    if model.trusted {
                        Label(L("켜져 있음", "On"), systemImage: "checkmark.circle.fill")
                            .font(.system(size: 12)).foregroundStyle(.secondary)
                            .labelStyle(TintedIconLabel(tint: .green))
                    } else {
                        Button(L("설정 열기…", "Open Settings…"), action: model.actions.openAccessibility).controlSize(.regular)
                    }
                }
            }
            SettingsCard(title: L("도움말", "Help")) {
                SettingRow(title: L("사용법", "How it works"),
                           note: L("처음 켰을 때 본 안내를 다시 봐요", "Shows the welcome guide again")) {
                    Button(L("보기…", "Show…"), action: model.actions.showGuide).controlSize(.regular)
                }
                CardDivider()
                SettingRow(title: L("진단 기록", "Diagnostics"),
                           note: L("문제를 알릴 때 첨부할 기록 파일을 Finder에서 보여 줘요", "Reveals the log file in Finder to attach to a bug report")) {
                    Button(L("Finder에서 보기", "Show in Finder"), action: model.actions.showLog).controlSize(.regular)
                }
            }
        }
    }
}

private struct TintedIconLabel: LabelStyle {
    let tint: Color
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 4) { configuration.icon.foregroundStyle(tint); configuration.title }
    }
}
