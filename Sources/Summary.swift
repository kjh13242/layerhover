// 주간 작업 요약 창: 이번 주 Figma 작업 시간, 집중 시간, 파일·페이지별 시간, 페이지 이동.
// 숫자는 사람 평가가 아니라 스스로 돌아보는 용도다. 기록은 이 Mac에만 있다.

import AppKit
import SwiftUI
import Charts
import UniformTypeIdentifiers

final class SummaryModel: ObservableObject {
    @Published var weekStart = Date()
    @Published var days: [DayStats] = []

    func reload() { days = ActivityLog.shared.week(containing: weekStart) }
    func shift(_ weeks: Int) {
        weekStart = Calendar.current.date(byAdding: .day, value: 7 * weeks, to: weekStart) ?? weekStart
        reload()
    }

    var total: DayStats {
        var t = DayStats(date: "")
        for d in days {
            t.active += d.active; t.focus += d.focus; t.longestFocus = max(t.longestFocus, d.longestFocus)
            t.edgeSwitches += d.edgeSwitches; t.manualSwitches += d.manualSwitches
            t.reveals += d.reveals; t.paletteOpens += d.paletteOpens; t.leaves += d.leaves
            for (k, v) in d.files { t.files[k, default: 0] += v }
            for (k, v) in d.pages { t.pages[k, default: 0] += v }
        }
        return t
    }

    var rangeText: String {
        guard let first = days.first?.date, let last = days.last?.date else { return "" }
        return "\(first) ~ \(last)"
    }
}

/// 초 → "3시간 20분" / "45분"
func durationText(_ s: Double) -> String {
    let m = Int(s / 60)
    if m < 1 { return s > 0 ? L("1분 미만", "<1 min") : L("0분", "0 min") }
    let h = m / 60, r = m % 60
    if h == 0 { return L("\(r)분", "\(r) min") }
    return r == 0 ? L("\(h)시간", "\(h) h") : L("\(h)시간 \(r)분", "\(h) h \(r) min")
}

struct SummaryView: View {
    @ObservedObject var model: SummaryModel
    let export: () -> Void
    let erase: () -> Void

