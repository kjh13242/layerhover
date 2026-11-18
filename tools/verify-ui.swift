// 왼쪽 아래 페이지 버튼이 Figma 하단 도구 막대와 똑같이 보이는지 실제 화면에서 검사한다.
// 사용법: swift tools/verify-ui.swift [결과 폴더]
//
// 하는 일
//   1. 지금 앞에 있는 앱을 기억하고 Figma를 앞으로 가져온다 (버튼은 Figma가 앞에 있을 때만 뜬다).
//   2. Figma 도구 막대 위치(손쉬운 사용)와 Layerhover 버튼 창 위치(창 목록)를 읽는다.
//   3. 화면을 찍어서 같은 부위의 픽셀을 비교한다: 크기·줄 맞춤·간격, 바탕, 가장자리 빛, 그림자, 모서리, 마우스 올림 색.
//   4. 원래 앱과 마우스 위치를 되돌리고, 항목별 결과와 비교 이미지를 남긴다.
// 필요 권한: 터미널에 손쉬운 사용·화면 기록 권한. Layerhover(또는 시험용 빌드)이 실행 중이어야 한다.
import AppKit
import ApplicationServices

let outDir = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "verify-out")
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let tolerance = 3  // 색 차이 허용 (0~255 중)

// MARK: 화면·창 정보

func attr(_ e: AXUIElement, _ n: String) -> AnyObject? {
    var v: AnyObject?
    return AXUIElementCopyAttributeValue(e, n as CFString, &v) == .success ? v : nil
}
func frame(_ e: AXUIElement) -> CGRect? {
    guard let p = attr(e, "AXPosition"), let s = attr(e, "AXSize") else { return nil }
    var pt = CGPoint.zero, sz = CGSize.zero
    AXValueGetValue(p as! AXValue, .cgPoint, &pt); AXValueGetValue(s as! AXValue, .cgSize, &sz)
    return CGRect(origin: pt, size: sz)
}
func find(_ e: AXUIElement, depth: Int = 0, _ match: (AXUIElement) -> Bool, into out: inout [AXUIElement]) {
    guard depth < 40 else { return }
    if match(e) { out.append(e); return }
    for c in attr(e, "AXChildren") as? [AXUIElement] ?? [] { find(c, depth: depth + 1, match, into: &out) }
}
func classes(_ e: AXUIElement) -> [String] { attr(e, "AXDOMClassList") as? [String] ?? [] }

guard let figma = NSRunningApplication.runningApplications(withBundleIdentifier: "com.figma.Desktop").first else {
    print("Figma가 실행 중이 아니에요"); exit(1)
}
let previous = NSWorkspace.shared.frontmostApplication
let mouseBefore = CGEvent(source: nil)?.location ?? .zero

func moveMouse(_ p: CGPoint) {
    CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: p, mouseButton: .left)?.post(tap: .cghidEventTap)
}
func restore() {
    moveMouse(mouseBefore)
    if let previous, previous != figma { previous.activate() }
}

figma.activate()
Thread.sleep(forTimeInterval: 1.5)

let ax = AXUIElementCreateApplication(figma.processIdentifier)
var toolbars: [AXUIElement] = []
for w in attr(ax, "AXWindows") as? [AXUIElement] ?? [] {
    find(w, { classes($0).contains { $0.hasPrefix("toolbelt--root") } }, into: &toolbars)
}
let toolbarFrames = toolbars.compactMap(frame).filter { $0.width > 100 }.sorted { $0.minX < $1.minX }

// Layerhover 버튼 창: 그림자 여백 16을 뺀 것이 실제 버튼 상자
let margin: CGFloat = 16
let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
let chipFrames: [CGRect] = windows.compactMap { w in
    let owner = w[kCGWindowOwnerName as String] as? String ?? ""
    guard owner.hasPrefix("Layerhover") || owner == "ep_test_bin",
          let b = w[kCGWindowBounds as String] as? [String: CGFloat] else { return nil }
    let r = CGRect(x: b["X"]!, y: b["Y"]!, width: b["Width"]!, height: b["Height"]!).insetBy(dx: margin, dy: margin)
    return r.height == 48 ? r : nil
}.sorted { $0.minX < $1.minX }

