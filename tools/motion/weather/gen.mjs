// 날씨 아이콘 8종 만들기: 공통 그림(구름·해)을 각 아이콘 파일에 넣어 tools/motion/icons/wx-*.js 로 쓴다.
// (아이콘 파일끼리는 코드를 나눠 쓸 수 없어서, 공통 부분을 파일마다 복사해 넣는다.)
//   node tools/motion/weather/gen.mjs
import { writeFileSync } from 'node:fs';
const DIR = new URL('../icons/', import.meta.url).pathname;

const KIT = String.raw`
var WX = (function () {
  // ── 구름 (hero) ─────────────────────────────────────────────────────────────────────────────
  // 봉우리 셋(작은 왼쪽 · 높은 가운데 돔 · 중간 오른쪽)과 납작한 바닥 띠를 부드럽게 합친 한 덩어리 윤곽.
  // 점 O 에서 사방으로 광선을 쏘아 각 봉우리(타원)와 바닥 캡슐에서 나가는 거리를 p-노름으로 합친다
  // → 봉우리 사이 골이 작은 반경으로 둥글게 메워져 '동그라미를 붙인' 티가 나지 않는다.
  // 기본 자리: 바닥 y 14.5, x 2–16, 돔 꼭대기 y ≈ 5.1. 장면에서는 바닥 중심 (9, 14.5) 기준으로 줄이고 옮긴다.
  function exitE(ox, oy, dx, dy, e) {
    var px = (ox - e[0]) / e[2], py = (oy - e[1]) / e[3], vx = dx / e[2], vy = dy / e[3];
    var a = vx * vx + vy * vy, b = 2 * (px * vx + py * vy), c = px * px + py * py - 1, D = b * b - 4 * a * c;
    if (D <= 0) return 0; var r = (-b + Math.sqrt(D)) / (2 * a); return r > 0 ? r : 0;
  }
  function blob(L, B, O, p, n) {
    var pts = [], h = (B[3] - B[2]) / 2, cy = B[2] + h;
    for (var i = 0; i < n; i++) {
      var a = TAU * i / n, dx = Math.cos(a), dy = Math.sin(a), sum = 0;
      for (var j = 0; j < L.length; j++) sum += Math.pow(exitE(O[0], O[1], dx, dy, L[j]), p);
      var tx = dx > 0 ? (B[1] - h - O[0]) / dx : dx < 0 ? (B[0] + h - O[0]) / dx : 1e9;
      var ty = dy > 0 ? (B[3] - O[1]) / dy : dy < 0 ? (B[2] - O[1]) / dy : 1e9;
      var rb = Math.max(Math.min(tx, ty), exitE(O[0], O[1], dx, dy, [B[0] + h, cy, h, h]), exitE(O[0], O[1], dx, dy, [B[1] - h, cy, h, h]));
      var hard = Math.max(rb, Math.pow(sum, 1 / p)), soft = Math.pow(sum + Math.pow(rb, p), 1 / p);
      var r = Math.min(soft, hard + 0.35);
      pts.push([O[0] + dx * r, O[1] + dy * r]);
    }
    return smoothPath(pts, true, 1);
  }
  var LOBES = [[5.0, 11.3, 2.6, 2.5], [9.0, 9.3, 4.0, 4.15], [13.3, 10.9, 2.75, 2.7]];
  var CLOUD = blob(LOBES, [2.0, 16.0, 11.4, 14.5], [9, 11.8], 14, 160);
  function cloud(fn) { return [tp(CLOUD, fn)]; }
  // 바닥 중심 (9, 14.5) 기준으로 k 배 줄이고 (dx, dy) 옮기는 변환
  function place(k, dx, dy) { return chain(scaleAt(9, 14.5, k), move(dx, dy)); }
  function inkAll(ps) { return ps.map(function (d) { return ink(d); }).join(''); }
  function frontAll(ps, gap) { return ps.map(function (d) { return cutAround(d, gap); }).join('') + ps.map(function (d) { return front(d); }).join(''); }

  // ── 해 ──────────────────────────────────────────────────────────────────────────────────────
  // 원판 + 쐐기 빛살 8개(뿌리는 반듯하고 굵게, 끝으로 가늘어지며 둥글게 맺는다). 빛살은 45°/바퀴로 돌아 이음이 없고,
  // 홀짝 빛살이 번갈아 길어졌다 짧아지며 숨 쉰다. o.hide = [a0, a1] (도) 이면 그 방향(구름 뒤)의
  // 빛살은 원판 안으로 미끄러져 숨는다 — 구름 가장자리에 자투리가 남지 않는다. o.glow 0..1 은 빛살 길이를 더한다. o.pulse 는 홀짝 빛살 숨쉬기 폭(기본 ±13 %).
  function sun(t, cx, cy, r, r1, r2, o) {
    o = o || {};
    var s = ink(circlePath(cx, cy, r)), spin = 45 * t * (o.turns === undefined ? 1 : o.turns), w = o.w || 1.85;
    for (var i = 0; i < 8; i++) {
      var a = spin + i * 45, k = 1;
      if (o.hide) {
        var m = ((a - o.hide[0]) % 360 + 360) % 360, span = o.hide[1] - o.hide[0], e = o.edge || 22;
        k = m < span ? 0 : Math.min(1, smooth((m - span) / e), smooth((360 - m) / e));
      }
      // 구름 쪽 빛살은 굵기를 지킨 채 원판 안으로 미끄러져 들어가 숨는다 (자투리·점이 남지 않는다)
      var L = (r2 - r1) * (1 + (o.pulse === undefined ? 0.13 : o.pulse) * loop(t, 2, i % 2 ? 0.5 : 0) + (o.glow || 0) * 0.22);
      var sink = (1 - k) * (r1 + L - r + 0.4), rr = r1 - sink;
      if (rr + L < r - 0.2) continue;
      var c = Math.cos(a * Math.PI / 180), sn = Math.sin(a * Math.PI / 180), x0 = cx + c * rr, y0 = cy + sn * rr;
      s += ink(ribbon([[x0, y0], [x0 + c * L, y0 + sn * L]], function (u) { return lerp(w, (o.tipk || 0.55) * w, u); }, { caps: ['flat', 'round'] }));
    }
    return s;
  }
  // 위로 올린 구름 (비·눈·번개·안개 위에 얹는다): 바닥 y ≈ 10.4, 꼭대기 ≈ 2.3
  var HIGH = chain(scaleAt(9, 11, 0.86), move(0, -3.6));
  return { cloud: cloud, place: place, inkAll: inkAll, frontAll: frontAll, sun: sun, HIGH: HIGH };
})();
`;

