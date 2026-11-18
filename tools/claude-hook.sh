#!/bin/sh
# Claude Code 훅: Claude가 Figma 도구를 쓰는 동안 Layerhover 페이지 버튼에 "작업 중"을 띄운다.
# Claude Code가 훅 정보를 JSON으로 표준 입력에 넣어 준다. 상태만 파일에 남기고 아무것도 막지 않는다.
#   PreToolUse / PostToolUse (Figma 도구) → working
#   Stop / SubagentStop                    → idle
dir="$HOME/Library/Application Support/Layerhover"
mkdir -p "$dir"
input=$(cat)
field() { printf '%s' "$input" | /usr/bin/plutil -extract "$1" raw -o - - 2>/dev/null; }
event=$(field hook_event_name)
tool=$(field tool_name | tr -d '"\\')
case "$event" in
  PreToolUse|PostToolUse) state=working ;;
  *) state=idle ;;
esac
now=$(/bin/date +%s)
tmp="$dir/claude-status.json.tmp"
printf '{"state":"%s","tool":"%s","event":"%s","at":%s}\n' "$state" "$tool" "$event" "$now" > "$tmp"
mv -f "$tmp" "$dir/claude-status.json"
exit 0
