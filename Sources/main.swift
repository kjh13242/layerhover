// Layerhover — Figma 데스크톱 앱에서 접어 두거나(Minimize UI) 숨긴(Show/Hide UI) 패널을,
// 마우스가 화면 끝에 닿으면 펼치고 패널을 벗어나면 다시 접어 주는 메뉴 막대 앱.
//
// 동작 원리: macOS 손쉬운 사용(Accessibility) API로 Figma 창 안의
// "Expand UI" / "Minimize UI" 버튼을 직접 누르거나, UI를 숨긴 화면에는 ⌘\\ 키를 보낸다. 패널의 실제 상태와
// 폭을 읽기 때문에 추측이 없고, 분할 화면에서도 마우스가 있는 쪽만 반응한다.

import AppKit
import ApplicationServices
import ServiceManagement
import SwiftUI
import Carbon
import UserNotifications

let figmaBundleID = "com.figma.Desktop"
/// 화면 언어: 설정 > 일반 > 언어 (자동이면 macOS 언어를 따른다). 바꾸면 앱이 다시 시작해 적용한다.
let appLanguage = UserDefaults.standard.string(forKey: "appLanguage") ?? "auto"
let isKorean = appLanguage == "auto" ? (Locale.preferredLanguages.first ?? "en").hasPrefix("ko") : appLanguage == "ko"
func L(_ ko: String, _ en: String) -> String { isKorean ? ko : en }

let args = CommandLine.arguments
let verbose = args.contains("--verbose") || args.contains("--simulate")
/// 화면 확인용: LAYERHOVER_UI_PREVIEW=1 로 켜면 손쉬운 사용 권한 없이도 아이콘·패널·환영 창을 권한이 있는 것처럼 보여 준다.
/// Figma를 다루는 동작(패널 꺼내기, 단축키)은 돌리지 않는다. 설치된 앱과 함께 켜도 서로 부딪히지 않는다.
let uiPreview = ProcessInfo.processInfo.environment["LAYERHOVER_UI_PREVIEW"] == "1"
func uiTrusted() -> Bool { uiPreview || AXIsProcessTrusted() }
/// 날씨 장면 시험용 (화면 확인 모드에서만): LAYERHOVER_UI_PREVIEW=1 LAYERHOVER_WEATHER_DEMO=1 로 켜면
/// 위치·날씨를 받지 않고 8개 장면을 예시 온도와 함께 6초씩 돌려 보여 준다. 설치된 앱과 함께 켜 둘 수 있다.
let weatherDemo = uiPreview && ProcessInfo.processInfo.environment["LAYERHOVER_WEATHER_DEMO"] == "1"
var weatherDemoScene: (mark: String, temp: Int) = ("wx-clear", 24)
// 문제가 생겼을 때 원인을 볼 수 있게 동작 기록을 ~/Library/Logs/Layerhover.log 에 남긴다.
// 1MB를 넘으면 Layerhover.old.log 로 옮기고 새로 시작한다.
let logFile: FileHandle? = {
    let dir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs")
    let url = dir.appendingPathComponent("Layerhover.log")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    if let size = try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize, size > 1_000_000 {
        let old = dir.appendingPathComponent("Layerhover.old.log")
        try? FileManager.default.removeItem(at: old)
        try? FileManager.default.moveItem(at: url, to: old)
    }
    if !FileManager.default.fileExists(atPath: url.path) {
        FileManager.default.createFile(atPath: url.path, contents: nil)
    }
    let handle = try? FileHandle(forWritingTo: url)
    _ = try? handle?.seekToEnd()
    return handle
}()
let logFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "MM-dd HH:mm:ss.SS"
    return f
}()

var logBytes = 0
func log(_ s: @autoclosure () -> String) {
    let line = logFormatter.string(from: Date()) + " " + s() + "\n"
    guard let data = line.data(using: .utf8) else { return }
    logFile?.write(data)
    // 켜 둔 채로도 1MB를 넘지 않게: 넘으면 내용을 비우고 새로 시작한다 (지난 내용은 old 파일로 옮긴다).
    logBytes += data.count
    if logBytes > 200_000 {
        logBytes = 0
        if let size = try? logFile?.seekToEnd(), size > 1_000_000 {
            let dir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs")
            try? FileManager.default.removeItem(at: dir.appendingPathComponent("Layerhover.old.log"))
            try? FileManager.default.copyItem(at: dir.appendingPathComponent("Layerhover.log"),
                                              to: dir.appendingPathComponent("Layerhover.old.log"))
            try? logFile?.truncate(atOffset: 0)
        }
    }
    if verbose { FileHandle.standardError.write(data) }
}

/// 같은 내용이 반복되면 0.5초에 한 번만 남긴다.
var lastTrace: (String, TimeInterval) = ("", 0)
func trace(_ s: String) {
    let now = ProcessInfo.processInfo.systemUptime
    if s == lastTrace.0 && now - lastTrace.1 < 0.5 { return }
    lastTrace = (s, now)
    log(s)
}

// MARK: - 손쉬운 사용 API 도우미

extension AXUIElement {
    func value(_ name: String) -> AnyObject? {
        var v: AnyObject?
        return AXUIElementCopyAttributeValue(self, name as CFString, &v) == .success ? v : nil
    }
    func element(_ name: String) -> AXUIElement? {
        guard let v = value(name), CFGetTypeID(v) == AXUIElementGetTypeID() else { return nil }
        return (v as! AXUIElement)
    }
    var role: String { value(kAXRoleAttribute) as? String ?? "" }
    var desc: String { value(kAXDescriptionAttribute) as? String ?? "" }
    var children: [AXUIElement] { value(kAXChildrenAttribute) as? [AXUIElement] ?? [] }
    var domID: String { value("AXDOMIdentifier") as? String ?? "" }
    var domClasses: [String] { value("AXDOMClassList") as? [String] ?? [] }
    var frame: CGRect? {
        guard let p = value(kAXPositionAttribute), let s = value(kAXSizeAttribute),
              CFGetTypeID(p) == AXValueGetTypeID(), CFGetTypeID(s) == AXValueGetTypeID() else { return nil }
        var pt = CGPoint.zero, sz = CGSize.zero
        AXValueGetValue(p as! AXValue, .cgPoint, &pt)
        AXValueGetValue(s as! AXValue, .cgSize, &sz)
        return CGRect(origin: pt, size: sz)
    }
    @discardableResult func press() -> Bool {
        AXUIElementPerformAction(self, kAXPressAction as CFString) == .success
    }
}

func hasClass(_ classes: [String], _ part: String) -> Bool { classes.contains { $0.contains(part) } }

// MARK: - Figma 화면 구조 읽기

/// 파일 하나(분할 화면이면 한쪽)의 패널 상태.
struct PaneLayout {
    var expandButton: AXUIElement?    // UI가 접혀 있을 때만 있는 "Expand UI" 버튼
    var minimizeButton: AXUIElement?  // UI가 펼쳐져 있을 때의 "Minimize UI" 버튼
    var leftPanel: CGRect?            // 펼쳐진 왼쪽 패널
    var rightPanel: CGRect?           // 펼쳐진 오른쪽 패널
    var toolbar: CGRect?              // 아래쪽 가운데 도구 막대
    var filePill: CGRect?             // UI가 접혀 있을 때 왼쪽 위의 파일 이름 칸 (페이지 버튼을 그 아래 같은 폭으로 둔다)
    var floating = false              // 메뉴·팝업·색상 선택기 같은 떠 있는 UI가 열려 있음
    var loaded = false                // 편집 화면의 패널 구조가 만들어져 있음 (로딩 중이 아님)
    var isMinimized: Bool { expandButton != nil }
    var isExpanded: Bool { leftPanel != nil }
    var isHidden: Bool { !isMinimized && !isExpanded }  // ⌘\ 로 UI 전체를 숨긴 상태
}

/// 왼쪽 패널 페이지 목록의 한 줄.
struct PageRow {
    let title: String
    let divider: Bool
    let active: Bool
    let element: AXUIElement
}

/// 페이지를 가리키는 값. 이름이 같은 페이지가 있을 수 있어 목록 안 순서도 함께 기억한다.
struct PageEntry: Hashable {
    let title: String
    let index: Int
    var label: String { title.trimmingCharacters(in: .whitespaces) }
}

/// 파일 하나의 페이지 목록과 이동 기록.
final class PageBook {
    var pages: [PageEntry] = []
    var current: PageEntry?
    var back: [PageEntry] = []
    var forward: [PageEntry] = []
    var recent: [PageEntry] = []    // 최근에 간 페이지, 가장 최근이 앞
    var fromDisk = false            // 지난번에 저장해 둔 값 (아직 패널에서 다시 확인하지 않음)
    var ids: [String: String] = [:] // 파일 주소의 페이지 번호(node-id) → 페이지 이름. 가 본 페이지마다 하나씩 배운다

    /// 파일별로 저장해 두는 값: 페이지 목록, 지금 페이지, 최근 페이지 (순서 번호)
    var saved: [String: Any] {
        ["pages": pages.map(\.title), "current": current?.index ?? -1, "recent": recent.map(\.index),
         "ids": ids, "at": Date().timeIntervalSince1970]
    }
    convenience init?(saved d: [String: Any]) {
        guard var titles = d["pages"] as? [String], !titles.isEmpty else { return nil }
        self.init()
        // 1.3.0까지는 목록이 통째로 두 번 저장되는 문제가 있었다. 앞 절반과 뒤 절반이 같으면 절반만 쓴다.
        let half = titles.count / 2
        let doubled = titles.count % 2 == 0 && half > 0 && Array(titles[..<half]) == Array(titles[half...])
        if doubled { titles = Array(titles[..<half]) }
        func fix(_ i: Int) -> Int { doubled ? i % half : i }
        pages = titles.enumerated().map { PageEntry(title: $1, index: $0) }
        if let c = d["current"] as? Int, pages.indices.contains(fix(c)), c >= 0 { current = pages[fix(c)] }
        var seen = Set<Int>()
        recent = (d["recent"] as? [Int] ?? []).map(fix).filter { pages.indices.contains($0) && seen.insert($0).inserted }
            .map { pages[$0] }
        ids = d["ids"] as? [String: String] ?? [:]
        fromDisk = true
    }

    /// 뒤로·앞으로 기록은 50개까지만 둔다.
    func trimHistory() {
        if back.count > 50 { back.removeFirst(back.count - 50) }
        if forward.count > 50 { forward.removeFirst(forward.count - 50) }
    }

    func noteVisit(_ e: PageEntry) {
        recent.removeAll { $0 == e }
        recent.insert(e, at: 0)
        if recent.count > 8 { recent.removeLast() }
    }

    /// 목록이 바뀌었을 수 있으니 이름과 순서로 지금 목록의 페이지를 다시 찾는다.
    func resolve(_ e: PageEntry) -> PageEntry? {
        let same = pages.filter { $0.title == e.title }
        return same.min { abs($0.index - e.index) < abs($1.index - e.index) }
    }
}

enum FigmaReader {
    /// 파일 주소(…?node-id=6312-52872&…)에 들어 있는 지금 페이지 번호. 패널이 접혀 있어도 읽힌다.
    /// 읽기만 한다. (이 주소를 열어서 이동하면 파일 탭을 새로 불러오므로 이동에는 쓰지 않는다)
    static func pageID(of webArea: AXUIElement) -> String? {
        guard let url = webArea.value("AXURL") as? URL,
              let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems else { return nil }
        return items.first { $0.name == "node-id" }?.value
    }

    /// 펼쳐진 왼쪽 패널에서 페이지 목록을 읽는다. 패널이 접혀 있으면 nil.
    /// 레이어 목록·캔버스·접근성용 문서 트리처럼 큰 부분은 건너뛴다.
    /// 파일 주소(https://www.figma.com/design/<고유값>/이름)의 고유값. 이름이 같은 파일도 서로 다르다.
    static func fileID(of webArea: AXUIElement) -> String? {
        guard let url = webArea.value("AXURL") as? URL, url.host?.hasSuffix("figma.com") == true else { return nil }
        let parts = url.pathComponents   // ["/", "design", "<고유값>", "이름"]
        return parts.count > 2 ? parts[2] : nil
    }

    static func pageRows(in webArea: AXUIElement) -> [PageRow]? {
        var budget = 3000
        var rows: [PageRow] = []
        var listDone = false
        func walk(_ e: AXUIElement, _ depth: Int) {
            guard depth <= 40, budget > 0, !listDone else { return }
            budget -= 1
            // 표는 같은 칸을 줄(AXRow)로 한 번, 열(AXColumn)로 한 번 더 내보낸다. 열 쪽은 건너뛴다.
            if e.role == "AXColumn" { return }
            let classes = e.domClasses
            let id = e.domID
            if id == "fullscreen-root" || id == "hidden-input-activedescendant" { return }
            if hasClass(classes, "web_stacking--layer") || hasClass(classes, "properties_panel--drillDownContainer")
                || hasClass(classes, "positioned_design_toolbelt") { return }
            if hasClass(classes, "pageRowButton") {
                if rows.contains(where: { CFEqual($0.element, e) }) { return }  // 같은 줄이 두 번 잡히지 않게
                var title = e.value(kAXTitleAttribute) as? String ?? ""
                // "Ready for dev" 같은 상태 아이콘의 이름이 제목 뒤에 붙어 나온다.
                for c in e.children where c.role == "AXImage" || !c.children.isEmpty {
                    for d in [c] + c.children where !d.desc.isEmpty && title.hasSuffix(" " + d.desc) {
                        title = String(title.dropLast(d.desc.count + 1))
                    }
                }
                rows.append(PageRow(title: title, divider: hasClass(classes, "Divider"),
                                    active: hasClass(classes, "pageRowActive"), element: e))
                return
            }
            for c in e.children { walk(c, depth + 1) }
            if hasClass(classes, "pagesList") { listDone = true }
        }
        walk(webArea, 0)
        return rows.isEmpty ? nil : rows
    }

    /// 창 안의 웹 화면(탭 막대, 파일 편집 화면)을 찾는다. 웹 화면 안쪽으로는 들어가지 않는다.
    static func webAreas(in window: AXUIElement) -> [AXUIElement] {
        var out: [AXUIElement] = []
        var budget = 300
        func walk(_ e: AXUIElement, _ depth: Int) {
            guard depth <= 16, budget > 0 else { return }
            budget -= 1
            if e.role == "AXWebArea" { out.append(e); return }
            for c in e.children { walk(c, depth + 1) }
        }
        walk(window, 0)
        return out
    }

    /// 왼쪽 위 파일 이름 칸: "Expand UI" 버튼을 품은 가장 가까운 조상 중, 화면 왼쪽 위에 붙은 낮고 넓은 칸.
    static func filePill(around button: AXUIElement, pane: CGRect) -> CGRect? {
        guard let b = button.frame else { return nil }
        var e: AXUIElement? = button.element(kAXParentAttribute)
        for _ in 0..<6 {
            guard let cur = e else { return nil }
            if let f = cur.frame, f.width >= b.width + 40, f.width <= 600, f.height <= 72, f.minX - pane.minX < 40, f.minY - pane.minY < 40 {
                return f
            }
            e = cur.element(kAXParentAttribute)
        }
        return nil
    }

    /// 편집 화면 하나에서 좌우 패널과 접기/펼치기 버튼을 찾는다.
    /// 레이어 목록처럼 큰 하위 트리는 건너뛰어서 가볍게 유지한다.
    static func layout(of webArea: AXUIElement) -> PaneLayout {
        var result = PaneLayout()
        var budget = 900
        let paneFrame = webArea.frame ?? .zero
        let leaves: Set<String> = ["AXStaticText", "AXImage", "AXLink", "AXPopUpButton", "AXToolbar",
                                   "AXTextField", "AXTextArea", "AXHeading", "AXSlider", "AXSplitter"]
        func walk(_ e: AXUIElement, _ depth: Int) {
            guard depth <= 14, budget > 0 else { return }
            budget -= 1
            let role = e.role
            if role == "AXMenu" { result.floating = true; return }
            if leaves.contains(role) { return }
            let classes = e.domClasses
            if hasClass(classes, "web_stacking--layer") {
                if hasFloatingContent(e, pane: paneFrame) { result.floating = true }
                return
            }
            if role == "AXButton" {
                if hasClass(classes, "toggle_expanded_sidebar_button") { result.expandButton = e; result.filePill = filePill(around: e, pane: paneFrame) }
                return
            }
            if hasClass(classes, "toolbelt--toolbeltWrapper") { result.toolbar = e.frame; return }
            if hasClass(classes, "left_panel_positioner") { result.loaded = true }
            if e.domID == "left-panel-container" {
                if let f = e.frame, f.height > 100 {
                    result.leftPanel = f
                    result.minimizeButton = minimizeButton(in: e, panel: f)
                }
                return
            }
            if hasClass(classes, "properties_panel--drillDownContainer") {
                if let f = e.frame, f.height > 100 { result.rightPanel = f }
                return
            }
            for c in e.children { walk(c, depth + 1) }
        }
        walk(webArea, 0)
        return result
    }

    /// 편집 화면의 키보드 포커스를 받는 요소 (캔버스).
    static func focusTarget(in webArea: AXUIElement) -> AXUIElement? {
        var budget = 200
        func walk(_ e: AXUIElement, _ depth: Int) -> AXUIElement? {
            guard depth <= 8, budget > 0 else { return nil }
            budget -= 1
            if hasClass(e.domClasses, "focus-target") { return e }
            for c in e.children { if let hit = walk(c, depth + 1) { return hit } }
            return nil
        }
        return walk(webArea, 0)
    }

    /// Figma는 메뉴·팝업을 별도의 겹침 레이어에 그린다. 그 안에 눈에 보이는 크기의
    /// 요소가 있으면 무언가 열려 있는 것으로 본다 (툴팁·알림처럼 낮은 것은 제외).
    private static func hasFloatingContent(_ layer: AXUIElement, pane: CGRect) -> Bool {
        var budget = 150
        func walk(_ e: AXUIElement, _ depth: Int) -> Bool {
            guard depth <= 7, budget > 0 else { return false }
            budget -= 1
            if e.role == "AXMenu" { return true }
            if depth > 0, let f = e.frame, f.width >= 80, f.height >= 80,
               !(f.width >= pane.width * 0.9 && f.height >= pane.height * 0.9) {
                return true
            }
            return e.children.contains { walk($0, depth + 1) }
        }
        return walk(layer, 0)
    }

    /// 왼쪽 패널 머리말의 "Minimize UI" 버튼. 이름이 번역되어 있어도 찾도록
    /// 위치(패널 오른쪽 위 구석의 작은 버튼)로도 찾는다.
    private static func minimizeButton(in container: AXUIElement, panel: CGRect) -> AXUIElement? {
        var byPosition: AXUIElement?
        var budget = 120
        func walk(_ e: AXUIElement, _ depth: Int) -> AXUIElement? {
            guard depth <= 3, budget > 0 else { return nil }
            budget -= 1
            if e.role == "AXButton" {
                if e.desc == "Minimize UI" { return e }
                if byPosition == nil, let f = e.frame, f.width <= 40, f.height <= 40,
                   f.maxX >= panel.maxX - 30, f.minY <= panel.minY + 24 {
                    byPosition = e
                }
                return nil
            }
            for c in e.children { if let hit = walk(c, depth + 1) { return hit } }
            return nil
        }
        return walk(container, 0) ?? byPosition
    }
}

