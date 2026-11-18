// 향 (Incense) — variant R (ribbon).
// A slim boat-shaped tray on the ground, one plain stick lying low across it, and smoke drawn as two braided ribbons
// rising from the burning end: a solid core low down that hands off to a translucent (fade) envelope as it climbs.
// Usually the two ribbons twist around each other as one plume; once a loop they part into two plumes, drift apart,
// and zip back together. The centre line is x(y) — a function of height — so the smoke can never curl into a hook.

var ICON = (function () {
  var FRAMES = 64;
  var T0 = 0.33;   // where the poster sits in the smoke's cycle

  // ── holder: a long, thin boat. Flat keel on y = 16, a shallow concave sheer, both ends lifted to fine points;
  //    the heel (left) carries a small raised socket where the stick enters ──
  var BOAT = 'M1.3 13.55' +
    'C2.5 14.1 3.5 14.3 4.35 14.35' +
    'C4.75 13.8 6.15 13.7 6.75 14.35' +
    'C9.6 14.4 13.6 14.15 16.7 13.25' +
    'C15.9 15.25 14.2 16 11.8 16' +
    'L5.2 16' +
    'C3.2 16 1.8 15.1 1.3 13.55Z';

  // ── stick: lies low at 16°, tapering 1.25 → 1.0, crisp square burnt end (corners softened), no dot ──
  var ANG = 20 * Math.PI / 180, DIR = [Math.cos(ANG), -Math.sin(ANG)];
  var FOOT = [5.3, 14.45], LEN = 7.9;
  var TIP = [FOOT[0] + DIR[0] * LEN, FOOT[1] + DIR[1] * LEN];
  function bar(d0, d1, w0, w1, r) {
    var nx = DIR[1], ny = -DIR[0];
    function P(d, side) { var w = lerp(w0, w1, (d - d0) / (d1 - d0)) / 2; return [FOOT[0] + DIR[0] * d + nx * w * side, FOOT[1] + DIR[1] * d + ny * w * side]; }
    var a = P(d0, 1), b = P(d1, 1), c = P(d1, -1), dd = P(d0, -1);
    var b1 = P(d1 - r, 1), bc = [b[0] - nx * r, b[1] - ny * r], c1 = [c[0] + nx * r, c[1] + ny * r], c2 = P(d1 - r, -1);
    return 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b1[0]) + ' ' + f(b1[1]) +
      'Q' + f(b[0]) + ' ' + f(b[1]) + ' ' + f(bc[0]) + ' ' + f(bc[1]) +
      'L' + f(c1[0]) + ' ' + f(c1[1]) +
      'Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c2[0]) + ' ' + f(c2[1]) +
      'L' + f(dd[0]) + ' ' + f(dd[1]) + 'Z';
  }
  var STICK = bar(0, LEN, 1.55, 1.2, 0.12);

  // ── smoke ──
  var SRC = [TIP[0] + DIR[0] * 0.15, TIP[1] - 0.35];
  var TOP = 1.0, H = SRC[1] - TOP, N = 30;

  function drift(t, seed, amp) { return amp * noise(t, seed, 3); }

  // centre line x at height h (0 at the ember, H at the top) for one ribbon
  function cx(h, t, o) {
    var u = h / H, grow = smooth((h - 0.9) / 3.2) * (0.6 + 0.45 * u);
    var a1 = 1.2 + drift(t, 3, 0.25), a2 = 0.3 + drift(t, 7, 0.14);
    var w = a1 * Math.sin(TAU * (h / 10 - 2 * t) + 2.6 + o.ph) + a2 * Math.sin(TAU * (h / 6 - 3 * t) + 2.1 + 0.6 * o.ph);
    var lean = (-3.6 + drift(t, 11, 0.7)) * Math.pow(u, 1.45);
    return SRC[0] + lean + grow * w + o.off(h, u);
  }
  function spine(t, o, h0, h1) {
    var pts = [];
    for (var i = 0; i <= N; i++) { var h = lerp(h0, h1, i / N); pts.push([cx(h, t, o), SRC[1] - h]); }
    return pts;
  }

  // the two ribbons part once a loop: split = 0 (one braided plume) → 1 (two plumes)
  function split(t) { return bump(t, 0.4, 0.55, 0.75, 0.92); }

  // a brush lift: full width until s0, then a long thinning tail to nothing at the end
  function tail(s, s0, p) { var k = clamp((s - s0) / (1 - s0)); return Math.pow(1 - k, p) * (1 - 0.0 * k); }

  function smoke(t) {
    var sp = split(t);
    var Hm = H * (0.96 + 0.04 * loop(t, 1, 0.2));
    // two ribbons share one drifting centre line and braid around it: they cross every few points of height (the
    // crossings travel upward with the smoke). During the split they part into two plumes, then zip back together.
    var bAmp = 0.75 + 0.12 * noise(t, 13, 2);
    function d(h, u) { return bAmp * smooth((h - 0.9) / 2.6) * (1 - 0.3 * u) * Math.sin(TAU * (h / 7.5 - 2 * t) + 1.3); }
    var h0 = 2.4;
    function sep(h) { return sp * smooth((h - h0) / 6); }
    var A = { ph: 0, off: function (h, u) { return -d(h, u) - 1.4 * sep(h); } };
    var B = { ph: 0.1 * sp, off: function (h, u) { return d(h, u) + 1.7 * sep(h); } };

    var swell = 1 + 0.08 * loop(t, 3, 0.1) + 0.06 * noise(t, 5, 2);
    // a ribbon turning over as it rises: travelling necks where it shows its edge
    function neck(s, ph) { return 1 - 0.28 * (0.5 + 0.5 * Math.sin(TAU * (1.6 * s - 2 * t) + ph)) * smooth((s - 0.15) / 0.2); }
    function wA(s) { return lerp(0.85, 2.15 * swell, smooth((s - 0.03) / 0.4)) * tail(s, 0.5, 1.4) * neck(s, 1.0); }
    function wAc(s) { return wA(s) * (1 - smooth((s - 0.58) / 0.3)); }
    var hB0 = 1.0, hB1 = Hm * (0.88 + 0.07 * sp + 0.04 * noise(t, 9, 2));
    function wB(s) { return lerp(0, 1.75 * swell, smooth(s / 0.35)) * tail(s, 0.45, 1.4) * neck(s, 3.6); }
    function wBc(s) { return wB(s) * (1 - smooth((s - 0.6) / 0.3)); }

    // a third, fainter ribbon peels off the left edge high up, comes and goes on its own slow rhythm
    var p3 = clamp(0.55 + 0.6 * noise(t, 31, 2)) * (1 - 0.6 * sp), h3 = 4.6 + 0.8 * noise(t, 27, 2);
    var third = { ph: -0.1, off: function (h, u) { return -d(h, u) - 1.4 * sep(h) - (0.5 + 1.1 * p3) * smooth((h - h3) / 4); } };
    function wThird(s) { return p3 * lerp(0, 1.3, smooth(s / 0.35)) * tail(s, 0.35, 1.4); }

    var PA = spine(t, A, 0, Hm), PB = spine(t, B, hB0, hB1), PR = spine(t, third, h3, Hm * (0.86 + 0.08 * p3));
    return { aEnv: ribbon(PA, wA), aCore: ribbon(PA, wAc), bEnv: ribbon(PB, wB), bCore: ribbon(PB, wBc), thirdEnv: ribbon(PR, wThird) };
  }

  return {
    id: 'incense',
    frames: FRAMES,
    at: function (t) {
      var S = smoke(wrap01(t + T0));
      return ink(BOAT) + ink(STICK) +
        ink(S.aCore) + fade(S.aEnv) +
        cutAround(S.bCore, 0.5) + front(S.bCore) + fade(S.bEnv) + fade(S.thirdEnv);
    }
  };
})();
