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
        case .general: return "gearshape"
        case .about: return "info.circle"
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

/// 칸 아이콘: 패널 안 아이콘과 같은 느낌 — 유리 칸 위의 한 가지 색 선 기호 (색 있는 네모를 쓰지 않는다)
struct PaneIcon: View {
    let pane: SettingsPane
    var size: CGFloat = 20
    var highlighted = false
    var body: some View {
        GlassFill(radius: size * 0.3)
            .frame(width: size, height: size)
            .overlay(LHIcon(symbol: pane.symbol, size: size >= 32 ? LHIcon.s24 : LHIcon.s16, weight: .medium)
                .foregroundStyle(highlighted ? LH.accent : Color.primary))
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
                .background(GlassFill(radius: 12))
            if let footnote, footnote.isEmpty {     // 덧붙임 설명은 보이지 않는다 (위 규칙과 같음)
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
                // 설명은 줄 아래에 쓰지 않는다 — 이름과 조절하는 것만 보이고, 설명은 마우스를 올리면 나온다
                Text(title).font(.system(size: 13)).fixedSize(horizontal: false, vertical: true)
                    .help(note ?? "")
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

/// 켬·끔 두 칸 — 스위치 대신 속도 고르기와 같은 선택 막대를 쓴다 (한 가지 조작 방식)
struct SettingSwitch: View {
    let isOn: Bool
    let label: String
    let action: () -> Void
    var body: some View {
        LHSegmented(options: [L("켬", "On"), L("끔", "Off")], selection: isOn ? 0 : 1, label: label, height: 24, fontSize: 12) { i in
            if (i == 0) != isOn { action() }
        }
        .frame(width: 96)
    }
}

/// 속도 미리보기: 작은 화면에서 커서가 끝에 닿고 → 고른 만큼 기다렸다 → 패널이 나오고 → 벗어나면 고른 만큼 뒤에 접힌다.
/// 실제 지연(0~0.4초)은 너무 짧아 보이지 않으니 차이가 보이도록 늘려 보여 준다.
struct SpeedPreview: View {
    let reveal: Int?
    let collapse: Int?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion)) { ctx in
            Canvas { g, size in
                let dR = [0, 0.3, 0.9][reveal ?? 1], dC = [0, 0.4, 1.1][collapse ?? 1]
                let move = 0.5, slide = 0.2, hold = 0.9, back = 0.4, rest = 0.6
                let total = move + dR + slide + hold + back + dC + slide + rest
                let t = reduceMotion ? move + dR + slide : ctx.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: total)
                func ease(_ x: Double) -> Double { let c = min(max(x, 0), 1); return c * c * (3 - 2 * c) }
                var px = 0.62, open = 0.0
                let t1 = move, t2 = t1 + dR, t3 = t2 + slide, t4 = t3 + hold, t5 = t4 + back, t6 = t5 + dC, t7 = t6 + slide
                if t < t1 { px = 0.62 - 0.62 * ease(t / move) } else if t < t4 { px = 0; if t >= t3 - 0.6 * hold { px = min(0.14, (t - t3) / hold * 0.3) } }
                else if t < t5 { px = 0.14 + 0.48 * ease((t - t4) / back) } else { px = 0.62 }
                if t >= t2 && t < t3 { open = ease((t - t2) / slide) } else if t >= t3 && t < t6 { open = 1 } else if t >= t6 && t < t7 { open = 1 - ease((t - t6) / slide) }
                // 캔버스의 프레임
                g.fill(Path(roundedRect: CGRect(x: size.width * 0.36, y: size.height * 0.24, width: size.width * 0.34, height: size.height * 0.52), cornerRadius: 3),
                       with: .color(.primary.opacity(0.1)))
                // 끝에 닿은 순간 왼쪽 끝이 빛난다
                if px < 0.01 && open < 1 { g.fill(Path(CGRect(x: 0, y: 6, width: 2, height: size.height - 12)), with: .color(LH.accent.opacity(0.7))) }
                // 레이어 패널
                let w = size.width * 0.28
                let panel = CGRect(x: -w + w * open + 4, y: 4, width: w, height: size.height - 8)
                if open > 0 {
                    g.fill(Path(roundedRect: panel, cornerRadius: 5), with: .color(.primary.opacity(0.16)))
                    for i in 0..<4 {
                        g.fill(Path(roundedRect: CGRect(x: panel.minX + 6, y: panel.minY + 8 + CGFloat(i) * 9, width: panel.width * (i == 1 ? 0.5 : 0.7), height: 3), cornerRadius: 1.5),
                               with: .color(.primary.opacity(0.28)))
                    }
                }
                // 커서
                let cx = max(3, px * size.width + 3), cy = size.height * 0.5
                var arrow = Path()
                arrow.move(to: CGPoint(x: cx, y: cy)); arrow.addLine(to: CGPoint(x: cx, y: cy + 11)); arrow.addLine(to: CGPoint(x: cx + 3, y: cy + 8))
                arrow.addLine(to: CGPoint(x: cx + 8, y: cy + 8)); arrow.closeSubpath()
                g.fill(arrow, with: .color(.primary))
                g.stroke(arrow, with: .color(Color(nsColor: .windowBackgroundColor)), lineWidth: 0.8)
            }
        }
        .frame(height: 72)
        .background(GlassFill(radius: 8, lift: 0.6))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .accessibilityLabel(L("펼치고 접히는 속도 미리보기", "Preview of reveal and fold speed"))
    }
}