// MARK: - 동작 엔진

/// Layerhover가 패널을 어떤 방법으로 꺼냈는지. 넣을 때 같은 방법을 되돌린다.
enum OpenedVia { case expandButton, showUI }

final class Pane {
    let element: AXUIElement
    var frame: CGRect
    var present = true
    var autoOpened = false          // Layerhover가 펼친 경우에만 자동으로 접는다
    var openedAt: TimeInterval = 0
    var leftMaxX: CGFloat?          // 펼쳐진 왼쪽 패널의 오른쪽 끝
    var rightMinX: CGFloat?         // 펼쳐진 오른쪽 패널의 왼쪽 끝
    var edgeSince: TimeInterval?
    var edgeLatched = false         // 한 번 끝에 닿으면 떠날 때까지 다시 반응하지 않음
    var outSince: TimeInterval?
    var regionsKnown = false
    var via = OpenedVia.expandButton
    // 처음 본 화면을 최소화 모드로 맞추는 작업 (화면마다 한 번만)
    var defaultDone = false
    var firstSeen: TimeInterval = 0
    var shownForDefault = false
    // 페이지 바로가기
    var fileKey = ""                 // 파일 이름 (화면에 보이는 이름, 작업 기록에 쓴다)
    var fileID: String?              // 주소에 들어 있는 파일 고유값. 이름이 같은 파일을 가려낸다
    var bookKey: String { fileID ?? fileKey }   // 페이지 기록을 나눠 두는 열쇠
    var mode = Mode.unknown
    var lastPagesRead: TimeInterval = 0
    var toolbar: CGRect?
    var filePill: CGRect?
    var pageID: String?                          // 마지막으로 읽은 주소의 페이지 번호
    var agents = 0                               // Figma가 보여 주는 연결된 AI 에이전트 수
    var popupOpen = false                        // Figma 메뉴·팝업이 열려 있다 (그동안 페이지 버튼은 비켜 준다)
    // 패널이 펼쳐지고 접히는 순간을 바로 알아채려고 붙잡아 두는 버튼들.
    // 접혀 있을 때는 "펼치기" 버튼이, 펼쳐져 있을 때는 "접기" 버튼이 화면에 있다. 사라지면 상태가 바뀐 것이다.
    var expandElement: AXUIElement?
    var lastX: CGFloat?             // 직전 확인 때 마우스 x (끝으로 달려가는 속도를 재려고)
    var lastT: TimeInterval = 0
    var minimizeElement: AXUIElement?
    // Layerhover가 펼치기를 누른 직후: Figma가 패널을 그리기 전이라 아직 "접힘"으로 읽힌다.
    // 이 시각까지는 접힘으로 읽혀도 믿지 않는다 (버튼이 사라졌다 다시 나오는 깜빡임을 막는다).
    var expectExpandedUntil: TimeInterval = 0
    // 패널 상태가 바뀌는 중: 이 시각까지는 매 확인마다 화면 구조를 다시 읽는다
    // (바뀌는 도중에는 접힘도 펼침도 아닌 상태로 읽혀서, 다음 정기 확인까지 버튼이 늦게 돌아왔다).
    var settlingUntil: TimeInterval = 0
    var pendingTitle: (String, TimeInterval)?    // 방금 누른 페이지: 주소가 바뀌면 그 번호를 이 이름으로 배운다
    enum Mode { case unknown, minimized, expanded, hidden }
    init(element: AXUIElement, frame: CGRect, now: TimeInterval) {
        self.element = element; self.frame = frame; self.firstSeen = now
    }
}

/// 접힌 화면에서 페이지를 옮기는 작업: 잠깐 펼쳐서 누르고 다시 접는다.
final class PageJob {
    enum Phase { case waitRows, waitMinimize }
    let pane: Pane
    let target: PageEntry?          // nil이면 목록만 읽어 온다
    let move: PageMove
    var phase = Phase.waitRows
    var started: TimeInterval
    var lastCount = -1              // 패널이 펼쳐지는 동안 목록이 덜 그려져 있을 수 있어, 개수가 같게 두 번 읽힐 때까지 기다린다
    init(pane: Pane, target: PageEntry?, move: PageMove, now: TimeInterval) {
        self.pane = pane; self.target = target; self.move = move; self.started = now
    }
}

enum PageMove { case jump, back, forward }

final class Engine {
    // 조절값
    let hardEdgeZone: CGFloat = 2      // 화면 끝과 맞닿은 경계: 커서가 멈추므로 좁게
    let softEdgeZone: CGFloat = 8      // 분할 화면 경계나 창 모드: 조금 넓게
    var hardDwell: TimeInterval = 0.06  // 끝에 닿은 뒤 펼치기까지 머무는 시간
    var softDwell: TimeInterval = 0.18
    // 접히는 속도. 다시 빌드하지 않고도 바꿀 수 있게 설정(defaults)에서 읽는다.
    //   defaults write app.layerhover.Layerhover collapseDelay -float 0.15
    //   defaults write app.layerhover.Layerhover leaveMargin -float 12
    var leaveMargin: CGFloat = 12      // 패널 밖으로 이만큼 나가야 접기 시작
    var collapseDelay: TimeInterval = 0.12
    let settleTime: TimeInterval = 0.35  // 펼친 뒤 패널 위치를 읽기까지 기다리는 시간

    var enabled = true
    var rightEdge = false  // 오른쪽 속성 패널은 Figma가 선택 시 띄우므로 기본은 왼쪽 끝만
    var minimizeByDefault = true
    var requireFrontmost = true
    var mouse: () -> CGPoint = { CGEvent(source: nil)?.location ?? .zero }

    private var figma: NSRunningApplication?
    private var lastLookup: TimeInterval = -10
    private var pid: pid_t = 0
    private var app: AXUIElement?
    private var panes: [Pane] = []
    private var lastRefresh: TimeInterval = 0
    private var lastFrameTrack: TimeInterval = 0
    private(set) var windowFrame: CGRect?   // Figma 창 (페이지 버튼 그림자가 창 밖으로 나가지 않게 자른다)
    private var windowElement: AXUIElement?

    /// 창 크기·분할 경계가 바뀌는 것을 매 확인(0.04초)마다 본다. 화면 목록 전체를 다시 읽는 것(0.7초마다)과 달리
    /// 이미 아는 화면의 위치만 읽어서 가볍다. 바뀌면 페이지 버튼 위치를 바로 다시 맞춘다.
    private func trackFrames() {
        var changed = false
        if let w = windowElement?.frame, w != windowFrame { windowFrame = w; changed = true }
        for pane in panes where pane.present {
            if let f = pane.element.frame, f != pane.frame { pane.frame = f; changed = true }
            // 패널 상태: 붙잡아 둔 버튼이 사라졌으면 펼쳐졌거나 접힌 것이다. 그때만 화면 구조를 다시 읽는다.
            // (버튼 하나의 위치만 물어보므로 가볍다. 0.5초마다 전체를 읽는 것만으로는 버튼이 늘 한 박자 늦었다.)
            if pageJob?.pane !== pane {
                let now = ProcessInfo.processInfo.systemUptime
                let gone: Bool
                switch pane.mode {
                case .minimized: gone = pane.expandElement.map { $0.frame == nil } ?? false
                case .expanded: gone = pane.minimizeElement.map { $0.frame == nil } ?? false
                default: gone = false
                }
                if gone { pane.settlingUntil = now + 1.0 }
                if gone || now < pane.settlingUntil {
                    if updateLayout(pane) { changed = true }
                    // 접힘이나 펼침으로 자리를 잡았으면 매번 읽기를 그만둔다
                    if !gone && (pane.mode == .minimized || pane.mode == .expanded) && now >= pane.expectExpandedUntil {
                        pane.settlingUntil = 0
                    }
                }
            }
        }
        if changed { onPagesChanged?() }
    }

    /// 화면 구조를 읽어 패널 상태·도구 막대 위치·팝업 여부를 갱신한다. 바뀐 것이 있으면 true.
    @discardableResult
    private func updateLayout(_ pane: Pane) -> Bool {
        var changed = false
        let layout = FigmaReader.layout(of: pane.element)
        var mode: Pane.Mode = layout.isMinimized ? .minimized : layout.isExpanded ? .expanded
            : layout.loaded ? .hidden : .unknown
        let now = ProcessInfo.processInfo.systemUptime
        if now < pane.expectExpandedUntil {
            if mode == .expanded { pane.expectExpandedUntil = 0 }   // 펼쳐진 것을 확인했다
            else { mode = .expanded }                                // 아직 그려지는 중: 펼침으로 본다
        }
        if mode != pane.mode { log("panel \(pane.mode) -> \(mode) x=\(Int(pane.frame.minX))"); pane.mode = mode; changed = true }
        if layout.toolbar != pane.toolbar { pane.toolbar = layout.toolbar; changed = true }
        if let f = layout.filePill, f != pane.filePill { log("file pill \(Int(f.minX)),\(Int(f.minY)) \(Int(f.width))x\(Int(f.height))"); pane.filePill = f; changed = true }
        if layout.floating != pane.popupOpen { log("popup \(layout.floating) x=\(Int(pane.frame.minX))"); pane.popupOpen = layout.floating; changed = true }
        pane.expandElement = mode == .minimized ? layout.expandButton : nil
        pane.minimizeElement = layout.minimizeButton
        return changed
    }

    func tick() {
        guard AXIsProcessTrusted() else { return }
        let now = ProcessInfo.processInfo.systemUptime
        if figma == nil || figma!.isTerminated {
            guard now - lastLookup > 1 else { return }
            lastLookup = now
            figma = NSRunningApplication.runningApplications(withBundleIdentifier: figmaBundleID).first
            app = nil; panes = []
        }
        guard let running = figma else { return }
        if requireFrontmost && !running.isActive {
            // 페이지를 읽거나 옮기려고 펼친 패널은 Figma가 뒤로 가도 마저 접는다 (열린 채 남지 않게).
            if let job = pageJob, app != nil { stepPageJob(job, now) }
            if panes.contains(where: { $0.autoOpened }) { trace("waiting: Figma is not frontmost") }
            return
        }
        if app == nil || pid != running.processIdentifier {
            pid = running.processIdentifier
            let ax = AXUIElementCreateApplication(pid)
            AXUIElementSetMessagingTimeout(ax, 0.3)
            // Electron 앱은 이 값을 켜야 웹 화면 내부를 손쉬운 사용 API로 내보낸다.
            AXUIElementSetAttributeValue(ax, "AXManualAccessibility" as CFString, kCFBooleanTrue)
            app = ax; panes = []; lastRefresh = 0
        }
        if now - lastRefresh > 0.7 { refreshPanes(); lastRefresh = now }
        // 창 위치·버튼 상태는 0.12초마다 본다 (Figma에 묻는 일이라 0.04초마다 하면 CPU를 꽤 쓴다).
        // 페이지 이동 중이거나 패널이 막 바뀌는 중에는 매번 본다. 마우스 확인은 아래에서 매번 한다.
        if pageJob != nil || panes.contains(where: { now < $0.settlingUntil }) || now - lastFrameTrack >= 0.11 {
            trackFrames(); lastFrameTrack = now
        }
        if now - lastURLCheck > 0.2 { watchAddresses(now); lastURLCheck = now }
        if let job = pageJob { stepPageJob(job, now) }
        if now - lastWatch > 0.5 { watchPages(now); lastWatch = now }
        guard enabled else { return }
        let p = mouse()
        for pane in panes where pane.present && pageJob?.pane !== pane {
            if !pane.defaultDone {
                if minimizeByDefault { applyDefault(pane, now) } else { pane.defaultDone = true }
                continue
            }
            if pane.autoOpened { whileOpen(pane, p, now) } else { whileClosed(pane, p, now) }
        }
    }

    private func refreshPanes() {
        guard let app else { return }
        guard let window = app.element(kAXFocusedWindowAttribute) ?? app.element(kAXMainWindowAttribute) else {
            trace("cannot read Figma window (accessibility)")
            panes.forEach { $0.present = false }; return
        }
        windowElement = window
        windowFrame = window.frame
        var found: [(AXUIElement, CGRect)] = []
        for area in FigmaReader.webAreas(in: window) {
            if let f = area.frame, f.width > 200, f.height > 200 { found.append((area, f)) }
        }
        // 탭 막대가 있는 바깥 웹 화면은 편집 화면을 통째로 감싸므로 제외한다.
        let editors = found.filter { outer in
            !found.contains { inner in !CFEqual(inner.0, outer.0) && outer.1.contains(inner.1) }
        }
        if editors.isEmpty { trace("no Figma file panes found") }
        panes.forEach { $0.present = false }
        for (el, f) in editors {
            let title = (el.value(kAXTitleAttribute) as? String ?? "")
                .replacingOccurrences(of: " – Figma", with: "")
            let fileID = FigmaReader.fileID(of: el)
            if let known = panes.first(where: { CFEqual($0.element, el) }) {
                known.frame = f; known.present = true; known.fileKey = title
                if let fileID { known.fileID = fileID }
            } else {
                let pane = Pane(element: el, frame: f, now: ProcessInfo.processInfo.systemUptime)
                pane.fileKey = title
                pane.fileID = fileID
                panes.append(pane)
                log("new pane \(f) (total \(panes.count))")
            }
        }
        // 닫힌 탭의 기록이 쌓이지 않게 정리 (자동으로 펼쳐 둔 것은 돌아올 때까지 기억)
        if panes.count > 24 { panes.removeAll { !$0.present && !$0.autoOpened } }
    }

    /// Show/Hide UI(⌘\\)를 그 편집 화면에 보낸다. 분할 화면에서는 키 입력이 포커스된 쪽으로
    /// 가므로 먼저 그 화면의 캔버스에 포커스를 준다. (보기 메뉴 항목을 프로그램으로 누르는 방식은
    /// 분할 화면에서 엉뚱한 화면에 적용되는 경우가 있어 실제 키 입력을 쓴다.)
    /// ⌘\\ 키 입력은 포커스를 옮긴 뒤 조금 늦게 보내므로, 이어서 다른 화면에 보내면 포커스가
    /// 겹쳐 한 화면에 두 번 들어갈 수 있다. 한 번 보낸 뒤 잠시 다음 입력을 막는다.
    private var uiToggleBusyUntil: TimeInterval = 0
    private var canToggleUI: Bool { ProcessInfo.processInfo.systemUptime >= uiToggleBusyUntil }

    private func toggleUI(focusing pane: Pane) -> Bool {
        guard canToggleUI else { return false }
        uiToggleBusyUntil = ProcessInfo.processInfo.systemUptime + 0.6
        guard let target = FigmaReader.focusTarget(in: pane.element) else { log("focus target not found"); return false }
        AXUIElementSetAttributeValue(target, kAXFocusedAttribute as CFString, kCFBooleanTrue)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { Engine.sendShowHideUI() }
        return true
    }

