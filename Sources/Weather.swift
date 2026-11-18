// 메뉴 막대 "날씨" 아이콘: 지금 위치의 날씨를 받아 맞는 장면(wx-*)과 온도를 알려 준다.
//
// 위치 권한은 "날씨" 아이콘을 고를 때만 묻는다. 다른 아이콘으로 바꾸면 위치를 더 묻지 않고,
// 받아 둔 위치와 날씨도 지운다 (macOS 권한 자체는 앱이 끌 수 없어서, 시스템 설정에서 끌 수 있다고 안내한다).
// 날씨는 Open-Meteo(열쇠 없이 쓰는 공개 날씨 API)에서 30분마다 받는다. 회사망 등에서 Open-Meteo가 막혀 있으면
// wttr.in 에서 받는다 (마지막으로 된 쪽을 먼저 쓴다). 보내는 것은 소수 둘째 자리(약 1km)로
// 줄인 위도·경도뿐이다. 위치와 날씨는 메모리에만 두고 파일로 남기지 않는다.

import AppKit
import CoreLocation

final class WeatherService: NSObject, CLLocationManagerDelegate {
    static let shared = WeatherService()

    enum State: Equatable {
        case off            // 날씨 아이콘을 쓰지 않음
        case asking         // 위치 권한을 묻는 중
        case denied         // 위치 권한이 꺼져 있음
        case loading        // 위치·날씨를 받는 중 (아직 값 없음)
        case ready          // 값이 있음
        case failed         // 받지 못함 (값 없음)
    }

    private(set) var state: State = .off
    private(set) var mark = "wx-partly"
    private(set) var temperature: Int?
    private(set) var conditionName = ""
    private(set) var updatedAt: Date?
    var onChange: (() -> Void)?

    private var manager: CLLocationManager?
    private var timer: Timer?
    private var coordinate: CLLocationCoordinate2D?
    private var task: URLSessionDataTask?
    private var wakeObserver: NSObjectProtocol?
    private let interval: TimeInterval = 30 * 60
    private var preferWttr = false        // Open-Meteo가 안 되던 곳이면 wttr.in 부터

    var running: Bool { manager != nil }

