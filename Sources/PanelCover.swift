// 페이지를 옮길 때 왼쪽 패널이 잠깐 펼쳐졌다 접히는 모습을 가린다.
// 펼치기 직전의 Figma 화면을 찍어 그 위에 덮어 두고, 이동이 끝나면 걷어 낸다.
// macOS 14 이상 + 화면 기록 권한이 있을 때만 동작하고, 없으면 그냥 지금처럼 보인다.

import AppKit
import ScreenCaptureKit

enum PanelCover {
    static var hasPermission: Bool { CGPreflightScreenCaptureAccess() }
    static func requestPermission() { _ = CGRequestScreenCaptureAccess() }

    private static var panel: NSPanel?
    private static var generation = 0   // 덮개를 띄울 때마다 올린다. 오래된 "걷기" 예약이 새 덮개를 걷지 않게.
    static let maxLifetime: TimeInterval = 2.5   // 무슨 일이 있어도 이 시간이 지나면 걷는다
    private static var cachedWindow: (id: CGWindowID, at: TimeInterval)?

    /// rect(손쉬운 사용 좌표, 위-왼쪽 원점) 부분의 Figma 창을 찍어 덮개를 띄운 뒤 done을 부른다.
    /// 찍지 못하면 덮개 없이 바로 done.
    static func show(over rect: CGRect, then done: @escaping () -> Void) {
        guard #available(macOS 14.0, *), hasPermission else { done(); return }
        Task {
            let t0 = Date()
            let image = await capture(rect)
            log("panel cover captured=\(image != nil) in \(Int(Date().timeIntervalSince(t0) * 1000))ms")
            await MainActor.run {
                guard let image else { done(); return }
                present(image, rect)
                // 이동은 패널을 펼치고 기다리는 동안 메인 스레드를 잡고 있어서, 덮개가 화면에 실제로 올라오기 전에
                // 시작하면 패널이 한 장면 먼저 보인다. 창 서버가 덮개를 화면에 올렸다고 알려 줄 때까지 기다린 뒤
                // 한 장면(1/60초)을 더 두고 시작한다. 최대 0.2초.
                waitUntilOnScreen(started: ProcessInfo.processInfo.systemUptime, then: done)
            }
        }
    }

    private static func waitUntilOnScreen(started: TimeInterval, then done: @escaping () -> Void) {
        let onScreen: Bool = {
            guard let p = panel,
                  let info = CGWindowListCopyWindowInfo([.optionIncludingWindow], CGWindowID(p.windowNumber)) as? [[String: Any]],
                  let w = info.first else { return false }
            return (w[kCGWindowIsOnscreen as String] as? Bool) == true && ((w[kCGWindowAlpha as String] as? Double) ?? 0) > 0.99
        }()
        if onScreen || ProcessInfo.processInfo.systemUptime - started > 0.2 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.017) { done() }
        } else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.008) { waitUntilOnScreen(started: started, then: done) }
        }
    }

    /// 덮개를 걷는다. Figma가 접고 새 페이지를 그릴 시간을 조금 준 뒤 서서히 걷는다.
    static func hide(after delay: TimeInterval = 0.12) {
        guard let p = panel else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            NSAnimationContext.runAnimationGroup({ ctx in
                ctx.duration = 0.15
                p.animator().alphaValue = 0
            }, completionHandler: {
                p.orderOut(nil)
                if panel === p { panel = nil }
            })
        }
    }

    @available(macOS 14.0, *)
    private static func capture(_ rect: CGRect) async -> CGImage? {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
            let windows = content.windows.filter {
                $0.owningApplication?.bundleIdentifier == figmaBundleID && $0.frame.intersects(rect) && $0.windowLayer == 0
            }
            guard let w = windows.max(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }) else { return nil }
            let filter = SCContentFilter(desktopIndependentWindow: w)
            let config = SCStreamConfiguration()
            let scale = NSScreen.screens.first { $0.frame.intersects(cocoaRect(fromAX: rect)) }?.backingScaleFactor ?? 2
            config.width = Int(w.frame.width * scale)
            config.height = Int(w.frame.height * scale)
            config.showsCursor = false
            config.ignoreShadowsSingleWindow = true
            let full = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
            // 창 전체 사진에서 rect 부분만 잘라 낸다
            let local = CGRect(x: (rect.minX - w.frame.minX) * scale, y: (rect.minY - w.frame.minY) * scale,
                               width: rect.width * scale, height: rect.height * scale)
            return full.cropping(to: local)
        } catch {
            log("panel cover capture failed: \(error.localizedDescription)")
            return nil
        }
    }

    private static func present(_ image: CGImage, _ rect: CGRect) {
        let p = panel ?? {
            let p = NSPanel(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
            p.level = .floating
            p.isOpaque = false
            p.backgroundColor = .clear
            p.hasShadow = false
            p.ignoresMouseEvents = true
            p.collectionBehavior = [.fullScreenAuxiliary, .moveToActiveSpace]
            p.isReleasedWhenClosed = false
            return p
        }()
        panel = p
        // 창 위치·크기를 먼저 정하고, 사진은 층(layer)에 바로 넣는다. 이미지 뷰를 쓰면 처음 한 장면이
        // 몇 px 어긋나게 그려졌다.
        p.setFrame(cocoaRect(fromAX: rect), display: false)
        let view = NSView(frame: NSRect(origin: .zero, size: rect.size))
        view.wantsLayer = true
        view.layer?.contents = image
        view.layer?.contentsGravity = .resize
        view.layer?.contentsScale = CGFloat(image.width) / max(rect.width, 1)
        view.autoresizingMask = [.width, .height]
        p.contentView = view
        p.alphaValue = 1
        CATransaction.flush()
        p.orderFrontRegardless()
        // 안전장치: 이동이 중간에 끊기더라도 이전 화면 사진이 계속 떠 있지 않게 한다.
        generation += 1
        let mine = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + maxLifetime) {
            if generation == mine, panel != nil { log("panel cover removed by time limit"); hide(after: 0) }
        }
        log("panel cover shown")
    }
}