    static func sendShowHideUI() {
        let source = CGEventSource(stateID: .hidSystemState)
        let command: CGKeyCode = 55, backslash: CGKeyCode = 42
        let steps: [(CGKeyCode, Bool, CGEventFlags)] = [
            (command, true, .maskCommand), (backslash, true, .maskCommand),
            (backslash, false, .maskCommand), (command, false, []),
        ]
        for (code, down, flags) in steps {
            guard let event = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: down) else { continue }
            event.flags = flags
            event.post(tap: .cghidEventTap)
        }
    }

    private func isHardEdge(_ x: CGFloat, _ y: CGFloat) -> Bool {
        var count: UInt32 = 0
        CGGetDisplaysWithPoint(CGPoint(x: x, y: y), 0, nil, &count)
        return count == 0
    }

    private func whileClosed(_ pane: Pane, _ p: CGPoint, _ now: TimeInterval) {
        let f = pane.frame
        guard p.y >= f.minY, p.y <= f.maxY else { pane.edgeSince = nil; pane.edgeLatched = false; return }

        let leftHard = isHardEdge(f.minX - 2, p.y)
        let rightHard = isHardEdge(f.maxX + 2, p.y)
        // 페이지 버튼이 왼쪽 아래 끝 가까이에 있다. 버튼을 누르러 가다 끝에 닿아 패널이 펼쳐지지 않게,
        // 버튼이 있는 아래쪽 띠에서는 왼쪽 끝 반응을 끈다.
        let inButtonBand = protectButtonBand && (buttonBandAtTop
            ? (p.y >= f.minY + PageChipPlace.topLeftY - 16 && p.y <= f.minY + PageChipPlace.topLeftY + ChipModel.height + 16)
            : p.y >= f.maxY - Engine.buttonBand)
        // 미리 누르기 ("바로"일 때만): 마우스가 화면 왼쪽 끝으로 빠르게 달려가고 있으면 닿기 직전에 누른다.
        // Figma가 패널을 그리는 데 0.25~0.35초 걸려서, 닿은 뒤에 누르면 한 박자 늦게 느껴진다.
        let vx: CGFloat = pane.lastX.map { now > pane.lastT ? ($0 - p.x) / CGFloat(now - pane.lastT) : 0 } ?? 0   // 왼쪽으로 가는 속도 (pt/초)
        pane.lastX = p.x; pane.lastT = now
        let dist = p.x - f.minX
        let heading = hardDwell == 0 && leftHard && !inButtonBand && dist > hardEdgeZone && dist <= 60
            && vx > 900 && dist / vx < 0.07
        let atLeft = heading || (!inButtonBand && p.x >= f.minX - 1 && p.x <= f.minX + (leftHard ? hardEdgeZone : softEdgeZone))
        let atRight = rightEdge && p.x <= f.maxX + 1 && p.x >= f.maxX - (rightHard ? hardEdgeZone : softEdgeZone)
        guard atLeft || atRight else { pane.edgeSince = nil; pane.edgeLatched = false; return }
        guard !pane.edgeLatched, NSEvent.pressedMouseButtons == 0 else { return }

        let since = pane.edgeSince ?? now
        pane.edgeSince = since
        let hard = atLeft ? leftHard : rightHard
        guard now - since >= (hard ? hardDwell : softDwell) else { return }

        pane.edgeLatched = true
        pane.edgeSince = nil
        let side = heading ? "left, early" : atLeft ? "left" : "right"
        var opened = false
        let t0 = ProcessInfo.processInfo.systemUptime
        // 빠른 길: 정기 확인 때 찾아 둔 "펼치기" 버튼을 바로 누른다. 화면 구조를 다시 읽는 데 큰 파일에서는
        // 0.1초 넘게 걸려서, 끝에 닿은 뒤 펼쳐지기까지 늦게 느껴졌다. 누르기가 실패할 때만 다시 읽는다.
        if let cached = pane.expandElement, cached.press() {
            opened = true
            pane.via = .expandButton
            log("expand (\(side) edge) cached \(Int((ProcessInfo.processInfo.systemUptime - t0) * 1000))ms")
        }
        let layout = opened ? PaneLayout() : FigmaReader.layout(of: pane.element)
        if opened {
        } else if let button = layout.expandButton {
            opened = button.press()
            pane.via = .expandButton
            log("expand (\(side) edge) pressed=\(opened) \(Int((ProcessInfo.processInfo.systemUptime - t0) * 1000))ms")
        } else if layout.isHidden {
            guard canToggleUI else { pane.edgeLatched = false; return }  // 잠시 뒤 다시 시도
            opened = toggleUI(focusing: pane)
            pane.via = .showUI
            log("show UI (\(side) edge) pressed=\(opened)")
        } else {
            log("edge hit, nothing to expand (expanded=\(layout.isExpanded))")
        }
        if opened {
            ActivityLog.shared.note(.reveal)
            // 패널이 펼쳐지는 것과 동시에 페이지 버튼이 비키도록, 확인을 기다리지 않고 바로 알린다.
            if pane.via == .expandButton {
                // 펼치기를 누른 뒤 Figma가 패널을 그리기까지 0.2~0.3초 걸린다. 누르는 순간에 페이지 버튼을 숨기면
                // 그동안 왼쪽 아래가 비어 보인다. 버튼은 그대로 두고, 패널이 실제로 나타나는 순간(매 확인마다 봄)에 숨긴다.
                pane.minimizeElement = nil          // 지난번에 붙잡아 둔 것은 이미 없는 버튼이다
                pane.settlingUntil = now + 1.0
            }
            pane.autoOpened = true
            pane.openedAt = now
            pane.regionsKnown = false; pane.outSince = nil
        }
    }

    /// 처음 본 편집 화면(새로 연 파일, 처음 보는 탭, Layerhover 시작 시 열려 있던 화면)을
    /// 한 번만 최소화 모드(Minimize UI)로 맞춘다. 그 뒤에 사용자가 바꾼 모드는 건드리지 않는다.
    private func applyDefault(_ pane: Pane, _ now: TimeInterval) {
        let layout = FigmaReader.layout(of: pane.element)
        if layout.isMinimized {
            pane.defaultDone = true
        } else if layout.isExpanded {
            if let button = layout.minimizeButton {
                if let rows = FigmaReader.pageRows(in: pane.element) { absorb(rows, pane, now) }
                log("default: minimize pressed=\(button.press())")
                pane.defaultDone = true
                pane.edgeLatched = true
            }
        } else if layout.loaded && !pane.shownForDefault && now - pane.firstSeen > 0.8 && canToggleUI {
            // ⌘\ 로 UI를 숨긴 화면: 먼저 다시 보이게 한 뒤, 펼쳐지면 위에서 최소화한다.
            log("default: show hidden UI pressed=\(toggleUI(focusing: pane))")
            pane.shownForDefault = true
            pane.firstSeen = now
        }
        // 로딩이 끝나지 않거나 반응이 없으면 포기한다.
        if !pane.defaultDone && now - pane.firstSeen > 8 {
            log("default: gave up")
            pane.defaultDone = true
        }
    }

    /// 사용자가 Layerhover보다 먼저 직접 넣어 버렸는지.
    private func closedByUser(_ pane: Pane, _ layout: PaneLayout) -> Bool {
        switch pane.via {
        case .expandButton: return layout.isMinimized || layout.isHidden
        case .showUI: return layout.isHidden
        }
    }

    private func storeRegions(_ pane: Pane, _ layout: PaneLayout) {
        pane.leftMaxX = layout.leftPanel?.maxX
        pane.rightMinX = layout.rightPanel?.minX
        pane.regionsKnown = true
    }

    private func insidePanels(_ pane: Pane, _ p: CGPoint) -> Bool {
        guard pane.frame.insetBy(dx: -2, dy: -2).contains(p) else { return false }
        if let l = pane.leftMaxX, p.x <= l + leaveMargin { return true }
        if let r = pane.rightMinX, p.x >= r - leaveMargin { return true }
        return false
    }

    private func whileOpen(_ pane: Pane, _ p: CGPoint, _ now: TimeInterval) {
        guard now - pane.openedAt >= settleTime else { return }
        if !pane.regionsKnown {
            let layout = FigmaReader.layout(of: pane.element)
            if layout.isExpanded {
                storeRegions(pane, layout)
                log("panels: leftMaxX=\(pane.leftMaxX.map { "\(Int($0))" } ?? "-") rightMinX=\(pane.rightMinX.map { "\(Int($0))" } ?? "-")")
            } else if pane.via == .showUI, let button = layout.expandButton {
                // UI를 다시 보이게 했더니 접힌(Minimize UI) 상태로 돌아온 경우: 마저 펼친다.
                log("shown but minimized, expanding pressed=\(button.press())")
                pane.openedAt = now
                return
            } else {
                // 펼쳐지지 않았거나 사용자가 바로 다시 넣은 경우
                if now - pane.openedAt > 2.0 { pane.autoOpened = false; log("gave up: not expanded") }
                return
            }
        }
        if insidePanels(pane, p) || NSEvent.pressedMouseButtons != 0 {
            trace("hold: pane x=\(Int(pane.frame.minX))..\(Int(pane.frame.maxX)) mouse=(\(Int(p.x)),\(Int(p.y))) " +
                  "inside=\(insidePanels(pane, p)) buttons=\(NSEvent.pressedMouseButtons) " +
                  "leftMaxX=\(pane.leftMaxX.map { "\(Int($0))" } ?? "-") rightMinX=\(pane.rightMinX.map { "\(Int($0))" } ?? "-")")
            pane.outSince = nil
            return
        }

        guard let since = pane.outSince else {
            // 패널을 막 벗어났을 때 폭을 다시 읽는다 (사용자가 폭을 바꿨을 수 있음)
            let layout = FigmaReader.layout(of: pane.element)
            if closedByUser(pane, layout) { pane.autoOpened = false; log("already closed by user"); return }
            if layout.isExpanded { storeRegions(pane, layout) }
            if !insidePanels(pane, p) { pane.outSince = now }
            return
        }
        guard now - since >= collapseDelay else { return }

        let layout = FigmaReader.layout(of: pane.element)
        if closedByUser(pane, layout) { pane.autoOpened = false; log("already closed by user"); return }
        // 패널에서 연 메뉴·팝업이 떠 있거나 이름을 편집하는 중이면 넣지 않고 조금 뒤에 다시 본다.
        let canClose = pane.via == .showUI ? canToggleUI : layout.minimizeButton != nil
        guard !layout.floating, !isEditingText(in: pane), canClose else {
            log("hold: floating=\(layout.floating) minimizeButton=\(layout.minimizeButton != nil)")
            pane.outSince = now
            return
        }
        switch pane.via {
        case .expandButton:
            // 접기 버튼을 붙잡아 둔다. 이 버튼이 화면에서 사라지는 순간(= 실제로 접힌 순간) 페이지 버튼이 나온다.
            pane.mode = .expanded
            pane.minimizeElement = layout.minimizeButton
            pane.expectExpandedUntil = 0
            pane.settlingUntil = now + 1.0   // 접히는 동안은 매번 확인해서, 접히자마자 버튼을 돌려놓는다
            log("minimize pressed=\(layout.minimizeButton!.press())")
        case .showUI: log("hide UI pressed=\(toggleUI(focusing: pane))")
        }
        pane.autoOpened = false
        pane.outSince = nil
        pane.edgeLatched = true  // 접힌 직후 같은 자리에서 다시 펼쳐지지 않게
    }

    /// 키보드 포커스가 입력칸이나 편집 중인 텍스트에 있는지
    private func isTyping() -> Bool {
        guard let app, let focused = app.element(kAXFocusedUIElementAttribute) else { return false }
        let role = focused.role
        return role == "AXTextField" || role == "AXTextArea" || role == "AXComboBox"
    }

    private func isEditingText(in pane: Pane) -> Bool {
        guard let app, let focused = app.element(kAXFocusedUIElementAttribute) else { return false }
        let role = focused.role
        guard role == "AXTextField" || role == "AXTextArea", let f = focused.frame else { return false }
        return insidePanels(pane, CGPoint(x: f.midX, y: f.midY))
    }

    // MARK: 페이지 바로가기

    private var books: [String: PageBook] = [:]
    private(set) var pageJob: PageJob?
    private var lastWatch: TimeInterval = 0
    var coverPanel = true                       // 이동할 때 패널을 가린다. 설정은 없고, 화면 기록 권한이 이미 있는 Mac에서만 동작한다
    var protectButtonBand = true                // 페이지 버튼이 보일 때 그 높이에서는 화면 끝 반응을 끈다
    var buttonBandAtTop = false                 // 페이지 버튼이 왼쪽 위(파일 이름 아래)에 있으면 그 높이를 지킨다
    static let buttonBand: CGFloat = 76         // 아래 여백 12 + 버튼 48 + 위쪽 여유 16
    private var coverPending = false
    private var lastURLCheck: TimeInterval = 0
    private var lastAgentCheck: TimeInterval = 0

    /// 파일 주소의 페이지 번호가 바뀌면 지금 페이지를 바꾼다. 패널을 열지 않아도 이름이 맞게 유지된다.
    /// 번호를 아직 모르는 페이지(가 본 적 없는 페이지, 또는 선택한 오브젝트 번호)는 무시한다.
    private func watchAddresses(_ now: TimeInterval) {
        var changed = false
        for pane in panes where pane.present && pageJob?.pane !== pane {
            guard let id = FigmaReader.pageID(of: pane.element), id != pane.pageID else { continue }
            pane.pageID = id
            let b = book(for: pane)
            if let (title, at) = pane.pendingTitle {
                pane.pendingTitle = nil
                if now - at < 3 {   // Layerhover가 방금 옮긴 페이지
                    b.ids[id] = title
                    savePages(pane)
                    continue
                }
            }
            guard let title = b.ids[id], title != b.current?.title,
                  let entry = b.pages.first(where: { $0.title == title }) else { continue }
            if let cur = b.current { b.back.append(cur); b.forward.removeAll() }
            b.current = entry
            b.noteVisit(entry)
            b.fromDisk = false
            savePages(pane)
            ActivityLog.shared.note(.manualSwitch)
            log("page now \(entry.label) (from address)")
            changed = true
        }
        if changed { onPagesChanged?() }
    }
    var onPagesChanged: (() -> Void)?

    var isFigmaActive: Bool { figma.map { !$0.isTerminated && $0.isActive } ?? false }
    var visiblePanes: [Pane] { panes.filter { $0.present } }

    func book(for pane: Pane) -> PageBook {
        if let b = books[pane.bookKey] { return b }
        // 예전 버전은 파일 이름으로 저장했다. 고유값으로 저장한 것이 없으면 이름으로 저장된 것을 이어 쓴다.
        let all = UserDefaults.standard.dictionary(forKey: "pageBooks")
        let saved = (all?[pane.bookKey] ?? all?[pane.fileKey]) as? [String: Any]
        let b = saved.flatMap(PageBook.init(saved:)) ?? PageBook()
        books[pane.bookKey] = b
        return b
    }

    /// 파일별 페이지 목록과 마지막 페이지를 저장한다. Layerhover를 다시 켜도 버튼에 페이지 이름이 바로 나온다.
    /// 오래 안 연 파일부터 지워서 40개까지만 둔다.
    private func savePages(_ pane: Pane) {
        guard !pane.bookKey.isEmpty, let b = books[pane.bookKey], !b.pages.isEmpty else { return }
        var all = UserDefaults.standard.dictionary(forKey: "pageBooks") ?? [:]
        var entry = b.saved
        entry["name"] = pane.fileKey
        all[pane.bookKey] = entry
        if pane.fileID != nil { all[pane.fileKey] = nil }   // 이름으로 저장했던 예전 항목은 치운다
        if all.count > 40 {
            let oldest = all.min { (($0.value as? [String: Any])?["at"] as? Double ?? 0) < (($1.value as? [String: Any])?["at"] as? Double ?? 0) }
            if let key = oldest?.key { all[key] = nil }
        }
        UserDefaults.standard.set(all, forKey: "pageBooks")
    }

    /// 단축키를 눌렀을 때 대상이 되는 화면: 마우스가 있는 쪽, 없으면 첫 화면.
    func targetPane() -> Pane? {
        let p = mouse()
        return visiblePanes.first { $0.frame.contains(p) } ?? visiblePanes.first
    }

    /// 화면 상태(접힘/펼침/숨김)를 주기적으로 보고, 펼쳐져 있으면 페이지 목록을 읽어 둔다.
    /// 사용자가 패널에서 직접 페이지를 옮긴 것도 여기서 알아챈다.
    private func watchPages(_ now: TimeInterval) {
        var changed = false
        for pane in panes where pane.present && pageJob?.pane !== pane {
            if updateLayout(pane) { changed = true }
            let mode = pane.mode
            // 에이전트 표시는 자주 바뀌지 않는다. 2초에 한 번만 찾는다 (CPU를 아끼려고).
            if now - lastAgentCheck > 2 {
                let agents = AgentStatus.figmaAgents(in: pane.element)
                if agents != pane.agents { pane.agents = agents; changed = true; log("figma agents \(agents) in \(pane.fileKey)") }
            }
            if mode == .expanded && now - pane.lastPagesRead > 0.9,
               let rows = FigmaReader.pageRows(in: pane.element) {
                if absorb(rows, pane, now) { changed = true }
            }
            // 페이지 목록을 읽으려고 패널을 저절로 펼치지 않는다. 패널은 사용자가 원할 때만 열린다:
            // 버튼·단축키로 이동할 때(ensurePages, go), 또는 사용자가 직접 펼쳤을 때(위에서 읽음).
        }
        if now - lastAgentCheck > 2 { lastAgentCheck = now }
        if changed { onPagesChanged?() }
    }

    /// 읽은 목록을 기록에 반영한다. 지금 페이지가 바뀌었으면 true.
    @discardableResult
    /// silent: 패널에 선택된 페이지를 지금 페이지로 바로잡기만 하고 뒤로 가기 기록에는 남기지 않는다.
    /// (이동 직전에 실제 위치를 확인할 때. 저장해 둔 값이 틀렸을 수 있다.)
    private func absorb(_ rows: [PageRow], _ pane: Pane, _ now: TimeInterval, silent: Bool = false) -> Bool {
        pane.lastPagesRead = now
        let b = book(for: pane)
        var entries: [PageEntry] = []
        var active: PageEntry?
        for r in rows where !r.divider && !r.title.trimmingCharacters(in: .whitespaces).isEmpty {
            let e = PageEntry(title: r.title, index: entries.count)
            entries.append(e)
            if r.active { active = e }
        }
        let listChanged = entries != b.pages
        b.pages = entries
        // 패널에 선택된 페이지와 주소의 번호를 짝지어 배운다. 단, 사용자가 패널에서 막 다른 페이지를 눌렀다면
        // 주소가 조금 늦게 바뀌어서 짝이 어긋날 수 있다. 그래서 둘 다 자리 잡은 때에만 배운다:
        //  - silent: Layerhover가 이동하려고 패널을 막 펼친 순간 (아무도 페이지를 바꾸지 않았다)
        //  - 그 밖: 선택된 페이지가 직전과 같고, 주소 번호도 직전 확인(0.2초 전)과 같을 때
        if let active, let id = FigmaReader.pageID(of: pane.element),
           pane.pendingTitle.map({ now - $0.1 > 3 }) ?? true,
           silent || (active.title == b.current?.title && id == pane.pageID) {
            if b.ids[id] != active.title { b.ids[id] = active.title; savePages(pane) }
            pane.pageID = id
        }
        if silent {
            if let active { b.current = active }
            b.fromDisk = false
            return listChanged
        }
        let wasSaved = b.fromDisk
        b.fromDisk = false
        defer { if listChanged || wasSaved { savePages(pane) } }
        // 같은 이름이면 같은 페이지로 본다 (순서 번호는 목록이 덜 그려졌을 때 달라질 수 있다)
        guard let active, active.title != b.current?.title else {
            if let active { b.current = active }
            return listChanged
        }
        // 패널에서 직접 옮긴 경우: 뒤로 가기 기록에 남긴다. (저장해 둔 값을 바로잡는 경우는 이동이 아니다)
        let hadCurrent = b.current != nil
        if let cur = b.current, !wasSaved { b.back.append(cur); b.forward.removeAll(); b.trimHistory() }
        b.current = active
        b.noteVisit(active)
        savePages(pane)
        if !wasSaved && hadCurrent { ActivityLog.shared.note(.manualSwitch) }  // 처음 읽은 것은 이동이 아니다
        log("page now \(active.label)")
        return true
    }

    private func rows(_ pane: Pane) -> [PageRow] { FigmaReader.pageRows(in: pane.element) ?? [] }

    private func press(_ entry: PageEntry, in rows: [PageRow]) -> Bool {
        let pages = rows.filter { !$0.divider && !$0.title.trimmingCharacters(in: .whitespaces).isEmpty }
        let same = pages.enumerated().filter { $0.element.title == entry.title }
        guard let hit = same.min(by: { abs($0.offset - entry.index) < abs($1.offset - entry.index) }) else { return false }
        return hit.element.element.press()
    }

    /// 페이지 목록을 아직 모르면 잠깐 펼쳐서 읽어 온다.
    func ensurePages(_ pane: Pane) {
        guard book(for: pane).pages.isEmpty, pageJob == nil else { return }
        startJob(pane, target: nil)
    }

    /// 페이지로 이동한다. 뒤로·앞으로 기록도 여기서 정리한다. 이동할 수 없으면 이유를 돌려준다.
    @discardableResult
    func go(_ entry: PageEntry, in pane: Pane, _ move: PageMove = .jump) -> String? {
        guard pageJob == nil, !coverPending else { return L("이전 이동이 끝나는 중이에요", "Still finishing the last move") }
        let b = book(for: pane)
        guard let target = b.resolve(entry) else { return L("페이지를 찾지 못했어요", "Page not found") }
        let layout = FigmaReader.layout(of: pane.element)
        // 패널이 펼쳐져 있으면 지금 페이지를 정확히 알 수 있다. 접혀 있으면 기억한 값이 틀렸을 수 있어서 그대로 진행한다.
        if layout.isExpanded, target.title == b.current?.title, move == .jump { return nil }
        if layout.isHidden {
            return L("UI를 숨긴 상태(⌘\\)에서는 페이지를 옮길 수 없어요", "Show the UI (⌘\\) to switch pages")
        }
        log("go \(move) -> \(target.label) (\(layout.isExpanded ? "expanded" : "minimized"))")
        if layout.isExpanded {
            let found = rows(pane)
            absorb(found, pane, ProcessInfo.processInfo.systemUptime, silent: true)
            record(move, target, pane)
            if !press(target, in: found) { log("page row not found") }
            // 누른 직후에는 아직 이전 페이지가 선택돼 보일 수 있어서, 잠시 뒤에 다시 읽는다.
            pane.lastPagesRead = ProcessInfo.processInfo.systemUptime + 0.5
        } else if coverPanel && PanelCover.hasPermission {
            // 펼치기 전 화면을 덮어 두고 옮긴 뒤 걷어 낸다 (패널이 펼쳐졌다 접히는 모습이 안 보이게)
            coverPending = true
            PanelCover.show(over: pane.frame) { [weak self] in
                guard let self else { return }
                self.coverPending = false
                if self.quickSwitch(pane, target, move) { self.hideCoverWhenSettled(pane) }
                else { self.startJob(pane, target: target, move: move) }   // 끝날 때(finish) 걷는다
                self.onPagesChanged?()
            }
        } else if !quickSwitch(pane, target, move) {
            // 빠른 이동이 안 되면 (목록이 늦게 그려지는 큰 파일 등) 확인 주기에 맞춰 천천히 한다 (stepPageJob).
            startJob(pane, target: target, move: move)
        }
        onPagesChanged?()
        return nil
    }

    /// 이동을 뒤로·앞으로 기록에 반영한다. b.current는 실제 지금 페이지로 바로잡힌 뒤여야 한다.
    private func record(_ move: PageMove, _ target: PageEntry, _ pane: Pane) {
        let b = book(for: pane)
        pane.pendingTitle = (target.title, ProcessInfo.processInfo.systemUptime)
        if target.title != b.current?.title { ActivityLog.shared.note(.edgeSwitch) }
        if let cur = b.current, cur.title != target.title {
            switch move {
            case .jump: b.back.append(cur); b.forward.removeAll()
            case .back: if !b.back.isEmpty { b.back.removeLast() }; b.forward.append(cur)
            case .forward: if !b.forward.isEmpty { b.forward.removeLast() }; b.back.append(cur)
            }
        } else if move == .back, !b.back.isEmpty {
            b.back.removeLast()   // 이미 그 페이지에 있으면 기록만 정리
        } else if move == .forward, !b.forward.isEmpty {
            b.forward.removeLast()
        }
        b.current = target
        b.noteVisit(target)
        b.trimHistory()
        savePages(pane)
    }

    /// 접힌 패널을 펼쳐 페이지를 누르고 다시 접는 일을 한 번에 끝낸다. 0.04초 확인 주기를 기다리지 않고
    /// 몇 ms 간격으로 바로바로 진행해서 패널이 보이는 시간을 줄인다. 목록이 0.6초 안에 안 나오면 false.
    private func quickSwitch(_ pane: Pane, _ target: PageEntry, _ move: PageMove) -> Bool {
        let layout = FigmaReader.layout(of: pane.element)
        guard let expand = layout.expandButton else { return false }
        let t0 = ProcessInfo.processInfo.systemUptime
        func ms() -> Int { Int((ProcessInfo.processInfo.systemUptime - t0) * 1000) }
        expand.press()
        var found: [PageRow] = []
        var lastCount = -1
        while ProcessInfo.processInfo.systemUptime - t0 < 0.6 {
            if let rows = FigmaReader.pageRows(in: pane.element) {
                if rows.count == lastCount { found = rows; break }  // 덜 그려진 목록이 아닌지 한 번 더 확인
                lastCount = rows.count
            }
            usleep(4000)
        }
        let listAt = ms()
        guard !found.isEmpty else {
            // 그대로 두면 패널이 열린 채 남으므로 접고 나서 느린 방식으로 넘긴다
            if let b = FigmaReader.layout(of: pane.element).minimizeButton { b.press() }
            log("quick switch: list not ready after \(listAt)ms")
            return false
        }
        absorb(found, pane, ProcessInfo.processInfo.systemUptime, silent: true)
        record(move, target, pane)
        let pressed = press(target, in: found)
        var minimized = false
        while ProcessInfo.processInfo.systemUptime - t0 < 1.0 {
            if let b = FigmaReader.layout(of: pane.element).minimizeButton { minimized = b.press(); break }
            usleep(3000)
        }
        pane.edgeLatched = true
        pane.autoOpened = false
        log("quick switch: list \(listAt)ms, pressed=\(pressed), minimized=\(minimized) at \(ms())ms")
        return true
    }

    /// 접기를 누른 뒤에도 Figma가 닫힌 화면을 다시 그리기까지 시간이 걸린다. Figma가 접힌 상태라고 알려 주고
    /// 새 페이지 주소로 바뀐 것을 본 뒤, 그려질 틈을 조금 더 주고 덮개를 걷는다. (최대 1.5초)
    private func hideCoverWhenSettled(_ pane: Pane) {
        let t0 = ProcessInfo.processInfo.systemUptime
        let before = pane.pageID
        func check() {
            let layout = FigmaReader.layout(of: pane.element)
            let moved = FigmaReader.pageID(of: pane.element) != before
            let waited = ProcessInfo.processInfo.systemUptime - t0
            if (layout.isMinimized && moved) || waited > 1.5 {
                log("panel cover hide after \(Int(waited * 1000))ms (minimized=\(layout.isMinimized) moved=\(moved))")
                PanelCover.hide(after: 0.15)
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.03) { check() }
            }
        }
        check()
    }

    func goBack(_ pane: Pane) -> String? {
        guard let e = book(for: pane).back.last else { return nil }
        return go(e, in: pane, .back)
    }

    func goForward(_ pane: Pane) -> String? {
        guard let e = book(for: pane).forward.last else { return nil }
        return go(e, in: pane, .forward)
    }

    private func startJob(_ pane: Pane, target: PageEntry?, move: PageMove = .jump) {
        let now = ProcessInfo.processInfo.systemUptime
        let layout = FigmaReader.layout(of: pane.element)
        guard let expand = layout.expandButton else { return }
        log("page job: expand pressed=\(expand.press()) target=\(target?.label ?? "(read list)")")
        pageJob = PageJob(pane: pane, target: target, move: move, now: now)
    }

    private func stepPageJob(_ job: PageJob, _ now: TimeInterval) {
        let pane = job.pane
        switch job.phase {
        case .waitRows:
            if let found = FigmaReader.pageRows(in: pane.element), found.count == job.lastCount {
                absorb(found, pane, now, silent: job.target != nil)
                if let t = job.target {
                    record(job.move, t, pane)
                    log("page job: pressed=\(press(t, in: found))")
                }
                // 누른 페이지가 반영된 뒤 접도록 다음 단계로
                job.phase = .waitMinimize
                job.started = now
            } else if let found = FigmaReader.pageRows(in: pane.element), now - job.started <= 1.5 {
                job.lastCount = found.count
            } else if now - job.started > 1.5 {
                log("page job: list not found")
                job.phase = .waitMinimize
                job.started = now
            }
        case .waitMinimize:
            let layout = FigmaReader.layout(of: pane.element)
            if let button = layout.minimizeButton {
                log("page job: minimize pressed=\(button.press())")
                finish(job)
            } else if layout.isMinimized || now - job.started > 1.5 {
                finish(job)
            }
        }
    }

    private func finish(_ job: PageJob) {
        pageJob = nil
        PanelCover.hide()
        job.pane.edgeLatched = true
        job.pane.autoOpened = false
        onPagesChanged?()
    }

    // 문제 해결용: 현재 인식한 화면 구조를 출력한다.
    func probe() {
        requireFrontmost = false
        tick()
        print("trusted=\(AXIsProcessTrusted()) panes=\(panes.count)")
        for pane in panes {
            let t0 = ProcessInfo.processInfo.systemUptime
            let l = FigmaReader.layout(of: pane.element)
            let ms = Int((ProcessInfo.processInfo.systemUptime - t0) * 1000)
            let t1 = ProcessInfo.processInfo.systemUptime
            let rows = FigmaReader.pageRows(in: pane.element)
            let pms = Int((ProcessInfo.processInfo.systemUptime - t1) * 1000)
            print("  file=\(pane.fileKey) pages=\(rows?.filter { !$0.divider }.count ?? -1) active=\(rows?.first { $0.active }?.title ?? "-") [\(pms)ms]")
            print("pane \(pane.frame) loaded=\(l.loaded) minimized=\(l.isMinimized) expanded=\(l.isExpanded) hidden=\(l.isHidden) minimizeButton=\(l.minimizeButton != nil) floating=\(l.floating) left=\(String(describing: l.leftPanel)) right=\(String(describing: l.rightPanel)) [\(ms)ms]")
        }
    }
}

