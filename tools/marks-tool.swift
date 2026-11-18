// 메뉴 막대 아이콘 장면 도구. Figma "Motion" 페이지의 frames 프레임을 SVG로 내려받은 파일(marks-src/frames.svg)을 다룬다.
// 격자: 줄 = 아이콘(아래 SPEC 순서), 칸 = 장면, 한 칸 18×18pt.
//
//   swift tools/marks-tool.swift check   marks-src/frames.svg            그림 규칙(3.2절)과 움직임 규칙(3.3절) 검사
//   swift tools/marks-tool.swift bake    marks-src/frames.svg Resources/Marks   앱에 넣을 이미지(1배·2배)와 manifest.json
//   swift tools/marks-tool.swift preview marks-src/frames.svg marks-preview.html 움직임 미리 보기 페이지
//   swift tools/marks-tool.swift sheet   marks-src/frames.svg out.png [id,...]   장면 8장씩 뽑은 확인표
//
// 장면 수는 움직임 스크립트(tools/motion/icons/<id>.js)의 ICON.frames 를 직접 실행해 읽는다 (프로젝트 폴더에서 실행).
// 스크립트가 없을 때만 아래 표의 값을 쓴다.
import AppKit
import JavaScriptCore

struct Spec { let id: String; let ko: String; let en: String; var frames: Int; let hasBase: Bool; let maxStep: Double; let fine: Bool }
// hasBase: 받침(걸상·땅·접시·기단)이 모든 장면에서 고정돼야 하는 아이콘
// maxStep: 이웃 장면 사이에 허용하는 가장 큰 이동(pt). 낚아채기처럼 빠른 동작이 있는 아이콘은 크게 둔다.
//          0 이면 재지 않는다 (눈송이나 불빛처럼 나타났다 사라지는 것이 있는 아이콘).
// fine: 낚싯줄·별자리 선·연기처럼 가는 요소가 그림의 일부인 아이콘 (가는 곳·무게 하한 검사를 하지 않는다)
var SPEC: [Spec] = [
    .init(id: "buddha", ko: "반가사유상", en: "Pensive Bodhisattva", frames: 40, hasBase: true, maxStep: 1.2, fine: false),
    .init(id: "wave", ko: "파도", en: "Waves", frames: 48, hasBase: false, maxStep: 2.0, fine: false),
    .init(id: "surf", ko: "서핑", en: "Surfing", frames: 32, hasBase: false, maxStep: 1.5, fine: true),
    .init(id: "fishing", ko: "낚시", en: "Fishing", frames: 64, hasBase: false, maxStep: 4.0, fine: true),
    .init(id: "tree", ko: "크리스마스 나무", en: "Christmas tree", frames: 24, hasBase: true, maxStep: 0, fine: true),
    .init(id: "magnolia", ko: "목련", en: "Magnolia", frames: 48, hasBase: false, maxStep: 1.5, fine: false),
    .init(id: "lotus", ko: "연꽃", en: "Lotus", frames: 40, hasBase: false, maxStep: 1.5, fine: true),
    .init(id: "pagoda", ko: "석탑", en: "Stone pagoda", frames: 48, hasBase: true, maxStep: 0, fine: true),
    .init(id: "incense", ko: "향", en: "Incense", frames: 48, hasBase: true, maxStep: 0, fine: true),
    .init(id: "dipper", ko: "북두칠성", en: "Big Dipper", frames: 56, hasBase: false, maxStep: 1.2, fine: true),
    .init(id: "cat", ko: "고양이와 나비", en: "Cat and butterfly", frames: 40, hasBase: true, maxStep: 2.5, fine: true),
    .init(id: "leaf", ko: "나뭇잎", en: "Leaf", frames: 40, hasBase: false, maxStep: 2.0, fine: false),
    .init(id: "peek", ko: "옆에서 나오는 패널", en: "Side peek", frames: 40, hasBase: false, maxStep: 3.0, fine: true),
]
let FPS = 8

