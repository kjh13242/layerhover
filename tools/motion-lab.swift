// 메뉴 막대 아이콘 움직임 실험실 (motion lab).
// 움직임 스크립트(tools/motion/icons/<id>.js)를 Figma 가져오기와 같은 규칙으로 그려서 확인한다:
//   모양 = (ink 합집합) − (cut 합집합) + (front 합집합), 그 위에 fade 를 50%로.
//
//   motion-lab render  <icon.js> <outdir>          수치 + <id>-keys.png, <id>-bars.png, <id>-strip.png
//   motion-lab compare <out.png> <icon.js> ...      후보를 나란히: 주요 장면 8장 + 실제 메뉴 막대 크기
//   motion-lab sheet   <out.png> <icon.js> ...      세트 비교: 장면 00 확대 + 메뉴 막대에 나란히 (밝은·어두운)
//   motion-lab svg     <icon.js> <frame>            한 장면의 SVG 원문
//   motion-lab bake    <outdir> <icon.js> ...       Figma를 거치지 않는 아이콘(날씨)을 앱용 장면 이미지(1배·2배)로 굽고
//                                                   <outdir>/manifest.json 에 더한다 (같은 id는 바꾼다)
// 빌드: swiftc -O -swift-version 5 tools/motion-lab.swift -o tools/bin/motion-lab
import AppKit
import JavaScriptCore

setvbuf(stdout, nil, _IOLBF, 0)
DispatchQueue.global().asyncAfter(deadline: .now() + 240) {
    print("시간 초과(240초): 스크립트에 끝나지 않는 반복이 없는지 확인하세요"); exit(3)
}

let usage = """
motion-lab — 메뉴 막대 아이콘 움직임 실험실
  render  <icon.js> <outdir>        수치와 확인 그림 3장 (<id>-keys.png, -bars.png, -strip.png)
  compare <out.png> <icon.js> ...   후보 비교 (주요 장면 8장 + 실제 크기)
  sheet   <out.png> <icon.js> ...   세트 비교 (장면 00 확대 + 메뉴 막대에 나란히)
  svg     <icon.js> <frame>         한 장면의 SVG 원문
  bake    <outdir> <icon.js> ...    앱용 장면 이미지(1배·2배)를 굽고 manifest.json 에 더한다
"""

// MARK: - 스크립트 실행

var jsError: String?

struct Icon { let id: String; let frames: Int; let svgs: [String]; let file: String }

func readLib(near path: String) -> String {
    let dir = URL(fileURLWithPath: path).deletingLastPathComponent()
    let candidates = [dir.appendingPathComponent("../lib.js"), dir.appendingPathComponent("lib.js"),
                      URL(fileURLWithPath: "tools/motion/lib.js")]
    for c in candidates { if let s = try? String(contentsOf: c.standardized, encoding: .utf8) { return s } }
    print("lib.js 를 찾지 못했습니다 (tools/motion/lib.js)"); exit(2)
}

func loadIcon(_ path: String) -> Icon {
    guard let src = try? String(contentsOfFile: path, encoding: .utf8) else { print("파일을 읽지 못했습니다: \(path)"); exit(2) }
    let ctx = JSContext()!
    ctx.exceptionHandler = { _, e in
        var msg = e?.toString() ?? "알 수 없는 오류"
        if let line = e?.objectForKeyedSubscript("line"), !line.isUndefined { msg += " (줄 \(line.toString() ?? "?"))" }
        jsError = msg
    }
    ctx.evaluateScript(readLib(near: path), withSourceURL: URL(string: "lib.js"))
    if let e = jsError { print("lib.js 오류: \(e)"); exit(4) }
    ctx.evaluateScript(src, withSourceURL: URL(fileURLWithPath: path))
    if let e = jsError { print("스크립트 오류: \(e)"); exit(4) }
    guard let icon = ctx.evaluateScript("typeof ICON === 'undefined' ? null : ICON"), !icon.isNull, !icon.isUndefined else {
        print("ICON 이 없습니다. var ICON = { id, frames, at(t) } 를 정의하세요"); exit(4)
    }
    let id = icon.objectForKeyedSubscript("id")?.toString() ?? "?"
    let frames = Int(icon.objectForKeyedSubscript("frames")?.toInt32() ?? 0)
    guard frames >= 8 && frames <= 96 else { print("frames 는 8~96 이어야 합니다 (지금 \(frames))"); exit(4) }
    var svgs: [String] = []
    for i in 0..<frames {
        let r = ctx.evaluateScript("ICON.at(\(Double(i) / Double(frames)))")
        if let e = jsError { print("스크립트 오류 (장면 \(i), t=\(String(format: "%.4f", Double(i) / Double(frames)))): \(e)"); exit(4) }
        guard let r, r.isString, let s = r.toString() else { print("at(t) 가 문자열을 돌려주지 않았습니다 (장면 \(i))"); exit(4) }
        svgs.append(s)
    }
    return Icon(id: id, frames: frames, svgs: svgs, file: path)
}

