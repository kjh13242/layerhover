// 날씨 아이콘 8종 만들기: 공통 그림(구름·해)을 각 아이콘 파일에 넣어 tools/motion/icons/wx-*.js 로 쓴다.
// (아이콘 파일끼리는 코드를 나눠 쓸 수 없어서, 공통 부분을 파일마다 복사해 넣는다.)
//   node tools/motion/weather/gen.mjs
import { writeFileSync } from 'node:fs';
const DIR = new URL('../icons/', import.meta.url).pathname;

const KIT = String.raw`
var WX = (function () {
  // 구름: 바닥이 평평한 띠 + 둥근 봉우리 셋. (9, 11) 근처가 중심, 폭 약 12.6pt
  function cloud(fn) {
    return [rectPath(3.2, 10.2, 12.6, 4.0, 2.0), circlePath(6.6, 10.6, 2.9),
            circlePath(10.3, 8.9, 3.7), circlePath(13.3, 11.4, 2.5)].map(function (d) { return tp(d, fn); });
  }
  function inkAll(ps) { return ps.map(function (d) { return ink(d); }).join(''); }
  function frontAll(ps, gap) { return ps.map(function (d) { return cutAround(d, gap); }).join('') + ps.map(function (d) { return front(d); }).join(''); }
  // 해: 원판 + 둥근 끝 빛살 8개. 빛살은 천천히 돌고(45°마다 같은 모양이라 이음이 없다) 길이가 숨 쉬듯 변한다.
  function sun(t, cx, cy, r, r1, r2, turns) {
    var s = ink(circlePath(cx, cy, r));
    var spin = 45 * t * (turns || 1), breathe = 0.3 * loop(t, 2);
    for (var i = 0; i < 8; i++) {
      var a = (spin + i * 45) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
      var e = r2 + breathe * (i % 2 ? -1 : 1);
      s += ink(ribbon([[cx + c * r1, cy + sn * r1], [cx + c * e, cy + sn * e]], 1.15, { caps: ['round', 'round'] }));
    }
    return s;
  }
  // 위로 올린 구름 (비·눈·번개·안개 위에 얹는다)
  var HIGH = chain(scaleAt(9, 11, 0.86), move(0, -3.6));
  return { cloud: cloud, inkAll: inkAll, frontAll: frontAll, sun: sun, HIGH: HIGH };
})();
`;

