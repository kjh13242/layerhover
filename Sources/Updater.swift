// 자동 업데이트: GitHub 최신 릴리스를 하루 한 번 확인하고, 새 버전이면 받아서 바꿔 끼운 뒤 다시 시작한다.
//
// 안전장치
//  - 받은 앱은 지금 앱과 같은 인증서로 서명되어 있어야만 설치한다 (지금 앱의 designated requirement 로 검사).
//    그래서 임시(ad-hoc) 서명으로 빌드한 앱은 스스로 업데이트하지 않는다.
//  - 같은 인증서라 macOS가 같은 앱으로 알아봐 손쉬운 사용 권한이 그대로 남는다.
//  - Figma를 앞에 두고 쓰는 중이면 바꿔 끼우지 않고 기다린다.
//  - 보내는 것은 GitHub에 최신 릴리스를 묻는 요청뿐이다 (사용자 정보 없음).

import AppKit
import Security

struct UpdateFailure: Error { let why: String; init(_ w: String) { why = w } }

final class Updater {
    static let shared = Updater()

    /// LAYERHOVER_UPDATE_URL 은 시험용 (로컬 서버로 업데이트 과정을 끝까지 돌려 볼 때)
    static let latestURL = URL(string: ProcessInfo.processInfo.environment["LAYERHOVER_UPDATE_URL"]
                               ?? "https://api.github.com/repos/kjh13242/layerhover/releases/latest")!
    static let assetName = "Layerhover.zip"

    enum State: Equatable {
        case idle
        case checking
        case upToDate
        case available(String)
        case installing(String)
        case failed(String)
    }

    private(set) var state: State = .idle { didSet { onChange?() } }
    private(set) var lastChecked: Date?
    var onChange: (() -> Void)?
    private var timer: Timer?
    private var pending: (version: String, url: URL)?
    private var waitTimer: Timer?