/// 페이지 버튼 위치: 작은 Figma 화면 위의 세 자리 중 하나를 직접 누른다.
/// 고른 자리에는 페이지 버튼이 놓이고, 나머지는 점선 빈자리로 보인다. (Figma의 위쪽 파일 이름·공유 칸, 아래 도구 막대는 회색으로)
struct ChipPlacePicker: View {
    let selection: Int
    let enabled: Bool
    let action: (Int) -> Void
    @State private var hover: Int?
    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height
            ZStack(alignment: .topLeading) {
                // Figma가 원래 띄우는 것: 왼쪽 위 파일 이름, 오른쪽 위 공유, 아래 가운데 도구 막대
                RoundedRectangle(cornerRadius: 5).fill(Color.primary.opacity(0.1)).frame(width: 56, height: 20).offset(x: 8, y: 8)
                RoundedRectangle(cornerRadius: 5).fill(Color.primary.opacity(0.1)).frame(width: 56, height: 20).offset(x: w - 64, y: 8)
                RoundedRectangle(cornerRadius: 5).fill(Color.primary.opacity(0.1)).frame(width: 104, height: 20).offset(x: w / 2 - 52, y: h - 28)
                slot(0, x: 8, y: h - 28)
                // 왼쪽 위는 파일 이름 바로 오른쪽, 가운데 위는 창 가운데 — 칸 폭 76이라 둘이 겹치지 않는다 (가운데가 왼쪽 위 끝보다 오른쪽)
                slot(1, x: 8 + 56 + 8, y: 8)
                slot(2, x: max(w / 2 - 38, 8 + 56 + 8 + 76 + 8), y: 8)
            }
        }
        .frame(height: 112)
        .background(GlassFill(radius: 8, lift: 0.6))
        .padding(.vertical, 12)
        .opacity(enabled ? 1 : 0.45)
        .allowsHitTesting(enabled)
    }
    private func slot(_ i: Int, x: CGFloat, y: CGFloat) -> some View {
        let on = selection == i
        return Button { action(i) } label: {
            HStack(spacing: 4) {
                LHIcon(symbol: "doc", size: 12)
                Text(L("페이지", "Page")).font(.system(size: 10, weight: .medium))
                Spacer(minLength: 0)
                Text("‹ ›").font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(on ? Color.primary : Color.secondary.opacity(hover == i ? 0.9 : 0.5))
            .padding(.horizontal, 6)
            .frame(width: 76, height: 20)
            .background { if on { GlassFill(radius: 5, tint: LH.accent) } else if hover == i { GlassFill(radius: 5) } }
            .overlay(RoundedRectangle(cornerRadius: 5).strokeBorder(on ? LH.accent.opacity(0.6) : Color.primary.opacity(0.25),
                                                                    style: StrokeStyle(lineWidth: 1, dash: on ? [] : [3, 2])))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 ? i : (hover == i ? nil : hover) }
        .offset(x: x, y: y)
        .help([L("왼쪽 아래 · 도구 막대와 같은 줄", "Bottom left, beside the toolbar"),
               L("왼쪽 위 · 파일 이름 오른쪽", "Top left, next to the file name"),
               L("가운데 위", "Top center")][i])
        .accessibilityLabel([L("왼쪽 아래", "Bottom left"), L("왼쪽 위", "Top left"), L("가운데 위", "Top center")][i])
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    }
}

