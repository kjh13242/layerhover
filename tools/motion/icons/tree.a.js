// 크리스마스 나무 (Christmas tree) — variant A: recognisability first.
//
// Poster: one drawn fir silhouette. A narrow spire flares into three tiers; every tier ends in a drooping branch
// tip whose underside sags a little and tucks back in, so the flank of the next tier emerges from a crisp notch.
// The lowest hem hangs in branch tips with concave scoops, and the trunk stands under its central arch.
// A crafted five-point star sits on top; five lights are carved on a triangular lattice (2.6 pt apart).
//
// Motion (48 frames, 6 s): the lights twinkle in turn like a string wound up the tree — bottom row left → right,
// middle row right → left. Each swells and sharpens from a dot into a four-ray glint that turns a little as it
// blooms, then shrinks and softens back. When the wave reaches the top the star swells, rocks back to rest, and
// light slides off its upper point as a glint that blooms and fades. Then about two seconds of calm.

var TR = {
  cx: 9,
  apex: 4.8,
  tips: [[11.95, 7.55], [13.6, 10.55], [15.25, 13.55]],  // outer branch tips (right side), one per tier
  notch: [[10.85, 7.5], [12.45, 10.45]],                // where the next tier emerges from under the one above
  dA: [5, 0, 0], dP: [6, 10, 10], kh: 0.36,  // flank leaves / arrives this many degrees steeper than its chord
  u0: -10, u1: 8, ku: 0.34,                 // underside (tip → notch) sags: the branch end hangs
  hem: { q: [11.0, 13.8], aq: 50, hq0: 1.4, hq1: 0.75, top: 13.15, ht: 0.75, aOut: 178, hOut: 1.2 },
  tipCut: 0.55, cuspCut: 0.45,              // softened branch tips (≈ 0.25 pt radius) and hem cusps
  gap: 0.7,                                 // the trunk tucks under the hem with a clean gap
  trunk: [8, 10],                           // trunk edges on the half-point grid
  star: { cy: 2.95, R: 1.9, inner: 0.58, tip: 0.48, notch: 0.16 },
  lights: [[6.4, 11.7], [9, 11.7], [11.6, 11.7], [10.3, 9.2], [7.7, 9.2]],   // in twinkle order
  lr: 0.5,
  tw: { at: [2, 6.5, 11, 15.5, 20], len: 8.5, rise: 0.3, peak: [1.35, 1.2, 1.35, 1.35, 1.35], v: 0.86 },
  glint: { at: 23, x: 12.75, y: 2.45, R: 1.3 }
};

// ── private geometry ────────────────────────────────────────────────────────────────────────────
function trD(deg) { var a = deg * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }
function trA(p, d, s) { return [p[0] + d[0] * s, p[1] + d[1] * s]; }
function trF(p) { return f(p[0]) + ' ' + f(p[1]); }
function trAng(p, q) { return Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI; }

