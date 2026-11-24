# Layerhover

Figma 데스크톱 앱을 위한 macOS 메뉴 막대 도우미입니다. **Figma의 공식 제품이 아니며 Figma와 관련이 없습니다.**

- **패널 꺼내기** — 패널을 접어 둔 채(최소화 모드) 화면 왼쪽 끝에 마우스를 대면 펼치고, 벗어나면 다시 접습니다.
- **페이지 바로가기** — Figma 왼쪽 아래 페이지 버튼(이름을 누르면 찾기, ‹ › 로 앞뒤)으로 패널을 열지 않고 페이지를 옮깁니다.
- **작업 기록** — 이번 주 Figma 작업 시간을 파일·페이지별로 보여 줍니다. 이 Mac에만 저장합니다.
- **움직이는 메뉴 막대 아이콘** — 14가지(반가사유상, 파도, 목련, 향, 학, 풍경 …) 가운데 고르고, 원하면 지금 위치의 날씨(온도 포함)로 바꿔 보여 줍니다.
- **뽀모도로** — 메뉴 막대 패널의 뽀모도로 칸을 누르면 25분이 흐르고, 끝나면 소리와 알림으로 알려 줍니다.
- **메뉴 막대 아이콘 메뉴** — 아이콘을 누르면 패널이, 우클릭하면 일시정지·뽀모도로·페이지 찾기·작업 기록·설정·종료 메뉴가 열립니다.
- **Claude 작업 상태** — Claude가 Figma 파일을 고치는 동안 페이지 버튼에 표시합니다.

## 설치

```bash
brew install --cask kjh13242/layerhover/layerhover
```

Homebrew가 신뢰하지 않는 tap이라고 하면 `brew trust --cask kjh13242/layerhover/layerhover`를 먼저 실행하세요.

### 업데이트

1.6.1부터는 앱이 하루 한 번 새 버전을 확인해 스스로 업데이트합니다 (Figma를 쓰는 중이면 기다렸다가). 설정 > 정보에서 끄거나 바로 확인할 수 있습니다.
같은 인증서로 서명해 두어 업데이트해도 손쉬운 사용 권한이 그대로 남습니다. 1.6.0 이하에서는 `brew upgrade --cask layerhover`로 한 번만 직접 올려 주세요.

### 직접 받기

또는 [Releases](https://github.com/kjh13242/layerhover/releases)에서 `Layerhover.zip`을 받아 `Layerhover.app`을 응용 프로그램 폴더로 옮깁니다.

Apple 개발자 서명이 없는 앱이라 처음 열 때 "확인되지 않은 개발자" 경고가 뜰 수 있습니다.
시스템 설정 > 개인정보 보호 및 보안 아래쪽의 **그래도 열기**를 누르거나, 터미널에서 아래 한 줄을 실행하세요.

```bash
xattr -dr com.apple.quarantine /Applications/Layerhover.app
```

그다음 **손쉬운 사용** 권한을 켜 주세요(시스템 설정 > 개인정보 보호 및 보안 > 손쉬운 사용).
Figma 안의 접기·펼치기 버튼을 대신 누르는 데 필요합니다. 새 버전으로 바꾼 뒤에는 다시 켜야 할 수 있습니다.

자세한 사용법은 [INSTALL.txt](INSTALL.txt)에 있습니다.

## 권한과 개인정보

| 권한 | 언제 | 무엇에 |
|---|---|---|
| 손쉬운 사용 | 항상 | Figma 패널 접기·펼치기, 페이지 이동 |
| 위치 | "날씨"를 켠 동안만 | 지금 위치의 날씨 (약 1km 정밀도로 Open-Meteo 또는 wttr.in에 요청) |
| 알림 | 뽀모도로를 처음 켤 때 | 25분이 끝났다고 알리기 (허락하지 않아도 소리는 납니다) |
| 화면 기록 | 이미 허락해 둔 경우에만 (앱이 따로 요청하지 않음) | 페이지를 옮기는 순간 화면을 잠깐 덮기 (저장하지 않음) |

작업 기록과 설정은 이 Mac에만 저장되고, 날씨 요청과 새 버전 확인(GitHub) 말고는 밖으로 보내는 것이 없습니다.

## 요구 사항

macOS 13 이상, Figma 데스크톱 앱.

## 직접 빌드

```bash
./build.sh            # build/Layerhover.app, dist/Layerhover.zip
build/Layerhover.app/Contents/MacOS/Layerhover --self-test
```

Xcode 또는 Command Line Tools가 필요합니다. 메뉴 막대 아이콘 장면은 `tools/motion/`의 스크립트로 만들고
`tools/marks-tool.swift`(Figma에서 내보낸 장면)와 `tools/motion-lab.swift bake`(날씨 장면)로 `Resources/Marks`에 굽습니다.
