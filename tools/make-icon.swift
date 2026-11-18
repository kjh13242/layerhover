// 앱 아이콘(.iconset)을 그려서 만든다. 사용법: swift make-icon.swift <출력 폴더.iconset> [미리보기.png]
// Layerhover 아이콘: 피그마 화면 한 장. 어두운 캔버스 위 선택된 프레임 옆으로 레이어 패널이 나와 있고,
// 포인터가 레이어 한 줄에 올라가 있다(호버). 피그마 로고·로고 색은 쓰지 않고 화면 언어만 빌린다.
// 1024 기준 좌표로 그린 뒤 크기에 맞게 줄인다 (macOS 아이콘 격자: 본체 824, 여백 100).
import AppKit

func rgb(_ hex: UInt32, _ a: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat((hex >> 16) & 0xff) / 255, green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255, alpha: a)
}
func rr(_ r: NSRect, _ radius: CGFloat) -> NSBezierPath { NSBezierPath(roundedRect: r, xRadius: radius, yRadius: radius) }
// NSShadow의 번짐·거리는 좌표 변환을 따르지 않고 실제 픽셀로 적용된다. 그래서 그리는 크기에 맞춰 줄인다.
var shadowScale: CGFloat = 1
func shadow(_ blur: CGFloat, _ dy: CGFloat, _ a: CGFloat, _ draw: () -> Void) {
    NSGraphicsContext.saveGraphicsState()
    let s = NSShadow(); s.shadowBlurRadius = blur * shadowScale; s.shadowOffset = NSSize(width: 0, height: -dy * shadowScale)
    s.shadowColor = NSColor(white: 0, alpha: a); s.set(); draw()
    NSGraphicsContext.restoreGraphicsState()
}
let blue = rgb(0x0D99FF), purple = rgb(0x9747FF)
let canvasTop = rgb(0x2A2A2A), canvasBottom = rgb(0x161616)
let panelFill = rgb(0x2C2C2C), panelEdge = rgb(0x444444)

/// 본체: 피그마 캔버스처럼 어두운 판 + 아주 옅은 점 격자
func body(small: Bool) -> NSBezierPath {
    let p = rr(NSRect(x: 100, y: 100, width: 824, height: 824), 185)
    shadow(28, 12, 0.4) { rgb(0x111111).setFill(); p.fill() }
    NSGradient(colors: [canvasTop, canvasBottom])!.draw(in: p, angle: -90)
    // 어두운 Dock·Finder 바탕에서도 외곽이 보이도록 아주 옅은 테두리
    let rim = rr(NSRect(x: 102, y: 102, width: 820, height: 820), 183); rim.lineWidth = 4
    rgb(0xFFFFFF, 0.10).setStroke(); rim.stroke()
    if !small {
        NSGraphicsContext.saveGraphicsState(); p.addClip()
        rgb(0xFFFFFF, 0.05).setFill()
        var y: CGFloat = 130
        while y < 920 { var x: CGFloat = 130; while x < 920 { NSBezierPath(ovalIn: NSRect(x: x, y: y, width: 6, height: 6)).fill(); x += 44 }; y += 44 }
        NSGraphicsContext.restoreGraphicsState()
    }
    return p
}
func pointer(tip: NSPoint, k: CGFloat, outline: CGFloat) {
    let a = NSBezierPath()
    for (i, (dx, dy)) in [(0.0, 0.0), (0, -230), (58, -178), (98, -268), (140, -250), (100, -162), (172, -158)].enumerated() {
        let p = NSPoint(x: tip.x + CGFloat(dx) * k, y: tip.y + CGFloat(dy) * k)
        if i == 0 { a.move(to: p) } else { a.line(to: p) }
    }
    a.close(); a.lineJoinStyle = .round; a.lineWidth = outline
    shadow(16, 6, 0.5) { NSColor.white.setStroke(); a.stroke() }
    NSColor.white.setStroke(); a.stroke()
    rgb(0x111111).setFill(); a.fill()
}
/// 피그마 선택 상자: 파란 테두리 + 네 귀퉁이 흰 손잡이 (+ 위에 파란 이름표)
func selection(_ r: NSRect, label: Bool, small: Bool) {
    let path = NSBezierPath(rect: r); path.lineWidth = small ? 10 : 6; blue.setStroke(); path.stroke()
    let h: CGFloat = small ? 30 : 22
    for p in [NSPoint(x: r.minX, y: r.minY), NSPoint(x: r.maxX, y: r.minY), NSPoint(x: r.minX, y: r.maxY), NSPoint(x: r.maxX, y: r.maxY)] {
        let s = NSRect(x: p.x - h / 2, y: p.y - h / 2, width: h, height: h)
        NSColor.white.setFill(); NSBezierPath(rect: s).fill()
        let e = NSBezierPath(rect: s); e.lineWidth = 4; blue.setStroke(); e.stroke()
    }
    if label && !small {
        blue.setFill(); rr(NSRect(x: r.minX, y: r.maxY + 18, width: 120, height: 34), 6).fill()
        NSColor.white.setFill(); rr(NSRect(x: r.minX + 14, y: r.maxY + 30, width: 92, height: 10), 5).fill()
    }
}
/// 피그마 레이어 줄 아이콘들
func frameGlyph(_ c: NSPoint, _ s: CGFloat, _ color: NSColor) {
    color.setStroke()
    let p = NSBezierPath(); p.lineWidth = s * 0.14
    p.move(to: NSPoint(x: c.x - s * 0.2, y: c.y - s * 0.5)); p.line(to: NSPoint(x: c.x - s * 0.2, y: c.y + s * 0.5))
    p.move(to: NSPoint(x: c.x + s * 0.2, y: c.y - s * 0.5)); p.line(to: NSPoint(x: c.x + s * 0.2, y: c.y + s * 0.5))
    p.move(to: NSPoint(x: c.x - s * 0.5, y: c.y - s * 0.2)); p.line(to: NSPoint(x: c.x + s * 0.5, y: c.y - s * 0.2))
    p.move(to: NSPoint(x: c.x - s * 0.5, y: c.y + s * 0.2)); p.line(to: NSPoint(x: c.x + s * 0.5, y: c.y + s * 0.2))
    p.stroke()
}
func diamond(_ c: NSPoint, _ s: CGFloat, _ color: NSColor) {
    let p = NSBezierPath()
    p.move(to: NSPoint(x: c.x, y: c.y + s / 2)); p.line(to: NSPoint(x: c.x + s / 2, y: c.y))
    p.line(to: NSPoint(x: c.x, y: c.y - s / 2)); p.line(to: NSPoint(x: c.x - s / 2, y: c.y)); p.close()
    color.setFill(); p.fill()
}
/// 레이어 패널(떠 있는 섬). rows: (아이콘 종류, 이름 길이), hovered: 마우스가 올라간 줄
func layersPanel(_ r: NSRect, rows: [(Int, CGFloat)], hovered: Int, small: Bool) {
    shadow(40, 16, 0.6) { panelFill.setFill(); rr(r, 40).fill() }
    let edge = rr(r.insetBy(dx: 1.5, dy: 1.5), 39); edge.lineWidth = 3; panelEdge.setStroke(); edge.stroke()
    let rowH = (r.height - 80) / CGFloat(rows.count)
    for (i, row) in rows.enumerated() {
        let y = r.maxY - 40 - rowH * CGFloat(i + 1)
        let line = NSRect(x: r.minX + 20, y: y + 6, width: r.width - 40, height: rowH - 12)
        let isHover = i == hovered
        if isHover {
            // 피그마는 마우스를 올린 레이어에 옅은 바탕을 깐다. 아이콘에서는 파랗게 강조해 "호버"를 보인다.
            rgb(0x0D99FF, 0.28).setFill(); rr(line, 18).fill()
            let o = rr(line, 18); o.lineWidth = 4; blue.setStroke(); o.stroke()
        }
        let iconC = NSPoint(x: line.minX + 46 + CGFloat(row.0 == 2 ? 30 : 0), y: line.midY)
        let s: CGFloat = small ? 46 : 38
        switch row.0 {
        case 0: frameGlyph(iconC, s, isHover ? .white : rgb(0xFFFFFF, 0.75))
        case 1: diamond(iconC, s * 0.95, purple)
        default: rgb(0xFFFFFF, isHover ? 1 : 0.6).setFill(); rr(NSRect(x: iconC.x - s * 0.35, y: iconC.y - s * 0.35, width: s * 0.7, height: s * 0.7), 6).fill()
        }
        if !small {
            NSColor(white: 1, alpha: isHover ? 0.95 : 0.55).setFill()
            rr(NSRect(x: iconC.x + 42, y: line.midY - 11, width: row.1, height: 22), 11).fill()
        }
    }
}

