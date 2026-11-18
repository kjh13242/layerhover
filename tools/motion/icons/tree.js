// 크리스마스 나무 (tree) — final, built on variant B.
//
// Drawing: one hand-drawn fir silhouette of three boughs. Each bough's side leaves the bough above steeply, sweeps
// out in a concave curve and droops into a soft point with body; under the point a taut hem returns inward and
// carries on into the tree as a tapered wedge-shaped slot, so each bough reads as lying over the one below (and the
// slot still reads as a clean white notch at 2×). The lower bough's top is one convex sweep from the slot's point
// onto its side — no corner, no ledge. The last hem droops at its tips and grows into the trunk through a generous
// collar; the trunk flares into the ground. On top, a five-point star held clear of the softened apex. Inside,
// three negative-space lights rest as small soft buds in a quiet triangle.
//
// Motion (48 frames, 6 s): a twinkle climbs the tree — bottom-left, bottom-right, middle. Each light draws in a
// little, then blooms into a crisp glint shaped to the room it has (the low lights flare outward along their bough,
// the middle one tall), turning a few degrees as it blooms and settling back into a bud. The star answers: it swells
// a touch, light slides off its upper-right point as a sparkle that blooms and turns while the star rocks, and the
// sparkle draws back toward the point and winks out. Then the three lights glow together once, and the tree rests
// (frames 36–47 and 0–1).
var ICON = {
  id: "tree",
  frames: 48,
  at: function (t) { return TREE.draw(t * 48); }
};

