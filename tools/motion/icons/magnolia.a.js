// 목련 (Magnolia) — variant A · recognisability first.
// 백목련 in bloom, held upright like a candle at the tip of a bare, angular twig, with a brush-tipped
// bud (목필, "wood brush") standing beside it. The bloom is a goblet of three thick spoon-shaped tepals:
// the front one upright, the two side ones leaning out a little — opened, not a closed tulip cup.
// The tepals share one cup at the base; the separations are clean 0.8 pt gaps that close inside the cup,
// and each side tepal's inner edge runs tangent into its gap, so the notches have no corners.
// Motion: still for half the loop; then a gust pushes the twig, the heavy bloom lags and overshoots,
// the side tepals flutter, the bud nods — the twig rocks twice (흔들흔들) and settles back to stillness.
var ICON = (function () {
  var FRAMES = 56, W = 0.8;

  // ── pen: nodes [x, y, a, li, lo] (smooth; a = direction of travel, deg) or [x, y, ai, li, ao, lo] (corner) ──
  function P(x, y) { return f(x) + ' ' + f(y); }
  function hin(n) { var a = n[2] * Math.PI / 180; return [n[0] - Math.cos(a) * n[3], n[1] - Math.sin(a) * n[3]]; }
  function hout(n) { var a = (n.length === 6 ? n[4] : n[2]) * Math.PI / 180, l = n.length === 6 ? n[5] : n[4]; return [n[0] + Math.cos(a) * l, n[1] + Math.sin(a) * l]; }
  function pen(N) {
    var d = 'M' + P(N[0][0], N[0][1]);
    for (var i = 0; i < N.length; i++) {
      var a = N[i], b = N[(i + 1) % N.length], o = hout(a), q = hin(b);
      d += 'C' + P(o[0], o[1]) + ' ' + P(q[0], q[1]) + ' ' + P(b[0], b[1]);
    }
    return d + 'Z';
  }
  function mirror(N) {            // x → −x, direction reversed so the path stays clockwise
    return N.slice().reverse().map(function (n) {
      var ai = n[2], li = n[3], ao = n.length === 6 ? n[4] : n[2], lo = n.length === 6 ? n[5] : n[4];
      return [-n[0], n[1], -ao, lo, -ai, li];
    });
  }
  function bez(N, i, u) {
    var a = N[i], b = N[(i + 1) % N.length], p1 = hout(a), p2 = hin(b), v = 1 - u;
    return [v * v * v * a[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * b[0],
            v * v * v * a[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * b[1]];
  }
  function rotN(N, cx, cy, deg) { // rotate anchors and handle directions
    var r = rot(cx, cy, deg);
    return N.map(function (n) { var p = r(n[0], n[1]); return n.length === 6 ? [p[0], p[1], n[2] + deg, n[3], n[4] + deg, n[5]] : [p[0], p[1], n[2] + deg, n[3], n[4]]; });
  }

  // ── the bloom, local frame: bottom of the cup at (0, 0), axis up (−y), pt ──────────────────────
  // front tepal: an obovate spoon — narrow claw, widest high up, a soft point
  var FRONT = [
    [-0.52, -0.3, -95, 0.01, 2.3],
    [-1.46, -6.05, -90, 2.25, 1.55],
    [0, -9.5, -26, 0.95, 26, 0.95],
    [1.46, -6.05, 90, 1.55, 2.25],
    [0.52, -0.3, 95, 2.25, 0.01]
  ];
  // a point w outside the front tepal's left edge (u: 0 = claw, 1 = tip) and the edge's downward direction
  function sideL(F, u) { var s = clamp(u) * 2, i = Math.min(1, Math.floor(s)); return bez(F, i, s - i); }
  function offL(F, u, w) {
    var p = sideL(F, u), q = sideL(F, u + 0.004), tx = q[0] - p[0], ty = q[1] - p[1], l = Math.hypot(tx, ty);
    tx /= l; ty /= l;
    return { p: [p[0] + ty * w, p[1] - tx * w], down: Math.atan2(-ty, -tx) * 180 / Math.PI };
  }
  // the gap: W wide, just outside the front tepal's left edge, rounded where it closes in the cup
  function slitL(F, u0, u1) {
    var c = [];
    for (var k = 0; k <= 30; k++) c.push(offL(F, lerp(u0, u1, k / 30), W / 2 - 0.03).p);
    return ribbon(c, W, { caps: ['round', 'flat'] });
  }
  var UN = 0.48, UB = 0.15;        // the notch (side tepal leaves the front one) and where the gap closes
  // side tepal (left), drawn against the front tepal: the cup wall, a shoulder, a soft tip leaning out,
  // and an inner edge running tangent into the gap at the notch. `open` swings the free top about the cup.
  function side(F, o, open) {
    var nt = offL(F, UN, W);
    var top = rotN([
      [o.sx, o.sy, -90, 1.0, 0.95],
      [o.tx, o.ty, o.ta - 25, 0.8, o.ta + 48, 0.62]
    ], 0, 0, -open);
    var wall = rotN([[-3.65, -3.4, -112, 1.0, 1.0]], 0, 0, -0.45 * open);   // the flank follows halfway: a bend, not a hinge
    return [
      [0.3, 0.12, 180, 0.01, 0.5],
      [-0.55, 0.0, -160, 0.3, 0.75],
      [-2.15, -1.0, -138, 0.7, 1.0],
      wall[0],
      top[0], top[1],
      [nt.p[0], nt.p[1], nt.down, 0.8, 1.6],
      [0.3, -2.0, 90, 2.5, 1.0]
    ];
  }
  var LEFT = { sx: -4.15, sy: -5.85, tx: -3.4, ty: -8.2, ta: -14 };
  var RIGHT = { sx: -4.2, sy: -5.85, tx: -3.45, ty: -8.3, ta: -14 };
  var FLIP = function (x, y) { return [-x, y]; };
  function bloom(openL, openR) {
    var mF = mirror(FRONT);
    return {
      L: pen(side(FRONT, LEFT, openL)), R: pen(mirror(side(mF, RIGHT, openR))), F: pen(FRONT),
      gL: slitL(FRONT, UB, UN), gR: tp(slitL(mF, UB, UN), FLIP)
    };
  }

  // ── twig and bud (canvas frame, rest pose) ────────────────────────────────────────────────────
  var BASE = [6.0, 17.3], CUP = [9.2, 10.75], NODE = [7.0, 13.75], TILT = 7;
  // peduncle rising out of the cup, an upper knee, the node, a straight run down to a pruned foot
  var TWIG = ribbon([[9.27, 10.0], [9.2, 10.8], [9.08, 11.5], [8.8, 12.05], [8.3, 12.55], [7.75, 12.98], [7.3, 13.4], [7.0, 13.92],
                     [6.78, 14.55], [6.55, 15.3], [6.33, 16.05], [6.15, 16.8], [6.05, 17.4]],
                    function (s) { return 1.24 + 0.32 * Math.pow(s, 1.2); });
  var FOOT = 'M3.6 15.95L8.4 17.45L8.4 18.6L3.6 18.6Z';
  // the bud's stalk leaves the node up-left and turns upright under the bud
  var STALK = ribbon([[7.0, 13.95], [5.95, 13.75], [5.25, 13.4], [4.98, 12.95], [4.95, 12.62]], [1.04, 0.98, 0.92, 0.88, 0.84]);
  var BUD_AT = [4.95, 12.72], BUD_DEG = -4;
  // the bud (local: neck at (0, 0), up = −y): a plump egg drawn out to a fine brush tip
  var BUD = pen([
    [-0.43, 0.25, -98, 0.01, 0.6],
    [-0.9, -1.6, -90, 0.65, 0.75],
    [-0.46, -3.45, -64, 0.6, 0.32],
    [0, -4.35, -78, 0.45, 78, 0.45],
    [0.46, -3.45, 64, 0.32, 0.6],
    [0.9, -1.6, 90, 0.75, 0.65],
    [0.43, 0.25, 98, 0.6, 0.01]
  ]);

  // a flexible twig: every point turns about the foot by an angle that grows along the twig
  function bendField(deg) {
    var ax = CUP[0] - BASE[0], ay = CUP[1] - BASE[1], L2 = ax * ax + ay * ay;
    return function (x, y) {
      var s = clamp(((x - BASE[0]) * ax + (y - BASE[1]) * ay) / L2, 0, 1.2), a = deg * Math.pow(s, 1.5) * Math.PI / 180;
      var c = Math.cos(a), n = Math.sin(a), dx = x - BASE[0], dy = y - BASE[1];
      return [BASE[0] + dx * c - dy * n, BASE[1] + dx * n + dy * c];
    };
  }
  // where a point of the twig went, and how far the twig turned there
  function frameAt(fn, p, q) {
    var a = fn(p[0], p[1]), b = fn(q[0], q[1]);
    var turn = Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.atan2(q[1] - p[1], q[0] - p[0]);
    return { p: a, deg: turn * 180 / Math.PI };
  }

  // ── motion: a gust through a damped twig; the bloom and the tepals ride on it as lagging springs ──
  // b: the twig's bend (1 ≈ held by the gust), f: the heavy bloom's lag on its stalk, te: the side tepals' swing (deg)
  var SIM = null, SUB = 6, BEND = 3.7, LAG = 4.0, TIPDEG = 2.1 * BEND;   // the cup turns ≈ 2.1 × BEND
  function gust(sec) { return bump(sec, 3.1, 3.45, 3.55, 4.0, smooth); }
  function simulate() {
    var T = FRAMES / 8, n = FRAMES * SUB, inner = 24, dt = T / (n * inner);
    var wb = TAU / 1.75, zb = 0.13, wf = TAU / 1.1, zf = 0.18, wt = TAU / 0.8, zt = 0.22;
    var b = 0, vb = 0, fl = 0, vf = 0, te = 0, vt = 0, rows = [];
    for (var i = 0; i <= n; i++) {
      rows.push([b, fl, te]);
      for (var j = 0; j < inner; j++) {
        var sec = (i * inner + j) * dt, g = gust(sec);
        var ab = -wb * wb * (b - g) - 2 * zb * wb * vb;
        var af = -wf * wf * fl - 2 * zf * wf * vf - ab / (wb * wb) * wf * wf * 0.35;
        var aw = TIPDEG * ab + LAG * af;                                  // the bloom's angular acceleration
        var at = -wt * wt * te - 2 * zt * wt * vt - 0.8 * aw + wt * wt * 2.2 * g;   // tepals lag it; the gust leans them
        vb += ab * dt; b += vb * dt; vf += af * dt; fl += vf * dt; vt += at * dt; te += vt * dt;
      }
    }
    return rows;
  }
  function state(t) {
    if (!SIM) SIM = simulate();
    var x = wrap01(t) * FRAMES * SUB, i = Math.floor(x), k = x - i, a = SIM[i], c = SIM[Math.min(i + 1, SIM.length - 1)];
    var settle = 1 - smooth((wrap01(t) - 0.88) / 0.12);
    return { b: lerp(a[0], c[0], k) * settle, f: lerp(a[1], c[1], k) * settle, t: lerp(a[2], c[2], k) * settle };
  }

  return {
    id: 'magnolia',
    frames: FRAMES,
    at: function (t) {
      var st = state(t);
      var field = bendField(BEND * st.b);
      var tip = frameAt(field, CUP, [CUP[0] - 0.12, CUP[1] + 1.0]);
      var bf = chain(rot(0, 0, TILT + tip.deg + LAG * st.f), move(tip.p[0], tip.p[1]));
      var node = frameAt(field, NODE, [NODE[0] - 0.5, NODE[1] - 0.7]);
      var nodeFn = chain(rot(NODE[0], NODE[1], node.deg), move(node.p[0] - NODE[0], node.p[1] - NODE[1]));
      var budFn = chain(scaleAt(0, 0, 0.94), rot(0, 0, BUD_DEG + 5 * st.f + 4 * st.b), move(BUD_AT[0], BUD_AT[1]), nodeFn);
      var B = bloom(-st.t, st.t);
      return ink(TWIG, field) + cut(FOOT)
        + ink(STALK, nodeFn) + ink(BUD, budFn)
        + ink(B.L, bf) + ink(B.R, bf) + ink(B.F, bf) + cut(B.gL, bf) + cut(B.gR, bf);
    }
  };
})();