    var body: some View {
        let t = model.total
        // 창 크기는 고정이다 (SummaryView.size). 기록이 많든 적든 각 칸의 높이를 정해 두어서
        // 내용에 따라 창이나 배치가 흔들리지 않고, 스크롤 없이 한 화면에 다 보인다.
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(L("이번 주 Figma 작업", "This week in Figma")).font(.title2.weight(.semibold))
                        Text(model.rangeText).foregroundStyle(.secondary)
                    }
                    Spacer()
                    // 주 넘기기: 유리 알약 하나 (도구 막대처럼 내용 위에 뜨는 길잡이)
                    HStack(spacing: 0) {
                        Button { model.shift(-1) } label: { LHIcon(symbol: "chevron.left").frame(width: 36, height: 32) }
                            .buttonStyle(GlassSegmentStyle())
                            .help(L("지난주", "Previous week"))
                        Button { model.weekStart = Date(); model.reload() } label: {
                            Text(L("이번 주", "This week")).font(.system(size: 12.5, weight: .medium)).padding(.horizontal, 12).frame(height: 32)
                        }
                        .buttonStyle(GlassSegmentStyle())
                        Button { model.shift(1) } label: { LHIcon(symbol: "chevron.right").frame(width: 36, height: 32) }
                            .buttonStyle(GlassSegmentStyle())
                            .help(L("다음 주", "Next week"))
                    }
                    .padding(4)
                    .liquidGlass(Capsule())
                }

                HStack(spacing: 12) {
                    tile(L("작업 시간", "Time in Figma"), durationText(t.active), nil,
                         help: L("Figma가 앞에 있고 손을 대고 있던 시간", "Figma in front and you were active"))
                    tile(L("집중 시간", "Focus time"), durationText(t.focus), nil,
                         help: L("10분 넘게 이어진 작업 구간", "Stretches longer than 10 minutes"))
                    tile(L("가장 긴 집중", "Longest focus"), durationText(t.longestFocus), nil)
                    tile(L("페이지 이동", "Page moves"), "\(t.edgeSwitches + t.manualSwitches)",
                         L("Layerhover \(t.edgeSwitches) · 직접 \(t.manualSwitches)",
                           "Layerhover \(t.edgeSwitches) · manual \(t.manualSwitches)"))
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(L("하루별", "By day")).font(.headline)
                    Chart {
                        ForEach(model.days, id: \.date) { d in
                            BarMark(x: .value(L("날짜", "Day"), weekday(d.date)),
                                    y: .value(L("시간", "Hours"), d.focus / 3600))
                                .foregroundStyle(by: .value(L("종류", "Kind"), L("집중", "Focus")))
                            BarMark(x: .value(L("날짜", "Day"), weekday(d.date)),
                                    y: .value(L("시간", "Hours"), max(0, d.active - d.focus) / 3600))
                                .foregroundStyle(by: .value(L("종류", "Kind"), L("그 밖의 작업", "Other")))
                        }
                    }
                    .chartForegroundStyleScale([L("집중", "Focus"): Color.accentColor,
                                                L("그 밖의 작업", "Other"): Color.accentColor.opacity(0.35)])
                    .chartYAxisLabel(L("시간", "hours"))
                    .frame(height: 170)
                }
                .frame(height: 200, alignment: .top)

                HStack(alignment: .top, spacing: 20) {
                    ranking(L("파일", "Files"), t.files.map { ($0.key, nil, $0.value) })
                    ranking(L("페이지", "Pages"), t.pages.map { k, v in
                        let p = k.split(separator: "\t", maxSplits: 1).map(String.init)
                        return ((p.count > 1 ? p[1] : k).trimmingCharacters(in: .whitespaces), p.first, v)
                    })
                }
                .frame(height: SummaryView.rankingHeight, alignment: .top)

                HStack(spacing: 20) {
                    stat("arrow.up.forward.app", t.leaves, L("다른 앱으로 넘어간 횟수", "Times you left Figma"))
                    stat("sidebar.left", t.reveals, L("화면 끝으로 패널을 꺼낸 횟수", "Panel reveals at the edge"))
                    stat("doc.text.magnifyingglass", t.paletteOpens, L("페이지 찾기 창을 연 횟수", "Times the page finder opened"))
                    Spacer()
                    HStack(spacing: 4) {
                        LHIcon(symbol: "lock")
                        Text(L("이 Mac에만", "This Mac only"))
                    }
                    .font(.system(size: 11.5)).foregroundStyle(.tertiary)
                    .help(L("기록은 이 Mac에만 저장되고 밖으로 보내지 않아요. 스스로 돌아보는 용도예요.",
                            "Stored only on this Mac, never sent anywhere. For your own reflection."))
                }
                .frame(height: 36)

                HStack {
                    Button(action: export) {
                        HStack(spacing: 8) { LHIcon(symbol: "square.and.arrow.up"); Text(L("CSV로 내보내기…", "Export CSV…")) }
                            .font(.system(size: 12.5, weight: .medium)).padding(.horizontal, 14).frame(height: 36)
                    }
                    .buttonStyle(GlassKeyStyle(shape: Capsule()))
                    Spacer()
                    Button(role: .destructive, action: erase) {
                        HStack(spacing: 8) { LHIcon(symbol: "trash"); Text(L("기록 모두 지우기…", "Erase All…")) }
                            .font(.system(size: 12.5, weight: .medium)).foregroundStyle(.red).padding(.horizontal, 14).frame(height: 36)
                    }
                    .buttonStyle(GlassKeyStyle(shape: Capsule()))
                }
            }
            .padding(24)
        }
        .frame(width: SummaryView.size.width, height: SummaryView.size.height, alignment: .top)
        .onAppear { model.reload() }
    }

    static let rows = 5                                   // 순위에 보여 주는 줄 수 (항상 이만큼 자리를 잡아 둔다)
    static let rowHeight: CGFloat = 40
    static let rankingHeight: CGFloat = 28 + CGFloat(rows) * rowHeight
    static let size = NSSize(width: 700, height: 48 + 44 + 80 + 200 + rankingHeight + 36 + 28 + 18 * 5)

    private func weekday(_ date: String) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        guard let d = f.date(from: date) else { return date }
        let o = DateFormatter(); o.dateFormat = isKorean ? "E d" : "EEE d"
        o.locale = Locale(identifier: isKorean ? "ko_KR" : "en_US")
        return o.string(from: d)
    }

    private func tile(_ title: String, _ value: String, _ note: String?, help: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.title3.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.7)
            if let note { Text(note).font(.caption2).foregroundStyle(.tertiary).lineLimit(2) }
        }
        .frame(maxWidth: .infinity, minHeight: 56, maxHeight: 56, alignment: .topLeading)   // 설명 줄을 뺀 만큼 낮춘다
        .padding(12)
        .background(GlassFill(radius: 10))
        .help(help ?? "")
    }

    /// 아래 줄의 숫자 하나: 아이콘 + 숫자. 무엇의 횟수인지는 마우스를 올리면 나온다.
    private func stat(_ symbol: String, _ n: Int, _ meaning: String) -> some View {
        HStack(spacing: 4) {
            LHIcon(symbol: symbol)
            Text("\(n)").monospacedDigit()
        }
        .font(.system(size: 12.5)).foregroundStyle(.secondary)
        .help(meaning)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(meaning) \(n)")
    }

    /// 순위 한 칸. 항목이 적어도 항상 rows 줄 높이를 차지한다. sub는 페이지가 속한 파일 이름.
    private func ranking(_ title: String, _ items: [(String, String?, Double)]) -> some View {
        let top = Array(items.sorted { $0.2 > $1.2 }.prefix(SummaryView.rows))
        let maxV = top.first?.2 ?? 1
        return VStack(alignment: .leading, spacing: 0) {
            Text(title).font(.headline).frame(height: 28, alignment: .top)
            ForEach(0..<SummaryView.rows, id: \.self) { i in
                Group {
                    if i < top.count {
                        let it = top[i]
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 6) {
                                Text(it.0).lineLimit(1).truncationMode(.middle)
                                if let sub = it.1 {
                                    Text(sub).lineLimit(1).truncationMode(.tail).foregroundStyle(.tertiary)
                                        .font(.caption).layoutPriority(-1)
                                }
                                Spacer(minLength: 4)
                                Text(durationText(it.2)).foregroundStyle(.secondary).monospacedDigit().fixedSize()
                            }
                            .font(.callout)
                            GeometryReader { g in
                                RoundedRectangle(cornerRadius: 2).fill(Color.accentColor.opacity(0.6))
                                    .frame(width: max(2, g.size.width * it.2 / maxV))
                            }
                            .frame(height: 4)
                        }
                    } else if i == 0 {
                        Text(L("아직 기록이 없어요", "No records yet")).foregroundStyle(.secondary)
                    } else {
                        Color.clear
                    }
                }
                .frame(height: SummaryView.rowHeight, alignment: .top)
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
    }
}