// MARK: - 페이지 바로가기 화면

/// 손쉬운 사용 좌표(주 화면 왼쪽 위가 원점)를 AppKit 좌표(왼쪽 아래가 원점)로 바꾼다.
func cocoaRect(fromAX r: CGRect) -> NSRect {
    let h = NSScreen.screens.first?.frame.height ?? 0
    return NSRect(x: r.minX, y: h - r.maxY, width: r.width, height: r.height)
}

/// Figma 화면과 같은 색·그림자. 값은 Figma 웹 화면의 디자인 토큰(figma_app.css)에서 그대로 옮겼다.
/// Figma 설정(라이트·다크·시스템)을 따라간다.
struct FigmaStyle: Equatable {
    var dark: Bool
    // --color-bg / --color-bg-hover : ramp-grey-800 #2C2C2C, grey-700 #383838 (다크) / white, grey-100 #F5F5F5 (라이트)
    var background: Color { dark ? Color(hex: 0x2C2C2C) : .white }
    var hover: Color { dark ? Color(hex: 0x383838) : Color(hex: 0xF5F5F5) }
    // --color-border : #444 / #E6E6E6
    var border: Color { dark ? Color(hex: 0x444444) : Color(hex: 0xE6E6E6) }
    // --color-text, -secondary, -disabled : white 100/70/40% (다크), black 90/50/30% (라이트)
    var text: Color { dark ? .white : Color.black.opacity(0.9) }
    var secondary: Color { dark ? Color.white.opacity(0.7) : Color.black.opacity(0.5) }
    var disabled: Color { dark ? Color.white.opacity(0.4) : Color.black.opacity(0.3) }
    static let accent = Color(hex: 0x0D99FF)   // --color-bg-brand
    static let radius: CGFloat = 13            // --radius-large
    static let buttonRadius: CGFloat = 5       // --radius-medium
    static let shadowMargin: CGFloat = 16      // 그림자를 그릴 창 안쪽 여백
    // --text-body-medium : Inter 11px / 16px, 굵기 450. Inter가 없으면 시스템 글꼴.
    static func font(_ size: CGFloat = 11, strong: Bool = false) -> Font {
        NSFont(name: "Inter", size: size) != nil
            ? .custom("Inter", size: size).weight(strong ? .medium : .regular)
            : .system(size: size, weight: strong ? .medium : .regular)
    }

    /// ~/Library/Application Support/Figma/settings.json 의 themePreference를 읽는다.
    static func current() -> FigmaStyle {
        let url = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/Figma/settings.json")
        var pref = "system"
        if let data = try? Data(contentsOf: url),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let p = json["themePreference"] as? String { pref = p }
        switch pref {
        case "dark": return FigmaStyle(dark: true)
        case "light": return FigmaStyle(dark: false)
        default:
            return FigmaStyle(dark: NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua)
        }
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255,
                  blue: Double(hex & 0xff) / 255, opacity: 1)
    }
}

/// Figma가 떠 있는 UI에 쓰는 그림자. 테두리 선 없이 그림자와 안쪽 가는 빛으로 경계를 만든다.
///   하단 도구 막대 (--elevation-200-canvas)
///     다크:   0 3 8 rgba(0,0,0,.35), 0 1 3 rgba(0,0,0,.5), inset 0 .5 0 rgba(255,255,255,.08), inset 0 0 .5 rgba(255,255,255,.3)
///     라이트: 0 0 .5 rgba(0,0,0,.18), 0 3 8 rgba(0,0,0,.1), 0 1 3 rgba(0,0,0,.1)
///   메뉴·창 (--elevation-400-menu-panel)
///     다크:   0 10 16 rgba(0,0,0,.35), 0 2 5 rgba(0,0,0,.35), inset 0 .5 0 rgba(255,255,255,.08), inset 0 0 .5 rgba(255,255,255,.35)
///     라이트: 0 0 .5 rgba(0,0,0,.12), 0 10 16 rgba(0,0,0,.12), 0 2 5 rgba(0,0,0,.15)
/// SwiftUI 그림자는 CSS와 흐림 계산이 달라서, 도구 막대 옆에 놓고 화면에서 잰 값으로 맞췄다 (tools/verify-ui.swift).
///   도구 막대: 큰 그림자 반경 3·아래 3·27%, 작은 그림자 반경 1·아래 1.5·30% (다크)
struct Elevated: ViewModifier {
    enum Level { case toolbar, menu }
    let style: FigmaStyle
    var level = Level.toolbar

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: FigmaStyle.radius, style: .circular)  // CSS border-radius는 원형 곡선
        let big: (CGFloat, CGFloat, Double) = level == .toolbar ? (3, 3, style.dark ? 0.27 : 0.10)
                                                                : (8, 10, style.dark ? 0.35 : 0.12)
        let small: (CGFloat, CGFloat, Double) = level == .toolbar ? (1, 1.5, style.dark ? 0.30 : 0.10)
                                                                  : (2.5, 2, style.dark ? 0.35 : 0.15)
        let insetRing = level == .toolbar ? 0.24 : 0.28  // CSS .3/.35 를 화면 값에 맞게 보정
        return content
            .clipShape(shape)
            .background {
                // 다크 테마의 안쪽 빛 두 겹(inset 0 0 .5px, inset 0 .5px 0)은 CSS와 같은 방식인 안쪽 그림자로 그린다.
                shape.fill(style.dark
                           ? AnyShapeStyle(style.background
                                .shadow(.inner(color: .white.opacity(insetRing), radius: 0.25))
                                .shadow(.inner(color: .white.opacity(0.07), radius: 0, y: 0.5)))
                           : AnyShapeStyle(style.background))
                    .shadow(color: .black.opacity(small.2), radius: small.0, y: small.1)
                    .shadow(color: .black.opacity(big.2), radius: big.0, y: big.1)
                    .shadow(color: .black.opacity(style.dark ? 0 : (level == .toolbar ? 0.18 : 0.12)), radius: 0.25)
                    // 그림자를 여러 겹으로 넘기면 외장 모니터(배율 화면)에서 창 둘레에 옅은 네모가 비친다.
                    // 미리 한 장의 그림으로 그려서 넘긴다. (화면 캡처에는 안 나오고 모니터에서만 보이던 문제)
                    .drawingGroup()
            }
            .padding(FigmaStyle.shadowMargin)
            // 입력칸 안내 글자·진행 표시 같은 시스템 요소도 Figma 테마를 따르게 한다.
            .environment(\.colorScheme, style.dark ? .dark : .light)
    }
}

/// 마우스를 올리면 Figma 버튼처럼 배경이 깔리는 버튼 모양.
struct FigmaButtonStyle: ButtonStyle {
    let style: FigmaStyle
    var enabled = true
    @State private var hovering = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(RoundedRectangle(cornerRadius: FigmaStyle.buttonRadius)
                .fill(enabled && (hovering || configuration.isPressed) ? style.hover : Color.clear))
            .animation(.easeOut(duration: 0.1), value: hovering)
            .onHover { hovering = $0 }
    }
}

/// 메뉴 막대 아이콘 아래에 뜨는 패널 창. 창 자체는 투명하고, 안의 유리 조각들이 바탕화면 위에 바로 뜬다
/// (시스템 팝오버는 자기 유리 판을 깔아 그 위 조각이 '유리 위의 유리'가 되므로 쓰지 않는다).
final class MenuPanelWindow: NSPanel {
    /// 유리 조각의 그림자가 잘리지 않도록 창을 조각보다 넉넉하게 잡는다
    static let margin = NSEdgeInsets(top: 8, left: 28, bottom: 36, right: 28)
    /// 메뉴 막대와 첫 유리 칸 사이 (제어 센터와 같다)
    static let gap: CGFloat = 12
    private let model: MenuModel
    private let host: NSHostingView<MenuPanelHost>
    private var anchor: NSRect = .zero
    private let onClose: () -> Void
    private(set) var isOpen = false

    init(model: MenuModel, onClose: @escaping () -> Void) {
        self.model = model
        self.onClose = onClose
        var resize: (CGSize) -> Void = { _ in }
        host = NSHostingView(rootView: MenuPanelHost(model: model, onSize: { resize($0) }))
        super.init(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        resize = { [weak self] size in self?.place(size) }
        host.sizingOptions = []          // 창 크기는 직접 정한다 (호스트가 창을 제멋대로 키우지 않게)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false                // 그림자는 유리 조각마다 시스템이 그린다
        level = .popUpMenu
        collectionBehavior = [.canJoinAllSpaces, .transient, .ignoresCycle, .fullScreenAuxiliary]
        hidesOnDeactivate = false
        isReleasedWhenClosed = false
        animationBehavior = .none
        contentView = host
        setAccessibilityLabel("Layerhover")
    }
    override var canBecomeKey: Bool { true }
    override func cancelOperation(_ sender: Any?) { onClose() }      // esc

    func open(below rect: NSRect) {
        anchor = rect
        isOpen = true
        model.panelOpen = false          // 나타나는 움직임의 출발점
        model.menuBarDetail = false      // 늘 첫 화면에서 연다
        place()
        alphaValue = 1
        orderFrontRegardless()
        makeKey()
        DispatchQueue.main.async { [weak self] in
            guard let self, self.isOpen else { return }
            if !self.isKeyWindow { self.makeKey() }      // 창이 화면에 다 올라온 뒤 한 번 더: esc·⌘,·⌘Q를 받는 창이 되게
            withAnimation(.spring(response: 0.32, dampingFraction: 0.82)) { self.model.panelOpen = true }
        }
    }

    func close(animated: Bool) {
        isOpen = false
        withAnimation(.easeIn(duration: 0.14)) { model.panelOpen = false }   // 닫힌 패널 안의 움직임(오늘 작업 링의 점)도 멈춘다
        DispatchQueue.main.asyncAfter(deadline: .now() + (animated ? 0.16 : 0)) { [weak self] in
            guard let self, !self.isOpen else { return }
            self.orderOut(nil)
        }
    }

    /// 아이콘 가운데 아래에 두되, 화면 밖으로 나가지 않게 (유리 조각 기준으로) 맞춘다
    private var lastSize: CGSize = .zero
    /// 내용 크기는 SwiftUI가 잰 값(onSize)을 쓴다. 화면이 바뀌는 중간에 0×0이 오면 무시한다.
    private func place(_ measured: CGSize? = nil) {
        let m = MenuPanelWindow.margin
        var size = measured ?? host.fittingSize
        if size.width < 1 || size.height < 1 { size = lastSize }
        guard size.width >= 1, size.height >= 1 else { return }
        lastSize = size
        let screen = NSScreen.screens.first { $0.frame.contains(NSPoint(x: anchor.midX, y: anchor.midY)) } ?? NSScreen.main
        let vf = screen?.visibleFrame ?? .zero
        // 왼쪽 끝은 첫 화면(격자) 폭으로 정해 고정한다: 세부 화면이 넓어져도 오른쪽으로만 자란다 (제어 센터와 같다)
        let glassW = size.width - m.left - m.right
        var gx = anchor.midX - MenuPanelView.width / 2
        if vf.width > 0 { gx = min(max(gx, vf.minX + 8), vf.maxX - 8 - max(glassW, MenuPanelView.width)) }
        let top = (anchor == .zero ? vf.maxY : anchor.minY) - MenuPanelWindow.gap + m.top
        setFrame(NSRect(x: gx - m.left, y: top - size.height, width: size.width, height: size.height), display: true)
    }
}

/// 패널 창의 내용: 여백(그림자 자리) + 위에서 내려오며 커지는 등장
struct MenuPanelHost: View {
    @ObservedObject var model: MenuModel
    let onSize: (CGSize) -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        let m = MenuPanelWindow.margin
        MenuPanelView(model: model)
            .scaleEffect(model.panelOpen || reduceMotion ? 1 : 0.94, anchor: .top)
            .opacity(model.panelOpen ? 1 : 0)
            .padding(EdgeInsets(top: m.top, leading: m.left, bottom: m.bottom, trailing: m.right))
            .fixedSize()
            .background(GeometryReader { g in Color.clear.onAppear { onSize(g.size) }.onChange(of: g.size) { onSize($0) } })
    }
}

