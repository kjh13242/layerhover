// 작업 기록: Figma를 쓴 시간을 파일·페이지별로 모으고 페이지 이동을 센다.
// 이 Mac에만 저장한다 (~/Library/Application Support/Layerhover/Activity/날짜.json). 밖으로 보내지 않는다.

import AppKit
import IOKit

/// 하루치 기록. 시간은 초.
struct DayStats: Codable {
    var date: String
    var active: Double = 0            // Figma가 앞에 있고 사용자가 손을 대고 있던 시간
    var focus: Double = 0             // 10분 넘게 이어진 작업 구간을 합친 시간
    var longestFocus: Double = 0
    var files: [String: Double] = [:]
    var pages: [String: Double] = [:] // "파일\t페이지"
    var edgeSwitches = 0              // Layerhover로 옮긴 페이지
    var manualSwitches = 0            // 패널에서 직접 옮긴 페이지
    var reveals = 0                   // 화면 끝으로 패널을 꺼낸 횟수
    var paletteOpens = 0              // 페이지 이동 창을 연 횟수
    var leaves = 0                    // Figma에서 다른 앱으로 넘어간 횟수
}

enum ActivityEvent { case edgeSwitch, manualSwitch, reveal, palette }

final class ActivityLog {
    static let shared = ActivityLog()

    var enabled = true
    static let focusMinimum: Double = 600   // 이만큼 이어져야 집중 시간으로 센다
    static let idleLimit: Double = 120      // 키보드·마우스를 이만큼 안 쓰면 쉬는 것으로 본다
    static let breakLimit: Double = 30      // 다른 앱에 이만큼 있으면 작업 구간이 끊긴다

    // 시험할 때는 LAYERHOVER_ACTIVITY_DIR 로 다른 폴더를 쓴다 (실제 기록을 건드리지 않게)
    let dir: URL = ProcessInfo.processInfo.environment["LAYERHOVER_ACTIVITY_DIR"].map { URL(fileURLWithPath: $0) }
        ?? FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Layerhover/Activity")
    private var today: DayStats
    private var lastTick: TimeInterval?
    private var lastFlush: TimeInterval = 0
    private var dirty = false
    private var streak: Double = 0          // 지금 이어지고 있는 작업 구간
    private var awaySince: TimeInterval?
    private var wasFront = false

    private static let dayFormat: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
    static func key(_ d: Date) -> String { dayFormat.string(from: d) }

    private init() {
        today = DayStats(date: ActivityLog.key(Date()))
        today = load(today.date) ?? today
    }

    /// 1초쯤마다 불린다. figmaFront: Figma가 앞에 있는지. file·page: 지금 보고 있는 파일과 페이지.
    func tick(figmaFront: Bool, file: String?, page: String?) {
        let now = ProcessInfo.processInfo.systemUptime
        defer { lastTick = now }
        guard enabled, let last = lastTick else { return }
        let dt = min(now - last, 5)  // 잠자기에서 깨어난 경우 등은 크게 세지 않는다
        rollDayIfNeeded()

        if wasFront && !figmaFront { today.leaves += 1; dirty = true }
        wasFront = figmaFront

        if figmaFront && ActivityLog.idleSeconds() < ActivityLog.idleLimit {
            awaySince = nil
            today.active += dt
            streak += dt
            if let file, !file.isEmpty {
                today.files[file, default: 0] += dt
                if let page, !page.isEmpty { today.pages[file + "\t" + page, default: 0] += dt }
            }
            dirty = true
        } else {
            let away = awaySince ?? now
            awaySince = away
            if now - away > ActivityLog.breakLimit { endStreak() }
        }
        if dirty && now - lastFlush > 30 { flush() }
    }

    func note(_ e: ActivityEvent) {
        guard enabled else { return }
        rollDayIfNeeded()
        switch e {
        case .edgeSwitch: today.edgeSwitches += 1
        case .manualSwitch: today.manualSwitches += 1
        case .reveal: today.reveals += 1
        case .palette: today.paletteOpens += 1
        }
        dirty = true
    }