guard !toolbarFrames.isEmpty, !chipFrames.isEmpty else {
    restore()
    print("도구 막대 \(toolbarFrames.count)개, 버튼 \(chipFrames.count)개를 찾았어요. Figma UI가 최소화 상태인지 확인하세요.")
    exit(1)
}

// MARK: 화면 찍기

let scale = NSScreen.screens.first?.backingScaleFactor ?? 2
func capture(_ name: String) -> NSBitmapImageRep {
    let url = outDir.appendingPathComponent(name + ".png")
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
    p.arguments = ["-x", "-m", url.path]
    try! p.run(); p.waitUntilExit()
    return NSBitmapImageRep(data: try! Data(contentsOf: url))!
}

let shot = capture("screen")

func px(_ img: NSBitmapImageRep, _ x: CGFloat, _ y: CGFloat) -> (Int, Int, Int) {
    let c = img.colorAt(x: min(Int(x * scale), img.pixelsWide - 1), y: min(Int(y * scale), img.pixelsHigh - 1))!.usingColorSpace(.sRGB)!
    return (Int(c.redComponent * 255), Int(c.greenComponent * 255), Int(c.blueComponent * 255))
}
/// 점(pt) 좌표 대신 픽셀 좌표로 읽기
func pxRaw(_ img: NSBitmapImageRep, _ x: Int, _ y: Int) -> (Int, Int, Int) {
    let c = img.colorAt(x: min(max(x, 0), img.pixelsWide - 1), y: min(max(y, 0), img.pixelsHigh - 1))!.usingColorSpace(.sRGB)!
    return (Int(c.redComponent * 255), Int(c.greenComponent * 255), Int(c.blueComponent * 255))
}
func hex(_ c: (Int, Int, Int)) -> String { String(format: "#%02X%02X%02X", c.0, c.1, c.2) }
func diff(_ a: (Int, Int, Int), _ b: (Int, Int, Int)) -> Int { max(abs(a.0 - b.0), abs(a.1 - b.1), abs(a.2 - b.2)) }

// MARK: 검사

struct Check { let name: String; let ok: Bool; let detail: String }
var checks: [Check] = []
func expect(_ name: String, _ ok: Bool, _ detail: String) { checks.append(Check(name: name, ok: ok, detail: detail)) }
func compare(_ name: String, _ a: (Int, Int, Int), _ b: (Int, Int, Int)) {
    expect(name, diff(a, b) <= tolerance, "버튼 \(hex(a)) / 도구 막대 \(hex(b)) (차이 \(diff(a, b)))")
}