var TREE = (function () {
  var CX = 9;
  var P = {
    apex: [9, 4.55], aApex: 66,
    tips: [[12.0, 7.6], [13.95, 11.0], [15.8, 14.35]],
    notches: [[11.2, 7.62], [12.95, 10.98]],
    aNotch: [61, 59],                // side leaving each notch
    aTip: [47, 44, 36],              // side arriving at each tip
    kSide: [0.46, 0.4],
    hemOut: [165, 165, 167],         // hem leaving each tip (< 180 = drooping)
    hemIn: 200, kHem: [0.45, 0.3],
    tipR: 0.3, apexR: 0.14,
    trunk: { w0: 1.7, w1: 3.0, hem: 14.0, collar: 0.45, flare: 67, foot: 0.28 },
    // slots: the hem carried into the tree as a tapered gap; the lower bough's top is one convex sweep from the
    // slot's point onto its side
    slot: { len: [1.5, 2.1], rise: [0.12, 0.45], aEnd: 186, open: [28, 31], land: [1.4, 1.5], k: [0.3, 0.28] },
    star: { c: [9, 2.75], R: 1.72, k: 0.52, bow: 0.06, soft: 0.2, gap: 0.6 },
    lights: [[7.25, 12.25], [10.75, 12.25], [9.0, 9.25]]   // on 2× pixel centres, so a resting bud is one bright pixel
  };
  function rad(a) { return a * Math.PI / 180; }
  function dir(a) { return [Math.cos(rad(a)), Math.sin(rad(a))]; }
  function add(p, d, s) { return [p[0] + d[0] * s, p[1] + d[1] * s]; }
  // cubic from A (leaving at angle a0) to Q (arriving at angle a1); handles as a share of the chord
  function cub(A, a0, Q, a1, k0, k1) {
    var L = dist(A, Q), d0 = dir(a0), d1 = dir(a1);
    return [A, [A[0] + d0[0] * k0 * L, A[1] + d0[1] * k0 * L], [Q[0] - d1[0] * k1 * L, Q[1] - d1[1] * k1 * L], Q];
  }
  function line(A, Q) { return [A, mix(A, Q, 1 / 3), mix(A, Q, 2 / 3), Q]; }
  function rev(S) { return [S[3], S[2], S[1], S[0]]; }
  function mirP(p) { return [2 * CX - p[0], p[1]]; }
  function C(S) { return 'C' + f(S[1][0]) + ' ' + f(S[1][1]) + ' ' + f(S[2][0]) + ' ' + f(S[2][1]) + ' ' + f(S[3][0]) + ' ' + f(S[3][1]); }
  function bez(S, u) {
    var v = 1 - u;
    return [v * v * v * S[0][0] + 3 * v * v * u * S[1][0] + 3 * v * u * u * S[2][0] + u * u * u * S[3][0],
            v * v * v * S[0][1] + 3 * v * v * u * S[1][1] + 3 * v * u * u * S[2][1] + u * u * u * S[3][1]];
  }
  function tan(S, u) {
    var v = 1 - u, x = 3 * v * v * (S[1][0] - S[0][0]) + 6 * v * u * (S[2][0] - S[1][0]) + 3 * u * u * (S[3][0] - S[2][0]);
    var y = 3 * v * v * (S[1][1] - S[0][1]) + 6 * v * u * (S[2][1] - S[1][1]) + 3 * u * u * (S[3][1] - S[2][1]), L = Math.hypot(x, y) || 1;
    return [x / L, y / L];
  }
  function split(S, u) {
    var a = mix(S[0], S[1], u), b = mix(S[1], S[2], u), c = mix(S[2], S[3], u), d = mix(a, b, u), e = mix(b, c, u), p = mix(d, e, u);
    return [[S[0], a, d, p], [p, e, c, S[3]]];
  }
  // parameter where the curve is `d` (straight-line distance) from its start, or from its end
  function uAt(S, d, fromEnd) {
    var lo = 0, hi = 1, ref = fromEnd ? S[3] : S[0];
    for (var i = 0; i < 32; i++) {
      var m = (lo + hi) / 2, far = dist(bez(S, m), ref) > d;
      if (fromEnd ? far : !far) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }
  // soften the corner between A (arriving) and B (leaving): trim both by d, bridge with the corner as control
  function roundCorner(A, B, d) {
    var a = split(A, uAt(A, d, true))[0], b = split(B, uAt(B, d, false))[1], T = A[3];
    return [a, [a[3], mix(a[3], T, 0.55), mix(b[0], T, 0.55), b[0]], b];
  }
  function softChain(segs, r) {
    var out = [], cur = segs[0];
    for (var i = 1; i < segs.length; i++) {
      if (r[i - 1] > 0) { var rc = roundCorner(cur, segs[i], r[i - 1]); out.push(rc[0], rc[1]); cur = rc[2]; }
      else { out.push(cur); cur = segs[i]; }
    }
    out.push(cur);
    return out;
  }
  // right half (apex → bottom centre) mirrored into one closed outline; the apex is softened by `apexR`
  function closedSym(R, apexR) {
    R = R.slice();
    var A = R[0][0];
    if (apexR > 0) R[0] = split(R[0], uAt(R[0], apexR, false))[1];
    var P0 = R[0][0], d = 'M' + f(P0[0]) + ' ' + f(P0[1]);
    R.forEach(function (S) { d += C(S); });
    for (var i = R.length - 1; i >= 0; i--) d += C(rev(R[i].map(mirP)));
    var Q0 = mirP(P0);
    return d + (apexR > 0 ? 'C' + f(lerp(Q0[0], A[0], 0.6)) + ' ' + f(lerp(Q0[1], A[1], 0.6)) + ' ' + f(lerp(P0[0], A[0], 0.6)) + ' ' + f(lerp(P0[1], A[1], 0.6)) + ' ' + f(P0[0]) + ' ' + f(P0[1]) : '') + 'Z';
  }

  // ── silhouette ─────────────────────────────────────────────────────────────────────────────────────
  function sideSeg(i) { return cub(P.notches[i], P.aNotch[i], P.tips[i + 1], P.aTip[i + 1], P.kSide[0], P.kSide[1]); }
  function hemSeg(i) { return cub(P.tips[i], P.hemOut[i], P.notches[i], P.hemIn, P.kHem[0], P.kHem[1]); }
  var SIL = (function () {
    var segs = [cub(P.apex, P.aApex, P.tips[0], P.aTip[0], P.kSide[0], P.kSide[1])], radii = [P.tipR], T = P.trunk;
    for (var i = 0; i < 2; i++) { segs.push(hemSeg(i), sideSeg(i)); radii.push(0, P.tipR); }
    var J = [CX + T.w0 / 2, T.hem];                               // where the hem meets the trunk
    segs.push(cub(P.tips[2], P.hemOut[2], J, 178, 0.36, 0.38)); radii.push(T.collar);
    var G = [CX + T.w1 / 2, 16];
    segs.push(cub(J, 90, G, T.flare, 0.5, 0.35)); radii.push(T.foot);  // trunk side, flaring into the ground
    segs.push(line(G, [CX, 16]));
    return closedSym(softChain(segs, radii), P.apexR);
  })();

  // ── slots: under each upper bough the hem carries on into the tree as the top edge of a wedge-shaped gap (about
  // 0.5 pt open under the notch, narrowing to a point); its lower edge is the lower bough's top. The cut is closed
  // outside the outline so no ink is left along the notch.
  function slotPath(i) {
    var Sl = P.slot, N = P.notches[i], E = [N[0] - Sl.len[i], N[1] - Sl.rise[i]];
    var top = cub(N, P.hemIn, E, Sl.aEnd, 0.4, 0.4);
    // the lower edge is one convex sweep: it leaves the slot's point `open` degrees off the top edge and lands on
    // the lower bough's side `land` pt below the notch, along the side's own tangent (no corner at the shoulder)
    var side = sideSeg(i), uS = uAt(side, Sl.land[i], false), S = bez(side, uS), tS = tan(side, uS);
    var L = dist(E, S), low = [E, add(E, dir(Sl.aEnd - 180 + Sl.open[i]), Sl.k[0] * L), add(S, tS, -Sl.k[1] * L), S];
    var So = add(S, [tS[1], -tS[0]], 0.5), No = add(N, dir((P.hemIn - 180 + P.aNotch[i]) / 2), 0.5);
    return 'M' + f(N[0]) + ' ' + f(N[1]) + C(top) + C(low) + 'L' + f(So[0]) + ' ' + f(So[1]) + 'L' + f(No[0]) + ' ' + f(No[1]) + 'Z';
  }
  var SLOTS = (function () {
    var out = '';
    for (var i = 0; i < 2; i++) { var d = slotPath(i); out += cut(d) + cut(d, function (x, y) { return mirP([x, y]); }); }
    return out;
  })();

  // ── star: five points, sides bowed slightly in, tips softened ───────────────────────────────────────
  function star5(cx, cy, R, k, bow, deg, soft) {
    var T = [], V = [], r0 = (deg || 0) - 90, d = '', i;
    for (i = 0; i < 5; i++) {
      var a = rad(r0 + 72 * i), b = rad(r0 + 72 * i + 36);
      T.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      V.push([cx + R * k * Math.cos(b), cy + R * k * Math.sin(b)]);
    }
    function towards(p, q, dd) { return mix(p, q, dd / dist(p, q)); }
    function edge(p, q) { var m = mix(p, q, 0.5); return 'Q' + f(lerp(m[0], cx, bow)) + ' ' + f(lerp(m[1], cy, bow)) + ' ' + f(q[0]) + ' ' + f(q[1]); }
    for (i = 0; i < 5; i++) {
      var A = towards(T[i], V[(i + 4) % 5], soft), Bp = towards(T[i], V[i], soft);
      d += (i ? edge(V[(i + 4) % 5], A) : 'M' + f(A[0]) + ' ' + f(A[1])) + 'Q' + f(T[i][0]) + ' ' + f(T[i][1]) + ' ' + f(Bp[0]) + ' ' + f(Bp[1]) + edge(Bp, V[i]);
    }
    var A0 = towards(T[0], V[4], soft);
    return d + edge(V[4], A0) + 'Z';
  }

  // ── glint: four rays (up, right, down, left before turning) joined by cubic sides drawn in toward the centre
  // (pinch) while keeping their body; each ray tip is softened by `soft`. One path structure in every state.
  function glint(cx, cy, R, body, pinch, deg, soft) {
    var sides = [], i;
    for (i = 0; i < 4; i++) {
      var j = (i + 1) % 4, uA = dir(deg - 90 + 90 * i), uB = dir(deg + 90 * i), Rm = Math.sqrt(R[i] * R[j]);
      var A = [cx + uA[0] * R[i], cy + uA[1] * R[i]], B = [cx + uB[0] * R[j], cy + uB[1] * R[j]];
      var c1 = [cx + uA[0] * R[i] * pinch + uB[0] * body * Rm, cy + uA[1] * R[i] * pinch + uB[1] * body * Rm];
      var c2 = [cx + uB[0] * R[j] * pinch + uA[0] * body * Rm, cy + uB[1] * R[j] * pinch + uA[1] * body * Rm];
      var S = [A, c1, c2, B];
      S = split(S, uAt(S, soft, false))[1];
      sides.push(split(S, uAt(S, soft, true))[0]);
    }
    var d = 'M' + f(sides[0][0][0]) + ' ' + f(sides[0][0][1]);
    for (i = 0; i < 4; i++) {
      var nx = sides[(i + 1) % 4], tipD = dir(deg + 90 * i), tipR = R[(i + 1) % 4];
      var T = [cx + tipD[0] * tipR, cy + tipD[1] * tipR];
      d += C(sides[i]) + 'Q' + f(T[0]) + ' ' + f(T[1]) + ' ' + f(nx[0][0]) + ' ' + f(nx[0][1]);
    }
    return d + 'Z';
  }

  // ── lights ─────────────────────────────────────────────────────────────────────────────────────────
  // At rest a light is a small soft bud; at its flash a crisp glint with body. Sharpness follows size.
  var BUD = { r: 0.58, body: 0.38, pinch: 0.46, soft: 0.1 }, FLASH = { body: 0.36, pinch: 0.4, soft: 0.04 };
  var LIGHTS = [   // rays at the flash (up, right, down, left): the low lights flare outward along their bough
    { p: P.lights[0], peak: [0.82, 1.0, 0.9, 1.72], turn: 1 },   // the long ray dips along the bough as it blooms
    { p: P.lights[1], peak: [0.82, 1.72, 0.9, 1.0], turn: -1 },
    { p: P.lights[2], peak: [1.3, 1.0, 1.2, 1.0], turn: 1 }
  ];
  var SOLO = [{ i: 0, at: 1 }, { i: 1, at: 5 }, { i: 2, at: 9 }], SOLO_LEN = 11;
  var GLOW = { at: [25.6, 25.6, 25], len: 11, scale: 0.8 };   // the finale: all three together, at 80 % of a solo flash
  // one twinkle over `len` frames: a frame of drawing in (to 0.75), a two-frame bloom, a long settle through a
  // soft overshoot (0.88). Returns the bud's size k (≤ 1), how far toward the flash it is (e) and a small turn:
  // back as it draws in, through upright at the peak, a little forward as it settles, home at rest
  function twinkle(df, len) {
    if (df <= 0 || df >= len) return { k: 1, e: 0, twist: 0 };
    var u = df / len, a = 1 / len, b = 3 / len, c = 0.8, k;
    if (u < a) k = 1 - 0.25 * smooth(u / a);
    else if (u < b) k = lerp(0.75, 2, easeOut((u - a) / (b - a)));
    else if (u < c) k = lerp(2, 0.88, smooth((u - b) / (c - b)));
    else k = lerp(0.88, 1, smooth((u - c) / (1 - c)));
    var twist = -6 * Math.sin(Math.PI * clamp(df / 3)) + 4 * Math.sin(Math.PI * clamp((df - 3) / (len - 3)));
    return { k: Math.min(k, 1), e: clamp(k - 1), twist: twist };
  }
  function light(L, w, scale) {
    var e = w.e * scale, R = [];
    for (var j = 0; j < 4; j++) R.push(lerp(BUD.r, L.peak[j], e) * w.k);
    return glint(L.p[0], L.p[1], R, lerp(BUD.body, FLASH.body, e), lerp(BUD.pinch, FLASH.pinch, e), w.twist * L.turn, lerp(BUD.soft, FLASH.soft, e) * w.k);
  }

  // ── star motion: a small swell about its top point as the climb arrives, then a damped rock as the sparkle
  // leaves (follow-through)
  var STAR_AT = 12, GLINT_AT = 14;
  function starPose(fr) {
    var su = (fr - STAR_AT) / 3, swell = su > 0 && su < 1 ? 0.045 * Math.sin(Math.PI * su) : 0;
    var ru = (fr - GLINT_AT) / 12, rock = ru > 0 && ru < 1 ? 8 * Math.sin(TAU * ru) * Math.pow(1 - ru, 1.6) : 0;
    return { swell: swell, rock: rock };
  }
  // the sparkle, frame by frame from its birth: how far it has slid from the point toward G (share), its radius and
  // turn. It is born lined up with the star's upper-right point (−18°), so the point itself seems to spark; it slides
  // out with ease-out while it blooms and turns, then shrinks back along its path toward the point and winks out
  // while it is still a 1.3 pt sparkle with body — it never leaves a speck behind.
  var GLINT = { G: [12.75, 2.45], body: 0.24, pinch: 0.33, soft: 0.03,
    out: [0, 0.55, 0.88, 1, 1, 0.9, 0.7, 0.42], R: [0.55, 1.0, 1.25, 1.32, 1.25, 1.08, 0.86, 0.66],
    rot: [-18, -8, 2, 10, 16, 20, 22, 23] };
  function glintPose(fr, tip) {
    var k = Math.round(fr - GLINT_AT);
    if (k < 0 || k >= GLINT.out.length) return null;
    return { p: mix(tip, GLINT.G, GLINT.out[k]), R: GLINT.R[k], rot: GLINT.rot[k] };
  }

  function draw(fr) {
    var s = ink(SIL) + SLOTS;
    for (var q = 0; q < 3; q++) {
      var i = SOLO[q].i, L = LIGHTS[i], w = twinkle(fr - SOLO[q].at, SOLO_LEN), g = twinkle(fr - GLOW.at[i], GLOW.len);
      var glow = g.e > 0 || g.k < 1;
      s += cut(light(L, glow ? g : w, glow ? GLOW.scale : 1));
    }
    var S = P.star, sp = starPose(fr), top = [S.c[0], S.c[1] - S.R];
    var pose = chain(scaleAt(top[0], top[1], 1 + sp.swell), rot(S.c[0], S.c[1], sp.rock));
    var st = tp(star5(S.c[0], S.c[1], S.R, S.k, S.bow, 0, S.soft), pose);
    s += cutAround(st, S.gap) + front(st);
    var tip = pose(S.c[0] + S.R * Math.cos(rad(-18)), S.c[1] + S.R * Math.sin(rad(-18)));
    var gp = glintPose(fr, tip);
    if (gp) s += front(glint(gp.p[0], gp.p[1], [gp.R, gp.R, gp.R, gp.R], GLINT.body, GLINT.pinch, gp.rot, GLINT.soft * gp.R));
    return s;
  }
  return { draw: draw };
})();