final class SummaryWindow: NSObject, NSWindowDelegate {
    private var window: NSWindow?
    private let model = SummaryModel()

    func show() {
        NSApp.activate(ignoringOtherApps: true)
        ActivityLog.shared.flush()
        model.weekStart = Date()
        model.reload()
        if let w = window { w.makeKeyAndOrderFront(nil); return }
        // 유리 창: 창 뒤가 비치게 하고, 제목 막대까지 같은 유리로 덮는다 (내용은 제목 막대 아래 그대로).
        let host = NSHostingController(rootView: SummaryView(model: model,
                                                             export: { [weak self] in self?.export() },
                                                             erase: { [weak self] in self?.erase() })
            .background(WindowGlass().ignoresSafeArea()))
        if #available(macOS 13.0, *) { host.sizingOptions = [] }   // 내용에 따라 창 크기를 바꾸지 않는다
        let w = NSWindow(contentViewController: host)
        w.title = L("작업 기록", "Activity")
        w.styleMask = [.titled, .closable, .miniaturizable, .fullSizeContentView]
        w.titlebarAppearsTransparent = true
        w.isOpaque = false; w.backgroundColor = .clear
        let size = NSSize(width: SummaryView.size.width, height: SummaryView.size.height + 28)   // 제목 막대 자리만큼
        w.setContentSize(size)
        w.contentMinSize = size
        w.contentMaxSize = size
        w.isReleasedWhenClosed = false
        w.delegate = self
        w.center()
        w.makeKeyAndOrderFront(nil)
        window = w
    }

    func windowWillClose(_ notification: Notification) { window = nil }

    private func export() {
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.commaSeparatedText]
        panel.nameFieldStringValue = "Layerhover-\(model.days.first?.date ?? "week").csv"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        try? ActivityLog.csv(model.days).write(to: url, atomically: true, encoding: .utf8)
    }

    private func erase() {
        let a = NSAlert()
        a.messageText = L("작업 기록을 모두 지울까요?", "Erase all activity?")
        a.informativeText = L("지금까지 모은 모든 날의 기록이 지워지고 되돌릴 수 없어요.",
                              "Every recorded day is removed. This can't be undone.")
        a.addButton(withTitle: L("지우기", "Erase"))
        a.addButton(withTitle: L("취소", "Cancel"))
        a.buttons.first?.hasDestructiveAction = true
        guard a.runModal() == .alertFirstButtonReturn else { return }
        ActivityLog.shared.eraseAll()
        model.reload()
    }
}
