// 크리스마스 나무 (tree) — variant B: elegance first.
//
// Drawing: one hand-drawn fir silhouette of three boughs. Each bough's side leaves the bough above steeply, sweeps
// out in a long concave curve and droops into a fine, softly rounded point; under the point a taut hem returns
// inward and carries on into the tree as a fine tapered slot, so each bough reads as lying over the one below. The
// lower bough's shoulder rolls out from under that slot. The last hem droops at its tips and arches into a trunk
// that flares into the ground. On top, a five-point star with slender points, slightly concave sides and softened
// tips, held clear of the apex by a cut. Inside, three negative-space glints sit in a quiet triangle.
//
// Motion (6 s): a twinkle climbs the tree. Each light draws in, flashes into a sharp glint shaped to the room it
// has (the low lights flare outward along their bough, the middle one flares tall between the boughs), then turns
// a quarter as it settles. The star answers: a small wind-up, one point's turn (72°) while it draws in and rises a
// touch, a soft settle. Then the three lights brighten together once, and the tree rests.
var ICON = {
  id: "tree",
  frames: 48,
  at: function (t) { return TREE.draw(t); }
};

var TREE = (function () {
  var P = {
    apex: [9, 4.55], aApex: 66,
    tips: [[12.0, 7.6], [13.95, 11.0], [15.8, 14.35]],
    notches: [[10.95, 7.38], [12.7, 10.78]],
    aNotch: [61, 59],                // side leaving each notch
    aTip: [32, 30, 29],              // side arriving at each tip
    kSide: [0.46, 0.4],
    hemOut: [163, 163, 167],         // hem leaving each tip (< 180 = drooping)
    hemIn: 200, kHem: [0.45, 0.3],
    trunk: { w0: 1.7, w1: 3.0, hem: 14.0, fillet: 0.25 },
    tipR: 0.15, notchR: 0,
    star: { c: [9, 2.75], R: 1.72, k: 0.47, bow: 0.06, soft: 0.12, gap: 0.6 },
    lights: [[7.4, 12.3], [10.6, 12.3], [9.0, 9.45]],
    lightR: 0.78, lightInner: 0.46, lightLong: 0.72,
    slot: { len: [1.2, 1.75], rise: [0.12, 0.2], w: 0.6, aEnd: 186 }
  };
  var CX = 9;
  function rad(a) { return a * Math.PI / 180; }
  function dir(a) { return [Math.cos(rad(a)), Math.sin(rad(a))]; }
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
  function split(S, u) {
    var a = mix(S[0], S[1], u), b = mix(S[1], S[2], u), c = mix(S[2], S[3], u), d = mix(a, b, u), e = mix(b, c, u), p = mix(d, e, u);
    return [[S[0], a, d, p], [p, e, c, S[3]]];
  }
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
  // right half (apex → bottom centre) mirrored into one closed outline
  function closedSym(R) {
    var d = 'M' + f(R[0][0][0]) + ' ' + f(R[0][0][1]);
    R.forEach(function (S) { d += C(S); });
    for (var i = R.length - 1; i >= 0; i--) d += C(rev(R[i].map(mirP)));
    return d + 'Z';
  }

  // ── silhouette: three tiers, each a concave sweep out to a fine, slightly drooping point; under the point
  // a short taut hem returns into the notch. The last hem arches into the trunk, which flares into the ground.
  var SIL = (function () {
    var segs = [], radii = [], top = P.apex, a0 = P.aApex, T = P.trunk, i;
    for (i = 0; i < 3; i++) {
      segs.push(cub(top, a0, P.tips[i], P.aTip[i], P.kSide[0], P.kSide[1])); radii.push(P.tipR);
      if (i < 2) {
        segs.push(cub(P.tips[i], P.hemOut[i], P.notches[i], P.hemIn, P.kHem[0], P.kHem[1])); radii.push(P.notchR);
        top = P.notches[i]; a0 = P.aNotch[i];
      }
    }
    var tx = 9 + T.w0 / 2, J = [tx, T.hem];                     // where the hem meets the trunk
    segs.push(cub(P.tips[2], P.hemOut[2], J, 178, 0.36, 0.38)); radii.push(T.fillet);
    var G = [9 + T.w1 / 2, 16];
    segs.push(cub(J, 90, G, 62, 0.5, 0.35)); radii.push(0);     // trunk side, flaring into the ground
    segs.push(line(G, [9, 16]));
    return closedSym(softChain(segs, radii));
  })();

  // ── star: five slender points, sides bowed slightly in, tips softened ───────────────────────────
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

  // a fine tapered slot that carries each upper hem a little way into the tree, so the boughs read as layered
  function slots() {
    if (!P.slot) return '';
    var out = '', Sl = P.slot;
    for (var i = 0; i < 2; i++) {
      var N = P.notches[i], E = [N[0] - Sl.len[i], N[1] - Sl.rise[i]];
      var top = cub(N, P.hemIn, E, Sl.aEnd, 0.4, 0.4);
      var sd = dir(P.aNotch[i]), S = [N[0] + sd[0] * Sl.w, N[1] + sd[1] * Sl.w];
      var low = cub(E, Sl.aEnd - 180 + 4, S, P.hemIn - 180 + 26, 0.45, 0.4);   // the lower bough's shoulder rolls into its side
      // close through the open notch (between the hem, leaving N at hemIn − 180°, and the next tier's side), so no
      // hairline of ink survives along the tier's edge
      var on = dir(P.aNotch[i] - 90), wedge = dir((P.hemIn - 180 + P.aNotch[i]) / 2);
      var So = [S[0] + on[0] * 0.3, S[1] + on[1] * 0.3], No = [N[0] + wedge[0] * 0.3, N[1] + wedge[1] * 0.3];
      var d = 'M' + f(N[0]) + ' ' + f(N[1]) + C(top) + C(low) + 'L' + f(So[0]) + ' ' + f(So[1]) + 'L' + f(No[0]) + ' ' + f(No[1]) + 'Z';
      out += cut(d) + cut(d, function (x, y) { return mirP([x, y]); });
    }
    return out;
  }

  // ── motion ───────────────────────────────────────────────────────────────────────────────────────
  // A light rests as a small, soft upright glint. Its twinkle over u ∈ [0, 1]: it draws in a little (anticipation),
  // flashes into a tall, sharp glint, then spins a quarter turn as it settles (a quarter turn is the resting pose
  // again), with a soft overshoot at the end.
  function twinkle(u, peak) {
    if (u <= 0 || u >= 1) return { k: 1, sharp: 0, turn: 0 };
    var k;
    if (u < 0.16) k = 1 - 0.25 * smooth(u / 0.16);                                 // draw in
    else if (u < 0.4) k = lerp(0.75, peak, easeOut((u - 0.16) / 0.24));           // flash
    else if (u < 0.48) k = peak;                                                    // hold
    else if (u < 0.86) k = lerp(peak, 0.88, smoother((u - 0.48) / 0.38));         // settle
    else k = lerp(0.88, 1, smooth((u - 0.86) / 0.14));                             // back to rest
    var turn = -0.08 * pulse(u, 0.1, 0.46) + smoother(clamp((u - 0.42) / 0.5));    // a small wind-up, then the spin
    var sharp = Math.max(clamp((k - 1) / (peak - 1)), Math.sin(Math.PI * clamp(turn)));   // stays crisp while it spins
    return { k: k, sharp: sharp, turn: turn };
  }
  // a four-ray glint whose rays can differ in length: up, right, down, left (before the turn)
  function glint4(cx, cy, R, inner, deg) {
    var d = '', a0 = rad(deg - 90);
    for (var i = 0; i < 4; i++) {
      var a = a0 + Math.PI / 2 * i, b = a + Math.PI / 4, an = a + Math.PI / 2, j = (i + 1) % 4;
      var ri = Math.sqrt(R[i] * R[j]) * inner;
      if (!i) d = 'M' + f(cx + Math.cos(a) * R[0]) + ' ' + f(cy + Math.sin(a) * R[0]);
      d += 'Q' + f(cx + Math.cos(b) * ri) + ' ' + f(cy + Math.sin(b) * ri) + ' ' + f(cx + Math.cos(an) * R[j]) + ' ' + f(cy + Math.sin(an) * R[j]);
    }
    return d + 'Z';
  }
  // the flash keeps to the room it has: the middle light flares tall, up between the boughs; the low lights flare
  // wide, outward along their bough and short toward each other. The shaping fades as the glint turns.
  function glint(L, r, sharp, turn) {
    var e = sharp * (Math.cos(Math.PI * clamp(turn)) * 0.5 + 0.5), F = L.flare;
    var R = [r * lerp(1, F[0], e), r * lerp(1, F[1], e), r * lerp(1, F[2], e), r * lerp(1, F[3], e)];
    return glint4(L.p[0], L.p[1], R, lerp(P.lightInner, 0.2, sharp), 90 * turn);
  }
  var LIGHTS = [   // centre, ray lengths at the flash (up, right, down, left)
    { p: P.lights[0], flare: [1, 0.95, 1, 1.5] },
    { p: P.lights[1], flare: [1, 1.5, 1, 0.95] },
    { p: P.lights[2], flare: [1, P.lightLong, 1, P.lightLong] }
  ];
  var SEQ = [   // light, start, length (share of the loop), peak size
    { i: 0, a: 0.03, d: 0.19, peak: 1.65 },
    { i: 1, a: 0.11, d: 0.19, peak: 1.65 },
    { i: 2, a: 0.19, d: 0.21, peak: 2.6 }
  ];
  var STAR_A = 0.33, STAR_D = 0.2;                 // the star answers the last light
  var ALL_A = 0.5, ALL_D = 0.2, ALL = [1.5, 1.5, 1.7];   // then every light brightens together once

  // the star turns one point (72°): a small wind-up against the turn, then the turn, drawing in a little and
  // rising a touch at its middle (so a downward point never touches the tree), then a soft settle past upright
  function starPose(v) {
    if (v <= 0 || v >= 1) return { turn: 0, k: 1, lift: 0 };
    var m = clamp((v - 0.12) / 0.66), mid = Math.sin(Math.PI * smoother(m));
    var turn = -6 * pulse(v, 0, 0.26) + 72 * easeInOut(m) + 3 * pulse(v, 0.74, 1);
    return { turn: turn, k: 1 - 0.18 * mid, lift: 0.36 * mid };
  }

  function draw(t) {
    var s = ink(SIL) + slots();
    var all = clamp((t - ALL_A) / ALL_D), swell = Math.sin(Math.PI * smoother(all));
    SEQ.forEach(function (q) {
      var w = twinkle((t - q.a) / q.d, q.peak);
      var g = 1 + (ALL[q.i] - 1) * swell;                                         // the shared brightening
      s += cut(glint(LIGHTS[q.i], P.lightR * w.k * g, Math.max(w.sharp, swell), w.turn));
    });
    var S = P.star, sp = starPose((t - STAR_A) / STAR_D);
    var st = star5(S.c[0], S.c[1] - sp.lift, S.R * sp.k, S.k, S.bow, sp.turn, S.soft);
    return s + cutAround(st, S.gap) + front(st);
  }
  return { draw: draw };
})();
