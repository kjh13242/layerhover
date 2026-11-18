// 목련 (Magnolia) — variant B · elegance first.
// A white magnolia in bloom at the tip of a bare twig, with one furry brush-tip bud (목필) on a node.
// The goblet: two broad outer tepals cup the bloom and flare open at the lip into softly pointed tips;
// the cupped inner tepal stands between them as a tall spoon. Overlaps are carved by tapered gaps that
// open from the bottom of the cup (one centre line that branches into a Y around the inner tepal).
// The twig is one calligraphic stroke — bold at a slanted cut, thinning, its curvature growing until it
// stands up into a stalk that flares into the cup. Still for half the loop, then a breeze from the right:
// the twig bends about its cut end, the bloom resists, swings left into the open space and overshoots
// back, the outer tepals flutter, the bud nods, and everything settles back to stillness.

var MAGNOLIA_B = (function () {
  var FRAMES = 56;

  // ── helpers ───────────────────────────────────────────────────────────────────────────────────
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k]; }
  function nrm(a) { var l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }
  function leftN(u) { return [u[1], -u[0]]; }                 // left of travel (y down)
  function ang(u) { return Math.atan2(u[1], u[0]) * 180 / Math.PI; }
  function P() { var s = ''; for (var i = 0; i < arguments.length; i += 2) s += (i ? ' ' : '') + f(arguments[i]) + ' ' + f(arguments[i + 1]); return s; }
  function cubicPt(p0, p1, p2, p3, u) {
    var a = 1 - u;
    return [a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * p3[0],
            a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * p3[1]];
  }
  // sample segments [i0, i1) of an absolute path (as produced by tp / pathStr)
  function sampleSegs(d, i0, i1, n) {
    var segs = parsePath(d), pts = [], cur = null;
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i];
      if (g.c === 'M') { cur = [g.p[0], g.p[1]]; continue; }
      if (g.c === 'Z') continue;
      var end = [g.p[g.p.length - 2], g.p[g.p.length - 1]];
      if (i >= i0 && i < i1) {
        for (var k = (pts.length ? 1 : 0); k <= n; k++) {
          var u = k / n;
          pts.push(g.c === 'C' ? cubicPt(cur, [g.p[0], g.p[1]], [g.p[2], g.p[3]], end, u) : mix(cur, end, u));
        }
      }
      cur = end;
    }
    return pts;
  }
  // negative-space gap just outside an edge (pts in travel order), opening from nothing between s0 and s1
  function gapAlong(pts, side, g, s0, s1) {
    var L = [0], i;
    for (i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i]));
    var tot = L[L.length - 1] || 1, inner = [], outer = [];
    for (i = 0; i < pts.length; i++) {
      var s = L[i] / tot; if (s < s0) continue;
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], nn = mul(leftN(nrm(sub(b, a))), side);
      var k = smooth((s - s0) / (s1 - s0));
      inner.push(sub(pts[i], mul(nn, 0.04 * k * (1 - smooth((s - 0.9) / 0.1)))));
      outer.push(add(pts[i], mul(nn, g * k)));
    }
    return polyPath(inner.concat(outer.reverse()), true);
  }
  // signed distance from p to a polyline (+ = left of its travel direction)
  function sideDist(p, poly) {
    var best = 1e9, sgn = 1;
    for (var i = 0; i < poly.length - 1; i++) {
      var a = poly[i], b = poly[i + 1], ab = sub(b, a), l2 = ab[0] * ab[0] + ab[1] * ab[1] || 1;
      var u = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2), q = add(a, mul(ab, u)), d = dist(p, q);
      if (d < best) { best = d; var n = leftN(nrm(ab)); sgn = (p[0] - q[0]) * n[0] + (p[1] - q[1]) * n[1] >= 0 ? 1 : -1; }
    }
    return best * sgn;
  }
  // arc-length fraction along pts where it first lies at least g to the given side of poly
  function emerge(pts, poly, side, g) {
    var L = [0], i;
    for (i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i]));
    for (i = 0; i < pts.length; i++) if (side * sideDist(pts[i], poly) >= g) return L[i] / L[L.length - 1];
    return 1;
  }
  // spoon: upright, base (0, 0) → apex (0, −len); half-widths wl / wr at the widest (height hm), claw at the base
  function spoon(len, wl, wr, hm, claw, pt) {
    var ym = -len * hm, up = len * (1 - hm), k = 0.56, e = pt || 0;
    return 'M' + P(-claw, 0) +
      'C' + P(-claw * 1.1, -len * 0.22, -wl, ym + len * 0.32, -wl, ym) +
      'C' + P(-wl, ym - up * k, -wl * k, -len + e, 0, -len) +
      'C' + P(wr * k, -len + e, wr, ym - up * k, wr, ym) +
      'C' + P(wr, ym + len * 0.32, claw * 1.1, -len * 0.22, claw, 0) + 'Z';
  }

  // ── the bloom, local frame: origin = bottom of the cup, up = −y ─────────────────────────────────
  // inner tepal: a tall cupped spoon standing in the V
  var F_D = spoon(10.6, 1.55, 1.55, 0.72, 0.5, 0.2);
  // outer tepals: segments 1 bottom · 2 bowl · 3 flank opening into the lip · 4 tip, outer side · 5 up to a
  // softly pointed apex · 6 apex → inner shoulder · 7 shoulder · 8 inner rim back to the base.
  // R is in front of everything; L is behind R.
  var R_D = 'M-0.5 0.6' +
    'C0.0 0.62 0.45 0.6 0.9 0.55' +
    'C2.25 0.35 3.25 -1.85 3.3 -3.9' +
    'C3.35 -5.5 3.65 -6.5 4.3 -7.4' +
    'C4.62 -7.85 4.78 -8.2 4.78 -8.55' +
    'C4.78 -8.9 4.62 -9.15 4.38 -9.28' +
    'C4.05 -9.35 3.65 -9.15 3.35 -8.9' +
    'C3.1 -8.7 2.92 -8.45 2.8 -8.2' +
    'C2.0 -6.75 0.3 -2.4 -0.5 0.6Z';
  var L_D = 'M0.6 0.6' +
    'C0.1 0.62 -0.35 0.6 -0.8 0.55' +
    'C-2.1 0.35 -3.0 -1.9 -3.1 -4.1' +
    'C-3.2 -5.5 -3.5 -6.55 -4.05 -7.35' +
    'C-4.45 -7.9 -4.75 -8.25 -4.78 -8.6' +
    'C-4.8 -9.0 -4.62 -9.3 -4.36 -9.4' +
    'C-4.0 -9.45 -3.55 -9.2 -3.22 -8.82' +
    'C-2.9 -8.45 -2.6 -8.15 -2.4 -7.8' +
    'C-1.62 -6.3 -0.05 -2.4 0.6 0.6Z';
  var R_PIV = [0.3, 0.3], L_PIV = [-0.3, 0.3];               // where each outer tepal hinges in the cup
  // receptacle: from the twig's width the stalk flares into the bottom of the cup
  var REC_D = 'M-0.556 1.6C-0.556 1.05 -0.9 0.42 -1.62 0.12L-1.62 -0.6L1.62 -0.6L1.62 0.12C0.9 0.42 0.556 1.05 0.556 1.6Z';

  // ── placement (canvas, rest pose) ───────────────────────────────────────────────────────────────
  var SC = 0.93, TILT = 8, ORIGIN = [9.7, 11.52], STALK = 1.55;
  var J0 = add(ORIGIN, rot(0, 0, TILT)(0, STALK * SC));       // where the twig meets the stalk
  var DIR0 = rot(0, 0, TILT)(0, -1);                          // the bloom's axis, pointing up

  // the twig: one spiral stroke — almost level at the cut end, its curvature growing steadily until it
  // stands up into the stalk: direction a(s) = A_BASE + (A_END − A_BASE)·(s/S)^3.5
  var A_BASE = 2 * Math.PI / 180, A_END = Math.atan2(DIR0[1], DIR0[0]);
  function spiral(S, n) {
    var pts = [[0, 0]], q = [0, 0];
    for (var i = 1; i <= n; i++) {
      var al = A_BASE + (A_END - A_BASE) * Math.pow((i - 0.5) / n, 3.5);
      q = add(q, [Math.cos(al) * S / n, Math.sin(al) * S / n]); pts.push(q);
    }
    return pts;
  }
  var SLEN = 9;
  for (var it = 0; it < 40; it++) { var e0 = spiral(SLEN, 80); SLEN += (J0[0] - e0[e0.length - 1][0] - 2.1) * 0.9; }
  var REL = spiral(SLEN, 36), BASE = sub(J0, REL[REL.length - 1]);
  var TWIG = REL.map(function (q) { return add(BASE, q); }).concat([add(J0, mul(DIR0, 0.45))]);
  var U1 = nrm(sub(TWIG[1], TWIG[0])), N1 = TWIG[13];
  var TWIG_W = function (s) { return lerp(1.42, 0.98, Math.pow(s, 0.75)); };
  // a clean slanted cut at the twig's end
  var CUTDIR = rot(0, 0, -78)(U1[0], U1[1]);
  var CUT_END = polyPath([add(BASE, mul(CUTDIR, 3)), sub(BASE, mul(CUTDIR, 3)), sub(sub(BASE, mul(CUTDIR, 3)), mul(U1, 3)),
                          sub(add(BASE, mul(CUTDIR, 3)), mul(U1, 3))], true);
  // the bud: a plump brush tip (목필) standing on the node
  var BUD_D = 'M-0.55 0.3C-1.0 -0.2 -1.12 -1.1 -0.98 -1.85C-0.82 -2.6 -0.32 -3.2 0.22 -3.75' +
              'C0.14 -3.08 0.6 -2.48 0.86 -1.85C1.1 -1.18 0.98 -0.3 0.55 0.3Z';
  var BUD_AT = add(N1, [0.02, -0.66]), BUD_DEG = -19;
  var GAP = 0.75;

  // ── motion: a gust drives a chain of damped springs, precomputed once ───────────────────────────
  // a1 twig bend (deg) · a2 bloom lag about its stalk · a3 outer tepals flutter · a4 bud nod
  function wind(t) { return bump(t, 0.47, 0.545, 0.565, 0.66) + 0.42 * bump(t, 0.655, 0.705, 0.715, 0.8); }
  var SIM = (function () {
    var SUBS = 40, secs = FRAMES / 8, dt = secs / FRAMES / SUBS, out = [];
    var w1 = TAU * 0.52, z1 = 0.13, w2 = TAU * 0.85, z2 = 0.16, w3 = TAU * 1.35, z3 = 0.14, w4 = TAU * 1.05, z4 = 0.16;
    var a1 = 0, v1 = 0, a2 = 0, v2 = 0, a3 = 0, v3 = 0, a4 = 0, v4 = 0;
    for (var fr = 0; fr <= FRAMES; fr++) {
      out.push([a1, a2, a3, a4]);
      for (var k = 0; k < SUBS; k++) {
        var w = wind((fr + k / SUBS) / FRAMES);
        // the gust blows from the right: everything is pushed left (negative = counter-clockwise)
        var c1 = -w1 * w1 * (a1 + 3.3 * w) - 2 * z1 * w1 * v1;
        var c2 = -w2 * w2 * (a2 + 0.5 * w) - 2 * z2 * w2 * v2 - 1.7 * c1;      // the bloom resists, then whips past
        var c3 = -w3 * w3 * (a3 + 3.6 * w) - 2 * z3 * w3 * v3 - 0.5 * (c1 + c2);
        var c4 = -w4 * w4 * (a4 + 4.0 * w) - 2 * z4 * w4 * v4 - 3.0 * c1;
        v1 += c1 * dt; a1 += v1 * dt; v2 += c2 * dt; a2 += v2 * dt; v3 += c3 * dt; a3 += v3 * dt; v4 += c4 * dt; a4 += v4 * dt;
      }
    }
    return out;
  })();
  function motion(t) {
    var x = wrap01(t) * FRAMES, i = Math.floor(x), k = x - i, A = SIM[i], B = SIM[Math.min(FRAMES, i + 1)];
    var settle = 1 - seg(wrap01(t), 0.9, 1.0, smoother);
    return [0, 1, 2, 3].map(function (j) { return lerp(A[j], B[j], k) * settle; });
  }

  // the twig bends about its cut end: each point turns by a1·s^1.6, s = position along the twig
  var AX = nrm(sub(J0, BASE)), AXL = dist(BASE, J0);
  function twigBend(a1) {
    return function (x, y) {
      var s = clamp(((x - BASE[0]) * AX[0] + (y - BASE[1]) * AX[1]) / AXL, 0, 1.3);
      return rot(BASE[0], BASE[1], a1 * Math.pow(s, 1.6))(x, y);
    };
  }
  // the frame carried by the twig at a point p on it: new position and how much the twig turned there
  function carried(bendFn, p, back) {
    var q = bendFn(p[0], p[1]), b0 = sub(p, mul(back, 0.35)), b1 = bendFn(b0[0], b0[1]);
    return { at: q, turn: ang(sub(q, b1)) - ang(back) };
  }

  function at(t) {
    var m = motion(t), a1 = m[0], a2 = m[1], a3 = m[2], a4 = m[3];
    var bendFn = twigBend(a1);

    // bloom: rides the twig's tip, plus its own lag about the stalk
    var tip = carried(bendFn, J0, DIR0);
    var bloom = chain(scaleAt(0, 0, SC), rot(0, 0, TILT), move(ORIGIN[0], ORIGIN[1]),
                      move(tip.at[0] - J0[0], tip.at[1] - J0[1]), rot(tip.at[0], tip.at[1], tip.turn + a2));
    // outer tepals flutter about their hinges (the windward one closes a little, the leeward one opens)
    var F = tp(F_D, chain(rot(0, 0.2, 0.25 * a3), bloom));
    var L = tp(L_D, chain(rot(L_PIV[0], L_PIV[1], 0.8 * a3), bloom));
    var R = tp(R_D, chain(rot(R_PIV[0], R_PIV[1], 1.15 * a3), bloom));

    // bud: rides the node, nods with its own lag
    var node = carried(bendFn, N1, U1);
    var bud = chain(rot(0, 0, BUD_DEG + node.turn + a4), move(BUD_AT[0], BUD_AT[1]), move(node.at[0] - N1[0], node.at[1] - N1[1]));

    var s = '';
    var spine = [sub(TWIG[0], mul(U1, 0.6))].concat(TWIG).map(function (p) { return bendFn(p[0], p[1]); });
    s += ink(ribbon(spine, TWIG_W));
    s += cut(CUT_END);
    s += ink(BUD_D, bud);
    s += ink(F) + ink(L) + ink(REC_D, bloom);
    // R's inner rim carries the centre line of the cup; L's inner rim takes over above the V where it leaves R
    var rIn = sampleSegs(R, 7, 9, 16).reverse(), lIn = sampleSegs(L, 7, 9, 16).reverse();
    var v = emerge(lIn, rIn, 1, GAP * 0.3);
    s += cut(gapAlong(lIn, -1, GAP, v, Math.min(0.98, v + 0.1)));
    s += cut(gapAlong(rIn, 1, GAP, 0.1, 0.38));
    s += front(R);
    return s;
  }

  return { frames: FRAMES, at: at };
})();

var ICON = { id: "magnolia", frames: MAGNOLIA_B.frames, at: MAGNOLIA_B.at };