    /// 날씨 아이콘을 골랐을 때. 처음이면 위치 권한을 묻는다.
    func start() {
        guard manager == nil else { return }
        let m = CLLocationManager()
        m.delegate = self
        m.desiredAccuracy = kCLLocationAccuracyKilometer   // 동네 수준이면 충분하다
        manager = m
        timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in self?.refresh() }
        wakeObserver = NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in
            self?.refresh(ifOlderThan: 10 * 60)
        }
        checkAuthorization()
    }

    /// 다른 아이콘으로 바꿨을 때. 위치를 더 묻지 않고, 받아 둔 값을 지운다.
    func stop() {
        guard manager != nil else { return }
        timer?.invalidate(); timer = nil
        task?.cancel(); task = nil
        manager?.delegate = nil; manager = nil
        if let o = wakeObserver { NSWorkspace.shared.notificationCenter.removeObserver(o); wakeObserver = nil }
        coordinate = nil; temperature = nil; updatedAt = nil; conditionName = ""
        mark = "wx-partly"
        set(.off)
    }

    func refresh(ifOlderThan age: TimeInterval = 0) {
        guard let manager, state != .denied, state != .asking else { return }
        if let u = updatedAt, Date().timeIntervalSince(u) < age { return }
        if temperature == nil { set(.loading) }
        manager.requestLocation()
    }

    private func checkAuthorization() {
        guard let manager else { return }
        switch manager.authorizationStatus {
        case .notDetermined:
            set(.asking)
            manager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            set(.denied)
        default:
            if state == .asking || state == .denied || state == .off { set(.loading) }
            refresh()
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) { checkAuthorization() }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let c = locations.last?.coordinate else { return }
        coordinate = c
        fetch(c)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // 위치를 못 받아도 예전 위치가 있으면 그 자리의 날씨를 다시 받는다
        if let c = coordinate { fetch(c); return }
        if (error as? CLError)?.code == .denied { set(.denied); return }
        log("weather: location failed \((error as NSError).code)")
        if temperature == nil { set(.failed) }
    }

    private struct Reading { let temp: Double; let mark: String }
    private enum Source { case openMeteo, wttr }

    private func fetch(_ c: CLLocationCoordinate2D) {
        task?.cancel()
        let order: [Source] = preferWttr ? [.wttr, .openMeteo] : [.openMeteo, .wttr]
        attempt(order, c)
    }

    private func attempt(_ sources: [Source], _ c: CLLocationCoordinate2D) {
        guard let source = sources.first else {
            log("weather: fetch failed")
            if temperature == nil { set(.failed) }
            return
        }
        let lat = String(format: "%.2f", c.latitude), lon = String(format: "%.2f", c.longitude)
        let fahrenheit = Locale.current.measurementSystem == .us
        let urlString: String
        switch source {
        case .openMeteo:
            urlString = "https://api.open-meteo.com/v1/forecast?latitude=\(lat)&longitude=\(lon)&current=temperature_2m,weather_code,is_day&temperature_unit=\(fahrenheit ? "fahrenheit" : "celsius")&timezone=auto"
        case .wttr:
            urlString = "https://wttr.in/\(lat),\(lon)?format=j1"
        }
        guard let url = URL(string: urlString) else { return }
        var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
        req.setValue("Layerhover", forHTTPHeaderField: "User-Agent")
        task = URLSession.shared.dataTask(with: req) { [weak self] data, _, error in
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            let reading = json.flatMap { source == .openMeteo ? WeatherService.parseOpenMeteo($0) : WeatherService.parseWttr($0, fahrenheit: fahrenheit) }
            DispatchQueue.main.async {
                guard let self, self.manager != nil else { return }
                if (error as NSError?)?.code == NSURLErrorCancelled { return }
                guard let reading else {
                    log("weather: \(source) failed")
                    self.attempt(Array(sources.dropFirst()), c)
                    return
                }
                self.preferWttr = source == .wttr
                self.temperature = Int(reading.temp.rounded())
                self.mark = reading.mark
                self.conditionName = WeatherService.name(of: reading.mark)
                self.updatedAt = Date()
                self.set(.ready, force: true)
            }
        }
        task?.resume()
    }

    private static func parseOpenMeteo(_ j: [String: Any]) -> Reading? {
        guard let cur = j["current"] as? [String: Any], let temp = (cur["temperature_2m"] as? NSNumber)?.doubleValue,
              let code = (cur["weather_code"] as? NSNumber)?.intValue else { return nil }
        let day = ((cur["is_day"] as? NSNumber)?.intValue ?? 1) == 1
        return Reading(temp: temp, mark: markID(code: code, isDay: day))
    }

    private static func parseWttr(_ j: [String: Any], fahrenheit: Bool) -> Reading? {
        guard let cur = (j["current_condition"] as? [[String: Any]])?.first,
              let temp = Double((cur[fahrenheit ? "temp_F" : "temp_C"] as? String) ?? ""),
              let code = Int((cur["weatherCode"] as? String) ?? "") else { return nil }
        // 해가 떠 있는지: 오늘의 해 뜨는·지는 시각(그 지역 시각, 예: "07:15 AM")과 이 Mac의 지금 시각을 견준다
        // (지금 위치의 날씨이므로 Mac의 시간대가 곧 그 지역 시간대다)
        var day = true
        if let astro = ((j["weather"] as? [[String: Any]])?.first?["astronomy"] as? [[String: Any]])?.first,
           let rise = minutes(astro["sunrise"] as? String), let setT = minutes(astro["sunset"] as? String) {
            let c = Calendar.current.dateComponents([.hour, .minute], from: Date())
            let now = (c.hour ?? 12) * 60 + (c.minute ?? 0)
            day = now >= rise && now < setT
        }
        return Reading(temp: temp, mark: wwoMarkID(code: code, isDay: day))
    }

    private static func minutes(_ s: String?) -> Int? {
        guard let s else { return nil }
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "hh:mm a"
        guard let d = f.date(from: s.trimmingCharacters(in: .whitespaces)) else { return nil }
        let c = Calendar(identifier: .gregorian).dateComponents([.hour, .minute], from: d)
        return (c.hour ?? 0) * 60 + (c.minute ?? 0)
    }

    /// wttr.in(World Weather Online) 날씨 코드 → 장면
    static func wwoMarkID(code: Int, isDay: Bool) -> String {
        switch code {
        case 113: return isDay ? "wx-clear" : "wx-night"
        case 116: return "wx-partly"
        case 119, 122: return "wx-cloudy"
        case 143, 248, 260: return "wx-fog"
        case 200, 386, 389, 392, 395: return "wx-storm"
        case 179, 227, 230, 323...338, 368, 371, 374, 377: return "wx-snow"
        case 176, 182, 185, 263...317, 350...365: return "wx-rain"
        default: return "wx-cloudy"
        }
    }

    private func set(_ s: State, force: Bool = false) {
        guard force || s != state else { return }
        state = s
        onChange?()
    }

    /// WMO 날씨 코드 → 장면
    static func markID(code: Int, isDay: Bool) -> String {
        switch code {
        case 0, 1: return isDay ? "wx-clear" : "wx-night"
        case 2: return "wx-partly"
        case 3: return "wx-cloudy"
        case 45, 48: return "wx-fog"
        case 51...67, 80...82: return "wx-rain"
        case 71...77, 85, 86: return "wx-snow"
        case 95...99: return "wx-storm"
        default: return "wx-cloudy"
        }
    }

    static func name(of mark: String) -> String {
        switch mark {
        case "wx-clear": return L("맑음", "Clear")
        case "wx-night": return L("맑은 밤", "Clear night")
        case "wx-partly": return L("구름 조금", "Partly cloudy")
        case "wx-cloudy": return L("흐림", "Cloudy")
        case "wx-fog": return L("안개", "Fog")
        case "wx-rain": return L("비", "Rain")
        case "wx-snow": return L("눈", "Snow")
        case "wx-storm": return L("뇌우", "Thunderstorm")
        default: return ""
        }
    }

    /// 패널에 보여 줄 한 줄
    var statusLine: String {
        switch state {
        case .off: return ""
        case .asking: return L("위치 권한을 허락하면 지금 날씨를 보여 줘요", "Allow location access to show the weather")
        case .denied: return L("위치 권한이 꺼져 있어요", "Location access is off")
        case .loading: return L("날씨를 받는 중…", "Getting the weather…")
        case .failed: return L("날씨를 받지 못했어요. 30분 뒤 다시 시도해요", "Couldn't get the weather. Retrying in 30 min")
        case .ready:
            let t = temperature.map { "\($0)°" } ?? ""
            let time = updatedAt.map { DateFormatter.localizedString(from: $0, dateStyle: .none, timeStyle: .short) } ?? ""
            return "\(t) \(conditionName) · " + L("\(time)에 받음", "updated \(time)")
        }
    }
}
