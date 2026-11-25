// 자동 업데이트: GitHub 최신 릴리스를 하루 한 번 확인하고, 새 버전이면 받아서 바꿔 끼운 뒤 다시 시작한다.
//
// 안전장치
//  - 받은 앱은 지금 앱과 같은 인증서로 서명되어 있어야만 설치한다 (지금 앱의 designated requirement 로 검사).
//    그래서 임시(ad-hoc) 서명으로 빌드한 앱은 스스로 업데이트하지 않는다.
//  - 같은 인증서라 macOS가 같은 앱으로 알아봐 손쉬운 사용 권한이 그대로 남는다.
//  - Figma를 앞에 두고 쓰는 중이면 바꿔 끼우지 않고 기다린다.
//  - 바꿔 끼울 수 없는 자리(격리된 채 연 앱, 쓸 수 없는 폴더)면 받지 않고 그 까닭을 설정에 보인다.
//  - 바꿔 끼우다 실패하면 지금 앱을 그대로 되돌려 둔다 (지우지 않는다). 옛 버전으로 다시 켜졌으면
//    그 버전은 하루 동안 다시 자동 설치하지 않는다 (끝없이 다시 시작하지 않게).
//  - 확인에 실패하면 1시간 뒤에 다시 확인한다. 잠자기에서 깨어나면 확인할 때가 됐는지 본다.
//  - 보내는 것은 GitHub에 최신 릴리스를 묻는 요청뿐이다 (사용자 정보 없음).
//    GitHub API는 같은 IP에서 시간당 60번까지라 회사처럼 여럿이 한 IP를 쓰면 막힐 수 있다:
//    그러면 릴리스 페이지(github.com/…/releases/latest)가 넘겨 주는 주소에서 최신 버전을 읽는다.

import AppKit
import Security

struct UpdateFailure: Error { let why: String; init(_ w: String) { why = w } }

final class Updater {
    static let shared = Updater()

    /// LAYERHOVER_UPDATE_URL·LAYERHOVER_UPDATE_WEB 은 시험용 (로컬 서버로 업데이트 과정을 끝까지 돌려 볼 때).
    /// API 주소만 바꾸면 웹 주소로 넘어가지 않는다 (시험이 GitHub에 닿지 않게).
    private static let env = ProcessInfo.processInfo.environment
    static let latestURL = URL(string: env["LAYERHOVER_UPDATE_URL"] ?? "https://api.github.com/repos/kjh13242/layerhover/releases/latest")!
    static let webLatestURL: URL? = env["LAYERHOVER_UPDATE_WEB"].flatMap(URL.init(string:))
        ?? (env["LAYERHOVER_UPDATE_URL"] == nil ? URL(string: "https://github.com/kjh13242/layerhover/releases/latest") : nil)
    static let assetName = "Layerhover.zip"
    private static var testing: Bool { env["LAYERHOVER_UPDATE_URL"] != nil || env["LAYERHOVER_UPDATE_WEB"] != nil }

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
    /// 이번에 켜지기 직전에 스스로 업데이트해 이 버전이 됐으면 그 버전 (설정에 '…으로 업데이트했어요')
    private(set) var justUpdated: String?
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