/// 다른 앱(Figma)을 앞에 둔 채로 키 입력을 받는 창.
final class FloatingPanel: NSPanel {
    init(contentRect: NSRect, borderless: Bool) {
        super.init(contentRect: contentRect,
                   styleMask: borderless ? [.borderless, .nonactivatingPanel]
                                         : [.titled, .fullSizeContentView, .nonactivatingPanel],
                   backing: .buffered, defer: false)
        level = .floating
        collectionBehavior = [.fullScreenAuxiliary, .moveToActiveSpace]
        isMovableByWindowBackground = false
        hidesOnDeactivate = false
        isReleasedWhenClosed = false
        backgroundColor = .clear
        isOpaque = false
        hasShadow = !borderless
        if !borderless {
            titleVisibility = .hidden
            titlebarAppearsTransparent = true
            standardWindowButton(.closeButton)?.isHidden = true
            standardWindowButton(.miniaturizeButton)?.isHidden = true
            standardWindowButton(.zoomButton)?.isHidden = true
        }
    }
    override var canBecomeKey: Bool { true }

    /// 나타나고 사라질 때 툭 튀지 않게 투명도로 넘긴다. 같은 요청이 반복돼도 한 번만 움직인다.
    private(set) var shown = false
    func fadeIn(key: Bool = false) {
        if shown { if key { makeKey() }; return }
        shown = true
        if !isVisible { alphaValue = 0 }
        if key { makeKeyAndOrderFront(nil) } else { orderFront(nil) }
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.1
            ctx.timingFunction = CAMediaTimingFunction(name: .easeOut)
            animator().alphaValue = 1
        }
    }
    // MARK: 페이지 버튼의 등장·퇴장
    // 제자리에서 스르르 나타나고 스르르 사라진다 (위치는 움직이지 않는다). 값을 정한 기준:
    //  - 길이는 Figma 화면이 쓰는 값에 맞춘다: --duration-md 0.2초(나타날 때), --duration-sm 0.1초(사라질 때).
    //    사라지는 쪽이 짧은 것은 흔한 원칙이다. 나가는 것은 더 볼 필요가 없으니 빨리 비켜야 하고,
    //    특히 여기서는 패널이 버튼 자리를 덮으므로 오래 남으면 패널 위에 겹쳐 보인다.
    //  - 나타날 때는 감속(ease-out): 초반에 빠르게 또렷해지고 끝에서 천천히 자리 잡는다.
    //    전체 시간의 40%에서 이미 80%쯤 보여서 "바로 떴다"고 느껴지고, 마지막은 튀지 않게 스며든다.
    //  - 사라질 때도 초반에 깊게 빠진다: 패널이 나타난 직후 0.04초 안에 대부분 흐려져서
    //    패널 내용과 겹쳐 보이는 시간이 거의 없고, 남은 시간 동안 잔상처럼 마저 사라진다.
    static let enterDuration = 0.2
    static let exitDuration = 0.1
    static let enterCurve = CAMediaTimingFunction(controlPoints: 0.0, 0.0, 0.2, 1.0)   // 감속
    static let exitCurve = CAMediaTimingFunction(controlPoints: 0.2, 0.0, 0.0, 1.0)    // 초반에 깊게
    private var restFrame = NSRect.zero

    /// 자리 잡을 위치. 보이는 중이면 바로 맞춘다 (분할 경계를 움직일 때는 애니메이션 없이 따라간다).
    func place(_ frame: NSRect) {
        restFrame = frame
        if self.frame != frame { setFrame(frame, display: true) }
    }

    func appear(at frame: NSRect) {
        place(frame)
        guard !shown else { return }
        shown = true
        if !isVisible { alphaValue = 0 }   // 사라지던 중이면 그 투명도에서 이어서 돌아온다
        orderFront(nil)
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = FloatingPanel.enterDuration
            ctx.timingFunction = FloatingPanel.enterCurve
            animator().alphaValue = 1
        }
    }

    func disappear() {
        guard shown else { return }
        shown = false
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = FloatingPanel.exitDuration
            ctx.timingFunction = FloatingPanel.exitCurve
            animator().alphaValue = 0
        }, completionHandler: { [weak self] in
            if self?.shown == false { self?.orderOut(nil) }
        })
    }

    func fadeOut() {
        guard shown else { return }
        shown = false
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.06
            ctx.timingFunction = CAMediaTimingFunction(name: .easeIn)
            animator().alphaValue = 0
        }, completionHandler: { [weak self] in
            if self?.shown == false { self?.orderOut(nil) }
        })
    }
}

struct PaletteItem: Identifiable, Equatable {
    let id: String
    let entry: PageEntry
    let section: String?     // 이 줄 위에 붙는 구역 이름
    let isCurrent: Bool
}

final class PaletteModel: ObservableObject {
    @Published var query = "" { didSet { rebuild(); selection = 0 } }
    @Published var selection = 0
    @Published private(set) var items: [PaletteItem] = []
    @Published var fileName = ""
    @Published var note: String?
    @Published var loading = false
    @Published var style = FigmaStyle(dark: true)
    var book = PageBook() { didSet { rebuild() } }

    func rebuild() {
        let words = query.lowercased().split(separator: " ").map(String.init)
        func matches(_ e: PageEntry) -> Bool {
            let t = e.label.lowercased()
            return words.allSatisfy { t.contains($0) }
        }
        var out: [PaletteItem] = []
        if words.isEmpty {
            let recent = book.recent.compactMap { book.resolve($0) }.filter { $0 != book.current }.prefix(5)
            for (i, e) in recent.enumerated() {
                out.append(PaletteItem(id: "r\(e.index)", entry: e, section: i == 0 ? L("최근", "Recent") : nil, isCurrent: false))
            }
        }
        for (i, e) in book.pages.filter(matches).enumerated() {
            let section = words.isEmpty && i == 0 ? L("모든 페이지", "All pages") : nil
            out.append(PaletteItem(id: "p\(e.index)", entry: e, section: section, isCurrent: e == book.current))
        }
        items = out
        if selection >= items.count { selection = max(0, items.count - 1) }
    }
}

struct PaletteView: View {
    @ObservedObject var model: PaletteModel
    let choose: (PageEntry) -> Void
    @FocusState private var focused: Bool

    var body: some View {
        let st = model.style
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").font(.system(size: 12)).foregroundStyle(st.secondary)
                TextField(L("페이지로 이동…", "Go to page…"), text: $model.query)
                    .textFieldStyle(.plain)
                    .font(FigmaStyle.font(13))
                    .foregroundStyle(st.text)
                    .focused($focused)
                if model.loading { ProgressView().controlSize(.small) }
            }
            .padding(.horizontal, 14).frame(height: 44)
            Rectangle().fill(st.border).frame(height: 1)
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(model.items.enumerated()), id: \.element.id) { i, item in
                            if let s = item.section {
                                Text(s).font(FigmaStyle.font(strong: true)).foregroundStyle(st.secondary)
                                    .padding(.horizontal, 16).padding(.top, i == 0 ? 8 : 12).padding(.bottom, 4)
                            }
                            row(item, selected: i == model.selection, st)
                                .id(item.id)
                                .contentShape(Rectangle())
                                .onTapGesture { choose(item.entry) }
                                .onHover { if $0 { model.selection = i } }
                        }
                        if model.items.isEmpty {
                            Text(model.loading ? L("페이지 목록을 읽는 중…", "Reading pages…")
                                               : L("맞는 페이지가 없어요", "No matching pages"))
                                .font(FigmaStyle.font()).foregroundStyle(st.secondary).padding(16)
                        }
                    }
                    .padding(.bottom, 8)
                }
                .onChange(of: model.selection) { i in
                    if model.items.indices.contains(i) { proxy.scrollTo(model.items[i].id) }
                }
            }
            Rectangle().fill(st.border).frame(height: 1)
            HStack {
                Text(model.note ?? model.fileName).lineLimit(1)
                    .foregroundStyle(model.note == nil ? st.secondary : Color.orange)
                Spacer()
                Text(L("↑↓ 선택  ⏎ 이동  esc 닫기", "↑↓ select  ⏎ go  esc close")).foregroundStyle(st.secondary)
            }
            .font(FigmaStyle.font())
            .padding(.horizontal, 16).frame(height: 32)
        }
        .frame(width: 460, height: 420)
        .modifier(Elevated(style: st, level: .menu))
        .onAppear { DispatchQueue.main.async { focused = true } }
    }

    private func row(_ item: PaletteItem, selected: Bool, _ st: FigmaStyle) -> some View {
        let child = item.entry.label.hasPrefix("ㄴ")
        let name = child ? String(item.entry.label.dropFirst()).trimmingCharacters(in: .whitespaces) : item.entry.label
        return HStack(spacing: 8) {
            Image(systemName: item.isCurrent ? "checkmark" : "doc")
                .font(.system(size: 12, weight: .light))
                .foregroundStyle(item.isCurrent ? st.text : st.secondary)
                .frame(width: 16)
            Text(name).lineLimit(1).font(FigmaStyle.font()).tracking(0.055)
            Spacer()
        }
        .padding(.leading, child ? 26 : 10).padding(.trailing, 10).frame(height: 32)
        .foregroundStyle(st.text)
        .background(selected ? st.hover : Color.clear, in: RoundedRectangle(cornerRadius: FigmaStyle.buttonRadius))
        .padding(.horizontal, 8)
    }
}

struct VisualEffect: NSViewRepresentable {
    var material: NSVisualEffectView.Material = .popover
    func makeNSView(context: Context) -> NSVisualEffectView {
        let v = NSVisualEffectView()
        v.material = material
        v.blendingMode = .behindWindow
        v.state = .active
        return v
    }
    func updateNSView(_ v: NSVisualEffectView, context: Context) {}
}

/// 페이지 버튼 자리 (설정 > 페이지 이동 > 위치)
enum PageChipPlace: Int {
    case bottomLeft = 0     // 왼쪽 아래, 도구 막대와 같은 줄 (기본)
    case topLeft = 1        // 왼쪽 위 파일 이름 칸 바로 오른쪽
    case topCenter = 2      // 위쪽 줄 가운데
    static let topLeftY: CGFloat = 8 + 48 + 8   // 위 여백 + 파일 이름 칸 높이 + 간격
}

/// 왼쪽 아래에 떠 있는 버튼: ‹ 지금 페이지 ›
/// Figma 아래쪽 도구 막대와 높이(48)·모양을 맞추고, 폭은 도구 막대까지 남은 공간에 맞춰 줄어든다.
final class ChipModel: ObservableObject {
    @Published var title = L("페이지", "Pages")
    @Published var canBack = false
    @Published var canForward = false
    @Published var busy = false
    @Published var width: CGFloat = ChipModel.maxWidth
    @Published var rowHeight: CGFloat = ChipModel.height   // 위쪽 자리에서는 Figma 파일 이름 칸 높이에 맞춘다
    @Published var style = FigmaStyle(dark: true)
    @Published var windowClip: CGRect?   // 버튼 창 안에서 본 Figma 창 영역
    @Published var hovering = false      // 마우스가 올라가 있는지
    @Published var agent = AgentState()  // Claude가 이 파일을 고치는 중이면 아이콘이 바뀐다
    @Published var peekArrows = false    // 단축키로 뒤로·앞으로를 눌렀는데 갈 곳이 없을 때 ‹ › 를 잠깐 보여 준다
    static let height: CGFloat = 48
    static let windowRadius: CGFloat = 16  // macOS 창 모서리
    static let maxWidth: CGFloat = 280
    static let titleWidth: CGFloat = 96      // 페이지 이름이 몇 글자라도 들어가는 최소 폭 (여백 16 + 아이콘 32 + 글자 약 4자)
    static let arrowsWidth: CGFloat = 130    // ‹ › 를 넣고도 이름이 두세 글자 남는 최소 폭. 이보다 좁으면 이름을 지키고 ‹ › 는 띄우지 않는다
    static let squareWidth: CGFloat = height // 이름이 안 들어가면 아이콘 하나만 있는 정사각형, 그것도 안 되면 숨긴다

    /// 도구 막대까지 남은 공간에 맞는 폭. nil이면 숨긴다.
    static func width(for space: CGFloat) -> CGFloat? {
        if space >= titleWidth { return min(maxWidth, space) }
        if space >= squareWidth { return squareWidth }
        return nil
    }
    var compact: Bool { width < ChipModel.titleWidth }
}

/// 페이지 버튼 왼쪽 아이콘. 평소엔 문서, 페이지를 읽는 동안 모래시계,
/// Claude가 작업 중이면 반짝이는 별 (도구를 쓰는 동안 숨 쉬듯 깜빡인다).
struct ChipIcon: View {
    let busy: Bool
    let agent: AgentState
    let color: Color
    @State private var pulse = false
    static let claude = Color(hex: 0xD97757)

    var body: some View {
        Group {
            if agent.active {
                Image(systemName: "sparkles")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(ChipIcon.claude)
                    .opacity(agent.hookWorking && pulse ? 0.35 : 1)
                    .onAppear { pulse = true }
                    .animation(agent.hookWorking ? .easeInOut(duration: 0.8).repeatForever(autoreverses: true) : .default,
                               value: pulse)
            } else {
                Image(systemName: busy ? "hourglass" : "doc")
                    .font(.system(size: 13, weight: .light))
                    .foregroundStyle(color)
            }
        }
        .frame(width: 24, height: 24)
        .transition(.opacity)
        .animation(.easeInOut(duration: 0.2), value: agent.active)
    }
}

struct ChipView: View {
    @ObservedObject var model: ChipModel
    let back: () -> Void
    let open: () -> Void
    let forward: () -> Void

    // Figma 도구 막대: 높이 48, 안쪽 여백 8, 버튼 32×32(아이콘 24 + 여백 4), 버튼 사이 1
    var body: some View {
        let st = model.style
        // 좁을 때는 아이콘 하나만 있는 정사각형. 넓을 때는 페이지 이름과 오른쪽 끝의 ‹ › 를 늘 보여 준다
        // (마우스를 올릴 때만 보이게 했더니 있다는 걸 잊어버렸다).
        // 아이콘과 이름은 그 자리에 둔다 (마우스를 올려도 읽던 글자가 움직이지 않게).
        // ⌄ 표시는 두지 않는다: 마우스를 올리면 ‹ › 에 밀려 사라져서, 누르려는 순간에 단서가 없어졌다.
        // 페이지 이름은 항상 보인다. 이름이 들어갈 자리가 모자랄 만큼 좁으면 ‹ › 를 띄우지 않는다.
        let showArrows = model.width >= ChipModel.arrowsWidth
        let showTitle = !model.compact
        HStack(spacing: 1) {
            Button(action: open) {
                HStack(spacing: 4) {
                    ChipIcon(busy: model.busy, agent: model.agent, color: st.text)
                    if showTitle {
                        // 페이지가 바뀌면 이름이 바로 바뀌지 않고 겹쳐지듯 넘어간다
                        Text(model.title).font(FigmaStyle.font()).tracking(0.055)
                            .lineLimit(1).truncationMode(.tail).foregroundStyle(st.text)
                            .id(model.title)
                            .transition(.opacity)
                        Spacer(minLength: 0)
                    }
                }
                .padding(.leading, 4).padding(.trailing, showTitle ? 2 : 4)
                .frame(maxWidth: showTitle || !showArrows ? .infinity : nil, minHeight: 32, maxHeight: 32,
                       alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(FigmaButtonStyle(style: st))
            .accessibilityLabel(L("페이지로 이동, 지금 \(model.title)", "Go to page, current \(model.title)"))
            .help((model.agent.active ? model.agent.detail + "\n" : "") + model.title + " — " + L("페이지로 이동", "Go to page"))
            if showArrows {
                if !showTitle { Spacer(minLength: 0) }
                Group {
                    arrow("chevron.left", enabled: model.canBack, action: back,
                          help: L("이전 페이지", "Previous page"))
                    arrow("chevron.right", enabled: model.canForward, action: forward,
                          help: L("다음 페이지", "Next page"))
                }
                .transition(.asymmetric(insertion: .opacity.combined(with: .offset(x: 6)), removal: .opacity))
            }
        }
        .animation(.easeOut(duration: 0.18), value: showArrows)
        .animation(.easeInOut(duration: 0.2), value: model.title)
        .padding(8)
        .frame(width: model.width, height: model.rowHeight)
        .contentShape(Rectangle())
        .onHover { model.hovering = $0 }  // 버튼 전체(여백 포함)에 올라갔을 때
        .modifier(Elevated(style: st))
        .drawingGroup()  // 버튼 전체를 한 장으로 그려서 넘긴다 (모니터에서 확인한 방식)
        // 그림자가 Figma 창 밖(바탕화면)으로 번지면 창의 둥근 모서리가 네모나게 메워져 보인다. 창 모양으로 자른다.
        .mask(alignment: .topLeading) {
            if let c = model.windowClip {
                RoundedRectangle(cornerRadius: ChipModel.windowRadius, style: .continuous)
                    .frame(width: c.width, height: c.height)
                    .offset(x: c.minX, y: c.minY)
            } else {
                Rectangle()
            }
        }
    }

    private func arrow(_ symbol: String, enabled: Bool, action: @escaping () -> Void, help: String) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 11, weight: .regular))
                .frame(width: 24, height: 32).contentShape(Rectangle())
        }
        .buttonStyle(FigmaButtonStyle(style: model.style, enabled: enabled))
        .foregroundStyle(enabled ? model.style.text : model.style.disabled)
        .disabled(!enabled)
        .accessibilityLabel(help)
        .help(help)
    }
}

// MARK: - 페이지 바로가기 관리

/// 왼쪽 아래 버튼·바로가기 창을 엔진의 페이지 기록과 이어 준다.
final class PageNavigator: NSObject, NSWindowDelegate {
    let engine: Engine
    var showChip = true { didSet { applyChipPlace() } }
    var chipPlace: PageChipPlace = .bottomLeft { didSet { applyChipPlace() } }
    /// 버튼이 화면 왼쪽 끝 가까이에 있을 때만, 버튼을 누르러 가다 패널이 펼쳐지지 않게 그 높이의 끝 반응을 끈다.
    private func applyChipPlace() {
        engine.protectButtonBand = showChip && chipPlace == .bottomLeft   // 위쪽 자리는 화면 끝에서 떨어져 있다
        engine.buttonBandAtTop = false
        sync()
    }

    private var palette: FloatingPanel?
    private let paletteModel = PaletteModel()
    private weak var palettePane: Pane?
    private var keyMonitor: Any?
    private var chips: [ObjectIdentifier: (panel: FloatingPanel, model: ChipModel)] = [:]