const ICONS = {
  'wx-clear': `// 맑음: 해가 천천히 돌며 빛살이 숨 쉰다.
var ICON = { id: "wx-clear", frames: 48, at: function (t) {
  return WX.sun(t, 9, 9, 3.3, 4.8, 6.6, 1);
} };`,

  'wx-night': `// 맑은 밤: 초승달 옆에서 별 둘이 번갈아 반짝인다.
var ICON = { id: "wx-night", frames: 48, at: function (t) {
  var rock = rot(8.6, 9.4, 3 * loop(t, 1));
  var s = ink(circlePath(8.6, 9.4, 5.6), rock) + cut(circlePath(11.7, 6.4, 4.7), rock);
  var a = 0.55 + 0.45 * (0.5 + 0.5 * loop(t, 1, 0.25)), b = 0.55 + 0.45 * (0.5 + 0.5 * loop(t, 1, 0.75));
  s += front(sparkle(13.6, 4.4, 1.9 * a, { inner: 0.2 })) + front(sparkle(15.4, 9.6, 1.25 * b, { inner: 0.2 }));
  return s;
} };`,

  'wx-partly': `// 구름 조금: 해 앞으로 구름이 천천히 오간다.
var ICON = { id: "wx-partly", frames: 48, at: function (t) {
  var c = WX.cloud(chain(scaleAt(9, 11, 0.84), move(1.5 + 0.55 * loop(t, 1), 1.3)));
  return WX.sun(t, 6.4, 6.6, 2.5, 3.7, 5.0, 1) + WX.frontAll(c, 0.75);
} };`,

  'wx-cloudy': `// 흐림: 구름 둘이 서로 엇갈려 흘러간다.
var ICON = { id: "wx-cloudy", frames: 48, at: function (t) {
  var back = WX.cloud(chain(scaleAt(9, 11, 0.62), move(-2.4 + 0.7 * loop(t, 1), -4.2)));
  var fr = WX.cloud(chain(scaleAt(9, 11, 0.9), move(0.5 - 0.4 * loop(t, 1), 1.2)));
  return WX.inkAll(back) + WX.frontAll(fr, 0.75);
} };`,

  'wx-rain': `// 비: 구름 아래로 비스듬한 빗방울이 이어서 떨어진다.
var ICON = { id: "wx-rain", frames: 48, at: function (t) {
  var s = WX.inkAll(WX.cloud(WX.HIGH));
  var cols = [[6.2, 0.5], [9.4, 0.3], [12.6, 0.64]];
  for (var i = 0; i < cols.length; i++) {
    var p = wrap01(3 * t + cols[i][1]);          // 한 바퀴에 세 번 떨어진다 (이음 없음)
    var head = 10.4 + p * 8.2, tail = Math.max(10.9, head - 2.6);
    if (head - tail < 1.2) continue;
    var dx = -0.32;                                // 바람에 살짝 기운다
    var hx = cols[i][0] + dx * (head - 10.4), tx = cols[i][0] + dx * (tail - 10.4);
    s += ink(ribbon([[tx, tail], [hx, head]], function (u) { return 1.35 * Math.sqrt(u); }, { caps: ['flat', 'round'] }));
  }
  return s;
} };`,

  'wx-snow': `// 눈: 송이가 좌우로 흔들리며 천천히 내린다.
var ICON = { id: "wx-snow", frames: 48, at: function (t) {
  var s = WX.inkAll(WX.cloud(WX.HIGH));
  var cols = [[6.0, 0.12], [9.3, 0.4], [12.6, 0.24]];
  var n = 0;
  for (var i = 0; i < 3; i++) {
    for (var k = 0; k < 2; k++) {
      var p = wrap01(2 * t + cols[i][1] + k * 0.5);
      var y = 11.2 + p * 7.0;
      var x = cols[i][0] + 0.6 * Math.sin(TAU * (2 * t + cols[i][1] + k * 0.5) * 1 + i);
      var r = 0.8 * smooth(p / 0.12);
      if (r > 0.05) s += ink(circlePath(x, y, r));
    }
  }
  return s;
} };`,

  'wx-storm': `// 뇌우: 구름 아래 번개가 번쩍이고 사이사이 깜빡 꺼진다.
var ICON = { id: "wx-storm", frames: 48, at: function (t) {
  var s = WX.inkAll(WX.cloud(WX.HIGH));
  var off = (t > 0.36 && t < 0.52) || (t > 0.58 && t < 0.63) || (t > 0.86 && t < 0.96);
  if (!off) {
    var bolt = polyPath([[10.6, 8.6], [7.0, 13.4], [9.3, 13.4], [7.9, 17.3], [12.4, 11.6], [10.0, 11.6], [11.9, 8.6]], true);
    s += cutAround(bolt, 0.7) + front(bolt);
  }
  return s;
} };`,

  'wx-fog': `// 안개: 구름 아래로 안개 띠 둘이 천천히 미끄러진다.
var ICON = { id: "wx-fog", frames: 48, at: function (t) {
  var s = WX.inkAll(WX.cloud(chain(scaleAt(9, 11, 0.8), move(0, -3.8))));
  var a = 0.9 * loop(t, 1), b = 0.9 * loop(t, 1, 0.5);
  s += ink(rectPath(2.6 + a, 11.6, 10.0, 1.5, 0.75)) + ink(rectPath(5.6 + b, 14.6, 10.0, 1.5, 0.75));
  return s;
} };`,
};

for (const [id, body] of Object.entries(ICONS)) {
  writeFileSync(DIR + id + '.js', `// 날씨 아이콘 — tools/motion/weather/gen.mjs 가 만든 파일입니다. 그 파일을 고치고 다시 실행하세요.\n${KIT}\n${body}\n`);
}
console.log('wrote', Object.keys(ICONS).join(', '));
