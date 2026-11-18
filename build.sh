#!/bin/bash
# Layerhover.app을 빌드하고 배포용 zip을 만든다. Xcode(또는 Command Line Tools)가 필요하다.
set -euo pipefail
cd "$(dirname "$0")"

APP="build/Layerhover.app"
rm -rf build dist
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" dist/Layerhover

# Apple Silicon과 Intel Mac 모두에서 돌아가는 유니버설 바이너리
for arch in arm64 x86_64; do
  swiftc -swift-version 5 -O -target "$arch-apple-macos13.0" Sources/*.swift -o "build/Layerhover-$arch"
done
lipo -create build/Layerhover-arm64 build/Layerhover-x86_64 -output "$APP/Contents/MacOS/Layerhover"

cp Info.plist "$APP/Contents/Info.plist"
# Claude Code 훅 스크립트 (Claude 작업 상태 표시용)
cp tools/claude-hook.sh "$APP/Contents/Resources/claude-hook.sh"
chmod +x "$APP/Contents/Resources/claude-hook.sh"
# 메뉴 막대 아이콘 장면 (Figma에서 내려받은 marks-src/frames.svg 를 tools/marks-tool.swift bake 로 구운 것)
cp -R Resources/Marks "$APP/Contents/Resources/Marks"
swift tools/make-icon.swift build/AppIcon.iconset
iconutil -c icns build/AppIcon.iconset -o "$APP/Contents/Resources/AppIcon.icns"

# Apple 개발자 인증서가 없으므로 임시(ad-hoc) 서명만 한다.
codesign --force --sign - "$APP"
codesign --verify --strict "$APP"

cp -R "$APP" dist/Layerhover/
cp INSTALL.txt "dist/Layerhover/설치 방법.txt"
(cd dist && ditto -c -k --norsrc --noextattr --keepParent Layerhover Layerhover.zip)  # ._ 파일 없이
echo "완료: dist/Layerhover.zip"
