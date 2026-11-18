// 서핑 (Surfing) — final, built on variant A (the director's pick) with C's choreography and B's pen-tool construction.
// The wave: one bold curl — a convex back, a clean round barrel, a claw lip that throws forward after the rider passes
// and draws back as he climbs — and one crafted face that sweeps out of the barrel into the trough; a swell lifts it
// under the rider at the stall. Inside, a calligraphic rolling line curls from the trough up under the barrel; strokes
// run along it twice per loop, so the wave keeps rolling in.
// The rider: one silhouette from heel to hair, crouched on a pointed, rockered board fitted onto the face — the tail
// sits at the waterline, the bottom rail planes into the water. One 0.7 cut runs along the board's bottom; behind the
// tail it trails off as a wake just under the surface, ahead of the board it becomes the calm water line that runs out
// at the right edge. Nothing outlines the tail or the nose.
// Loop (6 s): trim (poster, a gentle bob) → drop → bottom turn (compressed, nose up, rear hand reaching back as the
// lip throws, a sheet of spray off the tail) → climb on the swell → stall high on the face, tall → snap → trim.
var ICON = {
  id: "surf",
  frames: 48,
  at: function (t) { return surfScene(t); }
};

// ── vectors ──────────────────────────────────────────────────────────────────────────────────────
function sAdd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function sSub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function sMul(a, k) { return [a[0] * k, a[1] * k]; }
function sUnit(a) { var l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }
function sAng(a) { return Math.atan2(a[1], a[0]) * 180 / Math.PI; }
function sDir(deg) { var r = deg * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
function sRot(p, deg) { var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
function sDot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
function sPerp(a) { return [-a[1], a[0]]; }
function sPt(p) { return f(p[0]) + ' ' + f(p[1]); }

// ── pen tool: nodes [x, y, aOut, aIn, kOut, kIn] ───────────────────────────────────────────────
// a = direction of travel through the node (deg; 0 right, 90 down). aIn defaults to aOut: a smooth node, so the outline
// cannot kink there. k = handle length as a share of the chord (default 0.36). Corners are explicit (aIn ≠ aOut).
function bz(nodes, closed) {
  var n = nodes.length, d = 'M' + sPt(nodes[0]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var A = nodes[i], B = nodes[(i + 1) % n], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    var ao = A[2], ai = B[3] == null ? B[2] : B[3];
    var ko = (A[4] == null ? 0.36 : A[4]) * L, ki = (B[5] == null ? 0.36 : B[5]) * L;
    d += 'C' + sPt(sAdd(A, sMul(sDir(ao), ko))) + ' ' + sPt(sSub(B, sMul(sDir(ai), ki))) + ' ' + sPt(B);
  }
  return d + (closed ? 'Z' : '');
}
function nd(p, aOut, aIn, kOut, kIn) { return [p[0], p[1], aOut, aIn, kOut, kIn]; }
// nodes drawn in a local frame (origin o, rotated by deg, scaled by k) → world
function inFrame(nodes, o, deg, k) {
  k = k || 1;
  return nodes.map(function (q) {
    var p = sAdd(o, sRot([q[0] * k, q[1] * k], deg));
    return [p[0], p[1], q[2] + deg, q[3] == null ? q[3] : q[3] + deg, q[4], q[5]];
  });
}
// sample an open bz node list into points
function bzPts(nodes, per) {
  var segs = parsePath(bz(nodes, false)), pts = [], cur = null;
  segs.forEach(function (g) {
    if (g.c === 'M') { cur = [g.p[0], g.p[1]]; pts.push(cur); return; }
    var p0 = cur, p1 = [g.p[0], g.p[1]], p2 = [g.p[2], g.p[3]], p3 = [g.p[4], g.p[5]];
    for (var i = 1; i <= per; i++) {
      var u = i / per, v = 1 - u;
      pts.push([v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
        v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]);
    }
    cur = p3;
  });
  return pts;
}
// a sampled polyline with arc length: at(s) → { p, a } (point, tangent angle)
function track(pts) {
  var S = [0];
  for (var i = 1; i < pts.length; i++) S.push(S[i - 1] + dist(pts[i - 1], pts[i]));
  return {
    pts: pts, S: S, total: S[S.length - 1],
    at: function (s) {
      var j = 1; while (j < S.length - 1 && S[j] < s) j++;
      var k = clamp((s - S[j - 1]) / ((S[j] - S[j - 1]) || 1));
      return { p: mix(pts[j - 1], pts[j], k), a: sAng(sSub(pts[j], pts[j - 1])) };
    },
    sAtX: function (x) {
      for (var j = 1; j < pts.length; j++) if (pts[j][0] >= x && pts[j - 1][0] <= x)
        return lerp(S[j - 1], S[j], (x - pts[j - 1][0]) / ((pts[j][0] - pts[j - 1][0]) || 1));
      return x < pts[0][0] ? 0 : S[S.length - 1];
    },
    yAtX: function (x) { return this.at(this.sAtX(x)).p[1]; }
  };
}

// ── timing: periodic Hermite through keys [[t, v, slope?], ...] (C's sfSpline) ────────────────────
function spl(keys, t) {
  var n = keys.length, i = 0;
  t = wrap01(t);
  for (var j = 0; j < n; j++) if (keys[j][0] <= t) i = j;
  function T(m) { return keys[((m % n) + n) % n][0] + Math.floor(m / n); }
  function V(m) { return keys[((m % n) + n) % n][1]; }
  function M(m) { var k = keys[((m % n) + n) % n]; return k[2] != null ? k[2] : (V(m + 1) - V(m - 1)) / (T(m + 1) - T(m - 1)); }
  var t0 = T(i), h = T(i + 1) - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * V(i) + (u3 - 2 * u2 + u) * h * M(i) + (-2 * u3 + 3 * u2) * V(i + 1) + (u3 - u2) * h * M(i + 1);
}

// ── the water ────────────────────────────────────────────────────────────────────────────────────
// lip at rest (0) and thrown (1): same nodes, blended. The crest top is ONE smooth node, so it cannot kink at any blend.
var LIP0 = [
  [7.002, 2.55, 0],  // crest top
  [9.118, 3.64, 57],  // outer lip
  [9.486, 4.75, 84],  // lip front
  [9.201, 5.89, 128],
  [8.152, 6.55, -55, 164, 0.36, 0.36],  // claw tip
  [8.373, 5.57, -102],  // underside of the lip
  [7.692, 4.85, -161],  // barrel ceiling
  [5.696, 5.27, 142]
];
var LIP1 = [
  [7.14, 2.52, 2],
  [9.578, 3.69, 61],
  [10.222, 5.15, 94],
  [10.075, 6.64, 138],
  [9.026, 7.4, -49, 172, 0.36, 0.36],
  [9.017, 6.12, -96],
  [8.06, 5.05, -156],
  [5.788, 5.32, 144]
];
var BACK = [[2.3, 16, -88, 180, 0.42], [2.908, 8.2, -77], [4.15, 4.6, -56]];
// the face: out of the barrel's back wall, round through the barrel bottom, sweeping into the trough; it meets the
// right edge on the 0.5 grid. As the rider climbs to the stall a swell lifts the face under him (the wave keeps
// rolling in), and it settles again by the trim.
function faceNodes(L) {
  return [
    [4.564, 7.5, 94, null, 0.5],
    [6.15, 11.1 - 0.35 * L, 44],
    [10.6, 13.3 - L, 18 - 2 * L],
    [17, 15, 90, 8]
  ];
}
function swellAt(t) { return 1.0 * spl([[0, 0, 0], [0.3, -0.42, 0], [0.6, 1, 0], [0.84, 0.12]], t); }
var FACES = {};
function faceAt(t) {
  var key = Math.round(wrap01(t) * 9600);
  if (!FACES[key]) { var n = faceNodes(swellAt(t)); FACES[key] = track(bzPts(n, 40)); FACES[key].nodes = n; }
  return FACES[key];
}
var BACK_PTS = bzPts(BACK, 18);
function waveNodes(k, F) {
  var L = LIP0.map(function (a, i) {
    var b = LIP1[i];
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), a[3] == null ? null : lerp(a[3], b[3], k), a[4], a[5]];
  });
  return BACK.concat(L).concat(F.nodes).concat([[17, 16, 180, 90]]);
}