    /// 패널 머리의 한 줄에 쓰는 숫자 (오늘 작업한 시간, 지금 쉬지 않고 이어 온 시간)
    var todayActive: Double { rollDayIfNeeded(); return today.active }
    var currentStreak: Double { streak }

    private func endStreak() {
        if streak >= ActivityLog.focusMinimum {
            today.focus += streak
            today.longestFocus = max(today.longestFocus, streak)
            dirty = true
        }
        streak = 0
    }

    private func rollDayIfNeeded() {
        let k = ActivityLog.key(Date())
        guard k != today.date else { return }
        endStreak()
        flush()
        today = DayStats(date: k)
    }

    /// 지금 이어지고 있는 작업 구간까지 넣은 오늘 기록 (요약 창에서 쓴다)
    var todayIncludingStreak: DayStats {
        var t = today
        if streak >= ActivityLog.focusMinimum { t.focus += streak; t.longestFocus = max(t.longestFocus, streak) }
        return t
    }

    func flush() {
        lastFlush = ProcessInfo.processInfo.systemUptime
        guard dirty else { return }
        dirty = false
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        if let data = try? JSONEncoder().encode(today) {
            try? data.write(to: dir.appendingPathComponent(today.date + ".json"), options: .atomic)
        }
    }

    func load(_ date: String) -> DayStats? {
        guard let data = try? Data(contentsOf: dir.appendingPathComponent(date + ".json")) else { return nil }
        return try? JSONDecoder().decode(DayStats.self, from: data)
    }

    /// 그 주(월요일 시작) 7일치. 기록이 없는 날은 빈 값.
    func week(containing day: Date) -> [DayStats] {
        var cal = Calendar(identifier: .gregorian)
        cal.firstWeekday = 2
        let start = cal.dateInterval(of: .weekOfYear, for: day)?.start ?? day
        return (0..<7).map { i in
            let d = cal.date(byAdding: .day, value: i, to: start)!
            let k = ActivityLog.key(d)
            if k == today.date { return todayIncludingStreak }
            return load(k) ?? DayStats(date: k)
        }
    }

    /// 모든 기록을 지운다.
    func eraseAll() {
        try? FileManager.default.removeItem(at: dir)
        today = DayStats(date: ActivityLog.key(Date()))
        streak = 0
        dirty = false
    }

    /// 키보드·마우스를 마지막으로 쓴 뒤 지난 시간(초)
    static func idleSeconds() -> Double {
        var iter: io_iterator_t = 0
        guard IOServiceGetMatchingServices(kIOMainPortDefault, IOServiceMatching("IOHIDSystem"), &iter) == KERN_SUCCESS else { return 0 }
        defer { IOObjectRelease(iter) }
        let entry = IOIteratorNext(iter)
        guard entry != 0 else { return 0 }
        defer { IOObjectRelease(entry) }
        guard let v = IORegistryEntryCreateCFProperty(entry, "HIDIdleTime" as CFString, kCFAllocatorDefault, 0)?
            .takeRetainedValue() as? NSNumber else { return 0 }
        return v.doubleValue / 1_000_000_000
    }

    /// 주간 기록을 CSV로 (날짜, 파일, 페이지, 분)
    static func csv(_ days: [DayStats]) -> String {
        var rows = ["date,file,page,minutes"]
        func q(_ s: String) -> String { "\"" + s.replacingOccurrences(of: "\"", with: "\"\"") + "\"" }
        for d in days {
            for (k, v) in d.pages.sorted(by: { $0.value > $1.value }) {
                let parts = k.split(separator: "\t", maxSplits: 1).map(String.init)
                rows.append([d.date, q(parts.first ?? ""), q(parts.count > 1 ? parts[1] : ""),
                             String(format: "%.1f", v / 60)].joined(separator: ","))
            }
        }
        return rows.joined(separator: "\n") + "\n"
    }
}