/// 움직임 스크립트를 실행해 ICON.frames 를 읽는다. 스크립트가 없거나 실행이 안 되면 nil.
func scriptFrames(_ id: String) -> Int? {
    let dir = FileManager.default.currentDirectoryPath + "/tools/motion/"
    guard let lib = try? String(contentsOfFile: dir + "lib.js", encoding: .utf8),
          let src = try? String(contentsOfFile: dir + "icons/\(id).js", encoding: .utf8) else { return nil }
    let ctx = JSContext()!
    var failed = false
    ctx.exceptionHandler = { _, e in failed = true; print("  \(id).js 실행 오류: \(e?.toString() ?? "?")") }
    ctx.evaluateScript(lib); ctx.evaluateScript(src)
    guard !failed, let n = ctx.evaluateScript("typeof ICON === 'undefined' ? 0 : ICON.frames")?.toInt32(), n > 0 else { return nil }
    return Int(n)
}
for i in SPEC.indices {
    if let n = scriptFrames(SPEC[i].id) { SPEC[i].frames = n }
    else { print("  \(SPEC[i].id): 움직임 스크립트를 읽지 못해 표의 장면 수(\(SPEC[i].frames))를 씁니다") }
}

let args = CommandLine.arguments
guard args.count >= 3 else { print("사용법은 파일 맨 위 주석을 보세요"); exit(2) }
let mode = args[1]
guard var text = try? String(contentsOfFile: args[2], encoding: .utf8) else { print("SVG를 읽지 못했습니다: \(args[2])"); exit(2) }
// Figma는 프레임을 내보낼 때 페이지 바탕색 사각형을 맨 앞에 넣는다. 그림이 아니므로 뺀다.
text = text.replacingOccurrences(of: ##"<rect width="\d+" height="\d+" fill="#[0-9A-Fa-f]{6}"/>"##, with: "", options: .regularExpression)
guard let svg = NSImage(data: text.data(using: .utf8)!) else { print("SVG를 그리지 못했습니다"); exit(2) }
let maxFrames = SPEC.map(\.frames).max()!
guard Int(svg.size.width) == maxFrames * 18, Int(svg.size.height) == SPEC.count * 18 else {
    print("격자 크기가 다릅니다: \(svg.size) (기대 \(maxFrames * 18)×\(SPEC.count * 18))"); exit(2)
}

/// 전체 격자를 scale배로 그린 알파 값 (위에서 아래)
func raster(_ scale: Int) -> (rep: NSBitmapImageRep, w: Int, h: Int) {
    let w = Int(svg.size.width) * scale, h = Int(svg.size.height) * scale
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4,
                               hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    svg.draw(in: NSRect(x: 0, y: 0, width: w, height: h))
    NSGraphicsContext.restoreGraphicsState()
    return (rep, w, h)
}
func cellAlpha(_ r: (rep: NSBitmapImageRep, w: Int, h: Int), row: Int, col: Int, scale: Int) -> [UInt8] {
    let c = 18 * scale, data = r.rep.bitmapData!, bpr = r.rep.bytesPerRow
    var a = [UInt8](repeating: 0, count: c * c)
    for y in 0..<c { let base = (row * c + y) * bpr + col * c * 4 + 3; for x in 0..<c { a[y * c + x] = data[base + x * 4] } }
    return a
}
/// 한 칸들을 가로로 이어 붙인 PNG (검정 + 알파)
func strip(_ r: (rep: NSBitmapImageRep, w: Int, h: Int), row: Int, frames: Int, scale: Int) -> Data {
    let c = 18 * scale
    let out = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: c * frames, pixelsHigh: c, bitsPerSample: 8, samplesPerPixel: 4,
                               hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    let src = r.rep.bitmapData!, dst = out.bitmapData!
    for y in 0..<c { memcpy(dst + y * out.bytesPerRow, src + (row * c + y) * r.rep.bytesPerRow, c * frames * 4) }
    return out.representation(using: .png, properties: [:])!
}

switch mode {
case "check":
    let S = 16, c = 18 * S
    let r = raster(S)
    // 거리 지도: 칠해진 곳까지의 거리(px). 두 번 훑는 방식 (가로세로 1, 대각선 1.41 근사 → ×10 정수)
    func dist(_ solid: [Bool]) -> [Int32] {
        var d = [Int32](repeating: 1_000_000, count: c * c)
        for i in 0..<(c * c) where solid[i] { d[i] = 0 }
        for y in 0..<c { for x in 0..<c { let i = y * c + x; var v = d[i]
            if x > 0 { v = min(v, d[i - 1] + 10) }; if y > 0 { v = min(v, d[i - c] + 10) }
            if x > 0 && y > 0 { v = min(v, d[i - c - 1] + 14) }; if x < c - 1 && y > 0 { v = min(v, d[i - c + 1] + 14) }
            d[i] = v } }
        for y in stride(from: c - 1, through: 0, by: -1) { for x in stride(from: c - 1, through: 0, by: -1) { let i = y * c + x; var v = d[i]
            if x < c - 1 { v = min(v, d[i + 1] + 10) }; if y < c - 1 { v = min(v, d[i + c] + 10) }
            if x < c - 1 && y < c - 1 { v = min(v, d[i + c + 1] + 14) }; if x > 0 && y < c - 1 { v = min(v, d[i + c - 1] + 14) }
            d[i] = v } }
        return d
    }
    /// 두 장면 사이에서 가장 멀리 움직인 거리(pt): 한쪽에만 칠해진 점에서 다른 쪽 그림까지의 가장 먼 거리
    func moved(_ a: [Bool], _ da: [Int32], _ b: [Bool], _ db: [Int32]) -> Double {
        var m: Int32 = 0
        for i in 0..<(c * c) { if a[i] && !b[i] { m = max(m, db[i]) } else if b[i] && !a[i] { m = max(m, da[i]) } }
        return Double(m) / 10 / Double(S)
    }
    let rr = Int(0.45 * Double(S))
    var offs: [(Int, Int)] = []
    for dy in -rr...rr { for dx in -rr...rr where dx * dx + dy * dy <= rr * rr { offs.append((dx, dy)) } }
    var failures = 0
    print("아이콘      장면  밖  무게(최소~최대)  가는 곳  이웃 이동  이음   전체 이동  넓이 변화  받침   판정")
    for (row, sp) in SPEC.enumerated() {
        var solids: [[Bool]] = [], dists: [[Int32]] = [], inkArea: [Double] = []
        var outside = 0, covMin = 100.0, covMax = 0.0, thinMax = 0.0, lowOpacity = false
        for col in 0..<sp.frames {
            let a = cellAlpha(r, row: row, col: col, scale: S)
            let solid = a.map { $0 > 100 }
            var ink = 0.0
            for y in 0..<c { for x in 0..<c { let v = a[y * c + x]; if v == 0 { continue }
                let live = x >= S && x < c - S && y >= S && y < c - S
                if !live && v > 128 { outside += 1 }
                if live { ink += Double(v) / 255 }
                if v > 20 && v < 90, x >= 4, y >= 4, x < c - 4, y < c - 4 {     // 안쪽이 40%보다 옅은 면
                    var flat = true
                    for (dx, dy) in [(-4, 0), (4, 0), (0, -4), (0, 4)] where abs(Int(a[(y + dy) * c + x + dx]) - Int(v)) > 6 { flat = false; break }
                    if flat { lowOpacity = true }
                } } }
            let cov = ink / Double(16 * S * 16 * S) * 100
            covMin = min(covMin, cov); covMax = max(covMax, cov); inkArea.append(ink)
            // 가는 곳: 반지름 0.45pt로 깎았다 되살릴 때 사라지는 비율
            var er = [Bool](repeating: false, count: c * c)
            for y in rr..<(c - rr) { for x in rr..<(c - rr) where solid[y * c + x] {
                var ok = true
                for (dx, dy) in offs where !solid[(y + dy) * c + x + dx] { ok = false; break }
                er[y * c + x] = ok } }
            var op = [Bool](repeating: false, count: c * c)
            for y in rr..<(c - rr) { for x in rr..<(c - rr) where er[y * c + x] { for (dx, dy) in offs { op[(y + dy) * c + x + dx] = true } } }
            var lost = 0, total = 0
            for k in 0..<(c * c) where solid[k] { total += 1; if !op[k] { lost += 1 } }
            if total > 0 { thinMax = max(thinMax, Double(lost) / Double(total) * 100) }
            solids.append(solid); dists.append(dist(solid))
        }
        // 움직임
        var stepMax = 0.0, seam = 0.0, travel = 0.0, areaJump = 0.0
        for i in 0..<sp.frames {
            let j = (i + 1) % sp.frames
            let m = moved(solids[i], dists[i], solids[j], dists[j])
            if j == 0 { seam = m } else { stepMax = max(stepMax, m) }
            let base = max(inkArea[i], 1)
            areaJump = max(areaJump, abs(inkArea[j] - inkArea[i]) / base * 100)
        }
        // 전체 이동: 어느 두 장면 사이든 가장 멀리 벌어진 거리 (좌우로 흔들리는 움직임은 양 끝 사이를 잰다)
        for i in 0..<sp.frames { for j in (i + 1)..<max(i + 1, sp.frames) where (j - i) % 2 == 0 || sp.frames <= 24 {
            travel = max(travel, moved(solids[i], dists[i], solids[j], dists[j])) } }
        // 받침: 맨 아래 1pt 띠(y 15~16)가 모든 장면에서 같은가
        var baseMoved = 0
        // (y 15.5~16: 그 위는 고양이 꼬리처럼 몸 안쪽을 판 선이 지나갈 수 있다)
        if sp.hasBase { for col in 1..<sp.frames { for y in (15 * S + S / 2)..<(16 * S) { for x in 0..<c where solids[col][y * c + x] != solids[0][y * c + x] { baseMoved += 1 } } } }
        // 2026-11-16: 움직임이 "느껴져야 한다"는 방향으로 규칙을 바꿨다. 이동 거리의 상한(3pt)을 없애고 하한을 올렸다.
        var why: [String] = []
        if outside / sp.frames > S * 2 { why.append("격자 밖") }      // 장면 하나당 평균 (0.125pt² 넘게 벗어나면)
        if covMin < 15 && !sp.fine { why.append("가벼움") }; if covMax > 50 { why.append("무거움") }
        if thinMax > 3 && !sp.fine { why.append("가는 곳") }
        if lowOpacity { why.append("투명도<40%") }
        if sp.maxStep > 0 { if stepMax > sp.maxStep { why.append("이웃 이동 큼") }; if seam > sp.maxStep { why.append("이음 끊김") } }
        if travel < 1.5 && sp.id != "tree" { why.append("움직임이 안 느껴짐") }
        if baseMoved > S * 4 { why.append("받침 움직임") }
        if !why.isEmpty { failures += 1 }
        print(String(format: "%@ %3d %4d  %5.1f~%5.1f%%   %5.1f%%   %5.2fpt  %5.2fpt  %6.2fpt   %5.1f%%   %@  %@",
                     sp.id.padding(toLength: 9, withPad: " ", startingAt: 0), sp.frames, outside, covMin, covMax, thinMax,
                     stepMax, seam, travel, areaJump, sp.hasBase ? (baseMoved > S * 4 ? "움직임" : "고정  ") : "  -   ",
                     why.isEmpty ? "통과" : "실패: " + why.joined(separator: ", ")))
    }
    print(failures == 0 ? "\n13개 모두 통과 (장면 \(SPEC.map(\.frames).reduce(0, +))장)" : "\n실패 \(failures)개")
    exit(failures == 0 ? 0 : 1)

case "bake":
    guard args.count >= 4 else { print("출력 폴더가 필요합니다"); exit(2) }
    let out = URL(fileURLWithPath: args[3])
    // 날씨 장면(wx-*)은 Figma를 거치지 않고 motion-lab bake 로 굽는다. 그것은 남겨 둔다.
    var keep: [[String: Any]] = []
    if let d = try? Data(contentsOf: out.appendingPathComponent("manifest.json")),
       let j = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any], let m = j["marks"] as? [[String: Any]] {
        keep = m.filter { ($0["id"] as? String)?.hasPrefix("wx-") == true }
    }
    for f in (try? FileManager.default.contentsOfDirectory(atPath: out.path)) ?? [] where !f.hasPrefix("wx-") {
        try? FileManager.default.removeItem(at: out.appendingPathComponent(f))
    }
    try! FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
    var bytes = 0
    for scale in [1, 2] {
        let r = raster(scale)
        for (row, sp) in SPEC.enumerated() {
            let data = strip(r, row: row, frames: sp.frames, scale: scale)
            try! data.write(to: out.appendingPathComponent(scale == 1 ? "\(sp.id).png" : "\(sp.id)@2x.png"))
            bytes += data.count
        }
    }
    let manifest: [String: Any] = ["version": 1, "fps": FPS, "marks": SPEC.map { ["id": $0.id, "ko": $0.ko, "en": $0.en, "frames": $0.frames] } + keep]
    let json = try! JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted, .sortedKeys])
    try! json.write(to: out.appendingPathComponent("manifest.json"))
    print("구웠습니다: \(SPEC.count)개 아이콘, \(SPEC.map(\.frames).reduce(0, +))장면, \((bytes + json.count) / 1024)KB → \(out.path)")

