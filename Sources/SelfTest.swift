// 자동 시험: `Layerhover --self-test` 로 돌린다 (화면과 권한이 필요 없다).
// 메뉴 막대 아이콘의 상태 판단(MarkRules)과 장면 읽기(MarkLibrary)를 기획안의 인수 기준에 맞춰 확인한다.

import AppKit

func runSelfTests() -> Bool {
    var passed = 0, failed = 0
    func check(_ name: String, _ ok: Bool) {
        if ok { passed += 1 } else { failed += 1; print("  실패: \(name)") }
    }
    typealias In = MarkRules.Inputs
    func base(_ sel: String = "incense", _ a: MarkRules.AssetState = .complete, _ d: MarkRules.AssetState = .complete) -> In {
        In(selected: sel, selectedAsset: a, defaultAsset: d)
    }

    print("상태 판단")
    check("동작 중이면 움직인다 (FR-007)", MarkRules.decide(base()) == .animate("incense"))
    var i = base(); i.animateSetting = false
    check("움직임을 끄면 장면 00 (FR-008)", MarkRules.decide(i) == .still("incense", dimmed: false))
    i = base(); i.reduceMotion = true
    check("동작 줄이기면 장면 00 (FR-009)", MarkRules.decide(i) == .still("incense", dimmed: false))
    i = base(); i.lowPower = true
    check("저전력 모드면 장면 00 (FR-010)", MarkRules.decide(i) == .still("incense", dimmed: false))
    i = base(); i.screenAwake = false
    check("화면이 꺼지면 넘기지 않는다 (FR-011)", MarkRules.decide(i) == .still("incense", dimmed: false))
    i = base(); i.paused = true
    check("일시 정지면 흐린 장면 00 (FR-012)", MarkRules.decide(i) == .still("incense", dimmed: true))
    i = base(); i.paused = true; i.animateSetting = false; i.reduceMotion = true
    check("일시 정지가 다른 멈춤 조건보다 먼저다", MarkRules.decide(i) == .still("incense", dimmed: true))
    i = base(); i.trusted = false
    check("권한이 없으면 흐린 장면 00 (FR-013)", MarkRules.decide(i) == .still("incense", dimmed: true))
    i = base(); i.trusted = false; i.selectedAsset = .missing
    check("권한이 없어도 못 읽는 아이콘은 기본 아이콘으로", MarkRules.decide(i) == .still("buddha", dimmed: true))
    check("고른 아이콘을 못 읽으면 기본 아이콘 (FR-015)", MarkRules.decide(base("incense", .missing, .complete)) == .animate("buddha"))
    check("기본 아이콘도 못 읽으면 대체 그림 (FR-016)", MarkRules.decide(base("incense", .missing, .missing)) == .fallback)
    check("일부 장면만 있으면 장면 00으로 멈춘다 (FR-017)", MarkRules.decide(base("cat", .stillOnly, .complete)) == .still("cat", dimmed: false))
    check("기본 아이콘이 일부만 있어도 장면 00", MarkRules.decide(base("incense", .missing, .stillOnly)) == .still("buddha", dimmed: false))
    // 모든 조합에서: 움직이는 것은 조건이 모두 맞을 때뿐이다
    var combos = 0, wrong = 0
    for bits in 0..<128 {
        var x = base()
        x.animateSetting = bits & 1 != 0; x.trusted = bits & 2 != 0; x.paused = bits & 4 != 0
        x.reduceMotion = bits & 8 != 0; x.lowPower = bits & 16 != 0; x.screenAwake = bits & 32 != 0
        x.selectedAsset = bits & 64 != 0 ? .complete : .stillOnly
        let should = x.animateSetting && x.trusted && !x.paused && !x.reduceMotion && !x.lowPower && x.screenAwake && x.selectedAsset == .complete
        let does: Bool = { if case .animate = MarkRules.decide(x) { return true }; return false }()
        combos += 1; if should != does { wrong += 1 }
    }
    check("128가지 조합에서 움직임 조건이 맞다 (틀림 \(wrong)/\(combos))", wrong == 0)

    print("장면 읽기")
    let lib = MarkLibrary.shared
    let expected = ["buddha", "wave", "surf", "fishing", "tree", "magnolia", "lotus", "pagoda", "incense", "crane", "cat", "leaf", "furin", "peek"]
    check("목록이 14개이고 순서가 기획안과 같다, 날씨는 고르기 칸에 없다 (FR-004)", lib.marks.map(\.id) == expected)
    for w in ["wx-clear", "wx-night", "wx-partly", "wx-cloudy", "wx-rain", "wx-snow", "wx-storm", "wx-fog"] {
        lib.weatherMark = w
        if case .complete(let f) = lib.asset(MarkLibrary.weatherID) { check("날씨 \(w): 장면 \(f.count)장", f.count == 48) }
        else { check("날씨 \(w): 장면을 읽는다", false) }
    }
    lib.weatherMark = "wx-partly"
    for (code, day, want) in [(0, true, "wx-clear"), (0, false, "wx-night"), (2, true, "wx-partly"), (3, true, "wx-cloudy"),
                              (45, true, "wx-fog"), (61, true, "wx-rain"), (81, false, "wx-rain"), (73, true, "wx-snow"), (95, true, "wx-storm")] {
        check("날씨 코드 \(code)\(day ? "" : " 밤") → \(want)", WeatherService.markID(code: code, isDay: day) == want)
    }
    for (code, day, want) in [(113, true, "wx-clear"), (113, false, "wx-night"), (116, true, "wx-partly"), (122, true, "wx-cloudy"),
                              (248, true, "wx-fog"), (296, true, "wx-rain"), (338, true, "wx-snow"), (389, true, "wx-storm")] {
        check("wttr 코드 \(code)\(day ? "" : " 밤") → \(want)", WeatherService.wwoMarkID(code: code, isDay: day) == want)
    }
    check("초당 8장면", lib.fps == 8)
    check("업데이트 버전 비교", Updater.isNewer("1.6.1", than: "1.6.0") && Updater.isNewer("1.10", than: "1.9.9")
          && !Updater.isNewer("1.6.0", than: "1.6.0") && !Updater.isNewer("1.5.9", than: "1.6"))
    check("이름이 한국어·영어 모두 있다 (NFR-008)", lib.marks.allSatisfy { !$0.ko.isEmpty && !$0.en.isEmpty })
    var bytes = 0
    for m in lib.marks {
        if case .complete(let frames) = lib.asset(m.id) {
            check("\(m.id): 장면 \(m.frames)장", frames.count == m.frames)
            check("\(m.id): 18pt 템플릿, 1배·2배 (NFR-004)", frames.allSatisfy { $0.isTemplate && $0.size == NSSize(width: 18, height: 18) && $0.representations.count == 2 })
            bytes = max(bytes, frames.count * (18 * 18 + 36 * 36) * 4)
        } else { check("\(m.id): 모든 장면을 읽는다", false) }
    }
    check("한 아이콘의 장면 메모리 4MB 이하 (NFR-002): \(bytes / 1024)KB", bytes <= 4 * 1024 * 1024)
    check("모르는 ID는 없다고 답한다 (FR-003)", !lib.contains("layers") && !lib.contains("moon") && lib.contains("buddha"))
    if let dir = lib.directory {
        let size = ((try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.fileSizeKey])) ?? [])
            .reduce(0) { $0 + ((try? $1.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) }
        check("장면 파일 전체 2MB 이하 (NFR-003): \(size / 1024)KB", size > 0 && size <= 2 * 1024 * 1024)

        // 파일 오류: 임시 폴더에 복사해 일부를 망가뜨린다
        let fm = FileManager.default
        let tmp = fm.temporaryDirectory.appendingPathComponent("layerhover-selftest-\(getpid())")
        defer { try? fm.removeItem(at: tmp) }
        func fresh() -> URL { try? fm.removeItem(at: tmp); try? fm.copyItem(at: dir, to: tmp); return tmp }

        var d = fresh()
        try? fm.removeItem(at: d.appendingPathComponent("incense.png"))
        var broken = MarkLibrary(directory: d)
        check("장면 파일이 없으면 missing (FR-015)", broken.asset("incense").state == .missing && broken.asset("buddha").state == .complete)

        d = fresh()
        // cat 의 1배 이미지를 12장면 길이로 자른다
        if let src = CGImageSourceCreateWithURL(d.appendingPathComponent("cat.png") as CFURL, nil),
           let img = CGImageSourceCreateImageAtIndex(src, 0, nil), let cut = img.cropping(to: CGRect(x: 0, y: 0, width: 12 * 18, height: 18)) {
            try? NSBitmapImageRep(cgImage: cut).representation(using: .png, properties: [:])?.write(to: d.appendingPathComponent("cat.png"))
        }
        broken = MarkLibrary(directory: d)
        check("장면이 모자라면 stillOnly (FR-017)", broken.asset("cat").state == .stillOnly && broken.asset("cat").still != nil)

        d = fresh()
        try? fm.removeItem(at: d.appendingPathComponent("leaf@2x.png"))
        broken = MarkLibrary(directory: d)
        check("2배 이미지만 없으면 1배로 움직인다", broken.asset("leaf").state == .complete)

        d = fresh()
        try? "{ broken".write(to: d.appendingPathComponent("manifest.json"), atomically: true, encoding: .utf8)
        broken = MarkLibrary(directory: d)
        check("목록이 깨지면 비어 있다 (FR-016)", !broken.isLoaded && broken.asset("buddha").state == .missing)

        broken = MarkLibrary(directory: tmp.appendingPathComponent("nope"))
        check("폴더가 없으면 비어 있다 (FR-016)", !broken.isLoaded)
        check("대체 그림이 있다", MarkLibrary.fallbackImage.isTemplate && broken.still("buddha") === MarkLibrary.fallbackImage)
    } else { check("장면 폴더를 찾는다", false) }

    print(failed == 0 ? "\n자동 시험 \(passed)개 모두 통과" : "\n자동 시험 실패 \(failed)개 (통과 \(passed)개)")
    return failed == 0
}