// 피그마 화면 한 장: 캔버스 위 선택된 프레임, 왼쪽 끝에서 레이어 패널이 나오고 한 줄에 호버
func conceptA(small: Bool) {
    let b = body(small: small)
    NSGraphicsContext.saveGraphicsState(); b.addClip()
    // 캔버스 위 프레임 (흰 화면)
    let frame = NSRect(x: 520, y: 300, width: 300, height: 380)
    shadow(24, 8, 0.4) { rgb(0xF5F5F5).setFill(); NSBezierPath(rect: frame).fill() }
    if !small {
        rgb(0xD9D9D9).setFill(); NSBezierPath(rect: NSRect(x: frame.minX + 30, y: frame.maxY - 110, width: 240, height: 80)).fill()
        rgb(0xE6E6E6).setFill(); NSBezierPath(rect: NSRect(x: frame.minX + 30, y: frame.minY + 40, width: 160, height: 26)).fill()
    }
    selection(frame, label: true, small: small)
    NSGraphicsContext.restoreGraphicsState()
    // 왼쪽 끝에서 나온 레이어 패널
    layersPanel(NSRect(x: 150, y: 260, width: 330, height: 470), rows: [(0, 130), (1, 100), (2, 120), (2, 90)], hovered: 1, small: small)
    pointer(tip: NSPoint(x: 330, y: 560), k: small ? 0.75 : 0.56, outline: small ? 34 : 22)
}


let out = URL(fileURLWithPath: CommandLine.arguments[1])
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

func render(_ px: Int) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    let scale = CGFloat(px) / 1024
    shadowScale = scale
    NSAffineTransform(transform: AffineTransform(scaleByX: scale, byY: scale)).concat()
    conceptA(small: px <= 64)
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

for (name, px) in [("16x16", 16), ("16x16@2x", 32), ("32x32", 32), ("32x32@2x", 64), ("128x128", 128),
                   ("128x128@2x", 256), ("256x256", 256), ("256x256@2x", 512), ("512x512", 512), ("512x512@2x", 1024)] {
    try render(px).write(to: out.appendingPathComponent("icon_\(name).png"))
}
if CommandLine.arguments.count > 2 {
    try render(1024).write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
}