    init(engine: Engine) {
        self.engine = engine
        super.init()
        engine.onPagesChanged = { [weak self] in self?.sync() }
        // 앱을 오갈 때 다음 확인(0.25초)을 기다리지 않고 바로 버튼을 띄우거나 감춘다.
        NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main) { [weak self] _ in
            self?.tick()
            self?.sync()
        }
    }

    /// 0.04초마다 엔진 다음에 불린다. Figma가 앞에 있는지에 따라 버튼을 켜고 끈다.
    private var lastSync: TimeInterval = 0
    private var lastStyleRead: TimeInterval = -10
    private var lastActivity: TimeInterval = 0
    private var style = FigmaStyle(dark: true)
    func tick() {
        let figmaFront = engine.isFigmaActive && AXIsProcessTrusted()
        let now = ProcessInfo.processInfo.systemUptime
        if now - lastSync > 0.25 { sync(); lastSync = now }
        if now - lastActivity >= 1 {
            lastActivity = now
            let pane = engine.targetPane()
            ActivityLog.shared.tick(figmaFront: figmaFront, file: pane?.fileKey,
                                    page: pane.flatMap { engine.book(for: $0).current?.label })
        }
    }

    private func pane(_ id: ObjectIdentifier?) -> Pane? {
        if let id { return engine.visiblePanes.first { ObjectIdentifier($0) == id } }
        return engine.targetPane()
    }

    // MARK: 이동

    /// 갈 곳이 없으면 아무 일도 안 일어난 것처럼 보인다. 흐린 ‹ › 를 잠깐 띄워서 "더 갈 곳이 없다"를 알린다.
    private func flashArrows(_ p: Pane) {
        guard let chip = chips[ObjectIdentifier(p)] else { return }
        chip.model.peekArrows = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { chip.model.peekArrows = false }
    }

    func back(_ id: ObjectIdentifier?) {
        guard let p = pane(id) else { return }
        if engine.book(for: p).back.isEmpty { flashArrows(p); return }
        if let why = engine.goBack(p) { NSSound.beep(); log("back refused: \(why)") }
    }

    func forward(_ id: ObjectIdentifier?) {
        guard let p = pane(id) else { return }
        if engine.book(for: p).forward.isEmpty { flashArrows(p); return }
        if let why = engine.goForward(p) { NSSound.beep(); log("forward refused: \(why)") }
    }

    // MARK: 바로가기 창

    func openPalette(for id: ObjectIdentifier? = nil) {
        guard let p = pane(id) else { NSSound.beep(); return }
        if palette?.shown == true && palettePane === p { closePalette(); return }
        ActivityLog.shared.note(.palette)
        palettePane = p
        engine.ensurePages(p)
        paletteModel.query = ""
        paletteModel.note = p.mode == .hidden
            ? L("UI를 숨긴 상태(⌘\\)에서는 페이지를 옮길 수 없어요", "Show the UI (⌘\\) to switch pages") : nil
        refreshPalette()

        let panel = palette ?? makePalette()
        let area = cocoaRect(fromAX: p.frame)
        // 화면 위에서 140pt 아래. 창이 낮아서 아래로 넘치면 화면 안에 들어오게 올린다.
        let y = max(area.minY + 8, area.maxY - 140 - 420)
        panel.setFrameOrigin(NSPoint(x: area.midX - 230 - FigmaStyle.shadowMargin, y: y - FigmaStyle.shadowMargin))
        panel.fadeIn(key: true)
        if keyMonitor == nil {
            keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] e in
                self?.handleKey(e) == true ? nil : e
            }
        }
    }

    private func makePalette() -> FloatingPanel {
        let m = FigmaStyle.shadowMargin
        let panel = FloatingPanel(contentRect: NSRect(x: 0, y: 0, width: 460 + m * 2, height: 420 + m * 2), borderless: true)
        panel.contentView = NSHostingView(rootView: PaletteView(model: paletteModel, choose: { [weak self] in self?.choose($0) }))
        panel.delegate = self
        palette = panel
        return panel
    }

    private func refreshPalette() {
        guard let p = palettePane else { return }
        paletteModel.book = engine.book(for: p)
        paletteModel.fileName = p.fileKey
        paletteModel.loading = engine.pageJob?.pane === p && paletteModel.book.pages.isEmpty
    }

    private func handleKey(_ e: NSEvent) -> Bool {
        guard palette?.isKeyWindow == true else { return false }
        switch e.keyCode {
        case 125: paletteModel.selection = min(paletteModel.selection + 1, max(0, paletteModel.items.count - 1)); return true
        case 126: paletteModel.selection = max(paletteModel.selection - 1, 0); return true
        case 36, 76:
            if paletteModel.items.indices.contains(paletteModel.selection) {
                choose(paletteModel.items[paletteModel.selection].entry)
            }
            return true
        case 53: closePalette(); return true
        default: return false
        }
    }

    private func choose(_ entry: PageEntry) {
        guard let p = palettePane else { return }
        if let why = engine.go(entry, in: p) { paletteModel.note = why; NSSound.beep(); return }
        closePalette()
    }

    func closePalette() {
        palette?.fadeOut()
        if let m = keyMonitor { NSEvent.removeMonitor(m); keyMonitor = nil }
    }

    func windowDidResignKey(_ notification: Notification) {
        if (notification.object as? NSWindow) === palette { closePalette() }
    }

    // MARK: 왼쪽 아래 버튼

    func sync() {
        let now = ProcessInfo.processInfo.systemUptime
        if now - lastStyleRead > 2 { style = FigmaStyle.current(); lastStyleRead = now }
        if paletteModel.style != style { paletteModel.style = style }
        if palette?.isVisible == true { refreshPalette() }
        let front = engine.isFigmaActive && AXIsProcessTrusted() && showChip
        let hook = AgentStatus.hook()
        var seen = Set<ObjectIdentifier>()
        // Figma의 메뉴·팝업은 Figma 창 안에 그려져서, 그 위에 뜬 페이지 버튼이 가릴 수 있다. 열려 있는 동안은 숨긴다.
        for p in engine.visiblePanes where front && p.mode == .minimized && !p.popupOpen {
            let id = ObjectIdentifier(p)
            seen.insert(id)
            let chip = chips[id] ?? makeChip(id)
            let b = engine.book(for: p)
            let busy = engine.pageJob?.pane === p
            let title = b.current?.label.replacingOccurrences(of: "ㄴ ", with: "")
                ?? (busy ? L("페이지 읽는 중…", "Reading pages…") : L("페이지 선택", "Choose page"))
            if chip.model.title != title { chip.model.title = title }
            if chip.model.canBack != !b.back.isEmpty { chip.model.canBack = !b.back.isEmpty }
            if chip.model.canForward != !b.forward.isEmpty { chip.model.canForward = !b.forward.isEmpty }
            if chip.model.busy != busy { chip.model.busy = busy }
            // 훅은 어느 파일인지 모르므로: 에이전트가 붙은 파일이 있으면 그 파일에만, 없으면 보이는 모든 파일에 띄운다.
            let anyFigmaAgent = engine.visiblePanes.contains { $0.agents > 0 }
            let agent = AgentState(figmaAgents: p.agents, hookWorking: hook.working && (p.agents > 0 || !anyFigmaAgent),
                                   tool: hook.tool)
            if chip.model.agent != agent { chip.model.agent = agent }
            // 자리는 설정(페이지 버튼 위치)에 따른다.
            //  왼쪽 아래: Figma 아래쪽 도구 막대와 같은 줄·같은 높이. 폭은 도구 막대 왼쪽 끝까지 남은 공간에 맞춰 줄이고, 아주 좁으면 숨긴다.
            //  왼쪽 위: 왼쪽 위 파일 이름 칸 바로 아래.   가운데 위: 위쪽 줄 가운데 (파일 이름 칸과 공유 칸 사이).
            let axFrame: CGRect
            switch chipPlace {
            case .bottomLeft:
                let left = p.frame.minX + 12
                // 도구 막대는 화면 가운데·아래 12pt에 놓인다. 폭만 가끔 읽은 값을 쓰고 위치는 화면 크기에서 바로 계산해서,
                // 분할 경계를 움직이는 동안에도 늦지 않게 따라간다.
                let barWidth = p.toolbar?.width ?? 586
                let bar = CGRect(x: p.frame.midX - barWidth / 2, y: p.frame.maxY - 12 - ChipModel.height,
                                 width: barWidth, height: ChipModel.height)
                // 공간이 다시 생기면 다음 확인(0.25초)에서 저절로 다시 나타난다.
                guard let width = ChipModel.width(for: bar.minX - 8 - left) else { seen.remove(id); continue }
                if chip.model.width != width { chip.model.width = width }
                if chip.model.rowHeight != ChipModel.height { chip.model.rowHeight = ChipModel.height }
                axFrame = CGRect(x: left, y: bar.midY - ChipModel.height / 2, width: width, height: ChipModel.height)
            case .topLeft:
                // 왼쪽 위 파일 이름 칸 바로 오른쪽, 같은 줄·같은 높이. 폭은 원래대로(최대 280, 가운데를 넘지 않게).
                let pill = p.filePill
                let x = (pill?.maxX ?? p.frame.minX + 12 + 200) + 8
                guard let width = ChipModel.width(for: min(ChipModel.maxWidth, p.frame.midX - x)) else { seen.remove(id); continue }
                if chip.model.width != width { chip.model.width = width }
                let hgt = pill?.height ?? ChipModel.height
                if chip.model.rowHeight != hgt { chip.model.rowHeight = hgt }
                axFrame = CGRect(x: x, y: pill?.minY ?? p.frame.minY + 8, width: width, height: hgt)
            case .topCenter:
                // 위쪽 줄의 왼쪽 파일 이름 칸·오른쪽 공유 칸(각 약 260pt)과 겹치지 않는 폭
                guard let width = ChipModel.width(for: min(ChipModel.maxWidth, p.frame.width - 2 * 272)) else { seen.remove(id); continue }
                if chip.model.width != width { chip.model.width = width }
                // 위쪽 줄의 파일 이름 칸과 같은 높이·같은 줄
                let hgt = p.filePill?.height ?? ChipModel.height
                if chip.model.rowHeight != hgt { chip.model.rowHeight = hgt }
                axFrame = CGRect(x: p.frame.midX - width / 2, y: p.filePill?.minY ?? p.frame.minY + 8, width: width, height: hgt)
            }
            if chip.model.style != style { chip.model.style = style }
            let panelAX = axFrame.insetBy(dx: -FigmaStyle.shadowMargin, dy: -FigmaStyle.shadowMargin)
            let clip = engine.windowFrame.map { $0.offsetBy(dx: -panelAX.minX, dy: -panelAX.minY) }
            if chip.model.windowClip != clip { chip.model.windowClip = clip }
            let frame = cocoaRect(fromAX: panelAX)
            if !chip.panel.shown { log("button show x=\(Int(p.frame.minX)) mode=\(p.mode) popup=\(p.popupOpen)") }
            chip.panel.appear(at: frame)   // 이미 나와 있으면 자리만 맞춘다
        }
        for (id, chip) in chips where !seen.contains(id) {
            if chip.panel.shown { log("button hide (front=\(front))") }
            chip.panel.disappear()
            chip.model.hovering = false  // 숨는 동안에는 마우스가 나가는 신호를 못 받으므로 직접 풀어 둔다
            if !engine.visiblePanes.contains(where: { ObjectIdentifier($0) == id }) { chips[id] = nil }
        }
    }

    private func makeChip(_ id: ObjectIdentifier) -> (panel: FloatingPanel, model: ChipModel) {
        let model = ChipModel()
        let panel = FloatingPanel(contentRect: NSRect(x: 0, y: 0, width: 200, height: 32), borderless: true)
        panel.level = NSWindow.Level(rawValue: NSWindow.Level.floating.rawValue + 1)  // 이동 중 덮개보다 위
        panel.contentView = NSHostingView(rootView: ChipView(
            model: model,
            back: { [weak self] in self?.back(id) },
            open: { [weak self] in self?.openPalette(for: id) },
            forward: { [weak self] in self?.forward(id) }))
        let chip = (panel: panel, model: model)
        chips[id] = chip
        return chip
    }
}

// MARK: - 안내 창

/// 환영 창(WelcomeView, MenuPanel.swift)의 상태. 처음 실행할 때와 패널의 "사용법"에서 연다. 권한 상태를 1초마다 다시 읽는다.
final class GuideModel: ObservableObject {
    @Published var trusted = uiTrusted()
    @Published var launchAtLogin = SMAppService.mainApp.status == .enabled
    private var timer: Timer?