case "preview":
    guard args.count >= 4 else { print("출력 파일이 필요합니다"); exit(2) }
    let r = raster(8)
    var cards = ""
    for (row, sp) in SPEC.enumerated() {
        let b64 = strip(r, row: row, frames: sp.frames, scale: 8).base64EncodedString()
        let dur = Double(sp.frames) / Double(FPS)
        func icon(_ px: Int) -> String {
            "<i class=\"m\" style=\"width:\(px)px;height:\(px)px;-webkit-mask-image:url(data:image/png;base64,\(b64));mask-image:url(data:image/png;base64,\(b64));-webkit-mask-size:\(px * sp.frames)px \(px)px;mask-size:\(px * sp.frames)px \(px)px;animation:p\(sp.frames)x\(px) \(dur)s steps(\(sp.frames)) infinite\"></i>"
        }
        cards += "<section><h2>\(sp.ko)</h2><p>\(sp.id) · \(sp.frames)장면 · 한 바퀴 \(dur)초</p><div class=\"big\">\(icon(144))</div><div class=\"bar light\"><span>18pt</span>\(icon(18))</div><div class=\"bar dark\"><span>18pt</span>\(icon(18))</div></section>\n"
    }
    var keyframes = ""
    for n in Set(SPEC.map(\.frames)) { for px in [144, 18] { keyframes += "@keyframes p\(n)x\(px){to{-webkit-mask-position:-\(px * n)px 0;mask-position:-\(px * n)px 0}}\n" } }
    let html = """
    <!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Layerhover 아이콘 움직임 미리 보기</title><style>
    body{margin:0;padding:32px 24px;font:14px -apple-system,system-ui,sans-serif;background:#f2f2f2;color:#1a1a1a}
    h1{font-size:22px;margin:0 0 4px}header p{margin:0 0 28px;color:#666}
    main{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:28px}
    h2{font-size:16px;margin:0}section p{margin:2px 0 10px;color:#777;font-size:12px}
    .big{background:#fff;border-radius:16px;padding:28px;display:flex;justify-content:center}
    .bar{margin-top:10px;border-radius:8px;padding:6px 14px;display:flex;align-items:center;justify-content:space-between;font-size:11px}
    .light{background:#fcfcfc;color:#666}.dark{background:#292929;color:#aaa}
    .m{display:block;background:#111;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}.dark .m{background:#fff}
    @media (prefers-reduced-motion:reduce){.m{animation:none!important}}
    \(keyframes)</style></head><body><header><h1>Layerhover 아이콘 움직임 미리 보기</h1>
    <p>위: 8배 확대 · 아래: 실제 메뉴 막대 크기(18pt), 밝은 막대와 어두운 막대 · 초당 \(FPS)장면</p></header><main>
    \(cards)</main></body></html>
    """
    try! html.write(toFile: args[3], atomically: true, encoding: .utf8)
    print("미리 보기: \(args[3]) (\(html.utf8.count / 1024)KB)")