/// 펼치는 곳: 작은 화면의 끝을 직접 눌러 고른다. 켜진 끝은 빛나고, 그 끝에서 나오는 패널이 옅게 보인다.
struct EdgePicker: View {
    let right: Bool
    let toggleRight: () -> Void
    @State private var hoverRight = false
    var body: some View {
        HStack(spacing: 0) {
            edge(on: true, side: .leading, title: L("레이어", "Layers"), enabled: false)
            Spacer(minLength: 0)
            RoundedRectangle(cornerRadius: 3).fill(Color.primary.opacity(0.1)).frame(width: 64, height: 40)
            Spacer(minLength: 0)
            Button(action: toggleRight) { edge(on: right, side: .trailing, title: L("속성", "Properties"), enabled: true) }
                .buttonStyle(.plain)
                .onHover { hoverRight = $0 }
                .help(right ? L("오른쪽 끝 끄기", "Turn off the right edge") : L("오른쪽 끝도 쓰기", "Use the right edge too"))
                .accessibilityLabel(L("오른쪽 끝에서도 펼치기", "Right edge too"))
                .accessibilityAddTraits(right ? [.isButton, .isSelected] : .isButton)
        }
        .padding(4)
        .frame(height: 96)
        .background(GlassFill(radius: 8, lift: 0.6))
        .padding(.vertical, 12)
    }
    private func edge(on: Bool, side: HorizontalEdge, title: String, enabled: Bool) -> some View {
        let lit = on || (enabled && hoverRight)
        return HStack(spacing: 0) {
            if side == .trailing { Spacer(minLength: 0) }
            if side == .leading { bar(lit: lit, on: on) }
            VStack(spacing: 4) {
                ForEach(0..<4, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 1.5).fill(Color.primary.opacity(on ? 0.3 : 0.12)).frame(width: i == 1 ? 24 : 36, height: 3)
                }
                Text(title).font(.system(size: 10.5, weight: .medium)).foregroundStyle(on ? .primary : .tertiary).padding(.top, 4)
            }
            .frame(width: 64, height: 88)
            .background(RoundedRectangle(cornerRadius: 5).fill(Color.primary.opacity(on ? 0.12 : 0.03)))
            .overlay(RoundedRectangle(cornerRadius: 5).strokeBorder(Color.primary.opacity(on ? 0 : 0.15), style: StrokeStyle(lineWidth: 1, dash: [3, 3])))
            if side == .trailing { bar(lit: lit, on: on) }
        }
        .frame(width: 72)
        .contentShape(Rectangle())
    }
    private func bar(lit: Bool, on: Bool) -> some View {
        RoundedRectangle(cornerRadius: 1).fill(lit ? LH.accent.opacity(on ? 0.7 : 0.35) : Color.primary.opacity(0.12)).frame(width: 2, height: 72)
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
    /// 화면의 창은 옆줄과 오른쪽을 따로 그린다 (AppKit 분할 창의 두 칸)
    enum Part { case sidebar, detail }
    var part: Part = .detail
    /// 창이 뒤로 가면 시스템 설정처럼 고른 칸이 회색으로 바뀐다
    @Environment(\.controlActiveState) private var activeState

    var body: some View {
        Group {
            if rendering {
                HStack(spacing: 0) {
                    sidebar
                    Rectangle().fill(SettingsStyle.separator).frame(width: 1)
                    detail
                }
                .ignoresSafeArea()
            } else if part == .sidebar {
                // 화면에서는 Finder와 같은 AppKit 옆줄(NSSplitViewItem sidebar) 안에 둔다: 옆줄 바탕과 신호등 단추는 macOS가 그린다.
                // 칸은 Finder 옆줄과 같은 치수로 직접 그린다: 신호등 바로 아래(51pt)에서 시작, 높이 32, 고른 칸은 회색 알약, 기호는 강조색.
                VStack(spacing: 0) {
                    ForEach(SettingsPane.allCases) { pane in finderRow(pane) }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 10).padding(.top, 51)
                .ignoresSafeArea()
            } else {
                detail
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
                Color.clear.frame(height: 44)        // 창의 신호등 단추 자리
            }
            ForEach(SettingsPane.allCases) { pane in sidebarRow(pane) }
            Spacer()
        }
        .padding(.horizontal, rendering ? 12 : 8)
        .frame(maxHeight: .infinity)
        // 옆줄은 창 안에 떠 있는 유리 판 (macOS 26의 옆줄처럼): 창 가장자리에서 8pt 띄우고, 신호등 단추도 그 안에 든다.
        // 유리는 이 판 하나뿐이고, 오른쪽 내용과 그 안의 묶음은 유리가 아니다.
        .modifier(FloatingSidebar(rendering: rendering))
        .frame(width: SettingsStyle.sidebarWidth)
    }

    private func sidebarRow(_ pane: SettingsPane) -> some View {
        let selected = model.settingsPane == pane
        let active = rendering || activeState == .key || activeState == .active
        return Button { model.settingsPane = pane } label: {
            HStack(spacing: 8) {
                PaneIcon(pane: pane, highlighted: selected && active)
                Text(pane.title).font(.system(size: 13, weight: selected ? .semibold : .regular)).lineLimit(1)
                    .foregroundStyle(Color.primary)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 8).frame(height: 32)
            .background { if selected { GlassFill(radius: 8, tint: active ? LH.accent : nil) } }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(pane.title)
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }

    /// Finder 옆줄의 한 칸
    private func finderRow(_ pane: SettingsPane) -> some View {
        let selected = model.settingsPane == pane
        return Button { model.settingsPane = pane } label: {
            HStack(spacing: 7) {
                Image(systemName: pane.symbol).font(.system(size: 15, weight: .regular))
                    .foregroundStyle(Color.accentColor).frame(width: 24)
                Text(pane.title).font(.system(size: 13, weight: selected ? .semibold : .regular)).lineLimit(1)
                    .foregroundStyle(Color.primary)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 7).frame(height: 32)
            .background { if selected { RoundedRectangle(cornerRadius: 9, style: .continuous).fill(Color.primary.opacity(0.1)) } }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(pane.title)
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }

    // MARK: 오른쪽

    private var detail: some View {
        VStack(alignment: .leading, spacing: 0) {
            if rendering {
                HStack(spacing: 12) {
                    PaneIcon(pane: model.settingsPane, size: 36)
                    // 제목만 둔다 — 무엇을 정하는 곳인지는 아래 묶음 이름과 그림이 보여 준다 (설명은 마우스를 올리면)
                    Text(model.settingsPane.title).font(.system(size: 17, weight: .bold))
                        .help(model.settingsPane.subtitle)
                }
                .padding(.horizontal, 28).padding(.top, 32).padding(.bottom, 20)
            } else {
                // 화면의 창: 제목은 Finder의 도구 막대 제목처럼 신호등 단추와 같은 줄(높이 52)에 둔다
                Text(model.settingsPane.title).font(.system(size: 15, weight: .bold))
                    .help(model.settingsPane.subtitle)
                    .padding(.horizontal, 28).frame(height: 52)
            }
            ScrollView {
                VStack(alignment: .leading, spacing: 24) { pane }
                    .padding(.horizontal, 28).padding(.top, rendering ? 0 : 8).padding(.bottom, 28)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .ignoresSafeArea(.container, edges: rendering ? [] : .top)
        .background { if rendering { SettingsStyle.detail } }
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
                SpeedPreview(reveal: model.reveal, collapse: model.collapse).padding(.vertical, 12)
                CardDivider()
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
                EdgePicker(right: model.rightEdge, toggleRight: model.actions.toggleRightEdge)
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
                ChipPlacePicker(selection: model.chipPlace, enabled: model.showChip, action: model.actions.setChipPlace)
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
            SettingsCard(title: L("언어", "Language")) {
                SettingRow(title: L("화면 언어", "Interface language"),
                           note: L("바꾸면 Layerhover가 다시 시작해요", "Layerhover restarts to apply it")) {
                    SettingSegments(options: [L("자동", "Auto"), "한국어", "English"],
                                    selection: ["auto", "ko", "en"].firstIndex(of: appLanguage),
                                    label: L("화면 언어", "Interface language")) { i in model.actions.setLanguage(["auto", "ko", "en"][i]) }
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
                GlassFill(radius: 12).frame(width: 52, height: 52)
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

/// 설정 창의 옆줄 판: 그림으로 저장할 때는 단색 옆줄, 화면에서는 창 안에 떠 있는 유리 판
private struct FloatingSidebar: ViewModifier {
    let rendering: Bool
    func body(content: Content) -> some View {
        if rendering {
            content.background(SettingsStyle.sidebar)
        } else {
            content
                .liquidGlass(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .padding(8)
        }
    }
}
