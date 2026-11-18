// 향 (Incense) — variant B · elegance first.
// One calligraphic gesture: a slim boat on the ground, a fine stick rising from its heel, and a ribbon of smoke
// that leaves the ember as a hairline, broadens as it climbs, sways, curls and dissolves.

var ICON = (function () {
  var FRAMES = 64;

  // ── holder: a slender canoe (thin, as asked). Flat keel on y = 16, a long concave sheer, both ends lifted to
  //    fine points — the heel lower and shorter, the prow longer and higher ──
  var BOAT = 'M1.2 13.9' +
    'C2.9 14.33 4.8 14.47 7.5 14.47' +
    'C10.8 14.47 14 14.3 16.8 13.45' +
    'C15.9 15.2 14.2 16 11.6 16' +
    'L4.8 16' +
    'C3.1 16 1.8 15.2 1.2 13.9Z';

  // ── stick: seated in the heel at 33°, a slim rod tapering 1.3 → 1.08, a crisp burnt end (no dot; the corners
  //    only softened by 0.1). The burning end is told by the small gap before the smoke is born ──
  var ANG = 33 * Math.PI / 180, DIR = [Math.cos(ANG), -Math.sin(ANG)];
  var FOOT = [4.0, 15.2], LEN = 8.9;
  var TIP = [FOOT[0] + DIR[0] * LEN, FOOT[1] + DIR[1] * LEN];
  var STICK = (function () {
    var nx = DIR[1], ny = -DIR[0], w0 = 1.3, w1 = 1.08, r = 0.1;
    function P(d, side) { var w = lerp(w0, w1, d / LEN) / 2; return [FOOT[0] + DIR[0] * d + nx * w * side, FOOT[1] + DIR[1] * d + ny * w * side]; }
    var a = P(0, 1), b = P(LEN, 1), c = P(LEN, -1), dd = P(0, -1);
    var b1 = P(LEN - r, 1), bc = [b[0] - nx * r, b[1] - ny * r], c1 = [c[0] + nx * r, c[1] + ny * r], c2 = P(LEN - r, -1);
    return 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b1[0]) + ' ' + f(b1[1]) +
      'Q' + f(b[0]) + ' ' + f(b[1]) + ' ' + f(bc[0]) + ' ' + f(bc[1]) +
      'L' + f(c1[0]) + ' ' + f(c1[1]) +
      'Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c2[0]) + ' ' + f(c2[1]) +
      'L' + f(dd[0]) + ' ' + f(dd[1]) + 'Z';
  })();

  // ── smoke ──────────────────────────────────────────────────────────────────────────────────────
  var SRC = [TIP[0] + 0.1, TIP[1] - 0.6], TOPY = 1.0, H = SRC[1] - TOPY, N = 120;
  var PH = 2.1;   // phase of the travelling wave: chosen so that frame 0 is the poster

  // the plume's character through the loop (8 s): the poster's graceful S → calm, rising straighter and taller →
  // a breath of air: it leans, weaves more and divides into two threads → they drift and merge → settling back.
  // live = 0 calm … 1 lively; lean = the draft; lam = how long the thread rises straight before it weaves
  function mood(t) {
    var calm = bump(t, 0.1, 0.22, 0.3, 0.4), air = bump(t, 0.36, 0.5, 0.7, 0.88);
    var live = 0.45 - 0.35 * calm + 0.55 * air + 0.08 * noise(t, 3, 2);
    return {
      live: live,
      lean: -1.15 + 0.55 * calm - 0.4 * air + 0.15 * noise(t, 8, 2),
      amp: 1.3 + 0.6 * live,
      lam: 0.1 - 0.06 * live,
      aim: -(112 + 28 * live)   // where the rolled-over tip points: upward when calm, further over in the draft
    };
  }
  // centre line of a strand: a wave that travels up (3 per loop) over a slower, longer one (2 per loop)
  function spine(t, m, dx) {
    var P = [];
    for (var i = 0; i <= N; i++) {
      var u = i / N, g = smooth((u - m.lam) / 0.36) * (0.5 + 0.5 * u);
      var w = Math.sin(TAU * (0.8 * u - 3 * t) + PH) + 0.22 * Math.sin(TAU * (0.45 * u - 2 * t) + 2.0);
      P.push([SRC[0] + m.lean * Math.pow(u, 3) + m.amp * g * w + (dx ? dx(u) : 0), SRC[1] - H * u]);
    }
    return P;
  }
  function heading(P, i) { var a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); }
  // the tail rolls over: past u = uc the heading turns progressively until the tip points at `aim` (degrees,
  // -180 = left). Segment lengths are kept, so every frame ends in a real hook, never a spike
  function curl(P, uc, aim) {
    var ic = Math.round(uc * N), C = aim * Math.PI / 180 - heading(P, N), out = P.slice(0, ic + 1);
    for (var i = ic + 1; i <= N; i++) {
      var g = (i - ic) / (N - ic), a = heading(P, i) + C * Math.pow(g, 1.15);
      var L = dist(P[i - 1], P[i]), q = out[i - 1];
      out.push([q[0] + Math.cos(a) * L, q[1] + Math.sin(a) * L]);
    }
    return out;
  }
  function frames(P) {
    var F = [];
    for (var i = 0; i < P.length; i++) {
      var a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], c = P[i];
      var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, k = 0;
      if (i > 0 && i < P.length - 1) {
        var d = Math.atan2(b[1] - c[1], b[0] - c[0]) - Math.atan2(c[1] - a[1], c[0] - a[0]);
        while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        k = d / (tl / 2);
      }
      F.push({ p: c, n: [ty / tl, -tx / tl], k: k, u: i / (P.length - 1) });
    }
    var K = F.map(function (q) { return q.k; });
    for (i = 0; i < F.length; i++) {
      var s = 0, m = 0;
      for (var j = Math.max(0, i - 5); j <= Math.min(F.length - 1, i + 5); j++) { s += K[j]; m++; }
      F[i].k = s / m;
    }
    return F;
  }
  // a filled stroke between u0 and u1 of width wfn(u); the half width stays under ~85 % of the local bend radius
  function strand(F, wfn, u0, u1) {
    var Lp = [], Rp = [], i0 = Math.round(u0 * N), i1 = Math.round(u1 * N);
    for (var i = i0; i <= i1; i++) {
      var q = F[i], w = Math.max(0, wfn(q.u)) / 2, cap = 0.85 / Math.max(1e-6, Math.abs(q.k));
      w = w * cap / Math.pow(Math.pow(w, 4) + Math.pow(cap, 4), 0.25);
      Lp.push([q.p[0] + q.n[0] * w, q.p[1] + q.n[1] * w]);
      Rp.push([q.p[0] - q.n[0] * w, q.p[1] - q.n[1] * w]);
    }
    return polyPath(Lp.concat(Rp.reverse()), true);
  }

  // one silhouette for the whole plume: a hairline at the ember, slowly broadening as it climbs, a long taper
  function W(u) {
    var grow = 1.36 * Math.pow(smooth(u / 0.42), 0.75) + 0.14 * smooth((u - 0.42) / 0.3);
    return grow * Math.pow(1 - smooth((u - 0.6) / 0.4), 0.85);
  }
  // the dense lower thread is ink and thins away inside the grey, which keeps the same outline
  function inkW(u) { return W(u) * (1 - smooth((u - 0.46) / 0.24)); }

  // the second plume: the thread unzips from the top down — the fork travels down as the two threads part and
  // back up as they merge — so the gap between them is always a clean V, never a sliver
  var US = 0.1;   // the lowest the fork goes
  function split(t) { return bump(t, 0.38, 0.56, 0.6, 0.84, smoother); }

  return {
    id: 'incense',
    frames: FRAMES,
    at: function (t) {
      var m = mood(t), k = split(t);
      var uz = lerp(1.0, US, k);                                   // the fork
      var sep = function (u) { return smooth((u - uz) / 0.4); };   // 0 below the fork → 1 well above it
      var thinA = function (u) { return 1 - 0.28 * sep(u); };     // a divided plume shares its smoke
      var A = frames(curl(spine(t, m), 0.72, m.aim));
      var s = ink(BOAT) + ink(STICK) + ink(strand(A, function (u) { return inkW(u) * thinA(u); }, 0, 0.7));
      var f = fade(strand(A, function (u) { return W(u) * thinA(u); }, 0.36, 1));
      if (k > 0.002) {
        // below the fork the second thread lies inside the first, its outer edge on the first's outer edge; above
        // it, it peels away tangentially and rises beside the first with its own weave
        var WB = 0.72;
        var outer = function (u) { return u >= 0.36 ? W(u) : inkW(u); };
        var B = frames(curl(spine(t, m, function (u) {
          var weave = 1 + 0.17 * Math.sin(TAU * (0.75 * u - 3 * t) + 2.4) * smooth((u - US) / 0.5);
          return outer(u) * (thinA(u) - WB) / 2 + 1.75 * sep(u) * weave;
        }), 0.72, m.aim + 20 * smooth((0.75 - uz) / 0.3)));
        s += ink(strand(B, function (u) { return WB * inkW(u); }, US, 0.7));
        f += fade(strand(B, function (u) { return WB * W(u); }, Math.max(0.36, US), 1));
      }
      return s + f;
    }
  };
})();