case "sheet":
    guard args.count >= 4 else { print("출력 파일이 필요합니다"); exit(2) }
    let only = args.count > 4 ? Set(args[4].split(separator: ",").map(String.init)) : nil
    let rows = SPEC.enumerated().filter { only == nil || only!.contains($0.element.id) }
    let S = 6, c = 18 * S, n = 8, pad = 10, labelW = 110
    let r = raster(S)
    let W = labelW + n * (c + pad) + pad, H = rows.count * (c + pad) + pad
    let img = NSImage(size: NSSize(width: W, height: H)); img.lockFocus()
    NSColor.white.setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()
    for (k, (row, sp)) in rows.enumerated() {
        let y = H - pad - (k + 1) * c - k * pad
        (sp.id as NSString).draw(at: NSPoint(x: 10, y: y + c / 2 - 8), withAttributes: [.font: NSFont.systemFont(ofSize: 14, weight: .semibold)])
        let stripImage = NSImage(data: strip(r, row: row, frames: sp.frames, scale: S))!
        for j in 0..<n {
            let col = j * sp.frames / n
            let rect = NSRect(x: labelW + j * (c + pad), y: y, width: c, height: c)
            NSColor(white: 0.95, alpha: 1).setFill(); NSBezierPath(roundedRect: rect, xRadius: 8, yRadius: 8).fill()
            stripImage.draw(in: rect, from: NSRect(x: col * c, y: 0, width: c, height: c), operation: .sourceOver, fraction: 1)
        }
    }
    img.unlockFocus()
    try! NSBitmapImageRep(data: img.tiffRepresentation!)!.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[3]))
    print("확인표: \(args[3])")

default:
    print("모르는 명령: \(mode)"); exit(2)
}