// MARK: - 그리기 (Figma와 같은 합성 규칙)

let elementRE = try! NSRegularExpression(pattern: #"<(path|circle|rect|ellipse|polygon|polyline|line)\b[^>]*?/>"#, options: [.caseInsensitive])
let opacityRE = try! NSRegularExpression(pattern: #"\s(?:fill|stroke)-opacity="([0-9.]+)""#)

struct Layers { var ink: [String] = []; var cut: [String] = []; var top: [String] = []; var fade: [String] = []; var fadeOpacity: CGFloat = 0.5 }

func split(_ svg: String) -> Layers {
    var L = Layers()
    let ns = svg as NSString
    for m in elementRE.matches(in: svg, range: NSRange(location: 0, length: ns.length)) {
        var el = ns.substring(with: m.range)
        let low = el.lowercased()
        let isCut = low.contains("\"#f00\"") || low.contains("\"#ff0000\"") || low.contains("\"red\"")
        let isTop = low.contains("\"#00f\"") || low.contains("\"#0000ff\"") || low.contains("\"blue\"")
        var op: CGFloat = 1
        let len = (el as NSString).length
        if let o = opacityRE.firstMatch(in: el, range: NSRange(location: 0, length: len)) {
            op = CGFloat(Double((el as NSString).substring(with: o.range(at: 1))) ?? 1)
        }
        el = opacityRE.stringByReplacingMatches(in: el, range: NSRange(location: 0, length: len), withTemplate: "")
        for c in ["#f00", "#F00", "#ff0000", "#FF0000", "red", "#00f", "#00F", "#0000ff", "#0000FF", "blue"] {
            el = el.replacingOccurrences(of: "\"\(c)\"", with: "\"#000\"")
        }
        if isCut { L.cut.append(el) } else if isTop { L.top.append(el) } else if op < 0.99 { L.fade.append(el); L.fadeOpacity = op } else { L.ink.append(el) }
    }
    return L
}

func layerImage(_ els: [String], _ px: Int) -> CGImage? {
    guard !els.isEmpty else { return nil }
    let doc = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 18 18\">" + els.joined() + "</svg>"
    guard let img = NSImage(data: doc.data(using: .utf8)!) else { return nil }
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8, samplesPerPixel: 4,
                               hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    img.draw(in: NSRect(x: 0, y: 0, width: px, height: px))
    NSGraphicsContext.restoreGraphicsState()
    return rep.cgImage
}

/// 한 장면을 px × px 로 그린다. 알파 배열은 위쪽 줄부터.
func rasterize(_ svg: String, px: Int) -> (image: CGImage, alpha: [UInt8]) {
    let L = split(svg)
    let ctx = CGContext(data: nil, width: px, height: px, bitsPerComponent: 8, bytesPerRow: px * 4,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let r = CGRect(x: 0, y: 0, width: px, height: px)
    if let a = layerImage(L.ink, px) { ctx.draw(a, in: r) }
    if let c = layerImage(L.cut, px) { ctx.setBlendMode(.destinationOut); ctx.draw(c, in: r); ctx.setBlendMode(.normal) }
    if let t = layerImage(L.top, px) { ctx.draw(t, in: r) }
    if let fd = layerImage(L.fade, px) { ctx.setAlpha(L.fadeOpacity); ctx.draw(fd, in: r); ctx.setAlpha(1) }
    let data = ctx.data!.assumingMemoryBound(to: UInt8.self)
    var alpha = [UInt8](repeating: 0, count: px * px)
    for i in 0..<(px * px) { alpha[i] = data[i * 4 + 3] }
    return (ctx.makeImage()!, alpha)
}

// MARK: - 확인 그림을 그리는 캔버스 (좌표는 왼쪽 위 기준)

final class Canvas {
    let w: Int, h: Int, ctx: CGContext
    init(_ w: Int, _ h: Int, bg: NSColor) {
        self.w = w; self.h = h
        ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.setFillColor(bg.cgColor); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    }
    func r(_ x: CGFloat, _ y: CGFloat, _ rw: CGFloat, _ rh: CGFloat) -> CGRect { CGRect(x: x, y: CGFloat(h) - y - rh, width: rw, height: rh) }
    func fill(_ x: CGFloat, _ y: CGFloat, _ rw: CGFloat, _ rh: CGFloat, _ c: NSColor, radius: CGFloat = 0) {
        ctx.setFillColor(c.cgColor)
        ctx.addPath(CGPath(roundedRect: r(x, y, rw, rh), cornerWidth: radius, cornerHeight: radius, transform: nil)); ctx.fillPath()
    }
    func strokeRect(_ x: CGFloat, _ y: CGFloat, _ rw: CGFloat, _ rh: CGFloat, _ c: NSColor, dash: Bool = false) {
        ctx.saveGState(); ctx.setStrokeColor(c.cgColor); ctx.setLineWidth(1)
        if dash { ctx.setLineDash(phase: 0, lengths: [3, 3]) }
        ctx.stroke(r(x, y, rw, rh).insetBy(dx: 0.5, dy: 0.5)); ctx.restoreGState()
    }
    func hline(_ x: CGFloat, _ y: CGFloat, _ len: CGFloat, _ c: NSColor) {
        ctx.saveGState(); ctx.setStrokeColor(c.cgColor); ctx.setLineWidth(1); ctx.setLineDash(phase: 0, lengths: [2, 3])
        ctx.move(to: CGPoint(x: x, y: CGFloat(h) - y)); ctx.addLine(to: CGPoint(x: x + len, y: CGFloat(h) - y)); ctx.strokePath(); ctx.restoreGState()
    }
    /// 검은 알파 그림을 color 로 칠해 그린다. nearest 면 픽셀을 그대로 키운다.
    func icon(_ img: CGImage, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ color: NSColor, nearest: Bool = false) {
        let rect = r(x, y, size, size)
        ctx.saveGState()
        ctx.interpolationQuality = nearest ? .none : .high
        ctx.beginTransparencyLayer(in: rect, auxiliaryInfo: nil)
        ctx.draw(img, in: rect)
        ctx.setBlendMode(.sourceIn); ctx.setFillColor(color.cgColor); ctx.fill(rect)
        ctx.endTransparencyLayer()
        ctx.restoreGState()
    }
    func text(_ s: String, _ x: CGFloat, _ y: CGFloat, size: CGFloat = 12, weight: NSFont.Weight = .regular, color: NSColor = .black) {
        let font = NSFont.systemFont(ofSize: size, weight: weight)
        let a = NSAttributedString(string: s, attributes: [.font: font, .foregroundColor: color])
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
        a.draw(at: NSPoint(x: x, y: CGFloat(h) - y - a.size().height))
        NSGraphicsContext.restoreGraphicsState()
    }
    func symbol(_ name: String, _ x: CGFloat, _ yCenter: CGFloat, _ pt: CGFloat, _ color: NSColor) -> CGFloat {
        guard let s = NSImage(systemSymbolName: name, accessibilityDescription: nil)?
            .withSymbolConfiguration(.init(pointSize: pt, weight: .regular)) else { return 0 }
        var rect = NSRect(origin: .zero, size: s.size)
        guard let cg = s.cgImage(forProposedRect: &rect, context: nil, hints: nil) else { return 0 }
        let sw = s.size.width, sh = s.size.height
        let dst = r(x, yCenter - sh / 2, sw, sh)
        ctx.saveGState(); ctx.beginTransparencyLayer(in: dst, auxiliaryInfo: nil)
        ctx.draw(cg, in: dst); ctx.setBlendMode(.sourceIn); ctx.setFillColor(color.cgColor); ctx.fill(dst)
        ctx.endTransparencyLayer(); ctx.restoreGState()
        return sw
    }
    func save(_ path: String) {
        let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
        try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
    }
}

let lightBar = NSColor(white: 0.965, alpha: 1), darkBar = NSColor(white: 0.17, alpha: 1)
let inkColor = NSColor(white: 0.08, alpha: 1), paper = NSColor(white: 0.93, alpha: 1)
let guideColor = NSColor(calibratedRed: 0.05, green: 0.6, blue: 1, alpha: 0.55)

/// 메뉴 막대처럼 그린 띠: 시스템 아이콘 두 개 + 주어진 아이콘들 (2배 밀도, 18pt = 36px)
func bar(_ c: Canvas, _ x: CGFloat, _ y: CGFloat, _ wdt: CGFloat, dark: Bool, images: [CGImage], gap: CGFloat = 22) {
    let H: CGFloat = 48
    c.fill(x, y, wdt, H, dark ? darkBar : lightBar, radius: 10)
    let fg = dark ? NSColor.white : NSColor(white: 0.1, alpha: 1)
    var cx = x + 18
    cx += c.symbol("wifi", cx, y + H / 2, 28, fg) + gap
    cx += c.symbol("battery.75percent", cx, y + H / 2, 28, fg) + gap
    for img in images { c.icon(img, cx, y + (H - 36) / 2, 36, fg); cx += 36 + gap }
}

// MARK: - 수치

let S = 16          // 수치는 1pt = 16px 로 그려서 잰다
let cell = 18 * S

struct Metrics {
    var cover: [Double] = []; var outside: [Int] = []; var thin: [Double] = []
    var bbox0 = (minX: 0.0, maxX: 0.0, minY: 0.0, maxY: 0.0)
    var stepMax = 0.0, stepAt = 0, seam = 0.0, travel = 0.0, areaJump = 0.0, baseMoved: [Int] = []
}

func distanceMap(_ solid: [Bool]) -> [Int32] {
    let c = cell
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
/// 두 장면 사이에서 가장 멀리 움직인 거리(pt)
func moved(_ a: [Bool], _ da: [Int32], _ b: [Bool], _ db: [Int32]) -> Double {
    var m: Int32 = 0
    for i in 0..<(cell * cell) { if a[i] && !b[i] { m = max(m, db[i]) } else if b[i] && !a[i] { m = max(m, da[i]) } }
    return Double(m) / 10 / Double(S)
}

func measure(_ icon: Icon) -> Metrics {
    var M = Metrics()
    let rr = Int(0.45 * Double(S))
    var offs: [(Int, Int)] = []
    for dy in -rr...rr { for dx in -rr...rr where dx * dx + dy * dy <= rr * rr { offs.append((dx, dy)) } }
    var solids: [[Bool]] = [], dists: [[Int32]] = [], area: [Double] = []
    for (fi, svg) in icon.svgs.enumerated() {
        let a = rasterize(svg, px: cell).alpha
        var ink = 0.0, out = 0
        for y in 0..<cell { for x in 0..<cell { let v = a[y * cell + x]; if v == 0 { continue }
            let live = x >= S && x < cell - S && y >= S && y < cell - S
            if !live && v > 128 { out += 1 }
            if live { ink += Double(v) / 255 } } }
        M.cover.append(ink / Double(16 * S * 16 * S) * 100); M.outside.append(out); area.append(ink)
        let solid = a.map { $0 > 100 }
        var er = [Bool](repeating: false, count: cell * cell)
        for y in rr..<(cell - rr) { for x in rr..<(cell - rr) where solid[y * cell + x] {
            var ok = true
            for (dx, dy) in offs where !solid[(y + dy) * cell + x + dx] { ok = false; break }
            er[y * cell + x] = ok } }
        var op = [Bool](repeating: false, count: cell * cell)
        for y in rr..<(cell - rr) { for x in rr..<(cell - rr) where er[y * cell + x] { for (dx, dy) in offs { op[(y + dy) * cell + x + dx] = true } } }
        var lost = 0, total = 0
        for k in 0..<(cell * cell) where solid[k] { total += 1; if !op[k] { lost += 1 } }
        M.thin.append(total > 0 ? Double(lost) / Double(total) * 100 : 0)
        if fi == 0 {
            var x0 = cell, x1 = -1, y0 = cell, y1 = -1
            for y in 0..<cell { for x in 0..<cell where solid[y * cell + x] { x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y) } }
            if x1 >= 0 { M.bbox0 = (Double(x0) / Double(S), Double(x1 + 1) / Double(S), Double(y0) / Double(S), Double(y1 + 1) / Double(S)) }
        }
        solids.append(solid); dists.append(distanceMap(solid))
    }
    let n = icon.frames
    for i in 0..<n {
        let j = (i + 1) % n
        let m = moved(solids[i], dists[i], solids[j], dists[j])
        if j == 0 { M.seam = m } else if m > M.stepMax { M.stepMax = m; M.stepAt = i }
        M.areaJump = max(M.areaJump, abs(area[j] - area[i]) / max(area[i], 1) * 100)
    }
    for i in 0..<n { for j in (i + 1)..<max(i + 1, n) where (j - i) % 2 == 0 || n <= 32 {
        M.travel = max(M.travel, moved(solids[i], dists[i], solids[j], dists[j])) } }
    for col in 0..<n {
        var diff = 0
        for y in (15 * S + S / 2)..<(16 * S) { for x in 0..<cell where solids[col][y * cell + x] != solids[0][y * cell + x] { diff += 1 } }
        M.baseMoved.append(diff)
    }
    return M
}

func report(_ icon: Icon, _ M: Metrics) {
    let b = M.bbox0
    print("\(icon.id) · \(icon.frames)장면 · \(String(format: "%.1f", Double(icon.frames) / 8))초 한 바퀴 (초당 8장면)")
    print(String(format: "  장면 00 크기 %.1f × %.1fpt (x %.1f–%.1f, y %.1f–%.1f) · 무게 %.1f%% (모든 장면 %.1f–%.1f%%)",
                 b.maxX - b.minX, b.maxY - b.minY, b.minX, b.maxX, b.minY, b.maxY, M.cover[0], M.cover.min()!, M.cover.max()!))
    let outFrames = M.outside.enumerated().filter { $0.element > S * 2 }.map(\.offset)
    print("  격자(1–17pt) 밖: " + (outFrames.isEmpty ? "없음" : "장면 \(outFrames.prefix(12).map(String.init).joined(separator: ", "))\(outFrames.count > 12 ? " …" : "") (최대 \(M.outside.max()!)px)"))
    let thinWorst = M.thin.enumerated().max { $0.element < $1.element }!
    print(String(format: "  0.9pt보다 가는 부분: 최대 %.1f%% (장면 %d)  ← 3%%를 넘으면 가는 조각이 있다 (실선·연기처럼 의도한 것이 아니면 고친다)", thinWorst.element, thinWorst.offset))
    print(String(format: "  움직임: 가장 크게 달라진 거리 %.2fpt · 이웃 장면 최대 %.2fpt (장면 %d→%d) · 이음(마지막→처음) %.2fpt · 넓이 변화 최대 %.1f%%",
                 M.travel, M.stepMax, M.stepAt, M.stepAt + 1, M.seam, M.areaJump))
    let baseFrames = M.baseMoved.enumerated().filter { $0.element > S * 4 }.map(\.offset)
    print("  바닥선 띠(y 15.5–16): " + (baseFrames.isEmpty ? "고정" : "장면 \(baseFrames.prefix(10).map(String.init).joined(separator: ", ")) 에서 달라짐 (땅·받침이 있으면 고정돼야 한다)"))
    var hints: [String] = []
    if M.travel < 1.5 { hints.append("움직임이 1.5pt보다 작다: 실제 크기에서 거의 안 보인다") }
    if M.seam > max(M.stepMax, 0.6) * 1.2 { hints.append("마지막 장면에서 처음으로 넘어갈 때 튄다") }
    if !outFrames.isEmpty { hints.append("16×16 영역을 벗어난 장면이 있다") }
    if M.cover[0] < 18 { hints.append("장면 00이 가볍다 (메뉴 막대에서 작고 흐리게 보일 수 있다)") }
    if M.cover[0] > 45 { hints.append("장면 00이 무겁다 (덩어리로 보일 수 있다)") }
    print(hints.isEmpty ? "  주의: 없음" : hints.map { "  주의: " + $0 }.joined(separator: "\n"))
}

// MARK: - 확인 그림

/// 주요 장면 8장. 고르게 나누면 한 바퀴에 2·4·8번 반복하는 움직임이 모두 같은 장면으로 찍히므로 간격을 조금씩 어긋나게 고른다.
func keyIndices(_ n: Int) -> [Int] { (0..<8).map { $0 * n * 9 / 64 } }

func renderKeys(_ icon: Icon, _ path: String) {
    let sc = 8, px = 18 * sc, gap = 14, top = 40
    let c = Canvas(gap + 8 * (px + gap), top + px + 30, bg: paper)
    c.text("\(icon.id) — 주요 장면 8장 (8배). 점선 = 16×16 영역, 아래 점선 = 바닥선 y 16", 14, 12, size: 13, weight: .semibold)
    for (k, i) in keyIndices(icon.frames).enumerated() {
        let x = CGFloat(gap + k * (px + gap)), y = CGFloat(top)
        c.fill(x, y, CGFloat(px), CGFloat(px), .white, radius: 10)
        c.strokeRect(x + CGFloat(sc), y + CGFloat(sc), CGFloat(16 * sc), CGFloat(16 * sc), guideColor, dash: true)
        c.hline(x + 4, y + CGFloat(16 * sc), CGFloat(px - 8), NSColor(white: 0, alpha: 0.18))
        c.icon(rasterize(icon.svgs[i], px: px * 2).image, x, y, CGFloat(px), inkColor)
        c.text("장면 \(i)", x + 4, y + CGFloat(px) + 6, size: 11, color: .darkGray)
    }
    c.save(path)
}

func renderBars(_ icon: Icon, _ path: String) {
    let W = 760
    let c = Canvas(W, 470, bg: paper)
    c.text("\(icon.id) — 실제 메뉴 막대 크기 (Retina 2배: 18pt = 36px). 장면 0과 한 바퀴의 약 ¼ · ½ · ¾", 14, 10, size: 13, weight: .semibold)
    let quarters = [0, icon.frames * 28 / 100, icon.frames * 53 / 100, icon.frames * 78 / 100].map { rasterize(icon.svgs[$0], px: 36).image }
    bar(c, 14, 40, CGFloat(W - 28), dark: false, images: quarters)
    bar(c, 14, 100, CGFloat(W - 28), dark: true, images: quarters)
    c.text("장면 00 픽셀 확대 — 왼쪽: 1배 화면(18px)을 8배로 · 오른쪽: 2배 화면(36px)을 4배로", 14, 170, size: 13, weight: .semibold)
    let one = rasterize(icon.svgs[0], px: 18).image, two = rasterize(icon.svgs[0], px: 36).image
    var x: CGFloat = 14
    for dark in [false, true] {
        c.fill(x, 200, 160, 160, dark ? darkBar : lightBar, radius: 8)
        c.icon(one, x + 8, 208, 144, dark ? .white : inkColor, nearest: true)
        x += 176
        c.fill(x, 200, 160, 160, dark ? darkBar : lightBar, radius: 8)
        c.icon(two, x + 8, 208, 144, dark ? .white : inkColor, nearest: true)
        x += 190
    }
    c.text("메뉴 막대에서 장면 00 (실제 크기, 밝은·어두운)", 14, 380, size: 13, weight: .semibold)
    let still = [rasterize(icon.svgs[0], px: 36).image]
    bar(c, 14, 404, 300, dark: false, images: still)
    bar(c, 330, 404, 300, dark: true, images: still)
    c.save(path)
}

func renderStrip(_ icon: Icon, _ path: String) {
    let sc = 3, px = 18 * sc, gap = 6, perRow = 16, rows = (icon.frames + perRow - 1) / perRow, top = 34
    let c = Canvas(gap + perRow * (px + gap), top + rows * (px + gap + 14) + 6, bg: paper)
    c.text("\(icon.id) — 모든 장면 (3배, 왼쪽 위부터 순서대로, 초당 8장면)", 10, 10, size: 13, weight: .semibold)
    for i in 0..<icon.frames {
        let x = CGFloat(gap + (i % perRow) * (px + gap)), y = CGFloat(top + (i / perRow) * (px + gap + 14))
        c.fill(x, y, CGFloat(px), CGFloat(px), .white, radius: 5)
        c.icon(rasterize(icon.svgs[i], px: px * 2).image, x, y, CGFloat(px), inkColor)
        c.text("\(i)", x + 2, y + CGFloat(px) + 1, size: 10, color: .darkGray)
    }
    c.save(path)
}

func renderCompare(_ icons: [Icon], _ path: String) {
    let sc = 5, px = 18 * sc, gap = 10, rowH = px + 66, labelW = 0
    let W = gap + 8 * (px + gap) + 260
    let c = Canvas(max(W, 900), 20 + icons.count * rowH, bg: paper)
    for (k, icon) in icons.enumerated() {
        let y0 = CGFloat(10 + k * rowH)
        c.text("\(k + 1). \(URL(fileURLWithPath: icon.file).lastPathComponent) — \(icon.frames)장면", 12, y0, size: 13, weight: .semibold)
        for (j, i) in keyIndices(icon.frames).enumerated() {
            let x = CGFloat(labelW + gap + j * (px + gap)), y = y0 + 22
            c.fill(x, y, CGFloat(px), CGFloat(px), .white, radius: 8)
            c.icon(rasterize(icon.svgs[i], px: px * 2).image, x, y, CGFloat(px), inkColor)
            c.text("\(i)", x + 3, y + CGFloat(px) + 2, size: 10, color: .darkGray)
        }
        let still = rasterize(icon.svgs[0], px: 36).image
        let bx = CGFloat(labelW + gap + 8 * (px + gap))
        for (d, dark) in [false, true].enumerated() {
            let y = y0 + 22 + CGFloat(d) * 52
            c.fill(bx, y, 240, 46, dark ? darkBar : lightBar, radius: 8)
            let fg = dark ? NSColor.white : NSColor(white: 0.1, alpha: 1)
            var cx = bx + 12
            cx += c.symbol("wifi", cx, y + 23, 28, fg) + 18
            c.icon(still, cx, y + 5, 36, fg)
            cx += 54
            _ = c.symbol("battery.75percent", cx, y + 23, 28, fg)
        }
    }
    c.save(path)
}

func renderSheet(_ icons: [Icon], _ path: String) {
    let sc = 6, px = 18 * sc, gap = 16, perRow = 7, rows = (icons.count + perRow - 1) / perRow
    let gridH = rows * (px + gap + 18)
    let W = gap + perRow * (px + gap)
    let barW = 18 + 2 * 50 + icons.count * (36 + 18) + 12
    let c = Canvas(max(W, barW + 28), 40 + gridH + 150, bg: paper)
    c.text("세트 비교 — 장면 00 (6배)", 12, 10, size: 13, weight: .semibold)
    for (k, icon) in icons.enumerated() {
        let x = CGFloat(gap + (k % perRow) * (px + gap)), y = CGFloat(36 + (k / perRow) * (px + gap + 18))
        c.fill(x, y, CGFloat(px), CGFloat(px), .white, radius: 10)
        c.strokeRect(x + CGFloat(sc), y + CGFloat(sc), CGFloat(16 * sc), CGFloat(16 * sc), guideColor.withAlphaComponent(0.3), dash: true)
        c.icon(rasterize(icon.svgs[0], px: px * 2).image, x, y, CGFloat(px), inkColor)
        c.text(icon.id, x + 2, y + CGFloat(px) + 3, size: 11, color: .darkGray)
    }
    let y = CGFloat(40 + gridH)
    c.text("메뉴 막대에 나란히 (실제 크기)", 12, y, size: 13, weight: .semibold)
    let stills = icons.map { rasterize($0.svgs[0], px: 36).image }
    bar(c, 12, y + 26, CGFloat(barW), dark: false, images: stills, gap: 18)
    bar(c, 12, y + 84, CGFloat(barW), dark: true, images: stills, gap: 18)
    c.save(path)
}

// MARK: - 시작

let args = CommandLine.arguments
guard args.count >= 3 else { print(usage); exit(2) }
switch args[1] {
case "render":
    guard args.count >= 4 else { print(usage); exit(2) }
    let icon = loadIcon(args[2])
    let out = args[3]
    try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
    let M = measure(icon)
    report(icon, M)
    renderKeys(icon, "\(out)/\(icon.id)-keys.png")
    renderBars(icon, "\(out)/\(icon.id)-bars.png")
    renderStrip(icon, "\(out)/\(icon.id)-strip.png")
    print("  그림: \(out)/\(icon.id)-keys.png · \(icon.id)-bars.png · \(icon.id)-strip.png")
case "compare":
    let icons = args[3...].map(loadIcon)
    for i in icons { report(i, measure(i)) }
    renderCompare(icons, args[2])
    print("비교 그림: \(args[2])")
case "sheet":
    let icons = args[3...].map(loadIcon)
    renderSheet(icons, args[2])
    for i in icons {
        let M = measure(i)
        print(String(format: "%@  크기 %.1f × %.1fpt  무게 %.1f%%  가장 크게 달라진 거리 %.1fpt", i.id.padding(toLength: 10, withPad: " ", startingAt: 0),
                     M.bbox0.maxX - M.bbox0.minX, M.bbox0.maxY - M.bbox0.minY, M.cover[0], M.travel))
    }
    print("세트 그림: \(args[2])")
case "svg":
    let icon = loadIcon(args[2])
    let i = args.count > 3 ? (Int(args[3]) ?? 0) : 0
    print(icon.svgs[max(0, min(icon.frames - 1, i))])
case "bake":
    let out = URL(fileURLWithPath: args[2])
    let mf = out.appendingPathComponent("manifest.json")
    guard let data = try? Data(contentsOf: mf), var json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
          var marks = json["marks"] as? [[String: Any]] else { print("manifest.json 을 읽지 못했습니다: \(mf.path)"); exit(2) }
    for path in args[3...] {
        let icon = loadIcon(path)
        for scale in [1, 2] {
            let c = 18 * scale
            let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: c * icon.frames, pixelsHigh: c, bitsPerSample: 8, samplesPerPixel: 4,
                                       hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
            let dst = rep.bitmapData!
            for (i, svg) in icon.svgs.enumerated() {
                let a = rasterize(svg, px: c).alpha   // 검정 + 알파 (Figma에서 구운 것과 같은 꼴)
                for y in 0..<c { for x in 0..<c { let o = y * rep.bytesPerRow + (i * c + x) * 4; dst[o] = 0; dst[o + 1] = 0; dst[o + 2] = 0; dst[o + 3] = a[y * c + x] } }
            }
            try! rep.representation(using: .png, properties: [:])!.write(to: out.appendingPathComponent(scale == 1 ? "\(icon.id).png" : "\(icon.id)@2x.png"))
        }
        marks.removeAll { ($0["id"] as? String) == icon.id }
        marks.append(["id": icon.id, "ko": icon.id, "en": icon.id, "frames": icon.frames])
        print("구웠습니다: \(icon.id) (\(icon.frames)장면)")
    }
    json["marks"] = marks
    try! JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys]).write(to: mf)
default:
    print(usage); exit(2)
}
exit(0)
