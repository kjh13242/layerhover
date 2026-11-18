# 날씨 (Weather) — 8 scenes, one family

User: "실제 현재 위치 기반으로 날씨 표시해주면 좋겠어. 날씨 아이콘 혹은 온도+날씨로." → then "퀄리티 이전처럼 확보해봐, 이전에 아이콘 다듬었을 때처럼."
The menu bar shows the scene for the current weather, alone or followed by the temperature text (e.g. "☁ 12°"), so each
scene must read instantly at 18 pt next to system icons and next to SF text, and the 8 must look like one family.

Scenes (ids are fixed — the app maps WMO codes to them):
- wx-clear (sun), wx-night (clear night: moon + stars), wx-partly (sun partly behind cloud), wx-cloudy (overcast),
  wx-rain, wx-snow, wx-storm (thunder), wx-fog.

Source of truth: tools/motion/weather/gen.mjs. It holds a shared kit (WX: cloud, sun…) copied into every
tools/motion/icons/wx-*.js. Edit gen.mjs only, then `node tools/motion/weather/gen.mjs`. v1 backup: weather/gen.v1.mjs.

Quality bar = the rest of the set (buddha, wave, magnolia, incense, pagoda…): read STYLE.md. Craft, not clip-art:
- The cloud silhouette is the hero of 6 scenes: a confident, characterful, well-proportioned shape (bump rhythm,
  flat-ish base, no lumpy circles showing), optically centred, same visual weight as other set icons.
- Motion must be FELT but calm (8 fps loop, seamless, 32–64 frames). Frame 0 is the poster — the best still.
- Precipitation must read as rain / snow / lightning at real size (not dots that look like dirt, not blobs).
- Night must not be confused with a generic "dark mode" moon; partly must read as sun + cloud, not a blob.
- Consistent sun between clear and partly; consistent cloud between cloudy/rain/snow/storm/fog.