// ── the board (board frame: deck centre 0,0, nose +x, y down) ───────────────────────────────────
// pointed nose (0.45 rise), flat deck with a hint of tail kick, bottom thickest just behind centre, crisp squash tail
var BOARD = bz([
  [4.2, -0.5, 166, -38],                     // nose: a fine point
  [2.2, -0.05, 177],
  [-1.0, 0.0, 180],
  [-3.35, -0.06, 181, null, 0.39, 0.39],     // deck → tail corner (r 0.2)
  [-3.56, 0.14, 90, null, 0.39, 0.39],       // squash tail: a short, crisp edge (0.8)
  [-3.56, 0.54, 90, null, 0.39, 0.39],
  [-3.35, 0.74, 0, null, 0.39, 0.39],        // tail corner (r 0.2) → bottom
  [-1.0, 1.05, 0],                           // thickest (1.05) just behind centre
  [2.2, 0.8, -17],
  [3.5, 0.12, -38]                           // rocker: 0.4 thick, then the point
], true);
// fitting the board onto the face: the waterline meets the tail at TAIL_W, and the bottom crosses the face at CROSS
var TAIL_W = [-3.56, 0.1], CROSS = [1.3, 0.9], PIVOT = [-1.2, 0.5];
var FIT_L = dist(TAIL_W, CROSS), FIT_A = sAng(sSub(CROSS, TAIL_W));
// tx: where the tail meets the water; pitch tilts the board about a point behind its centre (+ = nose down), so a
// nose-up turn digs the tail in a little and a nose-down snap lifts it, while the nose stays clear of the face
function boardOnFace(F, tx, pitch) {
  var s0 = F.sAtX(tx), A = F.at(s0).p, s1 = s0;
  while (s1 < F.total && dist(F.at(s1).p, A) < FIT_L) s1 += 0.01;
  var th0 = sAng(sSub(F.at(s1).p, A)) - FIT_A, th = th0 + pitch;
  var pv = sAdd(A, sRot(sSub(PIVOT, TAIL_W), th0));
  return { C: sSub(pv, sRot(PIVOT, th)), th: th, s0: s0, s1: s1 };
}