    /// 앱이 켜지면 1분 뒤 한 번 확인한다. 그 뒤로는 1시간마다 살펴서 마지막 확인이 하루(실패했으면 1시간) 넘었으면 다시 확인한다.
    func start() {
        guard timer == nil else { return }
        noteRelaunchResult()
        DispatchQueue.main.asyncAfter(deadline: .now() + (Self.testing ? 3 : 60)) { [weak self] in self?.check() }
        timer = Timer.scheduledTimer(withTimeInterval: 3600, repeats: true) { [weak self] _ in self?.checkIfDue() }
        // 잠자기에서 깨어나면 (네트워크가 돌아올 때까지 잠깐 기다렸다가) 확인할 때가 됐는지 본다
        NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 30) { self?.checkIfDue() }
        }
    }

    private func checkIfDue() {
        let last = defaults.object(forKey: "updateLastCheck") as? Date ?? .distantPast
        var failed = false
        if case .failed = state { failed = true }
        if Date().timeIntervalSince(last) > (failed ? 3600 : 23 * 3600) - 60 { check() }
    }

    func check() {
        if case .installing = state { return }
        if state == .checking { return }
        state = .checking
        fetchFromAPI { [weak self] api in
            guard let self else { return }
            if let api { self.found(api.version, api.url); return }
            // API가 막혔으면(시간당 사용량 제한 등) 릴리스 페이지가 넘겨 주는 주소에서 버전을 읽는다
            guard let web = Self.webLatestURL else { self.checkFailed(); return }
            Self.fetchFromWeb(web) { r in
                if let r { log("update: latest \(r.version) via release page"); self.found(r.version, r.url) } else { self.checkFailed() }
            }
        }
    }

    private func checkFailed() {
        markChecked()
        state = .failed(L("업데이트를 확인하지 못했어요", "Couldn't check for updates"))
    }

    private func markChecked() {
        lastChecked = Date()
        defaults.set(Date(), forKey: "updateLastCheck")
    }

    /// 확인 결과: 최신 버전과 그 zip 주소 (최신 릴리스에 zip이 아직 없으면 nil)
    private func found(_ version: String, _ url: URL?) {
        markChecked()
        guard Self.isNewer(version, than: currentVersion), let url else { state = .upToDate; return }
        log("update: \(version) available")
        pending = (version, url)
        state = .available(version)
        if autoInstall {
            if recentlyFailed(version) {
                log("update: \(version) failed recently; waiting")
                state = .failed(L("업데이트를 설치하지 못했어요", "Couldn't install the update"))
                return
            }
            install(version, url)
        }
    }

    /// GitHub API로 최신 릴리스를 묻는다. 답이 릴리스가 아니면(사용량 제한 403, 서버 오류 등) nil
    private func fetchFromAPI(_ done: @escaping ((version: String, url: URL?)?) -> Void) {
        var req = URLRequest(url: Self.latestURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        req.setValue("Layerhover", forHTTPHeaderField: "User-Agent")
        URLSession.shared.dataTask(with: req) { data, response, error in
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            var result: (version: String, url: URL?)?
            if let json, let tag = json["tag_name"] as? String, let version = Self.version(fromTag: tag) {
                let assets = json["assets"] as? [[String: Any]] ?? []
                let s = assets.first(where: { ($0["name"] as? String) == Self.assetName })?["browser_download_url"] as? String
                result = (version, s.flatMap(URL.init(string:)))
            } else {
                log("update: api check failed http=\((response as? HTTPURLResponse)?.statusCode ?? 0) err=\(error.map { ($0 as NSError).code } ?? 0)")
            }
            DispatchQueue.main.async { done(result) }
        }.resume()
    }

    /// 릴리스 페이지 주소로 최신 버전을 알아낸다 (API 사용량 제한을 받지 않는다):
    /// …/releases/latest 는 …/releases/tag/v1.9.0 으로 넘어가고, zip은 …/releases/download/v1.9.0/Layerhover.zip 에 있다.
    static func fetchFromWeb(_ latest: URL, _ done: @escaping ((version: String, url: URL)?) -> Void) {
        var req = URLRequest(url: latest, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        req.httpMethod = "HEAD"
        req.setValue("Layerhover", forHTTPHeaderField: "User-Agent")
        URLSession.shared.dataTask(with: req) { _, response, error in
            var result: (version: String, url: URL)?
            if let final = response?.url, (response as? HTTPURLResponse)?.statusCode == 200 {
                result = releaseFromTagPage(final)
            }
            if result == nil { log("update: release page check failed http=\((response as? HTTPURLResponse)?.statusCode ?? 0) err=\(error.map { ($0 as NSError).code } ?? 0)") }
            DispatchQueue.main.async { done(result) }
        }.resume()
    }

    /// …/releases/tag/v1.9.0 → (1.9.0, …/releases/download/v1.9.0/Layerhover.zip)
    static func releaseFromTagPage(_ url: URL) -> (version: String, url: URL)? {
        let parts = url.pathComponents
        guard parts.count >= 3, parts[parts.count - 2] == "tag", let version = version(fromTag: parts[parts.count - 1]) else { return nil }
        let base = url.deletingLastPathComponent().deletingLastPathComponent()
        return (version, base.appendingPathComponent("download").appendingPathComponent(parts[parts.count - 1]).appendingPathComponent(assetName))
    }

    /// "v1.9.0" → "1.9.0". 숫자와 점이 아니면 nil
    static func version(fromTag tag: String) -> String? {
        let v = tag.hasPrefix("v") ? String(tag.dropFirst()) : tag
        guard !v.isEmpty, v.allSatisfy({ $0.isNumber || $0 == "." }), v.first?.isNumber == true else { return nil }
        return v
    }

    /// 바꿔 끼우기 직전에 적어 둔 버전이 있으면, 다시 켜진 지금 정말 그 버전이 됐는지 본다
    private func noteRelaunchResult() {
        guard let tried = defaults.dictionary(forKey: "updateTried"), let v = tried["version"] as? String else { return }
        defaults.removeObject(forKey: "updateTried")
        if Self.isNewer(v, than: currentVersion) {
            log("update: \(v) did not take; still \(currentVersion)")
            defaults.set(["version": v, "at": Date()], forKey: "updateFailed")
            state = .failed(L("업데이트를 설치하지 못했어요", "Couldn't install the update"))
        } else {
            log("update: now \(currentVersion)")
            justUpdated = currentVersion
            defaults.removeObject(forKey: "updateFailed")
        }
    }

    /// 이 버전으로 바꿔 끼우다 실패한 지 하루가 안 됐는지 (그동안은 저절로 다시 시도하지 않는다. '설치' 단추는 된다)
    private func recentlyFailed(_ version: String) -> Bool {
        guard let f = defaults.dictionary(forKey: "updateFailed"), f["version"] as? String == version,
              let at = f["at"] as? Date else { return false }
        return Date().timeIntervalSince(at) < 24 * 3600
    }

    /// 이 앱을 바꿔 끼울 수 없는 까닭 (없으면 nil)
    static func cannotReplaceReason() -> String? {
        let app = Bundle.main.bundleURL
        // 격리 표시가 남은 채 내려받은 자리에서 연 앱은 macOS가 읽기 전용 임시 자리에서 돌린다
        if app.path.contains("/AppTranslocation/") {
            return L("응용 프로그램 폴더로 옮기면 자동으로 업데이트돼요", "Move Layerhover to Applications to update automatically")
        }
        if !FileManager.default.isWritableFile(atPath: app.deletingLastPathComponent().path) {
            return L("이 폴더에는 업데이트를 쓸 수 없어요", "Can't write the update to this folder")
        }
        return nil
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
        if let why = Self.cannotReplaceReason() {
            log("update: cannot replace \(Bundle.main.bundleURL.path)")
            state = .failed(why)
            return
        }
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
                case .success(let app): self.replaceAndRelaunch(with: app, version: version)
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
    /// 지금 앱은 새 앱이 제자리에 들어간 뒤에만 지운다: 어느 단계에서 실패해도 지금 앱이 그대로 남아 다시 열린다.
    private func replaceAndRelaunch(with newApp: URL, version: String) {
        let target = Bundle.main.bundleURL.path
        defaults.set(["version": version, "at": Date()], forKey: "updateTried")
        let script = """
        while kill -0 "$1" 2>/dev/null; do sleep 0.2; done
        rm -rf "$2.old"
        if mv "$2" "$2.old"; then
          if mv "$3" "$2"; then rm -rf "$2.old"; else mv "$2.old" "$2"; fi
        fi
        xattr -dr com.apple.quarantine "$2" 2>/dev/null
        open "$2" --args --relaunch
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
            defaults.removeObject(forKey: "updateTried")
            state = .failed(L("업데이트를 설치하지 못했어요", "Couldn't install the update"))
        }
    }

    /// 설정·패널에 보여 줄 한 줄
    var statusLine: String {
        switch state {
        case .idle: return justUpdated.map { L("\($0)\(Self.ro($0)) 업데이트했어요", "Updated to \($0)") } ?? L("하루 한 번 새 버전을 확인해요", "Checks for a new version once a day")
        case .checking: return L("확인하는 중…", "Checking…")
        case .upToDate: return justUpdated.map { L("\($0)\(Self.ro($0)) 업데이트했어요", "Updated to \($0)") } ?? L("최신 버전이에요", "You're up to date")
        case .available(let v): return autoInstall ? L("\(v) 받는 중…", "Getting \(v)…") : L("새 버전 \(v)\(Self.iGa(v)) 있어요", "Version \(v) is available")
        case .installing(let v): return L("\(v) 설치하는 중… 곧 다시 시작해요", "Installing \(v)… restarting soon")
        case .failed(let why): return why
        }
    }

    /// 버전 뒤에 붙는 조사: 끝 숫자를 읽은 소리에 맞춘다 (0 영·3 삼·6 육은 받침 → '으로'·'이', 1 일·7 칠·8 팔은 ㄹ 받침 → '로'·'이')
    static func ro(_ v: String) -> String { "036".contains(v.last ?? "1") ? "으로" : "로" }
    static func iGa(_ v: String) -> String { "013678".contains(v.last ?? "2") ? "이" : "가" }

    /// 설정의 '설치' 단추에 쓸 새 버전: 받을 수 있는 새 버전이 있거나, 설치에 실패했지만 다시 해 볼 수 있을 때
    var availableVersion: String? {
        if case .available(let v) = state { return v }
        if case .failed = state, let p = pending, Self.cannotReplaceReason() == nil { return p.version }
        return nil
    }
}
