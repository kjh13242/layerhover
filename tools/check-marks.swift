// 그림 규칙 검사 (기획안 3.2절). Figma에서 꺼낸 "장면을 한 줄로 늘어놓은 SVG"를 16배로 그려 픽셀로 잰다.
// 사용법: swift tools/check-marks.swift <strip.svg> <이름1,이름2,...> [간격pt=36]
//   R-격자: 16×16 밖에 칠해진 곳 / R6: 칠해진 비율 25~45% / R2: 가는 곳(1pt 미만) / R7: 투명도 단계
import AppKit

let args = CommandLine.arguments
// Figma는 프레임을 내보낼 때 페이지 바탕색 사각형을 맨 앞에 넣는다. 그림이 아니므로 뺀다.
guard args.count >= 3, var text = try? String(contentsOfFile: args[1], encoding: .utf8) else { print("SVG를 읽지 못했습니다"); exit(2) }
text = text.replacingOccurrences(of: ##"<rect width="\d+" height="\d+" fill="#[0-9A-Fa-f]{6}"/>"##, with: "", options: .regularExpression)
guard let img = NSImage(data: text.data(using: .utf8)!) else { print("SVG를 그리지 못했습니다"); exit(2) }
let names = args[2].split(separator: ",").map(String.init)
let pitch = args.count > 3 ? Double(args[3])! : 36
let S = 16                       // 1pt = 16px
let cell = 18 * S
let W = Int(img.size.width) * S, H = Int(img.size.height) * S
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4,
                           hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
img.draw(in: NSRect(x: 0, y: 0, width: W, height: H))
NSGraphicsContext.restoreGraphicsState()
let data = rep.bitmapData!, bpr = rep.bytesPerRow
func alpha(_ x: Int, _ y: Int) -> UInt8 { data[y * bpr + x * 4 + 3] }   // y: 위에서 아래

var failed = 0
print("아이콘        밖(px)  칠해진 비율   가는 곳   투명도 단계   판정")
for (i, name) in names.enumerated() {
    let x0 = Int(Double(i) * pitch) * S
    var a = [UInt8](repeating: 0, count: cell * cell)
    for y in 0..<cell { for x in 0..<cell where x0 + x < W && y < H { a[y * cell + x] = alpha(x0 + x, y) } }
    // 격자: 16×16(1pt 여백) 밖의 칠
    var outside = 0, ink = 0.0
    var levels = Set<Int>()
    for y in 0..<cell { for x in 0..<cell {
        let v = a[y * cell + x]; if v == 0 { continue }
        let inLive = x >= S && x < cell - S && y >= S && y < cell - S
        if !inLive && v > 128 { outside += 1 }
        if inLive { ink += Double(v) / 255 }
        // 투명도 단계는 면 안쪽에서만 센다 (가장자리의 부드러운 경계 픽셀은 제외: 둘레 ±4px가 같은 값일 때만)
        if v >= 235 { levels.insert(10) }
        else if v > 20, x >= 4, y >= 4, x < cell - 4, y < cell - 4 {
            var flat = true
            for (dx, dy) in [(-4, 0), (4, 0), (0, -4), (0, 4), (-3, -3), (3, 3), (-3, 3), (3, -3)] where abs(Int(a[(y + dy) * cell + x + dx]) - Int(v)) > 6 { flat = false; break }
            if flat { levels.insert(Int((Double(v) / 255 * 10).rounded())) }
        }
    } }
    let coverage = ink / Double(16 * S * 16 * S) * 100
    // R2: 반지름 0.45pt 원으로 깎았다가 되살려서(열기 연산) 사라지는 부분 = 0.9pt보다 가는 곳
    let r = Int(0.45 * Double(S))
    var offs: [(Int, Int)] = []
    for dy in -r...r { for dx in -r...r where dx * dx + dy * dy <= r * r { offs.append((dx, dy)) } }
    let solid = a.map { $0 > 100 }
    var er = [Bool](repeating: false, count: cell * cell)
    for y in r..<(cell - r) { for x in r..<(cell - r) where solid[y * cell + x] {
        var ok = true
        for (dx, dy) in offs where !solid[(y + dy) * cell + x + dx] { ok = false; break }
        er[y * cell + x] = ok
    } }
    var op = [Bool](repeating: false, count: cell * cell)
    for y in r..<(cell - r) { for x in r..<(cell - r) where er[y * cell + x] { for (dx, dy) in offs { op[(y + dy) * cell + x + dx] = true } } }
    var lost = 0, total = 0
    for k in 0..<(cell * cell) where solid[k] { total += 1; if !op[k] { lost += 1 } }
    let thin = total > 0 ? Double(lost) / Double(total) * 100 : 0
    // 뾰족한 끝과 둥근 모서리도 조금 사라지므로 3%까지는 허용
    var why: [String] = []
    if outside > S * 2 { why.append("격자 밖") }
    if coverage < 25 { why.append("너무 가벼움") } else if coverage > 45 { why.append("너무 무거움") }
    if thin > 3 { why.append("가는 곳") }
    if levels.contains(where: { $0 < 4 }) { why.append("투명도 40% 미만") }
    if !why.isEmpty { failed += 1 }
    let pad = name.padding(toLength: 10, withPad: " ", startingAt: 0)
    print(String(format: "%@  %6d   %6.1f%%     %5.1f%%    %@   %@", pad, outside, coverage, thin,
                 levels.sorted().map { "\($0 * 10)" }.joined(separator: ",").padding(toLength: 12, withPad: " ", startingAt: 0),
                 why.isEmpty ? "통과" : "실패: " + why.joined(separator: ", ")))
}
print(failed == 0 ? "\n모두 통과" : "\n실패 \(failed)개")
exit(failed == 0 ? 0 : 1)