    private let defaults = UserDefaults.standard
    var autoInstall: Bool {
        get { defaults.object(forKey: "autoUpdate") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "autoUpdate"); if newValue, let p = pending { install(p.version, p.url) } }
    }

    var currentVersion: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0" }

    /// 앱이 켜지면 1분 뒤 한 번, 그 뒤로는 6시간마다 살펴서 마지막 확인이 하루 넘었으면 다시 확인한다.
    func start() {
        guard timer == nil else { return }
        let firstDelay: Double = ProcessInfo.processInfo.environment["LAYERHOVER_UPDATE_URL"] != nil ? 3 : 60
        DispatchQueue.main.asyncAfter(deadline: .now() + firstDelay) { [weak self] in self?.check() }
        timer = Timer.scheduledTimer(withTimeInterval: 6 * 3600, repeats: true) { [weak self] _ in
            guard let self else { return }
            let last = self.defaults.object(forKey: "updateLastCheck") as? Date ?? .distantPast
            if Date().timeIntervalSince(last) > 23 * 3600 { self.check() }
        }
    }

    func check() {
        if case .installing = state { return }
        if state == .checking { return }
        state = .checking
        var req = URLRequest(url: Self.latestURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        req.setValue("Layerhover", forHTTPHeaderField: "User-Agent")
        URLSession.shared.dataTask(with: req) { [weak self] data, _, error in
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            DispatchQueue.main.async {
                guard let self else { return }
                self.lastChecked = Date()
                self.defaults.set(Date(), forKey: "updateLastCheck")
                guard let json, let tag = json["tag_name"] as? String else {
                    log("update: check failed \(error.map { ($0 as NSError).code } ?? -1)")
                    self.state = .failed(L("업데이트를 확인하지 못했어요", "Couldn't check for updates"))
                    return
                }
                let version = tag.hasPrefix("v") ? String(tag.dropFirst()) : tag
                let assets = json["assets"] as? [[String: Any]] ?? []
                guard Self.isNewer(version, than: self.currentVersion) else { self.state = .upToDate; return }
                guard let s = assets.first(where: { ($0["name"] as? String) == Self.assetName })?["browser_download_url"] as? String,
                      let url = URL(string: s) else { self.state = .upToDate; return }
                log("update: \(version) available")
                self.pending = (version, url)
                self.state = .available(version)
                if self.autoInstall { self.install(version, url) }
            }
        }.resume()
    }

    /// 패널·설정의 "설치" 단추
    func installNow() {
        if let p = pending { install(p.version, p.url, force: true) }
    }

    static func isNewer(_ a: String, than b: String) -> Bool {
        let x = a.split(separator: ".").map { Int($0) ?? 0 }, y = b.split(separator: ".").map { Int($0) ?? 0 }
        for i in 0..<max(x.count, y.count) {
            let p = i < x.count ? x[i] : 0, q = i < y.count ? y[i] : 0
            if p != q { return p > q }
        }
        return false
    }

    private func install(_ version: String, _ url: URL, force: Bool = false) {
        if case .installing = state { return }
        // Figma를 쓰는 중이면 끼어들지 않는다 (직접 누른 경우는 바로)
        if !force, NSWorkspace.shared.frontmostApplication?.bundleIdentifier == figmaBundleID {
            waitTimer?.invalidate()
            waitTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: false) { [weak self] _ in self?.install(version, url) }
            return
        }
        state = .installing(version)
        URLSession.shared.downloadTask(with: url) { [weak self] file, _, error in
            var result: Result<URL, UpdateFailure>
            if let file { result = Self.prepare(zip: file, version: version) } else { result = .failure(UpdateFailure("download \((error as NSError?)?.code ?? -1)")) }
            DispatchQueue.main.async {
                guard let self else { return }
                switch result {
                case .success(let app): self.replaceAndRelaunch(with: app)
                case .failure(let why):
                    log("update: install failed: \(why.why)")
                    self.state = .failed(L("업데이트를 설치하지 못했어요", "Couldn't install the update"))
                }
            }
        }.resume()
    }

    /// 받은 zip을 풀고, 안의 앱이 이 앱과 같은 인증서로 서명된 그 버전인지 확인한다.
    private static func prepare(zip: URL, version: String) -> Result<URL, UpdateFailure> {
        let fm = FileManager.default
        let dir = fm.temporaryDirectory.appendingPathComponent("layerhover-update-\(UUID().uuidString)")
        do { try fm.createDirectory(at: dir, withIntermediateDirectories: true) } catch { return .failure(UpdateFailure("mkdir")) }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/ditto")
        p.arguments = ["-x", "-k", zip.path, dir.path]
        do { try p.run(); p.waitUntilExit() } catch { return .failure(UpdateFailure("ditto")) }
        guard p.terminationStatus == 0 else { return .failure(UpdateFailure("unzip")) }
        let candidates = [dir.appendingPathComponent("Layerhover/Layerhover.app"), dir.appendingPathComponent("Layerhover.app")]
        guard let app = candidates.first(where: { fm.fileExists(atPath: $0.path) }) else { return .failure(UpdateFailure("no app in zip")) }
        guard Bundle(url: app)?.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String == version else { return .failure(UpdateFailure("version mismatch")) }
        guard sameSigner(app) else { return .failure(UpdateFailure("signature does not match")) }
        return .success(app)
    }

    /// 받은 앱이 지금 앱의 designated requirement(같은 번들 ID + 같은 인증서)를 만족하는지
    static func sameSigner(_ app: URL) -> Bool {
        var me: SecCode?, meStatic: SecStaticCode?, req: SecRequirement?, other: SecStaticCode?
        guard SecCodeCopySelf([], &me) == errSecSuccess, let me,
              SecCodeCopyStaticCode(me, [], &meStatic) == errSecSuccess, let meStatic,
              SecCodeCopyDesignatedRequirement(meStatic, [], &req) == errSecSuccess, let req,
              SecStaticCodeCreateWithPath(app as CFURL, [], &other) == errSecSuccess, let other else { return false }
        // 임시(ad-hoc) 서명 앱은 요구 조건이 cdhash 라 새 빌드가 절대 맞지 않는다 → 업데이트하지 않음
        let flags = SecCSFlags(rawValue: kSecCSCheckAllArchitectures | kSecCSStrictValidate | kSecCSCheckNestedCode)
        return SecStaticCodeCheckValidity(other, flags, req) == errSecSuccess
    }

    /// 이 앱이 끝나기를 기다렸다가 새 앱으로 바꿔 끼우고 다시 여는 작은 스크립트를 띄운 뒤 끝낸다.
    private func replaceAndRelaunch(with newApp: URL) {
        let target = Bundle.main.bundleURL.path
        let script = """
        while kill -0 "$1" 2>/dev/null; do sleep 0.2; done
        rm -rf "$2.old"
        if mv "$2" "$2.old" && mv "$3" "$2"; then rm -rf "$2.old"; else rm -rf "$2"; mv "$2.old" "$2"; fi
        xattr -dr com.apple.quarantine "$2" 2>/dev/null
        open "$2"
        """
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/sh")
        p.arguments = ["-c", script, "sh", String(ProcessInfo.processInfo.processIdentifier), target, newApp.path]
        do {
            try p.run()
            log("update: relaunching into new version")
            NSApp.terminate(nil)
        } catch {
            log("update: could not start installer")
            state = .failed(L("업데이트를 설치하지 못했어요", "Couldn't install the update"))
        }
    }

    /// 설정·패널에 보여 줄 한 줄
    var statusLine: String {
        switch state {
        case .idle: return L("하루 한 번 새 버전을 확인해요", "Checks for a new version once a day")
        case .checking: return L("확인하는 중…", "Checking…")
        case .upToDate: return L("최신 버전이에요", "You're up to date")
        case .available(let v): return autoInstall ? L("\(v) 받는 중…", "Getting \(v)…") : L("새 버전 \(v)이 있어요", "Version \(v) is available")
        case .installing(let v): return L("\(v) 설치하는 중… 곧 다시 시작해요", "Installing \(v)… restarting soon")
        case .failed(let why): return why
        }
    }

    var availableVersion: String? {
        if case .available(let v) = state { return v }
        return nil
    }
}