// ── key poses ────────────────────────────────────────────────────────────────────────────────────
// tx: where the tail meets the water (x on the face); pitch: extra nose-down tilt about PIVOT. hx, hh: pelvis in the
// board frame (forward, height). lean: torso from vertical (world, + = toward the nose). head: head tilt on the torso.
// b, fr: back / front arm as WORLD angles [upper arm, forearm, hand], so the arms sweep in clean arcs whatever the board
// does.
var KEYS = [
  { t: 0.00, tx: 8.35, pitch: 0, hx: 0.2, hh: 3.45, lean: 24, head: -20, b: [186, 158, 146], fr: [14, 40, 52] },     // TRIM (poster)
  { t: 0.12, tx: 8.55, pitch: 1.5, hx: 0.15, hh: 3.3, lean: 22, head: -18, b: [182, 152, 140], fr: [10, 36, 48] },    // trim, bobbing
  { t: 0.30, tx: 9.32, pitch: -8, hx: -0.1, hh: 2.75, lean: 8, head: -8, b: [188, 160, 148], fr: [-6, 22, 34] },      // BOTTOM TURN
  { t: 0.62, tx: 7.62, pitch: -2, hx: 0.15, hh: 4.0, lean: 12, head: -12, b: [180, 146, 132], fr: [8, 36, 50] },     // STALL
  { t: 0.76, tx: 8.0, pitch: 9, hx: 0.35, hh: 3.3, lean: 33, head: -26, b: [198, 166, 152], fr: [24, 52, 64] }        // SNAP
];
// the lip throws forward and down after the rider has passed the top, peaking as his rear hand reaches back at the
// bottom turn, and draws back past its rest pose while he climbs into the pocket, so it never crowds him (B's PITCH as
// overlapping action; C's 'Creation of Adam' beat)
function lipAt(t) { return clamp(spl([[0, 0.4], [0.3, 1, 0], [0.62, -0.45, 0], [0.8, -0.05]], t), -0.45, 1); }
function key(name, t, idx) { return spl(KEYS.map(function (k) { return [k.t, idx == null ? k[name] : k[name][idx]]; }), t); }
function poseAt(t) {
  var lag = 0.035, lead = 0.025, F = faceAt(t), Bd = boardOnFace(F, key('tx', t), key('pitch', t));
  return {
    F: F, C: Bd.C, th: Bd.th, bd: Bd, hx: key('hx', t), hh: key('hh', t), lean: key('lean', t),
    head: key('head', t + lead), hair: 0,
    b: [key('b', t, 0), key('b', t - lag, 1), key('b', t - 2 * lag, 2)],
    fr: [key('fr', t, 0), key('fr', t - lag, 1), key('fr', t - 2 * lag, 2)]
  };
}

// ── the rider ────────────────────────────────────────────────────────────────────────────────────
var ANK_B = -2.05, ANK_F = 1.75, ANK_H = 0.52;       // ankles over the deck (board frame)
var THIGH_B = 2.05, THIGH_F = 2.2, SHIN = 1.95;
var UARM = 1.42, FARM = 1.2, HS = 0.88;