    init() {
        let t = Timer(timeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            let now = uiTrusted()
            if now != self.trusted { self.trusted = now }
        }
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    func setLaunchAtLogin(_ on: Bool) {
        do {
            if on { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
        } catch {
            log("launch at login failed: \(error.localizedDescription)")
        }
        launchAtLogin = SMAppService.mainApp.status == .enabled
    }
}

// MARK: - 메뉴 막대 앱

/// 화면 끝에 닿은 뒤 펼치기까지의 빠르기. (화면 끝에서 기다리는 시간, 분할 화면 경계에서 기다리는 시간)
enum RevealSpeed: CaseIterable {
    case instant, quick, relaxed
    var values: (TimeInterval, TimeInterval) {
        switch self {
        case .instant: return (0, 0.08)
        case .quick: return (0.06, 0.18)
        case .relaxed: return (0.3, 0.45)
        }
    }
    var title: String {
        switch self {
        case .instant: return L("바로", "Instantly")
        case .quick: return L("빠르게 (기본)", "Quickly (default)")
        case .relaxed: return L("천천히", "Slowly")
        }
    }
}

/// 패널을 벗어난 뒤 접히기까지의 빠르기. (기다리는 시간, 패널 밖 여유 폭)
enum CollapseSpeed: CaseIterable {
    case instant, quick, relaxed
    var values: (TimeInterval, CGFloat) {
        switch self {
        case .instant: return (0, 0)
        case .quick: return (0.12, 12)
        case .relaxed: return (0.4, 30)
        }
    }
    var title: String {
        switch self {
        case .instant: return L("바로", "Instantly")
        case .quick: return L("빠르게 (기본)", "Quickly (default)")
        case .relaxed: return L("여유 있게", "Relaxed")
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    let engine = Engine()
    lazy var pages = PageNavigator(engine: engine)
    let summary = SummaryWindow()
    var statusItem: NSStatusItem!
    var timer: Timer?
    var guideWindow: NSWindow?
    var settingsWindow: NSWindow?
    // 메뉴 막대 아이콘(Marks.swift)과, 아이콘을 누르면 뜨는 패널(MenuPanel.swift)
    var player: MarkPlayer!
    private var statusTitleKey = ""
    let menuModel = MenuModel()
    private var panelWindow: MenuPanelWindow?
    /// 패널을 붙이는 보이지 않는 창. 연 순간 메뉴 막대 아이콘 칸 자리에 놓는다.
    /// 아이콘 칸에 직접 붙이면 온도를 켜고 끌 때 칸 폭이 바뀌어 패널이 좌우로 흔들린다.
    private var outsideClick: Any?
    private var insideClick: Any?
    let defaults = UserDefaults.standard
    let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev"

    func applicationDidFinishLaunching(_ notification: Notification) {
        log("launch v\(version) pid=\(getpid()) trusted=\(AXIsProcessTrusted()) path=\(Bundle.main.bundlePath)")
        migrateFromOldName()   // ActivityLog·설정을 읽기 전에 해야 한다
        defaults.register(defaults: ["enabled": true, "rightEdge": false, "minimizeByDefault": true,
                                     "collapseDelay": 0.12, "leaveMargin": 12.0,
                                     "hardDwell": 0.06, "softDwell": 0.18,
                                     "showPageChip": true, "workLog": true, "animateMark": true, "weatherMode": 0])
        defaults.removeObject(forKey: "animateMark")      // 움직임 끄기 설정은 없앴다: 예전에 꺼 둔 값이 남아 멈춰 있지 않게
        ActivityLog.shared.enabled = defaults.bool(forKey: "workLog")
        engine.enabled = defaults.bool(forKey: "enabled")
        engine.rightEdge = defaults.bool(forKey: "rightEdge")
        engine.minimizeByDefault = defaults.bool(forKey: "minimizeByDefault")
        engine.collapseDelay = max(0, defaults.double(forKey: "collapseDelay"))
        engine.leaveMargin = CGFloat(max(0, defaults.double(forKey: "leaveMargin")))
        engine.hardDwell = max(0, defaults.double(forKey: "hardDwell"))
        engine.softDwell = max(0, defaults.double(forKey: "softDwell"))
        pages.showChip = defaults.bool(forKey: "showPageChip")
        pages.chipPlace = PageChipPlace(rawValue: defaults.integer(forKey: "pageChipPlace")) ?? .bottomLeft

        // 1.5.0에서 바뀐 아이콘: 골라 둔 사람은 새 아이콘으로 이어 준다
        let renamed = ["lily": "magnolia", "moon": "crane", "dipper": "crane", "cairn": "pagoda"]   // 북두칠성은 학으로 바뀌었다
        if let old = defaults.string(forKey: "menuMark"), let now = renamed[old] { defaults.set(now, forKey: "menuMark") }
        // 1.6.0의 "날씨" 아이콘은 이제 따로 켜는 줄이다: 골라 두었으면 그 설정으로 옮긴다
        if defaults.string(forKey: "menuMark") == MarkLibrary.weatherID {
            defaults.set(defaults.object(forKey: "weatherTemp") as? Bool == false ? 1 : 2, forKey: "weatherMode")
            defaults.set(MarkLibrary.defaultID, forKey: "menuMark")
        }
        // 저장된 아이콘이 목록에 없으면(예: 예전 버전의 값) 기본 아이콘으로 바꿔 저장한다
        if MarkLibrary.shared.isLoaded, !MarkLibrary.shared.contains(defaults.string(forKey: "menuMark") ?? "") {
            defaults.set(MarkLibrary.defaultID, forKey: "menuMark")
        }
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        statusItem.button?.target = self
        statusItem.button?.action = #selector(togglePanel)
        statusItem.button?.toolTip = "Layerhover"
        statusItem.button?.setAccessibilityLabel("Layerhover")
        player = MarkPlayer(library: .shared, button: statusItem.button)
        player.onSystemChange = { [weak self] in self?.refreshIcon() }
        WeatherService.shared.onChange = { [weak self] in self?.refreshIcon() }
        Updater.shared.onChange = { [weak self] in self?.syncMenuModel() }
        if !uiPreview { Updater.shared.start() }
        refreshIcon()
        if weatherDemo { runWeatherDemo(); return }
        if uiPreview { showWelcomeIfNeeded(); return }

        // 0.04초마다 확인한다. Figma가 뒤에 있을 때는 할 일이 거의 없으므로 6번에 한 번(약 0.25초)만 돈다.
        // (앱을 오가는 순간은 PageNavigator가 알림을 받아 바로 처리한다)
        // Figma가 앞에 있을 때만 0.04초마다 확인한다. 다른 앱을 쓰는 동안에는 2초에 한 번만 깨어나고
        // (예전엔 0.04초마다 깨어나 건너뛰기만 해도 CPU를 1~2% 썼다), Figma가 앞으로 오면 알림을 받아 바로 빨라진다.
        scheduleTimer()
        NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main) { [weak self] _ in
            self?.scheduleTimer()
        }

        // 권한 없이 켜진 뒤에 권한을 받으면, macOS가 이 프로세스에는 다른 앱 화면을 제대로
        // 보여 주지 않는다 (펼치기·접기가 동작하지 않음). 권한이 생기면 스스로 다시 켠다.
        if !AXIsProcessTrusted() {
            // 시스템의 권한 요청을 바로 띄운다. 이렇게 물어야 손쉬운 사용 목록에 Layerhover가 올라가서 켤 스위치가 생긴다.
            // (기록을 지운 뒤에는 목록에서 사라지므로, 안내 창의 버튼을 누르지 않으면 켤 곳이 없었다)
            let prompt = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
            _ = AXIsProcessTrustedWithOptions(prompt)
            showGuide()
            let watch = Timer(timeInterval: 1, repeats: true) { [weak self] timer in
                guard AXIsProcessTrusted() else { return }
                timer.invalidate()
                log("permission granted while running; relaunching")
                self?.relaunch()
            }
            RunLoop.main.add(watch, forMode: .common)
        } else {
            showWelcomeIfNeeded()
        }
    }

    private var timerFast: Bool?
    /// 빠른(0.04초)·느린(2초) 확인 주기를 지금 상태에 맞춘다. 같으면 그대로 둔다.
    func scheduleTimer() {
        let fast = engine.isFigmaActive || engine.pageJob != nil
        guard fast != timerFast else { return }
        timerFast = fast
        timer?.invalidate()
        let t = Timer(timeInterval: fast ? 0.04 : 2.0, repeats: true) { [weak self] _ in
            guard let self else { return }
            self.engine.tick()
            self.pages.tick()
            self.scheduleTimer()
        }
        t.tolerance = fast ? 0.01 : 0.5
        RunLoop.main.add(t, forMode: .common)
        timer = t
        if fast { engine.tick(); pages.tick() }
    }

    /// 권한을 받고 다시 켜진 뒤 한 번, "준비됐어요"와 써 보는 법을 보여 준다.
    private func showWelcomeIfNeeded() {
        if uiPreview { runPreviewScript(); return }      // 화면 확인 모드는 설정을 바꾸지 않는다
        guard !defaults.bool(forKey: "welcomed") else { return }
        defaults.set(true, forKey: "welcomed")
        showGuide()
    }

    /// 화면 확인 모드에서 LAYERHOVER_UI_SCRIPT 로 시키는 일 (쉼표로 구분): panel, settings, welcome, summary, switch
    ///  switch 는 13개 아이콘을 차례로 골라 바뀌는 데 걸린 시간을 기록하고 원래 고른 것으로 되돌린다.
    private func runPreviewScript() {
        let steps = (ProcessInfo.processInfo.environment["LAYERHOVER_UI_SCRIPT"] ?? "").split(separator: ",").map(String.init)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [self] in
            if steps.contains("switch") {
                let original = defaults.string(forKey: "menuMark")
                var worst = 0.0
                for m in MarkLibrary.shared.marks {
                    let t0 = ProcessInfo.processInfo.systemUptime
                    selectMark(m.id)
                    let ms = (ProcessInfo.processInfo.systemUptime - t0) * 1000
                    worst = max(worst, ms)
                    let shown: String = { if case .animate(let id)? = player.display { return id }; if case .still(let id, _)? = player.display { return id }; return "?" }()
                    log("preview switch \(m.id) -> shown=\(shown) \(String(format: "%.1f", ms))ms")
                }
                if let original { defaults.set(original, forKey: "menuMark") } else { defaults.removeObject(forKey: "menuMark") }
                refreshIcon()
                log("preview switch worst=\(String(format: "%.1f", worst))ms restored=\(currentMarkID)")
            }
            if steps.contains("panel") { togglePanel() }
            if steps.contains("settings") { showSettings() }
            if steps.contains("welcome") { showGuide() }
            if steps.contains("summary") { showSummary() }
        }
    }

    private func relaunch() {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/sh")
        task.arguments = ["-c", "sleep 1; /usr/bin/open -n \"$0\"", Bundle.main.bundlePath]
        try? task.run()
        NSApp.terminate(nil)
    }

    /// 고른 메뉴 막대 아이콘
    var currentMarkID: String {
        let saved = defaults.string(forKey: "menuMark") ?? ""
        return MarkLibrary.shared.contains(saved) ? saved : MarkLibrary.defaultID
    }

    /// 예전 이름(EdgePeek)으로 쓰던 설정·파일별 페이지 목록·작업 기록을 한 번만 옮겨 온다.
    /// 예전 것은 지우지 않는다(되돌릴 수 있게). 새 이름 쪽에 이미 값이 있으면 그대로 둔다.
    private func migrateFromOldName() {
        guard !defaults.bool(forKey: "migratedFromEdgePeek") else { return }
        defer { defaults.set(true, forKey: "migratedFromEdgePeek") }
        if let old = defaults.persistentDomain(forName: "app.edgepeek.EdgePeek") {
            var copied = 0
            for (k, v) in old where !k.hasPrefix("NSStatusItem") && !k.hasPrefix("NSWindow") && defaults.object(forKey: k) == nil {
                defaults.set(v, forKey: k); copied += 1
            }
            log("migrated \(copied) settings from EdgePeek")
        }
        let support = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support")
        let oldDir = support.appendingPathComponent("EdgePeek/Activity")
        let newDir = support.appendingPathComponent("Layerhover/Activity")
        if FileManager.default.fileExists(atPath: oldDir.path) && !FileManager.default.fileExists(atPath: newDir.path) {
            try? FileManager.default.createDirectory(at: newDir.deletingLastPathComponent(), withIntermediateDirectories: true)
            do { try FileManager.default.copyItem(at: oldDir, to: newDir); log("copied activity records from EdgePeek") }
            catch { log("activity copy failed: \(error)") }
        }
    }

    /// 메뉴 막대 아이콘을 지금 상태에 맞춘다. 무엇을 보여 줄지는 MarkRules 가 정한다.
    func refreshIcon() {
        let lib = MarkLibrary.shared, chosen = weatherDemo || weatherMode > 0 ? MarkLibrary.weatherID : currentMarkID
        // 날씨: 고른 동안만 위치·날씨를 받는다 (화면 확인 모드에서는 권한을 묻지 않는다)
        let weather = WeatherService.shared
        if chosen == MarkLibrary.weatherID && !uiPreview { weather.start() } else { weather.stop() }
        lib.weatherMark = weatherDemo ? weatherDemoScene.mark : weather.mark
        let id = lib.resolve(chosen)
        // 온도를 켜면 값이 오기 전에도 자리를 바로 잡고 흐린 "–°" 로 받는 중임을 보여 준다
        if chosen == MarkLibrary.weatherID && (weatherDemo || weatherMode == 2) {
            if weatherDemo { updateStatusTitle("\(weatherDemoScene.temp)°") }
            else if let t = weather.temperature { updateStatusTitle("\(t)°") } else { updateStatusTitle("–°", placeholder: true) }
        } else {
            updateStatusTitle(nil)
        }
        player.update(MarkRules.Inputs(
            selected: id,
            selectedAsset: lib.asset(id).state,
            defaultAsset: id == MarkLibrary.defaultID ? lib.asset(id).state : lib.asset(MarkLibrary.defaultID).state,
            animateSetting: defaults.bool(forKey: "animateMark"),
            trusted: uiTrusted(),
            paused: !engine.enabled,
            reduceMotion: NSWorkspace.shared.accessibilityDisplayShouldReduceMotion,
            lowPower: ProcessInfo.processInfo.isLowPowerModeEnabled,
            screenAwake: player.screenAwake))
        syncMenuModel()
    }

    /// 날씨 장면 시험: 8개 장면을 예시 온도와 함께 6초씩 계속 돌린다.
    private func runWeatherDemo() {
        let scenes: [(String, Int)] = [("wx-clear", 24), ("wx-partly", 18), ("wx-cloudy", 12), ("wx-night", 9),
                                       ("wx-rain", 15), ("wx-snow", -3), ("wx-storm", 21), ("wx-fog", 6)]
        var i = 0
        func show() {
            weatherDemoScene = scenes[i % scenes.count]
            refreshIcon()
            statusItem.button?.toolTip = WeatherService.name(of: weatherDemoScene.mark)
            log("weather demo: \(weatherDemoScene.mark)")
            i += 1
        }
        show()
        Timer.scheduledTimer(withTimeInterval: 6, repeats: true) { _ in show() }
    }

    /// 날씨 아이콘 옆 온도. nil 이면 아이콘만 (정사각형 칸).
    private func updateStatusTitle(_ text: String?, placeholder: Bool = false) {
        guard let button = statusItem.button else { return }
        let want = text.map { " " + $0 } ?? ""
        let key = want + (placeholder ? "~" : "")
        guard statusTitleKey != key else { return }
        statusTitleKey = key
        if let text {
            statusItem.length = NSStatusItem.variableLength
            button.imagePosition = .imageLeft
            var attrs: [NSAttributedString.Key: Any] = [.font: NSFont.monospacedDigitSystemFont(ofSize: NSFont.systemFontSize, weight: .regular)]
            if placeholder { attrs[.foregroundColor] = NSColor.tertiaryLabelColor }   // 값이 있을 땐 메뉴 막대 기본 색을 그대로 쓴다
            button.attributedTitle = NSAttributedString(string: " " + text, attributes: attrs)
        } else {
            button.title = ""
            button.imagePosition = .imageOnly
            statusItem.length = NSStatusItem.squareLength
        }
        button.setAccessibilityLabel(text.map { placeholder ? L("Layerhover, 날씨를 받는 중", "Layerhover, getting the weather") : "Layerhover, \(WeatherService.shared.conditionName) \($0)" } ?? "Layerhover")
        button.toolTip = placeholder ? WeatherService.shared.statusLine : "Layerhover"
        DispatchQueue.main.async { [weak self] in self?.player.relayout() }
    }

    // MARK: 패널

    /// 패널이 보여 주는 값을 지금 상태로 맞춘다
    func syncMenuModel() {
        let m = menuModel
        m.trusted = uiTrusted()
        m.enabled = engine.enabled
        m.figmaRunning = !NSRunningApplication.runningApplications(withBundleIdentifier: figmaBundleID).isEmpty
        m.cheer = Cheer.line(trusted: m.trusted, awake: m.enabled, figmaRunning: m.figmaRunning, logging: ActivityLog.shared.enabled,
                             active: ActivityLog.shared.todayActive, streak: ActivityLog.shared.currentStreak,
                             hour: Calendar.current.component(.hour, from: Date()))
        m.dayProgress = min(1, ActivityLog.shared.todayActive / (6 * 3600))
        m.working = ActivityLog.shared.currentStreak > 0
        m.restHint = Cheer.restHint(active: ActivityLog.shared.todayActive, streak: ActivityLog.shared.currentStreak,
                                    hour: Calendar.current.component(.hour, from: Date()))
        m.version = version
        m.marks = MarkLibrary.shared.marks
        m.selectedMark = currentMarkID
        let w = WeatherService.shared
        m.weatherMode = weatherMode
        m.weatherStatus = w.statusLine
        m.weatherDenied = w.state == .denied
        m.weatherTemp = weatherDemo ? weatherDemoScene.temp : w.temperature
        let up = Updater.shared
        m.autoUpdate = up.autoInstall
        m.updateStatus = up.statusLine
        m.updateVersion = up.availableVersion
        if case .installing = up.state { m.updateBusy = true } else { m.updateBusy = up.state == .checking }
        m.weatherShowTemp = weatherMode > 0 ? weatherMode == 2 : (defaults.object(forKey: "weatherShowTemp") as? Bool ?? true)
        m.animateMark = defaults.bool(forKey: "animateMark")
        m.motionBlocked = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
            ? L("macOS '동작 줄이기'가 켜져 있어 멈춰 있어요", "Paused because Reduce Motion is on")
            : ProcessInfo.processInfo.isLowPowerModeEnabled ? L("저전력 모드라 멈춰 있어요", "Paused in Low Power Mode") : nil
        m.reveal = RevealSpeed.allCases.firstIndex { $0.values == (engine.hardDwell, engine.softDwell) }
        m.collapse = CollapseSpeed.allCases.firstIndex { $0.values.0 == engine.collapseDelay && $0.values.1 == engine.leaveMargin }
        m.rightEdge = engine.rightEdge
        m.minimizeByDefault = engine.minimizeByDefault
        m.showChip = pages.showChip
        m.chipPlace = pages.chipPlace.rawValue
        m.workLog = ActivityLog.shared.enabled
        m.launchAtLogin = SMAppService.mainApp.status == .enabled
    }

    private func wireMenuActions() {
        // 창을 띄우는 동작은 패널을 먼저 닫는다
        func closing(_ f: @escaping () -> Void) -> () -> Void { { [weak self] in self?.closePanel(); f() } }
        var a = MenuModel.Actions()
        a.toggleEnabled = { [weak self] in self?.toggleEnabled() }
        a.toggleFocus = { [weak self] in self?.toggleFocus() }
        a.openAccessibility = closing { [weak self] in self?.openAccessibility() }
        a.openPalette = closing { [weak self] in self?.openPagePalette() }
        a.showSummary = closing { [weak self] in self?.showSummary() }
        a.selectMark = { [weak self] id in self?.selectMark(id) }
        a.toggleAnimate = { [weak self] in self?.toggleMarkAnimation() }
        a.setWeatherMode = { [weak self] mode in
            guard let self else { return }
            self.defaults.set(mode, forKey: "weatherMode")
            if mode > 0 { self.defaults.set(mode == 2, forKey: "weatherShowTemp") }
            self.refreshIcon()
        }
        a.checkUpdate = { Updater.shared.check() }
        a.installUpdate = { Updater.shared.installNow() }
        a.toggleAutoUpdate = { [weak self] in Updater.shared.autoInstall.toggle(); self?.syncMenuModel() }
        a.setWeatherTemp = { [weak self] on in     // 온도 스위치: 기억해 두고, 날씨를 쓰는 중이면 바로 바꾼다
            guard let self else { return }
            self.defaults.set(on, forKey: "weatherShowTemp")
            if self.weatherMode > 0 { self.defaults.set(on ? 2 : 1, forKey: "weatherMode") }
            self.refreshIcon(); self.syncMenuModel()
        }
        a.openLocationSettings = closing {
            NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices")!)
        }
        a.setReveal = { [weak self] i in self?.setRevealSpeed(RevealSpeed.allCases[i]) }
        a.setCollapse = { [weak self] i in self?.setSpeed(CollapseSpeed.allCases[i]) }
        a.toggleRightEdge = { [weak self] in self?.toggleRightEdge() }
        a.toggleMinimize = { [weak self] in self?.toggleMinimizeByDefault() }
        a.toggleChip = { [weak self] in self?.togglePageChip() }
        a.setChipPlace = { [weak self] i in
            guard let self, let place = PageChipPlace(rawValue: i) else { return }
            self.pages.chipPlace = place
            self.defaults.set(i, forKey: "pageChipPlace")
            self.syncMenuModel()
        }
        a.toggleWorkLog = { [weak self] in self?.toggleWorkLog() }
        a.toggleLogin = { [weak self] in self?.toggleLogin() }
        a.setLanguage = { lang in
            guard lang != appLanguage else { return }
            UserDefaults.standard.set(lang, forKey: "appLanguage")
            // 언어는 시작할 때 정해지므로, 이 앱이 끝나면 곧바로 다시 연다
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/bin/sh")
            p.arguments = ["-c", "while kill -0 \"$1\" 2>/dev/null; do sleep 0.1; done; open \"$2\"", "sh",
                           String(ProcessInfo.processInfo.processIdentifier), Bundle.main.bundleURL.path]
            try? p.run()
            NSApp.terminate(nil)
        }
        a.connectClaude = closing { [weak self] in self?.connectClaude() }
        a.showGuide = closing { [weak self] in self?.showGuide() }
        a.showLog = closing { [weak self] in self?.showLog() }
        a.showSettings = closing { [weak self] in self?.showSettings() }
        a.quit = { [weak self] in self?.quit() }
        menuModel.actions = a
    }

    @objc func togglePanel() {
        if panelWindow?.isOpen == true { closePanel(); return }
        guard let button = statusItem.button else { return }
        if panelWindow == nil {
            wireMenuActions()
            panelWindow = MenuPanelWindow(model: menuModel) { [weak self] in self?.closePanel() }
        }
        syncMenuModel()
        ActivityLog.shared.flush()
        // 기준은 아이콘만 있을 때의 정사각형 칸: 메뉴 막대 칸은 오른쪽 끝이 고정되고 온도가 붙으면 왼쪽으로 늘어나므로,
        // 오른쪽 끝에서 정사각형 한 칸만큼을 잡는다. 온도를 켜고 열든 끄고 열든 패널은 늘 같은 자리다.
        var rect = button.window.map { $0.convertToScreen(button.convert(button.bounds, to: nil)) } ?? .zero
        let square = NSStatusBar.system.thickness
        if rect.width > square { rect.origin.x = rect.maxX - square; rect.size.width = square }
        // 화면이 여러 개면 메뉴 막대 아이콘도 화면마다 하나씩 있다. 아이콘의 창이 가리키는 화면과
        // 지금 마우스가 있는 화면(사람이 누른 곳)이 다르면, 오른쪽 끝에서 같은 거리만큼 떨어진 그 화면의 아이콘 아래에 연다.
        let mouse = NSEvent.mouseLocation
        if let clicked = NSScreen.screens.first(where: { $0.frame.contains(mouse) }),
           let home = button.window?.screen, clicked != home {
            let fromRight = home.frame.maxX - rect.minX
            rect.origin.x = clicked.frame.maxX - fromRight
            rect.origin.y = clicked.visibleFrame.maxY
            rect.size.height = max(clicked.frame.maxY - clicked.visibleFrame.maxY, 1)
        }
        panelWindow?.open(below: rect)
        button.highlight(true)
        // 다른 앱을 누르면 닫는다 (메뉴 막대 앱은 앞에 나서지 않으므로 직접 지켜본다)
        outsideClick = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in self?.closePanel() }
        // 이 앱의 다른 창(설정 등)을 눌러도 닫는다. 메뉴 막대 아이콘은 togglePanel 이 맡는다.
        // esc 로도 닫는다 (안의 SwiftUI 가 esc 를 먼저 받아 창까지 올라오지 않을 때가 있어 직접 본다)
        insideClick = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown, .keyDown]) { [weak self] e in
            guard let self else { return e }
            if e.type == .keyDown {
                if e.keyCode == 53 {
                    // 펼친 칸을 보고 있으면 먼저 첫 화면으로 돌아간다 (제어 센터와 같다)
                    if self.menuModel.menuBarDetail {
                        withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) { self.menuModel.menuBarDetail = false }
                    } else { self.closePanel() }
                    return nil
                }
                return e
            }
            if e.window !== self.panelWindow, e.window !== self.statusItem.button?.window { self.closePanel() }
            return e
        }
    }

    func closePanel() {
        guard panelWindow?.isOpen == true else { return }
        panelWindow?.close(animated: true)
        statusItem.button?.highlight(false)
        if let m = outsideClick { NSEvent.removeMonitor(m); outsideClick = nil }
        if let m = insideClick { NSEvent.removeMonitor(m); insideClick = nil }
    }

    /// 날씨: 0 끔, 1 아이콘, 2 온도와 함께. 켜면 고른 아이콘 대신 날씨가 보인다.
    var weatherMode: Int { defaults.integer(forKey: "weatherMode") }

    func selectMark(_ id: String) {
        guard MarkLibrary.shared.contains(id) else { return }
        defaults.set(id, forKey: "menuMark")
        if !uiPreview { defaults.set(0, forKey: "weatherMode") }   // 아이콘을 고르면 그 아이콘을 보여 준다 (날씨는 끈다)
        refreshIcon()
    }

    @objc func toggleMarkAnimation() {
        defaults.set(!defaults.bool(forKey: "animateMark"), forKey: "animateMark")
        refreshIcon()
    }

    // MARK: 동작

    @objc func toggleEnabled() {
        engine.enabled.toggle()
        defaults.set(engine.enabled, forKey: "enabled")
        refreshIcon()
    }

    // MARK: 뽀모도로

    private var focusTimer: Timer?

    /// 누르면 25분을 시작하고, 도는 중이면 멈춘다. 끝나면 소리와 알림으로 알린다.
    @objc func toggleFocus() {
        focusTimer?.invalidate(); focusTimer = nil
        if menuModel.focusEnd != nil {
            menuModel.focusEnd = nil
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["focus"])
            return
        }
        let end = Date().addingTimeInterval(Focus.length)
        menuModel.focusEnd = end
        let t = Timer(fire: end, interval: 0, repeats: false) { [weak self] _ in self?.focusDone() }
        RunLoop.main.add(t, forMode: .common)
        focusTimer = t
        // 알림: 처음 한 번만 허락을 묻는다. 허락하지 않아도 소리는 난다.
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { _, _ in }
        let c = UNMutableNotificationContent()
        c.title = L("뽀모도로 끝", "Pomodoro done")
        c.body = L("25분 집중했어요. 잠깐 쉬어 가세요.", "25 minutes of focus. Take a short break.")
        c.sound = .default
        center.add(UNNotificationRequest(identifier: "focus", content: c,
                                         trigger: UNTimeIntervalNotificationTrigger(timeInterval: Focus.length, repeats: false)))
        log("focus started")
    }

    private func focusDone() {
        focusTimer = nil
        menuModel.focusEnd = nil
        NSSound(named: "Glass")?.play()
        log("focus done")
    }

    func setSpeed(_ s: CollapseSpeed) {
        (engine.collapseDelay, engine.leaveMargin) = s.values
        defaults.set(engine.collapseDelay, forKey: "collapseDelay")
        defaults.set(Double(engine.leaveMargin), forKey: "leaveMargin")
        syncMenuModel()
    }

    @objc func showSummary() { summary.show() }

    /// Claude Code 설정(~/.claude/settings.json)에 넣을 훅 설정을 복사해 준다. 설정 파일은 직접 고치지 않는다.
    @objc func connectClaude() {
        let script = Bundle.main.resourceURL?.appendingPathComponent("claude-hook.sh").path
            ?? "/Applications/Layerhover.app/Contents/Resources/claude-hook.sh"
        let cmd = ["type": "command", "command": script]
        let figmaTools = "mcp__.*(use_figma|figma_design|upload_assets|create_new_file|send_code_to_figma|shader|generative_plugin|code_connect_map)"
        let hooks: [String: Any] = ["hooks": [
            "PreToolUse": [["matcher": figmaTools, "hooks": [cmd]]],
            "PostToolUse": [["matcher": figmaTools, "hooks": [cmd]]],
            "Stop": [["hooks": [cmd]]],
        ]]
        let data = (try? JSONSerialization.data(withJSONObject: hooks, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])) ?? Data()
        let text = String(data: data, encoding: .utf8) ?? ""
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        NSApp.activate(ignoringOtherApps: true)
        let a = NSAlert()
        a.messageText = L("Claude Code 설정을 복사했어요", "Copied the Claude Code settings")
        a.informativeText = L("""
            ~/.claude/settings.json 의 "hooks"에 붙여 넣으면, Claude가 Figma를 고치는 동안 페이지 버튼에 ✦ 표시가 나와요.
            이미 hooks가 있다면 PreToolUse·PostToolUse·Stop 항목만 합쳐 넣어 주세요.
            Figma에 AI 에이전트가 연결되면 이 설정 없이도 ✦ 가 나와요.
            """, """
            Paste it into "hooks" in ~/.claude/settings.json. While Claude edits Figma, the page button shows ✦.
            If you already have hooks, merge the PreToolUse, PostToolUse and Stop entries.
            Without it, ✦ still appears when Figma shows an AI agent connected to the file.
            """)
        a.runModal()
    }

    @objc func toggleWorkLog() {
        ActivityLog.shared.flush()
        ActivityLog.shared.enabled.toggle()
        defaults.set(ActivityLog.shared.enabled, forKey: "workLog")
        syncMenuModel()
    }

    func applicationWillTerminate(_ notification: Notification) { ActivityLog.shared.flush() }

    @objc func openPagePalette() {
        // 메뉴를 닫은 뒤 Figma 화면 위에 띄운다. 다른 앱이 앞에 있으면 먼저 Figma를 앞으로 가져온다
        // (그러지 않으면 이동 창이 다른 앱 창 뒤에 묻혔다). Figma가 앞으로 온 것을 확인한 뒤에 연다.
        guard let figma = NSRunningApplication.runningApplications(withBundleIdentifier: figmaBundleID).first else { return }
        if figma.isActive {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { self.pages.openPalette() }
            return
        }
        figma.activate(options: [])
        func openWhenFront(_ tries: Int) {
            if figma.isActive || tries == 0 { scheduleTimer(); pages.openPalette(); return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { openWhenFront(tries - 1) }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { openWhenFront(20) }
    }

    @objc func togglePageChip() {
        pages.showChip.toggle()
        defaults.set(pages.showChip, forKey: "showPageChip")
        syncMenuModel()
    }

    func setRevealSpeed(_ s: RevealSpeed) {
        (engine.hardDwell, engine.softDwell) = s.values
        defaults.set(engine.hardDwell, forKey: "hardDwell")
        defaults.set(engine.softDwell, forKey: "softDwell")
        syncMenuModel()
    }

    @objc func toggleMinimizeByDefault() {
        engine.minimizeByDefault.toggle()
        defaults.set(engine.minimizeByDefault, forKey: "minimizeByDefault")
        syncMenuModel()
    }

    @objc func toggleRightEdge() {
        engine.rightEdge.toggle()
        defaults.set(engine.rightEdge, forKey: "rightEdge")
        syncMenuModel()
    }

    @objc func toggleLogin() {
        do {
            if SMAppService.mainApp.status == .enabled { try SMAppService.mainApp.unregister() }
            else { try SMAppService.mainApp.register() }
        } catch {
            NSApp.activate(ignoringOtherApps: true)
            let a = NSAlert()
            a.messageText = L("자동 실행을 바꾸지 못했어요", "Couldn't change launch at login")
            a.informativeText = error.localizedDescription
            a.runModal()
        }
        syncMenuModel()
    }

    @objc func openAccessibility() {
        // 프롬프트 옵션으로 한 번 물어야 손쉬운 사용 목록에 Layerhover가 올라간다.
        let prompt = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        _ = AXIsProcessTrustedWithOptions(prompt)
        NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!)
    }

    @objc func showLog() {
        let url = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs/Layerhover.log")
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    @objc func showGuide() {
        NSApp.activate(ignoringOtherApps: true)
        if let w = guideWindow { w.makeKeyAndOrderFront(nil); return }
        let host = NSHostingController(rootView: WelcomeView(
            model: GuideModel(),
            openSettings: { [weak self] in self?.openAccessibility() },
            close: { [weak self] in self?.guideWindow?.close() }))
        let w = NSWindow(contentViewController: host)
        w.title = "Layerhover"
        w.styleMask = [.titled, .closable, .fullSizeContentView]
        w.isOpaque = false; w.backgroundColor = .clear         // 유리: 창 뒤가 비치게
        w.titlebarAppearsTransparent = true
        w.titleVisibility = .hidden
        w.isReleasedWhenClosed = false
        w.standardWindowButton(.miniaturizeButton)?.isHidden = true
        w.standardWindowButton(.zoomButton)?.isHidden = true
        w.delegate = self
        w.center()
        w.makeKeyAndOrderFront(nil)
        guideWindow = w
    }

    /// 설정 창 (SettingsWindow.swift). 패널의 "설정…"(⌘,)으로 연다. 크기는 고정이다.
    @objc func showSettings() {
        syncMenuModel()
        if settingsWindow == nil { wireMenuActions() }      // 패널을 한 번도 열지 않았을 때도 동작이 이어지도록
        NSApp.activate(ignoringOtherApps: true)
        if let w = settingsWindow {
            if w.isMiniaturized { w.deminiaturize(nil) }
            w.makeKeyAndOrderFront(nil)
            return
        }
        // Finder와 같은 짜임: AppKit 분할 창의 옆줄 칸 + 내용 칸 (각 칸 안은 SwiftUI)
        let close: () -> Void = { [weak self] in self?.settingsWindow?.close() }
        let side = NSHostingController(rootView: SettingsView(model: menuModel, close: close, part: .sidebar))
        let main = NSHostingController(rootView: SettingsView(model: menuModel, close: close, part: .detail))
        side.sizingOptions = []; main.sizingOptions = []
        let split = NSSplitViewController()
        let sideItem = NSSplitViewItem(sidebarWithViewController: side)
        sideItem.canCollapse = false
        sideItem.minimumThickness = SettingsStyle.sidebarWidth; sideItem.maximumThickness = SettingsStyle.sidebarWidth
        split.addSplitViewItem(sideItem)
        split.addSplitViewItem(NSSplitViewItem(viewController: main))
        let w = NSWindow(contentViewController: split)
        w.title = L("Layerhover 설정", "Layerhover Settings")
        w.styleMask = [.titled, .closable, .miniaturizable, .fullSizeContentView]
        // 빈 도구 막대를 달아 Finder와 같은 통합 제목 막대(큰 모서리 반경, 옆줄 안 신호등 자리)를 받는다
        w.toolbar = NSToolbar(identifier: "LayerhoverSettings")
        w.toolbarStyle = .unified
        w.titlebarAppearsTransparent = true
        w.titleVisibility = .hidden
        w.setContentSize(SettingsStyle.size)
        w.contentMinSize = SettingsStyle.size
        w.contentMaxSize = SettingsStyle.size
        w.standardWindowButton(.zoomButton)?.isEnabled = false
        w.isReleasedWhenClosed = false
        w.delegate = self
        w.center()
        w.setFrameAutosaveName("LayerhoverSettings")
        w.makeKeyAndOrderFront(nil)
        settingsWindow = w
    }

    /// 설정 창으로 돌아올 때마다 값을 다시 읽는다 (시스템 설정에서 권한을 켜고 왔거나, 로그인 항목을 밖에서 바꿨을 수 있다)
    func windowDidBecomeKey(_ notification: Notification) {
        if let w = notification.object as? NSWindow, w === settingsWindow { syncMenuModel() }
    }

    func windowWillClose(_ notification: Notification) {
        if (notification.object as? NSWindow) === guideWindow { guideWindow = nil }
        if (notification.object as? NSWindow) === settingsWindow { settingsWindow = nil }
    }

    @objc func quit() { NSApp.terminate(nil) }
}



// MARK: - 시작

/// SwiftUI 화면을 창 없이 2배 해상도 PNG로 저장한다 (화면 확인용)
func renderPNG<V: View>(_ view: V, to path: String, dark: Bool) {
    let v = NSHostingView(rootView: view)
    v.appearance = NSAppearance(named: dark ? .darkAqua : .aqua)
    v.frame = NSRect(origin: .zero, size: v.fittingSize)
    v.layoutSubtreeIfNeeded()
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(v.bounds.width * 2), pixelsHigh: Int(v.bounds.height * 2),
                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = v.bounds.size
    v.cacheDisplay(in: v.bounds, to: rep)
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}

if let i = args.firstIndex(of: "--render-chip"), args.count > i + 1 {
    // 테스트용: 왼쪽 아래 버튼을 여러 폭으로 그려 PNG로 저장한다.
    _ = NSApplication.shared
    for (n, w) in [ChipModel.maxWidth, ChipModel.maxWidth, 161, ChipModel.squareWidth].enumerated() {
        let m = ChipModel()
        m.hovering = n == 1
        m.title = "Settings / Notifications"
        m.canBack = true
        m.width = w
        m.style = FigmaStyle(dark: !args.contains("--light"))
        let v = NSHostingView(rootView: ChipView(model: m, back: {}, open: {}, forward: {}))
        v.frame = NSRect(x: 0, y: 0, width: w, height: ChipModel.height).insetBy(dx: -FigmaStyle.shadowMargin, dy: -FigmaStyle.shadowMargin)
        v.appearance = NSAppearance(named: args.contains("--light") ? .aqua : .darkAqua)
        v.layoutSubtreeIfNeeded()
        // 화면과 같은 2배 해상도로 그린다.
        let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(v.bounds.width * 2), pixelsHigh: Int(v.bounds.height * 2),
                                   bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                   colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
        rep.size = v.bounds.size
        v.cacheDisplay(in: v.bounds, to: rep)
        try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[i + 1] + "-\(n).png"))
    }
    exit(0)
}
if let i = args.firstIndex(of: "--render-palette"), args.count > i + 1 {
    // 테스트용: 페이지 이동 창을 PNG로 저장한다.
    _ = NSApplication.shared
    let m = PaletteModel()
    m.style = FigmaStyle(dark: !args.contains("--light"))
    let b = PageBook()
    b.pages = ["👋 Welcome", "📱 App", " ㄴ Onboarding / Login", " ㄴ Home / Dashboard",
               " ㄴ Reports", "🧪 Experiments", " ㄴ Settings / Notifications"].enumerated().map { PageEntry(title: $1, index: $0) }
    b.current = b.pages[6]
    b.recent = [b.pages[6], b.pages[3]]
    m.book = b
    m.fileName = "Sample App"
    m.selection = 1
    let v = NSHostingView(rootView: PaletteView(model: m, choose: { _ in }))
    v.frame = NSRect(x: 0, y: 0, width: 460 + FigmaStyle.shadowMargin * 2, height: 420 + FigmaStyle.shadowMargin * 2)
    v.layoutSubtreeIfNeeded()
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(v.bounds.width * 2), pixelsHigh: Int(v.bounds.height * 2),
                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = v.bounds.size
    v.cacheDisplay(in: v.bounds, to: rep)
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[i + 1]))
    exit(0)
}
if args.contains("--render-summary"), let i = args.firstIndex(of: "--render-summary"), args.count > i + 1 {
    // 테스트용: 이번 주 요약 창을 PNG로 저장한다.
    _ = NSApplication.shared
    let m = SummaryModel()
    m.reload()
    let v = NSHostingView(rootView: SummaryView(model: m, export: {}, erase: {})
        .background(Color(nsColor: .windowBackgroundColor)))
    v.frame = NSRect(origin: .zero, size: SummaryView.size)
    v.appearance = NSAppearance(named: args.contains("--dark") ? .darkAqua : .aqua)
    v.layoutSubtreeIfNeeded()
    let rep = v.bitmapImageRepForCachingDisplay(in: v.bounds)!
    v.cacheDisplay(in: v.bounds, to: rep)
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[i + 1]))
    exit(0)
}
if let i = args.firstIndex(of: "--render-menu"), args.count > i + 1 {
    // 화면 확인용: 메뉴 패널을 PNG로 저장한다. --state running|paused|nofigma|untrusted|settings|blocked, --dark, --weather, --mark <id>
    //  --settings [reveal|pages|general|about] 이면 패널 대신 설정 창을 그린다 (state settings 는 깜빡임 가리기의 권한 경고를 보여 준다)
    _ = NSApplication.shared
    let state = args.firstIndex(of: "--state").flatMap { args.count > $0 + 1 ? args[$0 + 1] : nil } ?? "running"
    let m = MenuModel()
    m.version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev"
    m.marks = MarkLibrary.shared.marks
    m.selectedMark = args.firstIndex(of: "--mark").flatMap { args.count > $0 + 1 ? args[$0 + 1] : nil } ?? MarkLibrary.defaultID
    m.enabled = state != "paused"; m.figmaRunning = state != "nofigma"; m.trusted = state != "untrusted"
    if args.contains("--focus") { m.focusEnd = Date().addingTimeInterval(14 * 60 + 32) }   // 뽀모도로 도는 중
    if state == "blocked" { m.motionBlocked = L("macOS '동작 줄이기'가 켜져 있어 멈춰 있어요", "Paused because Reduce Motion is on") }
    m.cheer = Cheer.line(trusted: m.trusted, awake: m.enabled, figmaRunning: m.figmaRunning, logging: true, active: 2 * 3600 + 40 * 60, streak: 0, hour: 15)
    m.dayProgress = (2 * 3600 + 40 * 60) / (6 * 3600); m.working = true
    if args.contains("--weather") { m.weatherMode = 2; m.weatherStatus = "4° 맑음 · 오후 12:57에 받음"; m.weatherTemp = 4; MarkLibrary.shared.weatherMark = "wx-clear" }
    if args.contains("--weather-denied") { m.weatherMode = 1; m.weatherStatus = L("위치 권한이 꺼져 있어요", "Location access is off"); m.weatherDenied = true }
    if let s = args.firstIndex(of: "--settings") {
        let name = args.count > s + 1 ? args[s + 1] : ""
        m.settingsPane = SettingsPane(rawValue: name) ?? .reveal
        renderPNG(SettingsView(model: m, rendering: true), to: args[i + 1], dark: args.contains("--dark"))
    } else {
        renderPNG(MenuPanelView(model: m).background(Color(nsColor: .windowBackgroundColor)), to: args[i + 1], dark: args.contains("--dark"))
    }
    exit(0)
}
if let i = args.firstIndex(of: "--render-welcome"), args.count > i + 1 {
    // 화면 확인용: 환영 창을 PNG로 저장한다. --trusted, --phase 0~1, --dark
    _ = NSApplication.shared
    let g = GuideModel()
    g.trusted = args.contains("--trusted")
    let phase = args.firstIndex(of: "--phase").flatMap { args.count > $0 + 1 ? Double(args[$0 + 1]) : nil } ?? 0.5
    renderPNG(WelcomeView(model: g, demoPhase: phase, openSettings: {}, close: {}).background(Color(nsColor: .windowBackgroundColor)),
              to: args[i + 1], dark: args.contains("--dark"))
    exit(0)
}
// 업데이트 서명 검사 시험: 이 앱과 같은 인증서로 서명된 앱이면 0으로 끝난다
if let i = args.firstIndex(of: "--verify-update"), args.count > i + 1 {
    let ok = Updater.sameSigner(URL(fileURLWithPath: args[i + 1]))
    print(ok ? "same signer" : "different signer"); exit(ok ? 0 : 1)
}
if args.contains("--self-test") {
    exit(runSelfTests() ? 0 : 1)
}
if args.contains("--probe") {
    Engine().probe()
    exit(0)
}
let application = NSApplication.shared
application.setActivationPolicy(.accessory)

