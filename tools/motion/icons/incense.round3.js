// 향 (Incense) — final (from variant B).
// A slim boat-shaped holder on the ground, one stick planted behind its near rim, and a calligraphic ribbon of smoke:
// born as a fine point above the ember, broadening as it climbs, its dense black core turning over like a ribbon into
// a grey wisp that dissolves upward. Usually one plume; once a loop a breath of air divides it in two for about two
// seconds, then the threads zip back together.

var ICON = (function () {
  var FRAMES = 64;

  // ── holder: a slim asymmetric crescent (thin, as asked). Flat keel on y = 16, a long concave sheer 1.25 pt above it
  //    at its lowest, both ends lifted to fine points — the heel shorter and lower, the prow longer and higher ──
  var BOAT = 'M1.2 13.85' +
    'C2.7 14.3 4.6 14.5 7.3 14.5' +
    'C10.6 14.5 13.9 14.25 16.8 13.4' +
    'C15.95 15.3 14.3 16 11.6 16' +
    'L4.8 16' +
    'C3 16 1.7 15.2 1.2 13.85Z';

  // ── stick: planted behind the near rim at 33°, tapering 1.4 → 1.15, a crisp burnt end (corners softened by 0.1,
  //    no dot). Its foot runs down behind the hull, which sits in front with a clean 0.7 gap ──
  var ANG = 24 * Math.PI / 180, DIR = [Math.cos(ANG), -Math.sin(ANG)];
  var FOOT = [2.7, 15.35], LEN = 9.9;
  var TIP = [FOOT[0] + DIR[0] * LEN, FOOT[1] + DIR[1] * LEN];
  var STICK = (function () {
    var nx = DIR[1], ny = -DIR[0], w0 = 1.85, w1 = 1.5, r = 0.1;
    function P(d, side) { var w = lerp(w0, w1, d / LEN) / 2; return [FOOT[0] + DIR[0] * d + nx * w * side, FOOT[1] + DIR[1] * d + ny * w * side]; }
    var a = P(0, 1), b = P(LEN, 1), c = P(LEN, -1), dd = P(0, -1);
    var b1 = P(LEN - r, 1), bc = [b[0] - nx * r, b[1] - ny * r], c1 = [c[0] + nx * r, c[1] + ny * r], c2 = P(LEN - r, -1);
    return 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b1[0]) + ' ' + f(b1[1]) +
      'Q' + f(b[0]) + ' ' + f(b[1]) + ' ' + f(bc[0]) + ' ' + f(bc[1]) +
      'L' + f(c1[0]) + ' ' + f(c1[1]) +
      'Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c2[0]) + ' ' + f(c2[1]) +
      'L' + f(dd[0]) + ' ' + f(dd[1]) + 'Z';
  })();

  // ── smoke: one calligraphic ribbon born ~1 pt thick at the burnt end, swelling into a broad S, thinning to nothing.
  //    Solid ink low down, handing off to a grey wisp only near the top. Its centre line is two travelling waves of
  //    different length and speed whose amplitudes drift on looping noise, so the rising shape never repeats exactly ──
  var SRC = [TIP[0] + DIR[0] * 0.55 + 0.05, TIP[1] + DIR[1] * 0.55 - 0.15];
  var TOPY = 1.1, N = 120, L = 14.5;   // the ribbon's length along its own curve (pt)

  function drift(t, seed, amp) { return amp * (noise(t, seed, 2) - noise(0, seed, 2)); }
  // the plume's character through the loop (8 s): the poster's broad S → a still moment, a tall quiet thread →
  // a breath of air: it sways wider and divides into two for a while → they merge → settling back
  function mood(t) {
    var calm = bump(t, 0.1, 0.2, 0.3, 0.4), air = bump(t, 0.36, 0.5, 0.7, 0.88);
    return {
      t: t, calm: calm,
      a1: 1.3 * (1 - 0.3 * calm + 0.2 * air) + drift(t, 3, 0.15),     // the long sway (heading swing, rad)
      a2: 0.28 * (1 - 0.5 * calm + 0.4 * air) + drift(t, 6, 0.1),        // a shorter ripple riding on it
      bias: -0.22 + 0.1 * calm + drift(t, 8, 0.2),                                   // a slow turn to the left as it climbs
      lam: 0.5 + 1.8 * calm,                                            // the straight laminar rise (pt)
      slim: 1 - 0.2 * calm
    };
  }
  // curvature along the ribbon at arc length sl: two travelling waves of different length and speed
  // heading (rad from straight up) at arc length sl: two travelling waves of different length and speed, growing as
  // the smoke climbs (laminar → turbulent), plus a slow lean
  function heading(sl, m, lag) {
    var u = sl / L, e = smooth((sl - m.lam) / 2.2) * (0.75 + 0.4 * u);
    var h = e * (m.a1 * Math.sin(TAU * (sl / 11 - 2 * m.t - lag) + 4.0) + m.a2 * Math.sin(TAU * (sl / 6 - 3 * m.t - 1.4 * lag) + 2.6)) + m.bias * smooth(u / 0.8);
    return h;
  }
  // integrate a centre line from point p0 with heading th0, from arc length s0 to L, N + 1 samples indexed by u = s / L
  function trace(P, i0, dth, m, lag) {
    var ds = L / N, p = P[i0];
    for (var i = i0 + 1; i <= N; i++) {
      var sl = (i - 0.5) * ds, hh = heading(sl, m, lag), th = -Math.PI / 2 + 0.9 * Math.tanh(hh / 0.9) + (dth ? dth(sl) : 0);
      p = [p[0] + Math.cos(th) * ds, p[1] + Math.sin(th) * ds];
      P[i] = p;
    }
    return P;
  }
  function W(u, m) {
    var swell = smooth(u / 0.4);
    var ripple = 1 + 0.22 * Math.sin(TAU * (1.5 * u - 2 * m.t) + 0.9) * smooth(u / 0.25);
    var w = lerp(1.0, 2.7 * m.slim, swell) * ripple;
    return w * Math.pow(1 - smooth((u - 0.5) / 0.5), 1.25);
  }
  function hand(u, u0, len) { return Math.pow(1 - smooth((u - u0) / len), 1.3); }
  // a broad nib held at NIB: strokes travelling along it are thin, strokes across it full — calligraphic thick-thin
  var NIB = -128 * Math.PI / 180;
  function nib(q) { var th = Math.atan2(q.n[0], -q.n[1]); return 0.62 + 0.38 * Math.abs(Math.sin(th - NIB)); }
  function plume(F, wfn0, uA, uB, ink0, inkLen) {
    var wfn = function (q) { return wfn0(q.u) * lerp(1, nib(q), smooth(q.u / 0.15)); };
    var grey = band(F, function (q) { var h = capHalf(wfn(q) / 2, q.k); return [h, -h]; }, uA, uB);
    var core = band(F, function (q) {
      var h = capHalf(wfn(q) / 2, q.k), r = hand(q.u, ink0, inkLen);
      return [h, Math.max(-h, h - 2 * h * r)];
    }, uA, Math.min(uB, ink0 + inkLen));
    return { grey: grey, core: core };
  }
  function relax(P, rmin) {
    var dy = H / N, n = P.length, x = P.map(function (p) { return p[0]; });
    for (var it = 0; it < 120; it++) {
      var moved = false, nx = x.slice();
      for (var i = 1; i < n - 1; i++) {
        var lap = x[i - 1] - 2 * x[i] + x[i + 1], d1 = (x[i + 1] - x[i - 1]) / (2 * dy);
        var c = Math.abs(lap) / (dy * dy) / Math.pow(1 + d1 * d1, 1.5), w = smooth((c * rmin - 0.85) / 0.3);
        if (w > 0.002) { nx[i] += 0.3 * w * lap; moved = true; }
      }
      x = nx;
      if (!moved) break;
    }
    for (var p = 0; p < 4; p++) { var y = x.slice(); for (i = 1; i < n - 1; i++) y[i] = (x[i - 1] + 2 * x[i] + x[i + 1]) / 4; x = y; }
    return P.map(function (q, j) { return [x[j], q[1]]; });
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
  // half width kept under ~85 % of the local bend radius, so an inner edge never folds
  function capHalf(h, k) { var cap = 0.72 / Math.max(1e-6, Math.abs(k)); return h * cap / Math.pow(Math.pow(h, 4) + Math.pow(cap, 4), 0.25); }
  // a band between u0 and u1 whose two edges sit at edges(q) = [left, right] along the normal
  function band(F, edges, u0, u1) {
    var Lp = [], Rp = [], i0 = Math.round(u0 * N), i1 = Math.round(u1 * N);
    for (var i = i0; i <= i1; i++) {
      var q = F[i], e = edges(q);
      Lp.push([q.p[0] + q.n[0] * e[0], q.p[1] + q.n[1] * e[0]]);
      Rp.push([q.p[0] + q.n[0] * e[1], q.p[1] + q.n[1] * e[1]]);
    }
    return polyPath(Lp.concat(Rp.reverse()), true);
  }

  // keep the centre lines inside the live area with a soft wall (no visible flat)
  function soft(x) {
    var lo = 2.4, hi = 15.4, s = 0.8;
    if (x > hi - s) x = hi - s + s * Math.tanh((x - hi + s) / s);
    if (x < lo + s) x = lo + s - s * Math.tanh((lo + s - x) / s);
    return x;
  }
  function split(t) { return bump(t, 0.42, 0.54, 0.66, 0.78, smoother); }

  function smoke(t) {
    var m = mood(t), k = split(t);
    var open = smoother(k);
    m.a1 *= 1 - 0.5 * open; m.a2 *= 1 - 0.4 * open;   // while divided, both threads rise calmer, as a clear V
    iz = Math.round(N * lerp(0.42, 0.26, open)), ub = lerp(0.74, 0.88, open);
    var WA = function (u) { return W(u, m); };
    var WB = function (u) { return 0.8 * W(u, m) * Math.pow(1 - smooth((u - ub + 0.3) / 0.3), 0.9); };
    // the ribbon is as long as it takes to climb to the top line (its length changes as it sways)
    L = 30;
    var P0 = trace([SRC.slice()], 0, null, m, 0), j = 0;
    while (j < N && P0[j][1] > TOPY + 0.3) j++;
    L = clamp(30 * j / N, 9, 30);
    for (var pass = 0; pass < 2; pass++) {
      P0 = trace([SRC.slice()], 0, null, m, 0);
      var top = Math.min.apply(null, P0.map(function (p) { return p[1]; }));
      L *= clamp((SRC[1] - TOPY - 0.3) / (SRC[1] - top), 0.7, 1.4);
    }
    var PA = trace([SRC.slice()], 0, null, m, 0), PB = null;
    if (open > 0.002) {
      // the twin branches off the main ribbon's right flank at the fork, turning up to 45° further right, and sways a
      // little behind it; the main one yields a little to the left
      var sz = iz * L / N;
      PB = trace(PA.slice(0, iz + 1), iz, function (sl) { return 0.72 * open * smooth((sl - sz) / 1.2); }, m, 0);
      PA = trace(PA.slice(0, iz + 1), iz, function (sl) { return -0.3 * open * smooth((sl - sz) / 1.2); }, m, 0);
    }
    // fit inside the live area: shrink positions about the source if needed (widths stay as designed)
    var sc = 1, all = PA.concat(PB || []);
    all.forEach(function (p) {
      var dy = SRC[1] - p[1], dx = p[0] - SRC[0];
      if (p[1] < TOPY) sc = Math.min(sc, (SRC[1] - TOPY) / dy);
      if (p[0] > 16.2) sc = Math.min(sc, (16.2 - SRC[0]) / dx);
      if (p[0] < 1.8) sc = Math.min(sc, (SRC[0] - 1.8) / -dx);
    });
    var fit = function (P) { return P.map(function (p) { return [SRC[0] + (p[0] - SRC[0]) * sc, SRC[1] + (p[1] - SRC[1]) * sc]; }); };
    var A = plume(frames(fit(PA)), WA, 0, 1, 0.74, 0.2);
    var out = ink(A.core) + fade(A.grey);
    if (PB) {
      var B = plume(frames(fit(PB)), WB, Math.max(0, iz / N - 0.1), ub, iz / N + 0.24, 0.22);
      out += ink(B.core) + fade(B.grey);
    }
    return out;
  }

  return {
    id: 'incense',
    frames: FRAMES,
    at: function (t) {
      return ink(STICK) + cutAround(BOAT, 0.7) + front(BOAT) + smoke(t);
    }
  };
})();