for chip in chipFrames {
    // 같은 화면(분할 화면 한쪽)의 도구 막대
    guard let bar = toolbarFrames.first(where: { $0.minX > chip.minX && abs($0.midY - chip.midY) < 40 })
            ?? toolbarFrames.min(by: { abs($0.minX - chip.maxX) < abs($1.minX - chip.maxX) }) else { continue }
    let tag = "[x=\(Int(chip.minX))]"

    // 크기·줄 맞춤·간격
    expect("\(tag) 높이", chip.height == bar.height, "버튼 \(chip.height) / 도구 막대 \(bar.height)")
    expect("\(tag) 위 끝 맞춤", chip.minY == bar.minY, "버튼 \(chip.minY) / 도구 막대 \(bar.minY)")
    let gap = bar.minX - chip.maxX
    expect("\(tag) 도구 막대와의 간격", gap >= 8 && (chip.width >= 280 || gap == 8), "\(gap)pt (8 이상, 폭이 줄었으면 정확히 8)")

    // 바탕: 위쪽 여백 안 (버튼·글자가 없는 곳)
    compare("\(tag) 바탕색", px(shot, chip.minX + 20, chip.minY + 4), px(shot, bar.minX + 20, bar.minY + 4))

    // 가장자리 빛: 상자 안쪽 첫 픽셀 줄. 모서리를 피해 직선 부분에서 잰다.
    let cTop = Int(chip.minY * scale), bTop = Int(bar.minY * scale)
    let cBottom = Int(chip.maxY * scale) - 1, bBottom = Int(bar.maxY * scale) - 1
    let cLeft = Int(chip.minX * scale)
    // Figma는 도구 막대를 반 점(0.5pt) 위치에 그리기도 하는데 손쉬운 사용 좌표는 반올림된다.
    // 가운데 줄에서 가장 밝은 가장자리 픽셀을 찾아 실제 왼쪽 끝으로 쓴다.
    let bLeft: Int = {
        let guess = Int(bar.minX * scale), y = Int(bar.midY * scale)
        return (guess - 2...guess + 1).max { a, b in
            let p = pxRaw(shot, a, y), q = pxRaw(shot, b, y); return p.0 + p.1 + p.2 < q.0 + q.1 + q.2
        }!
    }()
    let cMidX = Int((chip.minX + 30) * scale), bMidX = Int((bar.minX + 30) * scale)
    let cMidY = Int(chip.midY * scale), bMidY = Int(bar.midY * scale)
    compare("\(tag) 위 가장자리", pxRaw(shot, cMidX, cTop), pxRaw(shot, bMidX, bTop))
    compare("\(tag) 아래 가장자리", pxRaw(shot, cMidX, cBottom), pxRaw(shot, bMidX, bBottom))
    compare("\(tag) 왼쪽 가장자리", pxRaw(shot, cLeft, cMidY), pxRaw(shot, bLeft, bMidY))
    compare("\(tag) 가장자리 바로 안쪽", pxRaw(shot, cMidX, cTop + 1), pxRaw(shot, bMidX, bTop + 1))

    // 그림자: 아래쪽 10px의 밝기 변화. 뒤 캔버스 색이 다를 수 있어 '바깥 캔버스 대비 어두워진 정도'를 비교한다.
    // (도구 막대 아래 여백이 12pt뿐이라 화면 끝을 넘지 않게 그 안에서 잰다)
    func shadowProfile(_ x: Int, _ bottom: Int) -> [Int] {
        let far = pxRaw(shot, x, min(bottom + Int(11 * scale), shot.pixelsHigh - 1))
        return (1...10).map { k in
            let c = pxRaw(shot, x, bottom + k)
            return (far.0 + far.1 + far.2 - c.0 - c.1 - c.2) / 3
        }
    }
    let cs = shadowProfile(cMidX, cBottom), bs = shadowProfile(bMidX, bBottom)
    let worst = zip(cs, bs).map { abs($0 - $1) }.max() ?? 0
    expect("\(tag) 아래 그림자", worst <= tolerance, "버튼 \(cs) / 도구 막대 \(bs) (최대 차이 \(worst))")

    // 옆 그림자: 버튼 왼쪽 바깥과 도구 막대 오른쪽 바깥 (서로 붙어 있는 쪽은 그림자가 겹쳐서 피한다)
    func sideProfile(_ x: Int, _ dir: Int, _ y: Int) -> [Int] {
        let far = pxRaw(shot, x + dir * Int(11 * scale), y)
        return (1...10).map { k in
            let c = pxRaw(shot, x + dir * k, y)
            return (far.0 + far.1 + far.2 - c.0 - c.1 - c.2) / 3
        }
    }
    let sc = sideProfile(cLeft, -1, cMidY), sb = sideProfile(Int(bar.maxX * scale) - 1, 1, bMidY)
    let sideWorst = zip(sc, sb).map { abs($0 - $1) }.max() ?? 0
    expect("\(tag) 옆 그림자", sideWorst <= tolerance, "버튼 \(sc) / 도구 막대 \(sb) (최대 차이 \(sideWorst))")

    // 모서리: 위쪽 13pt의 각 픽셀 줄에서 바탕색이 처음 나오는 위치(왼쪽 끝 기준).
    // 뒤 캔버스 밝기와 상관없이 둥근 정도만 비교된다.
    let body = pxRaw(shot, cMidX, cTop + 6)
    func corner(_ left: Int, _ top: Int) -> [Int] {
        (0..<Int(13 * scale)).map { row in
            for dx in 0..<Int(16 * scale) where diff(pxRaw(shot, left + dx, top + row), body) <= 2 { return dx }
            return -1
        }
    }
    // 모서리의 가는 빛: 각 줄에서 바탕이 시작되기 직전 4px 중 가장 밝은 값
    func ring(_ left: Int, _ top: Int, _ first: [Int]) -> [Int] {
        first.enumerated().map { row, f in
            guard f > 0 else { return -1 }
            return (max(0, f - 4)..<f).map { dx -> Int in
                let c = pxRaw(shot, left + dx, top + row); return (c.0 + c.1 + c.2) / 3
            }.max() ?? -1
        }
    }
    let cc = corner(cLeft, cTop), bc = corner(bLeft, bTop)
    let cr = ring(cLeft, cTop, cc), br = ring(bLeft, bTop, bc)
    let ringWorst = zip(cr, br).filter { $0 >= 0 && $1 >= 0 }.map { abs($0 - $1) }.max() ?? 0
    expect("\(tag) 모서리 가는 빛", ringWorst <= tolerance, "버튼 \(cr) / 도구 막대 \(br) (최대 차이 \(ringWorst))")
    let cornerWorst = zip(cc, bc).filter { $0 >= 0 && $1 >= 0 }.map { abs($0 - $1) }.max() ?? 0
    expect("\(tag) 모서리 곡선", cornerWorst <= 1, "버튼 \(cc) / 도구 막대 \(bc)")

    // 마우스 올림: 버튼의 페이지 이름 칸과 Figma의 선 도구 버튼에 각각 올려서 배경색을 비교한다.
    var lineButtons: [AXUIElement] = []
    for w in attr(ax, "AXWindows") as? [AXUIElement] ?? [] {
        find(w, { (attr($0, "AXDescription") as? String) == "Line" && (attr($0, "AXRole") as? String) == "AXCheckBox" }, into: &lineButtons)
    }
    if let line = lineButtons.compactMap(frame).first(where: { bar.contains(CGPoint(x: $0.midX, y: $0.midY)) }) {
        // 페이지 이름 칸의 아이콘 위 (화살표가 나와도 이 자리는 그대로다)
        moveMouse(CGPoint(x: chip.minX + 8 + 16, y: chip.midY - 4))
        Thread.sleep(forTimeInterval: 0.15)
        moveMouse(CGPoint(x: chip.minX + 8 + 16, y: chip.midY))
        Thread.sleep(forTimeInterval: 0.5)
        let hoverChip = capture("hover-chip")
        moveMouse(CGPoint(x: line.midX, y: line.midY))
        Thread.sleep(forTimeInterval: 0.35)
        let hoverBar = capture("hover-toolbar")
        // 버튼 칸 왼쪽 위 안쪽 (아이콘·글자를 피한 곳)
        compare("\(tag) 마우스 올림 색", px(hoverChip, chip.minX + 8 + 2, chip.minY + 8 + 2),
                px(hoverBar, line.minX + 2, line.minY + 2))
    } else {
        expect("\(tag) 마우스 올림 색", false, "Figma 선 도구 버튼을 찾지 못해 비교하지 못함")
    }

    // 나란히 보는 이미지
    let crop = CGRect(x: chip.minX - 20, y: chip.minY - 20, width: bar.maxX - chip.minX + 40, height: chip.height + 40)
    if let cg = shot.cgImage?.cropping(to: CGRect(x: crop.minX * scale, y: crop.minY * scale,
                                                   width: crop.width * scale, height: crop.height * scale)) {
        try? NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])?
            .write(to: outDir.appendingPathComponent("side-by-side-\(Int(chip.minX)).png"))
    }
}

restore()

// MARK: 결과

var lines = ["# 페이지 버튼 ↔ Figma 도구 막대 비교", "", "| 결과 | 항목 | 값 |", "|---|---|---|"]
for c in checks { lines.append("| \(c.ok ? "통과" : "실패") | \(c.name) | \(c.detail) |") }
let passed = checks.filter(\.ok).count
lines.append("")
lines.append("\(passed)/\(checks.count) 통과")
let report = lines.joined(separator: "\n")
try? report.write(to: outDir.appendingPathComponent("report.md"), atomically: true, encoding: .utf8)
print(report)
exit(passed == checks.count ? 0 : 2)