if let i = args.firstIndex(of: "--simulate"), args.count > i + 1 {
    // 테스트용: "x,y,ms;x,y,ms" 순서대로 가짜 마우스 위치를 넣어 실제 Figma에 동작시켜 본다.
    let steps: [(CGPoint, Double)] = args[i + 1].split(separator: ";").compactMap { part in
        let n = part.split(separator: ",").compactMap { Double($0) }
        return n.count == 3 ? (CGPoint(x: n[0], y: n[1]), n[2] / 1000) : nil
    }
    let engine = Engine()
    engine.requireFrontmost = false
    engine.rightEdge = !args.contains("--no-right")
    let start = ProcessInfo.processInfo.systemUptime
    var lastIndex = -1
    engine.mouse = {
        var t = ProcessInfo.processInfo.systemUptime - start
        for (index, step) in steps.enumerated() {
            if t < step.1 {
                if index != lastIndex { lastIndex = index; log("mouse -> \(step.0)") }
                return step.0
            }
            t -= step.1
        }
        log("simulation finished")
        exit(0)
    }
    let t = Timer(timeInterval: 0.04, repeats: true) { _ in engine.tick() }
    RunLoop.main.add(t, forMode: .common)
    application.run()
} else {
    let delegate = AppDelegate()
    application.delegate = delegate
    application.run()
}
