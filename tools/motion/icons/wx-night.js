// 날씨 아이콘 — tools/motion/weather/gen.mjs 가 만든 파일입니다. 그 파일을 고치고 다시 실행하세요.

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

// 맑은 밤: 가는 초승달(뿔 끝이 뾰족하게 빠진다)이 ±9° 흔들리고, 큰 별은 반짝 커지고 작은 별은 거의 꺼졌다 되살아난다.
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
} };