const ICONS = {
  'wx-clear': `// 맑음: 큰 원판 + 짧고 굵은 쐐기 빛살 8개. 6초에 빛살 두 칸(90°) 돌며 홀짝 빛살이 ±25 % 로 번갈아 길어졌다 짧아진다.
var ICON = { id: "wx-clear", frames: 48, at: function (t) {
  return WX.sun(t, 9, 9, 3.6, 4.75, 6.6, { turns: 2, pulse: 0.25 });
} };`,

  'wx-night': `// 맑은 밤: 가는 초승달(뿔 끝이 뾰족하게 빠진다)이 ±9° 흔들리고, 큰 별은 반짝 커지고 작은 별은 거의 꺼졌다 되살아난다.
var ICON = { id: "wx-night", frames: 48, at: function (t) {
  var rock = rot(8.2, 10.0, 9 * Math.sin(TAU * t));
  var s = ink(circlePath(8.2, 10.0, 6.0), rock) + cut(circlePath(11.2, 7.4, 5.2), rock);
  // 큰 별: 반짝 커지며 45° 돈다. 작은 별: 거의 꺼졌다가(15 %) 살짝 크게 되살아난다. 둘은 번갈아 온다.
  var g1 = bump(t, 0.12, 0.25, 0.25, 0.40, easeInOut);
  var dip = bump(t, 0.50, 0.60, 0.62, 0.70, easeInOut), g2 = bump(t, 0.66, 0.74, 0.74, 0.86, easeInOut);
  s += front(sparkle(13.8, 4.3, 2.2 * (1 + 0.42 * g1 - 0.15 * dip), { inner: 0.24, rot: 45 * g1 }));
  var k2 = 1 - 0.85 * dip + 0.1 * g2;
  if (k2 > 0.32) s += front(sparkle(15.2, 10.1, 1.6 * k2, { inner: 0.26, rot: -45 * (g2 + dip) }));
  return s;
} };`,

  'wx-partly': `// 구름 조금: 해는 오른쪽 위 제자리에서 돌고, 왼쪽 아래 구름이 ±1.3pt 오가며 해를 더 가렸다 드러낸다(드러나면 빛살이 길어진다).
// 해와 구름 사이는 1pt 틈으로 갈라 '구름 뒤로 해가 고개를 내민' 모양으로 읽힌다.
var ICON = { id: "wx-partly", frames: 48, at: function (t) {
  var d = Math.sin(TAU * t);                    // 장면 0 = 지금 자리. 오른쪽으로 1.3pt 밀려와 해를 덮고, 왼쪽으로 1.3pt 물러난다
  var c = WX.cloud(WX.place(0.74, -1.2 + 1.3 * d, 1.3));
  return WX.sun(t, 11.0, 7.0, 2.75, 3.85, 5.4, { hide: [80 - 35 * Math.max(0, d), 200], edge: 30, w: 1.5, turns: 2, pulse: 0.24,
    glow: 0.3 * Math.max(0, -d) - 0.2 * Math.max(0, d) }) + WX.frontAll(c, 1.0);
} };`,

  'wx-cloudy': `// 흐림: 작은 뒤 구름(오른쪽 위)과 앞 구름이 서로 반대로 천천히 흘러 엇갈린다. 둘 사이 0.9pt 틈.
var ICON = { id: "wx-cloudy", frames: 48, at: function (t) {
  var d = Math.sin(TAU * t);
  var back = WX.cloud(WX.place(0.58, 2.9 - 1.3 * d - 0.3 * (1 - Math.cos(TAU * t)), -5.6));   // 장면 0 자리 유지, 오른쪽 끝 ≤ 17
  var fr = WX.cloud(WX.place(0.78, -1.2 + 1.1 * d + 0.12 * (1 - Math.cos(TAU * t)), 0.6));
  return WX.inkAll(back) + WX.frontAll(fr, 0.9);
} };`,

  'wx-rain': `// 비: 비스듬한 빗줄기(꼬리는 가늘고 머리는 둥글다)가 구름 뒤에서 나와 일정한 박자로 떨어진다.
// 세 줄 × 두 방울, 한 바퀴에 네 번. 바닥(y 16.3)에 닿으면 머리는 멈추고 꼬리가 따라와 사라진다 — 잘리지 않는다.
var ICON = { id: "wx-rain", frames: 48, at: function (t) {
  var cl = WX.cloud(WX.HIGH), s = '';
  var cols = [[5.8, 0.0], [9.2, 0.36], [12.6, 0.7]], Y0 = 9.0, Y1 = 16.3, LEN = 3.6, SL = -0.34;
  for (var i = 0; i < 3; i++) {
    for (var k = 0; k < 2; k++) {
      var p = wrap01(4 * t + cols[i][1] + 0.5 * k), hd = Y0 + p * (Y1 - Y0 + LEN);
      var head = Math.min(hd, Y1), tail = Math.max(Y0, hd - LEN), len = head - tail;
      if (len < 0.15) continue;
      var wk = Math.min(1, len / 1.8), x0 = cols[i][0];
      var x = function (y) { return x0 + SL * (y - Y0); };
      s += ink(ribbon([[x(tail), tail], [x(head), head]], function (u) { return 1.15 * wk * Math.pow(u, 0.6); }, { caps: ['flat', 'round'] }));
    }
  }
  return s + WX.frontAll(cl, 0.8);
} };`,

  'wx-snow': `// 눈: 여섯 가지 송이(가지 가운데가 도톰하다) 셋이 구름 아래에서 피어나 좌우로 흔들리고 돌며 천천히 내린다.
function flake(x, y, r, deg) {
  var d = '';
  for (var j = 0; j < 3; j++) {
    var a = (deg + 60 * j) * Math.PI / 180, c = Math.cos(a) * r, sn = Math.sin(a) * r;
    d += ink(ribbon([[x - c, y - sn], [x, y], [x + c, y + sn]], function (u) { return 0.8 + 0.25 * Math.sin(Math.PI * u); }, { caps: ['round', 'round'] }));
  }
  return d;
}
var ICON = { id: "wx-snow", frames: 48, at: function (t) {
  var cl = WX.cloud(WX.HIGH), s = '';
  var F = [[5.4, 0.15], [9.2, 0.82], [12.9, 0.48]];
  for (var i = 0; i < F.length; i++) {
    var ph = 3 * t + F[i][1], p = wrap01(ph), y = 11.7 + p * 4.4;
    var sc = smooth((y - 11.5) / 1.1) * smooth((15.9 - y) / 1.0);
    if (sc < 0.1) continue;
    var x = F[i][0] + 0.9 * Math.sin(TAU * ph + i * 2);
    s += flake(x, y, 1.4 * sc, 90 + 120 * p + i * 20);
  }
  return s + WX.frontAll(cl, 0.8);
} };`,

  'wx-storm': `// 뇌우: 굵은 번개가 구름 앞에 0.8pt 틈을 두고 걸려 있다(장면 0). 2초쯤 지나 0.5초 꺼졌다가, 위에서 아래로 내리꽂히며
// 다시 치고(구름이 움찔 흔들린다), 한 번 흐릿하게 깜빡인 뒤 자리를 잡는다. 1.5초 뒤 한 장면 꺼지는 여운. 번쩍거림은 없다.
var ICON = { id: "wx-storm", frames: 48, at: function (t) {
  var i = Math.round(t * 48) % 48;
  // 0–17 켜짐 · 18–21 꺼짐(숨 고르기) · 22–23 내리꽂힘 + 구름이 움찔 흔들림 · 25 흐릿 · 26– 켜짐 · 38 한 장면 꺼짐(여운)
  var shake = [0, 0, 0, 0, 0.7, -0.55, 0.4, -0.25, 0.12][i - 18] || 0;
  var s = WX.inkAll(WX.cloud(chain(WX.HIGH, move(shake, 0))));
  var BOLT = polyPath([[10.7, 7.4], [6.6, 12.9], [9.1, 12.9], [7.5, 16.6], [12.7, 10.9], [10.2, 10.9], [12.5, 7.4]], true);
  if ((i >= 18 && i <= 21) || i === 38) return s;
  var grow = i === 22 ? 0.45 : i === 23 ? 0.8 : 1;
  var b = tp(BOLT, chain(scaleAt(11.6, 7.4, 1, grow), move(shake, 0)));
  if (i === 25) return s + cutAround(b, 0.8) + fade(b);
  return s + cutAround(b, 0.8) + front(b);
} };`,

  'wx-fog': `// 안개: 구름 아래로 끝이 가늘게 풀리는 안개 띠 둘이 서로 반대로 천천히 미끄러진다.
var ICON = { id: "wx-fog", frames: 48, at: function (t) {
  var s = WX.inkAll(WX.cloud(WX.HIGH));
  function band(x0, x1, y) {
    return ink(ribbon([[x0, y], [(x0 + x1) / 2, y], [x1, y]], function (u) { return 1.25 * Math.pow(Math.min(1, Math.sin(Math.PI * u) * 2.2), 0.6); }, { caps: ['round', 'round'] }));
  }
  var a = 1.5 * Math.sin(TAU * t), b = 1.5 * Math.sin(TAU * t + 2.4) - 0.5 * Math.sin(2.4);   // 장면 0 자리 유지
  return s + band(2.6 + a, 12.6 + a, 12.7) + band(5.6 + b, 15.2 + b, 15.2);
} };`,
};

for (const [id, body] of Object.entries(ICONS)) {
  writeFileSync(DIR + id + '.js', `// 날씨 아이콘 — tools/motion/weather/gen.mjs 가 만든 파일입니다. 그 파일을 고치고 다시 실행하세요.\n${KIT}\n${body}\n`);
}
console.log('wrote', Object.keys(ICONS).join(', '));