// nodes {p, i: arrival angle, o: departure angle, hi, ho} (degrees, 0 = right, 90 = down) → cubic segments {s, c1, c2, p}
function trChain(nodes) {
  var out = [];
  for (var k = 1; k < nodes.length; k++) {
    var a = nodes[k - 1], b = nodes[k];
    out.push({ s: a.p, c1: trA(a.p, trD(a.o), a.ho), c2: trA(b.p, trD(b.i), -b.hi), p: b.p });
  }
  return out;
}
function trMirrorSeg(g, cx) {
  return { s: [2 * cx - g.p[0], g.p[1]], c1: [2 * cx - g.c2[0], g.c2[1]], c2: [2 * cx - g.c1[0], g.c1[1]], p: [2 * cx - g.s[0], g.s[1]] };
}
// right half (axis → … → axis) followed by its mirror: a closed, clockwise outline
function trMirror(segs, cx) {
  var all = segs.slice();
  for (var j = segs.length - 1; j >= 0; j--) all.push(trMirrorSeg(segs[j], cx));
  return all;
}
function trPath(segs) {
  var d = 'M' + trF(segs[0].s);
  for (var k = 0; k < segs.length; k++) d += 'C' + trF(segs[k].c1) + ' ' + trF(segs[k].c2) + ' ' + trF(segs[k].p);
  return d + 'Z';
}
function trBez(g, u) {
  var v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, e = u * u * u;
  return [a * g.s[0] + b * g.c1[0] + c * g.c2[0] + e * g.p[0], a * g.s[1] + b * g.c1[1] + c * g.c2[1] + e * g.p[1]];
}
function trTan(g, u) {
  var v = 1 - u;
  var x = 3 * v * v * (g.c1[0] - g.s[0]) + 6 * v * u * (g.c2[0] - g.c1[0]) + 3 * u * u * (g.p[0] - g.c2[0]);
  var y = 3 * v * v * (g.c1[1] - g.s[1]) + 6 * v * u * (g.c2[1] - g.c1[1]) + 3 * u * u * (g.p[1] - g.c2[1]);
  var L = Math.hypot(x, y) || 1; return [x / L, y / L];
}
function trSplit(g, u) {   // de Casteljau
  var a = mix(g.s, g.c1, u), b = mix(g.c1, g.c2, u), c = mix(g.c2, g.p, u), d = mix(a, b, u), e = mix(b, c, u), m = mix(d, e, u);
  return [{ s: g.s, c1: a, c2: d, p: m }, { s: m, c1: e, c2: c, p: g.p }];
}
// soften corners: cuts[k] = how far back along both neighbours the joint after segment k is rounded (0 = sharp).
// The neighbours are split exactly there and joined by a curve through the old corner.
function trRound(segs, cuts) {
  var out = segs.slice(), res = [];
  function at(g, c, fromEnd) {   // parameter where the segment is c away from its end (or start)
    var P = fromEnd ? g.p : g.s, lo = fromEnd ? 0.3 : 0, hi = fromEnd ? 1 : 0.7;
    for (var it = 0; it < 30; it++) {
      var mid = (lo + hi) / 2, dd = dist(trBez(g, mid), P);
      if (fromEnd ? dd > c : dd < c) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  for (var k = 0; k < out.length; k++) {
    var g = out[k], c = cuts[k] || 0;
    if (c > 0 && k + 1 < out.length) {
      var P = g.p, g2 = trSplit(g, at(g, c, true))[0], h2 = trSplit(out[k + 1], at(out[k + 1], c, false))[1];
      res.push(g2, { s: g2.p, c1: mix(g2.p, P, 2 / 3), c2: mix(h2.s, P, 2 / 3), p: h2.s });
      out[k + 1] = h2;
    } else res.push(g);
  }
  return res;
}
// a clean gap of constant width below a run of a clockwise outline (outward normal = (ty, -tx)): a stroke along
// the outline offset outward by gap/2, turning round the corners — it carves what lies behind, never the tree
function trGap(segs, gap) {
  var h = gap / 2, pts = [], N = 16;
  function nrm(t) { return Math.atan2(-t[0], t[1]); }
  for (var k = 0; k < segs.length; k++) {
    var g = segs[k];
    if (k) {
      var a0 = nrm(trTan(segs[k - 1], 1)), a1 = nrm(trTan(g, 0)), da = a1 - a0;
      while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      var steps = Math.ceil(Math.abs(da) / 0.2);
      for (var j = 1; j < steps; j++) { var a = a0 + da * j / steps; pts.push([g.s[0] + Math.cos(a) * h, g.s[1] + Math.sin(a) * h]); }
    }
    for (var i = 0; i <= N; i++) { var u = i / N, p = trBez(g, u), tt = trTan(g, u); pts.push([p[0] + tt[1] * h, p[1] - tt[0] * h]); }
  }
  return cutLine(polyPath(pts, false), gap);
}

// ── the parts ───────────────────────────────────────────────────────────────────────────────────
// the silhouette, right half: apex → (flank → tip → underside → notch) × 2 → flank → tip → scoop → cusp → arch
function trTree() {
  var T = TR, nodes = [{ p: [T.cx, T.apex] }], from = nodes[0].p;
  for (var k = 0; k < 3; k++) {
    var P = T.tips[k], ch = trAng(from, P), L = dist(from, P), prev = nodes[nodes.length - 1];
    prev.o = ch + T.dA[k]; prev.ho = T.kh * L;
    var tip = { p: P, i: ch + T.dP[k], hi: T.kh * L };
    nodes.push(tip);
    if (k < 2) {
      var N = T.notch[k], cu = trAng(P, N), Lu = dist(P, N);
      tip.o = cu + T.u0; tip.ho = T.ku * Lu;
      nodes.push({ p: N, i: cu + T.u1, hi: T.ku * Lu });
      from = N;
    } else { tip.o = T.hem.aOut; tip.ho = T.hem.hOut; }
  }
  var H = T.hem;
  nodes.push({ p: H.q, i: 180 - H.aq, hi: H.hq0, o: 180 + H.aq, ho: H.hq1 });
  nodes.push({ p: [T.cx, H.top], i: 180, hi: H.ht });
  // raw segments: flank, underside, flank, underside, flank, scoop, arch — soften the tips and the hem cusp
  var c = T.tipCut, right = trRound(trChain(nodes), [c, 0, c, 0, c, T.cuspCut, 0]);
  var hemR = right.slice(right.length - 3), hem = hemR.slice();      // scoop, cusp, arch (+ mirror)
  for (var j = hemR.length - 1; j >= 0; j--) hem.push(trMirrorSeg(hemR[j], T.cx));
  return { d: trPath(trMirror(right, T.cx)), hem: hem };
}

// five-point star with softened tips and notches
function trStar(cx, cy, R, inner, cutTip, cutIn) {
  var pts = [], d = '';
  for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + Math.PI * i / 5, r = i % 2 ? R * inner : R; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  for (i = 0; i < 10; i++) {
    var p = pts[i], q0 = pts[(i + 9) % 10], q1 = pts[(i + 1) % 10], c = i % 2 ? cutIn : cutTip;
    var l0 = dist(p, q0), l1 = dist(p, q1);
    var pa = [p[0] + (q0[0] - p[0]) * c / l0, p[1] + (q0[1] - p[1]) * c / l0], pb = [p[0] + (q1[0] - p[0]) * c / l1, p[1] + (q1[1] - p[1]) * c / l1];
    d += (i ? 'L' : 'M') + trF(pa) + 'Q' + trF(p) + ' ' + trF(pb);
  }
  return d + 'Z';
}

// a glint: four tips joined by cubic arcs. sharp = 0 → an ellipse rh × rv; sharp = 1 → a sparkle with concave
// sides (pinch: how far the sides draw in; body: how much the rays keep, so they taper rather than needle out).
// One structure in every state, so a dot can grow rays and settle back without swapping shapes.
function trGlint(cx, cy, rh, rv, sharp, deg, body, pinch) {
  var a0 = (deg || 0) * Math.PI / 180, d = '', k = 0.5523;
  for (var i = 0; i < 4; i++) {
    var aA = a0 + i * Math.PI / 2, aB = aA + Math.PI / 2, RA = i % 2 ? rv : rh, RB = (i + 1) % 2 ? rv : rh;
    var uA = [Math.cos(aA), Math.sin(aA)], uB = [Math.cos(aB), Math.sin(aB)];
    var A = [uA[0] * RA, uA[1] * RA], B = [uB[0] * RB, uB[1] * RB], Rm = (RA + RB) / 2;
    var c1 = mix([A[0] + uB[0] * k * RB, A[1] + uB[1] * k * RB], [A[0] * pinch + uB[0] * body * Rm, A[1] * pinch + uB[1] * body * Rm], sharp);
    var c2 = mix([B[0] + uA[0] * k * RA, B[1] + uA[1] * k * RA], [B[0] * pinch + uA[0] * body * Rm, B[1] * pinch + uA[1] * body * Rm], sharp);
    if (!i) d += 'M' + f(cx + A[0]) + ' ' + f(cy + A[1]);
    d += 'C' + f(cx + c1[0]) + ' ' + f(cy + c1[1]) + ' ' + f(cx + c2[0]) + ' ' + f(cy + c2[1]) + ' ' + f(cx + B[0]) + ' ' + f(cy + B[1]);
  }
  return d + 'Z';
}
// one twinkle over u = 0..1: a two-frame bloom, then a longer settle
function trTwinkle(u, rise) {
  if (u <= 0 || u >= 1) return 0;
  return u < rise ? smooth(u / rise) : 1 - smooth((u - rise) / (1 - rise));
}

var ICON = {
  id: "tree",
  frames: 48,
  at: function (t) {
    var fr = t * 48, W = TR.tw, S = TR.star, G = TR.glint;
    var tree = trTree(), r = 0.25, a = TR.trunk[0], b = TR.trunk[1];
    var trunk = 'M' + a + ' 12.6L' + b + ' 12.6L' + b + ' ' + (16 - r) + 'Q' + b + ' 16 ' + (b - r) + ' 16L' + (a + r) + ' 16Q' + a + ' 16 ' + a + ' ' + (16 - r) + 'Z';
    var s = ink(tree.d) + ink(trunk) + trGap(tree.hem, TR.gap);

    // lights: sharpness follows size, so a big light is always a crisp sparkle and a small one a soft little
    // star — never a large round hole
    for (var i = 0; i < TR.lights.length; i++) {
      var u = (fr - W.at[i]) / W.len, k = trTwinkle(u, W.rise), x = TR.lights[i][0], y = TR.lights[i][1];
      var R = lerp(TR.lr, W.peak[i], k), sharp = smooth(clamp(k * 2.2));
      s += cut(trGlint(x, y, R, R * lerp(1, W.v, sharp), sharp, lerp(-12, 10, clamp(u)), 0.2, 0.35));
    }

    // the star swells with a small overshoot as the wave arrives, and rocks back to rest (follow-through)
    var su = (fr - G.at) / 12, on = su > 0 && su < 1;
    var pop = !on ? 0 : (su < 0.3 ? easeOutBack(su / 0.3, 2.0) : 1 - smooth((su - 0.3) / 0.7));
    var rock = !on ? 0 : 8 * Math.sin(TAU * su) * Math.pow(1 - su, 1.6);
    s += ink(trStar(TR.cx, S.cy, S.R, S.inner, S.tip, S.notch), chain(scaleAt(TR.cx, S.cy, 1 + 0.085 * pop), rot(TR.cx, S.cy, rock)));

    // light catches the star's upper-right point and slides off as a glint that blooms, turns and fades
    var gu = (fr - G.at - 1) / 11, gk = clamp((trTwinkle(gu, 0.3) - 0.2) / 0.8);   // twinkles out, no dust
    if (gk > 0.001) {
      var tipA = -18 * Math.PI / 180, x0 = TR.cx + Math.cos(tipA) * S.R, y0 = S.cy + Math.sin(tipA) * S.R, gm = easeOut(clamp(gu / 0.45));
      s += ink(trGlint(lerp(x0, G.x, gm), lerp(y0, G.y, gm), G.R * gk, G.R * gk, 1, lerp(-30, 20, clamp(gu)), 0.17, 0.3));
    }
    return s;
  }
};