function ik2(a, b, l1, l2, prefer) {
  var d = sSub(b, a), D = Math.min(Math.hypot(d[0], d[1]), l1 + l2 - 0.001), u = sUnit(d);
  var x = (l1 * l1 - l2 * l2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  var m = sAdd(a, sMul(u, x)), n = sPerp(u), k1 = sAdd(m, sMul(n, h)), k2 = sAdd(m, sMul(n, -h));
  return sDot(sSub(k1, k2), prefer) > 0 ? k1 : k2;
}
// C1 Hermite half-width profile through [u, h] stops (u = 0..1 along a bone); returns [h, dh/du]. Few stops, no ripple.
function prof(stops) {
  var n = stops.length, m = [];
  for (var i = 0; i < n; i++) {
    var a = stops[Math.max(0, i - 1)], b = stops[Math.min(n - 1, i + 1)];
    m.push((b[1] - a[1]) / (b[0] - a[0]));
  }
  return function (u) {
    var i = 1; while (i < n - 1 && u > stops[i][0]) i++;
    var a = stops[i - 1], b = stops[i], h = b[0] - a[0], x = (u - a[0]) / h, x2 = x * x, x3 = x2 * x;
    return [(2 * x3 - 3 * x2 + 1) * a[1] + (x3 - 2 * x2 + x) * h * m[i - 1] + (-2 * x3 + 3 * x2) * b[1] + (x3 - x2) * h * m[i],
      ((6 * x2 - 6 * x) * a[1] + (3 * x2 - 4 * x + 1) * h * m[i - 1] + (-6 * x2 + 6 * x) * b[1] + (3 * x2 - 2 * x) * h * m[i]) / h];
  };
}
// a node on the edge of a bone (J, unit d, length L, outer normal n) at u, on side +1 (outer) / −1 (inner), with the exact
// tangent of the tapering edge; back = travelling toward the root
function edge(J, d, L, n, pf, u, side, back) {
  var r = pf(u), tg = sAdd(d, sMul(n, side * r[1] / L));
  return nd(sAdd(sAdd(J, sMul(d, u * L)), sMul(n, side * r[0])), sAng(back ? sMul(tg, -1) : tg));
}
function bendFrame(d1, d2) {      // normals on the convex (outer) side of a joint, and the crease point factor
  var sg = (d1[0] * d2[1] - d1[1] * d2[0]) > 0 ? -1 : 1, n1 = sMul(sPerp(d1), sg), n2 = sMul(sPerp(d2), sg);
  return { sg: sg, n1: n1, n2: n2, nb: sUnit(sAdd(n1, n2)), c: 1 / ((1 + sDot(n1, n2)) || 1) };
}

// ARM: one outline. Deltoid 1.3 → upper arm 0.98 → elbow 0.86 (round outside, crisp crease inside) → forearm swell
// 0.94 at 30 % → wrist 0.7 → mitten hand 0.86 × 1.0, flexed off the forearm, its soft point slanted to the palm side.
var ARM_U = prof([[0, 0.65], [0.55, 0.49], [1, 0.43]]);
var ARM_F = prof([[0, 0.44], [0.3, 0.48], [1, 0.4]]);
function armShape(S, a) {
  var d1 = sDir(a[0]), d2 = sDir(a[1]), dh = sDir(a[2]), bf = bendFrame(d1, d2);
  var n1 = bf.n1, n2 = bf.n2, nh = sMul(sPerp(dh), bf.sg), nw = sUnit(sAdd(n2, nh));
  var E = sAdd(S, sMul(d1, UARM)), W = sAdd(E, sMul(d2, FARM));
  var crease = sSub(E, sMul(sAdd(n1, n2), 0.4 * bf.c));
  function Hd(x, y) { return sAdd(W, sAdd(sMul(dh, x), sMul(nh, y))); }
  function Hv(x, y) { return sAng(sAdd(sMul(dh, x), sMul(nh, y))); }
  return bz([
    nd(sAdd(S, sMul(d1, -0.35)), sAng(n1), null, 0.5, 0.5),                 // root (inside the torso)
    edge(S, d1, UARM, n1, ARM_U, 0.08, 1),                                   // deltoid
    edge(S, d1, UARM, n1, ARM_U, 0.55, 1),
    nd(sAdd(E, sMul(bf.nb, 0.44)), sAng(sAdd(d1, d2))),                      // round outer elbow
    edge(E, d2, FARM, n2, ARM_F, 0.3, 1),                                    // forearm swell
    nd(sAdd(W, sMul(nw, 0.4)), sAng(sAdd(d2, dh))),                          // wrist
    nd(Hd(0.4, 0.46), Hv(1, -0.04)),                                         // back of the hand
    nd(Hd(0.98, -0.2), Hv(-0.1, -1), null, 0.26, 0.3),                       // fingertips: a soft point, slanted to the palm
    nd(Hd(0.44, -0.45), Hv(-1, 0.04)),                                       // palm
    nd(sSub(W, sMul(nw, 0.4)), sAng(sMul(sAdd(d2, dh), -1))),                // wrist, inside
    edge(E, d2, FARM, n2, ARM_F, 0.3, -1, true),
    nd(crease, sAng(sMul(d1, -1)), sAng(sMul(d2, -1))),                      // crisp inner crease
    edge(S, d1, UARM, n1, ARM_U, 0.55, -1, true),
    edge(S, d1, UARM, n1, ARM_U, 0.08, -1, true)                             // armpit
  ], true);
}

// LEG: one outline. Thigh root hidden in the pelvis → quad / hamstring → round kneecap, crisp crease behind the knee →
// straight shin front, calf swell behind → ankle 0.82 → heel (r 0.3) and a toe tapering along the deck.
var THIGH_O = prof([[0, 0.7], [0.4, 0.66], [1, 0.5]]), THIGH_I = prof([[0, 0.7], [0.5, 0.58], [1, 0.48]]);
var SHIN_O = prof([[0, 0.5], [0.45, 0.46], [1, 0.46]]), SHIN_I = prof([[0, 0.48], [0.3, 0.58], [1, 0.46]]);
function legShape(H, K, A, bw, th, ax) {
  var L1 = Math.hypot(K[0] - H[0], K[1] - H[1]), L2 = Math.hypot(A[0] - K[0], A[1] - K[1]);
  var dt = sUnit(sSub(K, H)), ds = sUnit(sSub(A, K)), bf = bendFrame(dt, ds), nt = bf.n1, ns = bf.n2;
  var crease = sSub(K, sMul(sAdd(nt, ns), 0.46 * bf.c));
  function B(x, y) { return bw([ax + x, y]); }
  // the instep runs from the toe to the front of the ankle whatever the shin does, so the foot never hooks
  var toe = B(1.0, 0.04), af = sAdd(A, sMul(ns, 0.46)), ia = sAng(sSub(af, toe)), inst = sAdd(mix(toe, af, 0.5), sMul(sDir(ia - 90), 0.1));
  return bz([
    nd(sAdd(H, sMul(dt, -0.5)), sAng(sMul(nt, -1)), null, 0.5, 0.5),      // root (inside the pelvis)
    edge(H, dt, L1, nt, THIGH_I, 0.12, -1),                                // back of the thigh
    edge(H, dt, L1, nt, THIGH_I, 0.55, -1),
    nd(crease, sAng(ds), sAng(dt)),                                         // crease behind the knee
    edge(K, ds, L2, ns, SHIN_I, 0.32, -1),                                  // calf
    nd(sSub(A, sMul(ns, 0.46)), sAng(ds) + 6),                              // Achilles
    nd(B(-0.4, -0.27), th + 90, null, 0.39, 0.39),                          // back of the heel ...
    nd(B(-0.1, 0.04), th, null, 0.36, 0.36),                                // ... rounding (r 0.3) onto the deck
    nd(toe, ia + 6, th),                                                    // toe tip, flat on the deck
    nd(inst, ia),                                                           // instep
    nd(af, sAng(sAdd(sDir(ia), sMul(ds, -1)))),                             // front of the ankle, easing into the shin
    edge(K, ds, L2, ns, SHIN_O, 0.45, 1, true),                             // shin
    nd(sAdd(K, sMul(bf.nb, 0.53)), sAng(sMul(sAdd(dt, ds), -1))),           // round kneecap
    edge(H, dt, L1, nt, THIGH_O, 0.4, 1, true),                             // quad
    edge(H, dt, L1, nt, THIGH_O, 0.1, 1, true)
  ], true);
}

// torso (frame: pelvis 0,0, spine up −y, chest +x) and head (frame: skull centre 0,0, facing +x) are ONE outline:
// chest → throat notch → jaw → chin → lips → nose → brow → crown → swept tuft → nape → trapezius → back → glute
var T_FRONT = [
  [0.62, 0.05, -92],      // front of the hip
  [0.64, -0.85, -94],     // belly
  [0.84, -1.66, -100],    // chest
  [0.5, -2.34, -132]      // top of the chest, into the neck
];
var T_BACK = [
  [-0.84, -2.2, 100, null, 0.4, 0.45],    // trapezius: the tuft lies on the nape, then one curve down the back
  [-0.82, -1.72, 96],     // shoulder blade
  [-0.7, -0.84, 88]       // lower back
];
var HEAD = [
  [0.12, 0.82, 6, -62],                   // throat: the inner corner of the notch under the jaw
  [0.64, 0.92, -48, 4, 0.42, 0.4],        // chin
  [0.82, 0.58, -94],                      // lips
  [0.84, 0.4, -30, -100, 0.3, 0.3],       // under the nose
  [1.03, 0.2, -114, -34, 0.32, 0.32],     // nose tip
  [0.88, -0.14, -96],                     // brow
  [0.78, -0.62, -116],                    // forehead
  [0.42, -1.0, -160],                     // a little quiff at the hairline
  [-0.3, -1.08, 172],                     // crown
  [-0.98, -0.66, 128, null, 0.4],         // the hair sweeps back over the skull ...
  [-1.24, 0.02, 100],
  [-1.22, 0.5, 64, 112, 0.42, 0.3]         // ... to a short tuft that lies on the nape
];
var NECK = [0.08, -2.78], SKULL = [0.2, -1.06], SHOULDER = [-0.02, -1.86];

function rider(P) {
  var bw = function (p) { return sAdd(P.C, sRot(p, P.th)); };
  var fwd = sDir(P.th);
  var pelvis = bw([P.hx, -P.hh]);
  var tw = function (p) { return sAdd(pelvis, sRot(p, P.lean)); };
  var hdeg = P.lean + P.head, skull = sAdd(tw(NECK), sRot(sMul(SKULL, HS), hdeg));
  // legs (IK, knees forward)
  var hipB = tw([-0.12, -0.3]), hipF = tw([0.2, -0.22]);
  var ankB = bw([ANK_B, -ANK_H]), ankF = bw([ANK_F, -ANK_H]);
  var kB = ik2(hipB, ankB, THIGH_B, SHIN, fwd), kF = ik2(hipF, ankF, THIGH_F, SHIN, fwd);
  var legB = legShape(hipB, kB, ankB, bw, P.th, ANK_B), legF = legShape(hipF, kF, ankF, bw, P.th, ANK_F);
  // glute: lands on the back edge of the back thigh with its tangent, so the back flows into the leg without a lump
  var dtB = sUnit(sSub(kB, hipB)), bfB = bendFrame(dtB, sUnit(sSub(ankB, kB)));
  var gl = edge(hipB, dtB, Math.hypot(kB[0] - hipB[0], kB[1] - hipB[1]), bfB.n1, THIGH_I, 0.34, -1);
  var head = HEAD.slice(), last = head.length - 1;
  head[last] = (function (q) { var p = sAdd(sRot(sSub([q[0], q[1]], [-0.9, 0.3]), P.hair), [-0.9, 0.3]); return [p[0], p[1], q[2] + P.hair, q[3] + P.hair, q[4], q[5]]; })(head[last]);
  var body = []
    .concat(inFrame(T_FRONT, pelvis, P.lean, 1))
    .concat(inFrame(head, skull, hdeg, HS))
    .concat(inFrame(T_BACK, pelvis, P.lean, 1))
    .concat([gl, nd(tw([0.1, 0.55]), -10 + P.lean), nd(tw([0.45, 0.4]), -60 + P.lean)]);
  var S = tw(SHOULDER);
  return {
    body: bz(body, true), legB: legB, legF: legF,
    armB: armShape(sAdd(S, sRot([-0.08, 0], P.lean)), P.b), armF: armShape(sAdd(S, sRot([0.08, 0], P.lean)), P.fr),
    joints: { pelvis: pelvis, skull: skull, kB: kB, kF: kF, S: S }
  };
}

// ── the board's cut: one 0.7 cut along the bottom. Behind the tail it trails off as a wake along the face, just under
// the surface, tapering to nothing over 2.3; ahead of the belly its lower edge is the water line itself, one calm curve
// to the right edge, so the face never kinks or bumps at the nose. Nothing outlines the tail or the nose.
var WAKE_L = 2.3, WAKE_D = 0.95, GAP = 0.7, SEA = 15;
// the water line under the board: 0.7 below the bottom from the tail to the belly, then one calm descending curve that
// runs out at the right edge on the 0.5 grid — always flatter than the face there, so the two never cross
function underLine(P) {
  var bw = function (p) { return sAdd(P.C, sRot(p, P.th)); }, th = P.th;
  var a = bw([-3.35, 0.74 + GAP]), b = bw([-1.0, 1.05 + GAP]), e = [17, SEA];
  var ch = sAng(sSub(e, b)), aE = clamp(2 * ch - th, -4, 6);
  return bzPts([nd(a, th + 3), nd(b, th, null, 0.42), [e[0], e[1], aE, aE, null, 0.36]], 16);
}
function boardCut(P) {
  var bw = function (p) { return sAdd(P.C, sRot(p, P.th)); }, nb = sPerp(sDir(P.th));
  // behind the tail: the wake follows the face just under the surface and tapers to nothing
  var top = [], low = [], tc = bw([-3.35, 0.74]);
  for (var i = 0; i <= 16; i++) {
    var u = i / 16, k = smooth(Math.min(1, u * 4.5)), q = P.F.at(P.bd.s0 - 0.2 - u * WAKE_L);
    var nf = sPerp(sDir(q.a)), n = sUnit(mix(nb, nf, k));
    var pt = mix(tc, sAdd(q.p, sMul(nf, WAKE_D)), k);
    top.push(pt); low.push(sAdd(pt, sMul(n, GAP * Math.pow(1 - u, 0.85))));
  }
  var under = underLine(P);
  var pts = top.slice().reverse()                                  // wake tip → tail corner (the wake's top edge)
    .concat([bw([-3.0, 0.45]), bw([-1.0, 0.4]), bw([1.8, 0.25]), [17.6, 10], [17.6, SEA]])   // (inside the board, then air)
    .concat(under.slice().reverse())                               // right edge → under the belly → under the tail
    .concat(low.slice(1));                                         // the wake's lower edge back to its tip
  return polyPath(pts, true);
}

// ── the rolling line: a calligraphic crescent concentric with the barrel bottom, from the trough behind the board's tail
// up into the back of the curl. Two strokes per loop run along it (the water climbing the face into the lip); each
// tapers at both ends, fades wherever the water around it gets shallow (never a sliver), and breathes as it travels.
var ROLL = [
  [7.4, 14.8, 202, null, 0.42],
  [5.0, 13.45, 226],
  [3.85, 10.8, 262]
];
var ROLL_T = track(bzPts(ROLL, 24));
function rollLine(t, P) {
  var cutPts = parsePath(boardCut(P)).map(function (g) { return g.p.slice(-2); }).filter(function (p) { return p.length === 2; });
  var bdry = P.F.pts.concat(BACK_PTS).concat(cutPts);    // the water's edges: face, back, the board's cut and wake
  function room(p) {
    var m = 16 - p[1];
    for (var j = 0; j < bdry.length; j++) m = Math.min(m, dist(p, bdry[j]));
    return 2 * (m - 0.85);
  }
  // the water surges up the face twice per loop: the strokes crawl at the poster and rush mid-surge
  var total = ROLL_T.total, out = '', surge = 2 * t - 0.8 / (2 * Math.PI) * Math.sin(4 * Math.PI * t);
  for (var k = 0; k < 2; k++) {
    var ph = wrap01(surge + 0.5 * k);                          // 0 → 1: from under the board up into the curl
    var c = lerp(-1.6, total + 1.6, ph), half = lerp(1.5, 2.4, Math.sin(Math.PI * ph));
    var s0 = Math.max(0, c - half), s1 = Math.min(total, c + half);
    if (s1 - s0 < 0.5) continue;
    var pts = [], ws = [];
    for (var q = 0; q <= 24; q++) {
      var s = lerp(s0, s1, q / 24), p = ROLL_T.at(s).p, uu = (s - (c - half)) / (2 * half), r = room(p);
      var w = 0.78 * Math.pow(Math.max(0, Math.sin(Math.PI * uu)), 0.5) * smooth(s / 1.1) * smooth((total - s) / 1.1);
      pts.push(p); ws.push(Math.min(w, Math.max(0, r)) * smooth((r - 0.3) / 0.4));   // fades out, never thins to a sliver
    }
    if (Math.max.apply(null, ws) < 0.6) continue;
    out += cut(ribbon(pts, function (u) { var x = u * 24, j = Math.min(23, Math.floor(x)); return lerp(ws[j], ws[j + 1], x - j); }, { samples: 3 }));
  }
  return out;
}

// ── spray: at the bottom turn the tail rail throws a sheet of water up and back toward the barrel. It grows from the
// rail in two frames, peels into two drops that fly their own parabolas (stretching when fast, rounding at the apex) and
// fall back into the face. Nothing pops in or out in mid-air.
function teardrop(C, v, r, tailLen) {
  var d = sUnit(v), n = sPerp(d), a = sAng(d), T = sAdd(C, sMul(d, -(r + tailLen)));
  return bz([
    nd(T, a + 18, a + 162, 0.45, 0.45),                 // the tail point trails along the flight
    nd(sAdd(C, sMul(n, r)), a, null, 0.55, 0.55),
    nd(sAdd(C, sMul(d, r)), a - 90, null, 0.55, 0.55),  // round head
    nd(sAdd(C, sMul(n, -r)), a + 180, null, 0.55, 0.55)
  ], true);
}
// the sheet: rooted in the water at the tail rail, it rises almost straight up and curls back toward the barrel — a small
// echo of the lip's own curl
function sheetAt(P, L) {
  var root = sAdd(P.C, sRot([-3.1, 0.62], P.th));
  var p1 = sAdd(root, sMul(sDir(P.th + 258), 0.45 * L)), p2 = sAdd(p1, sMul(sDir(P.th + 233), 0.32 * L));
  return [root, p1, p2, sAdd(p2, sMul(sDir(P.th + 212), 0.23 * L))];
}
// a point on the sheet's spine, s = 0 (root) .. 1 (tip)
function sheetPt(P, L, s) { return ribbonSpinePt(sheetAt(P, L), s); }
function ribbonSpinePt(sp, s) {
  var segs = [], tot = 0;
  for (var i = 1; i < sp.length; i++) { var l = dist(sp[i - 1], sp[i]); segs.push(l); tot += l; }
  var d = s * tot;
  for (var j = 0; j < segs.length; j++) { if (d <= segs[j]) return mix(sp[j], sp[j + 1], d / segs[j]); d -= segs[j]; }
  return sp[sp.length - 1];
}
var SHEET_L = 2.4;
var DROPS = [            // [peel t, land t, radius, apex rise, land x, land y, where on the sheet it peels]
  [0.285, 0.45, 0.45, 1.2, 6.05, 12.3, 1.0],
  [0.32, 0.47, 0.35, 0.7, 7.45, 12.8, 0.7]
];
function spray(t, P) {
  var out = '';
  var grow = seg(t, 0.215, 0.258, easeOut), fall = seg(t, 0.29, 0.38, easeIn);
  var L = SHEET_L * grow * (1 - fall);
  if (L > 0.3) out += front(ribbon(sheetAt(P, L), function (s) { return 1.0 * (1 - Math.pow(s, 1.4)); }, { samples: 8 }));
  DROPS.forEach(function (d) {
    var u = (t - d[0]) / (d[1] - d[0]);
    if (u <= 0 || u >= 1) return;
    var P0 = poseAt(d[0]), S = sheetPt(P0, SHEET_L * (1 - seg(d[0], 0.29, 0.38, easeIn)), d[6]), E = [d[4], d[5]], h = d[3];
    var C = [lerp(S[0], E[0], u), lerp(S[1], E[1], u) - 4 * h * u * (1 - u)];
    var v = [E[0] - S[0], E[1] - S[1] - 4 * h * (1 - 2 * u)];
    var depth = C[1] - P.F.yAtX(C[0]);                  // + below the surface
    var r = d[2] * (0.75 + 0.25 * smooth(u / 0.25));    // it pulls together as it leaves the sheet ...
    r *= smooth((d[2] * 0.9 - depth) / (d[2] * 1.6));   // ... and sinks into the face as it lands
    if (r < 0.16) return;
    var fallK = clamp(v[1] / (Math.hypot(v[0], v[1]) || 1)) * smooth((-depth - r) / 0.6);   // a teardrop as it falls, round as it lands
    out += front(teardrop(C, v, r, 0.06 + 0.3 * fallK));
  });
  return out;
}

function surfScene(t) {
  var P = poseAt(t), e = 1 / 48;
  // the hair follows through: it lifts while the head drops and trails down as it rises
  var Pa = poseAt(t + e), Pb = poseAt(t - e);
  P.hair = clamp(18 * (Pa.C[1] - Pb.C[1] - (Pa.hh - Pb.hh)), -14, 22);
  var bw = function (p) { return sAdd(P.C, sRot(p, P.th)); };
  var R = rider(P);
  var s = ink(bz(waveNodes(lipAt(t), P.F), true)) + rollLine(t, P) + cut(boardCut(P));
  s += front(tp(BOARD, function (x, y) { return bw([x, y]); }));
  s += front(R.legB) + front(R.legF) + front(R.body) + front(R.armB) + front(R.armF);
  s += spray(t, P);
  return s;
}
