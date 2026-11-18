// 목련 (Magnolia) — v2, redrawn for identity.
// 백목련 at the tip of a bare, angular twig that crosses the icon on a diagonal (cut end lower left,
// bloom upper right). The bloom is a tilted goblet of five long spoon tepals: two front tepals open a V,
// the tall inner tepal stands in it, and two outer tepals flare out behind them. Every overlap is
// separated by a clean 0.8 pt gap. One plump, brush-tipped bud (목필) sits on the lower node.
// Motion: still for half the loop, then a gust bends the twig about its cut end, the bloom lags on its
// stalk and overshoots, the tepals flex from bowl to tip, the bud nods late, and all settles.
var ICON = (function () {
  var FRAMES = 56, GAP = 0.8;
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k]; }
  function dv(deg) { var r = deg * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
  function rotP(p, c, deg) { return rot(c[0], c[1], deg)(p[0], p[1]); }

  // ── tepal: a spoon on a spine whose direction turns a0 → a1 (bowl) → a2 (flared tip) ───────────────
  function spine(x0, y0, a0, a1, a2, L) {
    var P = [[x0, y0]], n = 24, p = [x0, y0];
    for (var i = 1; i <= n; i++) {
      var s = (i - 0.5) / n, a = a0 + (a1 - a0) * smooth(s / 0.55) + (a2 - a1) * smooth((s - 0.55) / 0.45);
      p = add(p, mul(dv(a), L / n)); P.push(p);
    }
    return P;
  }
  function spoonW(W, peak, b, te) {
    return function (s) {
      if (s <= peak) return W * (b + (1 - b) * Math.pow(Math.sin(Math.PI / 2 * s / peak), 0.75));
      return W * Math.pow(Math.max(0, Math.cos(Math.PI / 2 * (s - peak) / (1 - peak))), te);
    };
  }
  function tepal(T, side) {     // side -1 = left as given, +1 = mirrored to the right
    var m = function (a) { return side > 0 ? -180 - a : a; };
    var P = spine(side * T.x, T.y, m(T.a0), m(T.a1), m(T.a2), T.L);
    var wf = spoonW(T.W, T.pk, T.b, T.te);
    return { d: ribbon(P, wf, { samples: 3 }), P: P, w: wf, L: T.L };
  }
  // a tapered gap just outside one edge of a tepal (side +1 = left of travel, -1 = right), opening from
  // nothing at s0 to GAP by s1 and running out past the tip: separates it from the tepal behind it
  function edgeGap(T, side, s0, s1, s2) {
    var P = _sample(T.P, 6), n = P.length - 1, C0 = [], S = [];
    for (var i = 0; i <= n; i++) {
      var a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)], u = sub(b, a), l = Math.hypot(u[0], u[1]);
      C0.push(add(P[i], mul([u[1] / l * side, -u[0] / l * side], T.w(i / n) / 2))); S.push(i / n);
    }
    // the strip lies between the contour and its offset along the contour's own normal (it turns round
    // the tip), so it never bites into the tepal itself
    var IN_ = [], OUT = [];
    for (var j = 0; j <= n; j++) {
      var s = S[j], g = GAP * smooth((s - s0) / (s1 - s0)) * (1 - smooth((s - s2) / (1 - s2)));
      if (s < s0) continue;
      var a2 = C0[Math.max(0, j - 1)], b2 = C0[Math.min(n, j + 1)], u2 = sub(b2, a2), l2 = Math.hypot(u2[0], u2[1]) || 1, nc = [u2[1] / l2 * side, -u2[0] / l2 * side];
      IN_.push(add(C0[j], mul(nc, -0.02))); OUT.push(add(C0[j], mul(nc, g)));
    }
    return polyPath(IN_.concat(OUT.reverse()), true);
  }
  // local frame: origin = bottom of the cup, up = −y
  var SIDE = { x: -0.3, y: 0.15, a0: -148, a1: -116, a2: -112, L: 8.6, W: 2.9, pk: 0.64, b: 0.3, te: 0.8 };
  var SIDE_R = { x: -0.3, y: 0.15, a0: -144, a1: -108, a2: -104, L: 8.5, W: 2.7, pk: 0.64, b: 0.3, te: 0.8 };   // mirrored; less spread against the tilt
  var MID = { x: 0, y: 0.1, a0: -90, a1: -90, a2: -90, L: 8.1, W: 2.8, pk: 0.62, b: 0.35, te: 0.8 };
  var INN = { x: 0, y: 0, a0: -101, a1: -100, a2: -102, L: 9.7, W: 2.1, pk: 0.62, b: 0.3, te: 0.9 };
  // receptacle: the stalk flares into the bowl through concave flanks (no corner where they meet)
  var REC = ribbon([[0, 1.05], [0.04, 0.5], [0.1, -0.1]], function (s) { return 0.84 + 1.45 * Math.pow(s, 2.0); }, { samples: 8 });

  // ── placement and twig (canvas) ──────────────────────────────────────────────────────────────────
  var TILT = 20, C = [9.0, 11.95], SC = 1.13;
  function place(p) { return add(rotP(mul(p, SC), [0, 0], TILT), C); }
  var STALK = place([0, 1.6]);
  // twig: straight internodes, tight turns at the nodes
  var N1 = [4.5, 14.6], J = [[2.4, 16.25], N1, mix(N1, STALK, 0.5), STALK, place([0, 0.2])];   // J[2] is a flex point, not a turn
  function filleted(pts, R) {
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var a = pts[i - 1], b = pts[i], c = pts[i + 1];
      var u = sub(b, a), v = sub(c, b), lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
      u = mul(u, 1 / lu); v = mul(v, 1 / lv);
      var r = R[i - 1], p0 = sub(b, mul(u, r)), p1 = add(b, mul(v, r));
      for (var k = 0; k <= 6; k++) { var q = k / 6; out.push(add(add(p0, mul(sub(b, p0), 2 * (1 - q) * q)), mul(sub(p1, p0), q * q))); }
    }
    out.push(pts[pts.length - 1]);
    // resample densely (straight runs stay straight)
    var D = [out[0]];
    for (var j = 1; j < out.length; j++) {
      var d = Math.hypot(out[j][0] - out[j - 1][0], out[j][1] - out[j - 1][1]), n = Math.max(1, Math.ceil(d / 0.25));
      for (var m = 1; m <= n; m++) D.push(mix(out[j - 1], out[j], m / n));
    }
    return D;
  }
  var TW = filleted(J, [0.3, 0.25, 0.8]), TS = [0];
  for (var i = 1; i < TW.length; i++) TS.push(TS[i - 1] + Math.hypot(TW[i][0] - TW[i - 1][0], TW[i][1] - TW[i - 1][1]));
  var TL = TS[TS.length - 1];
  function sOf(p) { var best = 0, bd = 1e9; for (var i = 0; i < TW.length; i++) { var d = Math.hypot(TW[i][0] - p[0], TW[i][1] - p[1]); if (d < bd) { bd = d; best = i; } } return TS[best]; }
  var SJ = [0, sOf(J[1]), sOf(J[2]), sOf(J[3])];
  function twigW(s) {
    var x = s / TL, w = lerp(1.35, 0.95, Math.pow(x, 0.7));
    w += 0.1 * Math.exp(-Math.pow((s - SJ[1]) / 0.3, 2));
    return w;
  }
  // the oblique cut at the twig's foot
  var CUT_P = polyPath([[1.76, 13.18], [3.74, 18.82], [-1, 18.82], [-1, 13.18]], true);

  // bud on the lower node, leaning away from the bloom
  var BUD_BASE = [J[1][0] - 0.05, J[1][1] - 0.05], BUD_A = -98;
  var BUD = ribbon(spine(BUD_BASE[0], BUD_BASE[1], BUD_A, BUD_A, BUD_A - 4, 3.5), function (s) {
    if (s < 0.4) return 1.9 * (0.45 + 0.55 * Math.sin(Math.PI / 2 * s / 0.4));
    return 1.9 * Math.pow(Math.cos(Math.PI / 2 * (s - 0.4) / 0.6), 1.6);
  }, { samples: 3 });

  // ── motion ─────────────────────────────────────────────────────────────────────────────────────
  function gust(sec) { return bump(sec, 3.35, 3.7, 3.8, 4.3, smooth); }
  var SIM = (function () {
    var SUB = 6, T = FRAMES / 8, n = FRAMES * SUB, inner = 20, dt = T / (n * inner), rows = [];
    var wb = TAU / 2.0, zb = 0.2, wf = TAU / 1.15, zf = 0.25, wt = TAU / 0.7, zt = 0.3, wn = TAU / 1.4, zn = 0.22;
    var b = 0, vb = 0, fl = 0, vf = 0, te = 0, vt = 0, nd = 0, vn = 0;
    for (var i = 0; i <= n; i++) {
      rows.push([b, fl, te, nd]);
      for (var j = 0; j < inner; j++) {
        var g = gust((i * inner + j) * dt);
        var ab = -wb * wb * (b - g) - 2 * zb * wb * vb;
        var af = -wf * wf * fl - 2 * zf * wf * vf - 0.5 * ab;
        var at = -wt * wt * te - 2 * zt * wt * vt - 0.4 * (ab + af);
        var an = -wn * wn * nd - 2 * zn * wn * vn - 0.8 * ab;
        vb += ab * dt; b += vb * dt; vf += af * dt; fl += vf * dt; vt += at * dt; te += vt * dt; vn += an * dt; nd += vn * dt;
      }
    }
    return { rows: rows, sub: SUB };
  })();
  function state(t) {
    var x = wrap01(t) * FRAMES * SIM.sub, i = Math.floor(x), k = x - i, a = SIM.rows[i], c = SIM.rows[Math.min(i + 1, SIM.rows.length - 1)];
    var settle = 1 - smooth((wrap01(t) - 0.88) / 0.1);
    return [0, 1, 2, 3].map(function (j) { return lerp(a[j], c[j], k) * settle; });
  }
  var A0 = 3.6, A1 = 2.4, A2 = 2.6, LAG = 5, FLUT = 5, NOD = 12;

  function fk(st) {
    var ang = [A0 * st[0], A1 * st[0], A2 * st[0], LAG * st[1]];
    return function (p, s) {
      var q = p;
      for (var j = 3; j >= 0; j--) {
        var w = j === 0 ? smooth(s / 1.2) : smooth((s - SJ[j] + 0.35) / 0.7);
        if (j === 3) w = smooth((s - SJ[3] + 0.2) / 1.2);
        q = rotP(q, J[j], ang[j] * w);
      }
      return q;
    };
  }

  function at(t) {
    var st = state(t), F = fk(st), fl = FLUT * st[2], nd = NOD * st[3], s = '';
    // twig
    var P = TW.map(function (p, i) { return F(p, TS[i]); });
    s += ink(ribbon(P, function (u) { return twigW(u * TL); }, { samples: 2 }));
    s += cut(CUT_P);
    // bud: nods about its base, rides the node
    s += ink(BUD, function (x, y) {
      var h = clamp(Math.hypot(x - BUD_BASE[0], y - BUD_BASE[1]) / 3.6);
      return F(rotP([x, y], BUD_BASE, nd * Math.pow(h, 1.4)), SJ[1]);
    });
    // bloom: tepals flex from the bowl to the tip (each with its own share), then ride the stalk
    function bl(k) {
      return function (x, y) {
        var h = clamp(Math.hypot(x, y) / 9), q = rotP([x, y], [0, 0.3], fl * k * Math.pow(h, 1.3));
        return F(place(q), TL + 1);
      };
    }
    s += ink(REC, bl(0));
    var sd = [tepal(SIDE, -1), tepal(SIDE_R, 1)], mid = tepal(MID, -1), inn = [tepal(INN, -1), tepal(INN, 1)];
    s += ink(inn[0].d, bl(1.1)) + ink(inn[1].d, bl(0.9));
    s += ink(sd[0].d, bl(1.25)) + ink(sd[1].d, bl(0.8));
    s += cut(edgeGap(sd[0], -1, 0.25, 0.5, 0.97), bl(1.25)) + cut(edgeGap(sd[1], 1, 0.25, 0.5, 0.97), bl(0.8));
    s += cut(edgeGap(mid, 1, 0.08, 0.32, 0.86), bl(1.0)) + cut(edgeGap(mid, -1, 0.08, 0.32, 0.86), bl(1.0)) + front(mid.d, bl(1.0));
    return s;
  }
  return { id: "magnolia", frames: FRAMES, at: at };
})();
