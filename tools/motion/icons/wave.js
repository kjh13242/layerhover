// 파도 (Waves) — final, built on variant B (claw lip, crescent slit, inner tongue) with A's engineering.
// "왼쪽에서 천천히 오른쪽으로 … 얕기도 살짝 강하기도 긴 웨이브로 … 진짜 바다를 보는 것처럼"
// Two waves take turns, both rising out of the flat sea at the left and leaving at the right. The set
// wave builds into a big curl (the poster, with the smaller curl of the gentle wave running ahead of it),
// pitches forward, collapses and rolls out as a low claw. The gentle wave rises behind it, lingers as a
// small curl with an open eye (the calm beat) while a distant swell passes in fade, and runs ahead of the
// next set wave. Every frame is the same ten-anchor Bézier outline, so every frame has a designed lip.
var ICON = {
  id: "wave",
  frames: 64,
  at: function (t) { return wvScene(t); }
};

var WL = 13.5;        // sea surface; the near sea fills down to the ground line y = 16
var WV_BASE = 14;     // the surface the poses are drawn on (design coordinates)

// ── anchor Béziers ────────────────────────────────────────────────────────────────────────────────
// anchor = [x, y, angleIn, handleIn, handleOut, angleOut]; angleOut defaults to angleIn (smooth).
// A different angleOut makes a designed corner (the lip tip). Handles < 0 are automatic (circular-arc
// length for the angle each end makes with its chord, times |h|). Every wave pose uses the same ten
// anchors in the same roles, so in-betweens never lose the lip:
//   0 foot · 1 back · 2 crest · 3 lip front · 4 lip low · 5 tip · 6 underside · 7 ceiling · 8 wall · 9 trough
function wvDir(a) { var r = a * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
// Handles < 0 are automatic: the circular-arc length for the angle each end makes with the chord.
function wvFit(p, q, a) {
  var L = Math.hypot(q[0] - p[0], q[1] - p[1]), g = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
  var d = Math.abs(((a - g) % 360 + 540) % 360 - 180) * Math.PI / 180; d = Math.min(d, 2.6);
  return d < 1e-3 ? L / 3 : L * (2 / 3) * Math.tan(d / 2) / Math.sin(d);
}
// A number u in place of an anchor means "split the single cubic between my two neighbours at u":
// the back (anchor 1) and the outer lip (anchor 4) are each one clean curve, never a lump.
function wvPrep(A) {
  A = A.map(function (r) { return typeof r === 'number' ? r : [r[0], r[1], r[2], r[3], r[4], r[5] === undefined ? r[2] : r[5]]; });
  for (var i = 1; i < A.length - 1; i++) {
    if (typeof A[i] !== 'number') continue;
    var u = A[i], F = A[i - 1], K = A[i + 1], df = wvDir(F[5]), dk = wvDir(K[2]);
    var hf = F[4] < 0 ? -F[4] * wvFit(F, K, F[5]) : F[4], hk = K[3] < 0 ? -K[3] * wvFit(F, K, K[2]) : K[3];
    var P0 = [F[0], F[1]], P1 = [F[0] + df[0] * hf, F[1] + df[1] * hf], P3 = [K[0], K[1]], P2 = [K[0] - dk[0] * hk, K[1] - dk[1] * hk];
    var Q0 = mix(P0, P1, u), Q1 = mix(P1, P2, u), Q2 = mix(P2, P3, u), R0 = mix(Q0, Q1, u), R1 = mix(Q1, Q2, u), S = mix(R0, R1, u);
    F[4] = dist(P0, Q0); K[3] = dist(Q2, P3);
    var a = Math.atan2(R1[1] - R0[1], R1[0] - R0[0]) * 180 / Math.PI, ref = (F[5] + K[2]) / 2;
    while (a - ref > 180) a -= 360; while (ref - a > 180) a += 360;
    A[i] = [S[0], S[1], a, dist(R0, S), dist(S, R1), a];
  }
  for (var k = 0; k < A.length - 1; k++) {
    var p = A[k], q = A[k + 1];
    if (p[4] < 0) p[4] = -p[4] * wvFit(p, q, p[5]);
    if (q[3] < 0) q[3] = -q[3] * wvFit(p, q, q[2]);
  }
  return A;
}
// absolute pose (design coordinates) → local (x from the station, y from the sea surface)
function wvLocal(A, X) { return wvPrep(A).map(function (r) { return [r[0] - X, r[1] - WV_BASE, r[2], r[3], r[4], r[5]]; }); }

// A crafted pose pitched forward and pressed down: every anchor and both of its handles go through
// (x, y) → (x + k·h·(0.3 + 0.7·h/H), y·sy), h = height above the water, H = crest height. The foot stays
// where it is, the top travels furthest (a bend, not a shear), and the curves stay the drawn curves.
// Used for the throw and the crash: the poster curl pitches forward and collapses.
function wvWrap(a, ref) { while (a - ref > 180) a -= 360; while (ref - a > 180) a += 360; return a; }
function wvLean(P, x, k, sy) {
  var H = Math.max(1, -P.A[2][1]);
  var M = function (q) { var h = Math.max(0, -q[1]); return [q[0] + k * h * (0.3 + 0.7 * h / H) + (P.x - x), q[1] * sy]; };
  return { x: x, A: P.A.map(function (a) {
    var di = wvDir(a[2]), dO = wvDir(a[5]);
    var p = M([a[0], a[1]]), pi = M([a[0] - di[0] * a[3], a[1] - di[1] * a[3]]), po = M([a[0] + dO[0] * a[4], a[1] + dO[1] * a[4]]);
    var ai = a[3] > 1e-6 ? wvWrap(Math.atan2(p[1] - pi[1], p[0] - pi[0]) * 180 / Math.PI, a[2]) : a[2];
    var ao = a[4] > 1e-6 ? wvWrap(Math.atan2(po[1] - p[1], po[0] - p[0]) * 180 / Math.PI, a[5]) : a[5];
    return [p[0], p[1], ai, dist(pi, p), dist(p, po), ao];
  }) };
}

// rise: 0 = not yet formed, 1 = full size. A young (or dying) wave is the same crafted claw scaled about
// the foot of its crest. open: 1 = the pocket is open; 0 = it is held under the water (the tip, the
// underside, the ceiling and the wall sink by the pocket's depth), so a newborn claw's tip surfaces
// first and its pocket opens in one step once it can be at least 0.8 pt wide: never a sealed sliver.
// While it is held, the tip also reaches forward, so a newborn crest leans forward over the water
// instead of standing as a dome with a vertical front.
var WV_SINK = [0, 0, 0, 0.5, 0.85, 1, 1, 1, 1, 0], WV_REACH = [0, 0, 0, 0, 0.35, 0.7, 0.7, 0.5, 0.3, 0];
function wvPlace(A, X, rise, open) {
  if (rise === undefined) rise = 1;
  if (open === undefined) open = 1;
  var cx = A[2][0], deep = Math.max(0, -A[7][1]) * rise * (1 - clamp(open));
  return A.map(function (a, k) {
    var dy = WV_SINK[k] * deep, dx = WV_REACH[k] * deep;
    var T = function (x, y) { return [X + cx + (x - cx) * rise + dx, WL + y * rise + dy]; };
    var di = wvDir(a[2]), dO = wvDir(a[5]);
    return { p: T(a[0], a[1]), i: T(a[0] - di[0] * a[3], a[1] - di[1] * a[3]), o: T(a[0] + dO[0] * a[4], a[1] + dO[1] * a[4]) };
  });
}
function wvPath(P) {
  var d = 'M' + f(P[0].p[0]) + ' ' + f(P[0].p[1]);
  for (var k = 0; k < P.length - 1; k++) {
    var a = P[k], b = P[k + 1];
    d += 'C' + f(a.o[0]) + ' ' + f(a.o[1]) + ' ' + f(b.i[0]) + ' ' + f(b.i[1]) + ' ' + f(b.p[0]) + ' ' + f(b.p[1]);
  }
  var n = P.length - 1;
  return d + 'L' + f(P[n].p[0]) + ' ' + f(WL + 1) + 'L' + f(P[0].p[0]) + ' ' + f(WL + 1) + 'Z';
}

// ── the slit: a crescent cut that continues the barrel ceiling as a spiral ───────────────────────
// It leaves the ceiling anchor on the ceiling's own tangent (no kink), curls by k degrees per pt over
// `len` pt, keeps `wid` until the last `tap` pt and tapers to a needle. It never gets thinner.
// S = { len (pt), wid (pt), tap (pt), k (curl, degrees per pt) }.
// The upper edge is a circular arc that bends toward the barrel side, the lower edge a concentric arc
// `wid` inside it, and the taper a single convex curve from the tip.
function wvC(p, q, r, s) { return 'C' + f(p[0]) + ' ' + f(p[1]) + ' ' + f(q[0]) + ' ' + f(q[1]) + ' ' + f(r[0]) + ' ' + f(r[1]); }
function wvArc(C, R, a, b) {   // cubic(s) along a circle (angles of the inward normal), a → b
  var n = Math.max(1, Math.ceil(Math.abs(b - a) / (Math.PI / 3))), d = '';
  for (var i = 0; i < n; i++) {
    var u0 = a + (b - a) * i / n, u1 = a + (b - a) * (i + 1) / n, h = 4 / 3 * Math.tan((u1 - u0) / 4) * R;
    var p0 = [C[0] - Math.cos(u0) * R, C[1] - Math.sin(u0) * R], p1 = [C[0] - Math.cos(u1) * R, C[1] - Math.sin(u1) * R];
    // tangent of the point C − R·(cos u, sin u) with respect to u is R·(sin u, −cos u)
    d += wvC([p0[0] + Math.sin(u0) * h, p0[1] - Math.cos(u0) * h], [p1[0] - Math.sin(u1) * h, p1[1] + Math.cos(u1) * h], p1);
  }
  return d;
}
function wvSlit(P, S) {
  if (!S || S.len < 0.08) return '';
  var c = P[7], O = c.p, a0 = Math.atan2(c.o[1] - O[1], c.o[0] - O[0]);
  var R = 180 / Math.PI / Math.max(S.k, 0.5), W = Math.min(S.wid, R * 0.8);
  // inward normal (left-hand side of travel in y-down space) at heading a: (sin a, −cos a); heading decreases
  var nA = function (a) { return Math.atan2(-Math.cos(a), Math.sin(a)); };   // normal angle
  var C = [O[0] + Math.sin(a0) * R, O[1] - Math.cos(a0) * R];
  var L = S.len, tp = Math.min(S.tap, L * 0.85), aE = a0 - L / R, aT = a0 - (L - tp) / R;
  var E = [C[0] - Math.cos(nA(aE)) * R, C[1] - Math.sin(nA(aE)) * R];
  var T = [C[0] - Math.cos(nA(aT)) * (R - W), C[1] - Math.sin(nA(aT)) * (R - W)];
  var M = [C[0] - Math.cos(nA(a0)) * (R - W), C[1] - Math.sin(nA(a0)) * (R - W)];
  // taper: one convex arc from the tip E that meets the inner arc tangentially at T (no S-bend)
  var bT = aT + Math.PI, dT = [Math.cos(bT), Math.sin(bT)], g = Math.hypot(T[0] - E[0], T[1] - E[1]);
  var ch = Math.atan2(T[1] - E[1], T[0] - E[0]), phi = Math.abs(((ch - bT) % TAU + 3 * Math.PI) % TAU - Math.PI);
  var ht = 4 / 3 * Math.tan(phi / 2) * g / (2 * Math.sin(Math.max(phi, 0.05)));
  var dE = [Math.cos(2 * ch - bT), Math.sin(2 * ch - bT)];
  var d = 'M' + f(O[0]) + ' ' + f(O[1]) + wvArc(C, R, nA(a0), nA(a0) - L / R);
  d += wvC([E[0] + dE[0] * ht, E[1] + dE[1] * ht], [T[0] - dT[0] * ht, T[1] - dT[1] * ht], T);
  if (L - tp > 0.02) d += wvArc(C, R - W, nA(aT), nA(a0));
  return d + 'L' + f(O[0]) + ' ' + f(O[1]) + 'Z';
}

// ── poses ────────────────────────────────────────────────────────────────────────────────────────
// Drawn in design coordinates; `x` is the station (the crest anchor), so the track moves the crest.
// Angles of the underside and of the tip's out-tangent are written on one branch (180–320) so every
// in-between turns the short way.
function wvPose(x, A) { return { x: x, A: wvLocal(A, x) }; }

// ── set wave ──
// Every key is a crest with a lip. The tip turns from pointing down (a young claw) to pointing back
// (a curl) as the wave grows, and the back grows longer with the wave, so the back foot stays in frame.
var WV_SWELL = wvPose(5.0, [
  [0.5, 14, 0, 0, 1.8], 0.5, [5.0, 10.9, -10, 1.8, -1],
  [7.4, 11.75, 66, -1, -1], 0.5, [7.35, 12.95, 112, -1, -1, 250],
  0.5, [6.4, 12.15, 182, -1, -0.9], [6.0, 12.85, 100, -1, -1], [8.4, 14, 0, -1, 0]
]);
var WV_PEAK = wvPose(6.2, [
  [1.0, 14, 0, 0, 1.6], [3.7, 10.5, -75, 2.0, 1.2], [6.2, 8.4, -12, 1.1, -1],
  [10.1, 9.5, 78, -1, -1], 0.5, [9.05, 11.45, 148, -1, -1, 272],
  [8.8, 10.5, 264, -1, -1], [7.75, 9.95, 182, -1, 0.35], [7.3, 11.2, 98, -1, -1], [10.5, 14, 0, -1, 0]
]);
var WV_PRECURL = wvPose(7.3, [
  [1.3, 14, 0, 0, 2.0], [4.6, 9.2, -78, 2.4, 1.5], [7.3, 5.9, -13, 1.2, -1],
  [11.4, 8.3, 82, -1, -1], 0.5, [10.1, 10.75, 178, -1, -1, 342],
  [10.55, 9.3, 272, -1, -1], [8.85, 7.8, 182, -1, 0.4], [8.0, 10.1, 96, -1, -1], [12.1, 14, 0, -1, 0]
]);
// the poster: a steep back rising out of the flat sea, the crest tilted up into a calligraphic claw lip
// that tapers to a needle, an open barrel, and the slit continuing the barrel ceiling as a spiral
var WV_CURL = wvPose(8.0, [
  [2.7, 14.0, 0, 0, 1.6], [5.3, 8.0, -80, 2.6, 1.6], [8.0, 4.35, -20, 1.2, 2.6],
  [12.6, 7.1, 90, 1.5, -1], 0.5, [10.45, 10.35, 194, -1, -1, 354],
  [11.1, 8.1, 270, -1, -1], [9.3, 6.4, 180, -1, 0.45], [8.1, 9.4, 97, -1, -1], [13.0, 14.0, 0, 3.0, 0]
]);
// the throw and the crash are the poster itself, leaned forward and pressed down (wvLean), so the
// calligraphy of the lip and the barrel survives into the break
var WV_THROW = wvLean(WV_CURL, 8.0, 0.15, 0.97);
var WV_CRASH = wvLean(WV_CURL, 8.0, 0.36, 0.68);
// the foam roll: the broken wave rolls on as a low claw whose tip points down over a small pocket
var WV_FOAM = wvPose(11.0, [
  [5.2, 14, 0, 0, 2.2], 0.5, [11.0, 9.9, -10, 2.1, -1],
  [14.05, 11.15, 72, -1, -1], 0.5, [13.85, 12.9, 120, -1, -1, 258],
  0.5, [12.65, 11.75, 182, -1, -0.9], [12.15, 12.6, 100, -1, -1], [15.7, 14, 0, -1, 0]
]);
var WV_ROLL = wvPose(12.0, [
  [6.8, 14, 0, 0, 2.2], 0.5, [12.0, 10.8, -8, 2.0, -1],
  [14.6, 11.75, 66, -1, -1], 0.5, [14.55, 13.0, 112, -1, -1, 250],
  0.5, [13.45, 12.2, 182, -1, -0.9], [13.05, 12.9, 100, -1, -1], [16.3, 14, 0, -1, 0]
]);
// ── gentle wave ──
var WV_GSWELL = wvPose(4.5, [
  [0.6, 14, 0, 0, 1.6], 0.5, [4.5, 11.55, -9, 1.6, -1],
  [6.6, 12.3, 66, -1, -1], 0.5, [6.6, 13.25, 112, -1, -1, 250],
  0.5, [5.75, 12.65, 182, -1, -0.9], [5.4, 13.2, 100, -1, -1], [8.0, 14, 0, -1, 0]
]);
// the calm beat: a small curl with an open eye (the smaller curl that follows the big one)
var WV_GCURL = wvPose(6.0, [
  [1.4, 14, 0, 0, 2.1], 0.5, [6.0, 9.6, -12, 1.9, -1],
  [9.6, 11.05, 90, -1, -1], 0.5, [7.7, 12.85, 194, -1, -1, 335],
  [8.05, 11.6, 272, -1, -1], [7.0, 10.85, 180, -1, 0.35], [6.35, 12.2, 98, -1, -1], [10.6, 14, 0, -1, 0]
]);
// the same curl with a shorter back, once the set wave rises behind it: the two meet at the waterline
var WV_GOUT = wvPose(6.0, [
  [2.9, 14, 0, 0, 2.0], 0.5, [6.0, 9.6, -14, 1.5, -1],
  [9.6, 11.05, 90, -1, -1], 0.5, [7.7, 12.85, 194, -1, -1, 335],
  [8.05, 11.6, 272, -1, -1], [7.0, 10.85, 180, -1, 0.35], [6.35, 12.2, 98, -1, -1], [10.6, 14, 0, -1, 0]
]);
var WV_GSPILL = wvPose(7.5, [
  [3.0, 14, 0, 0, 1.8], 0.5, [7.5, 11.4, -8, 1.7, -1],
  [9.9, 12.1, 70, -1, -1], 0.5, [9.85, 13.2, 120, -1, -1, 255],
  0.5, [8.85, 12.5, 182, -1, -0.9], [8.45, 13.15, 100, -1, -1], [11.2, 14, 0, -1, 0]
]);

// ── timeline ──────────────────────────────────────────────────────────────────────────────────────
// Each wave is a list of keys [frame, pose, station x, rise]; frames run past 64 into the next loop.
// Every value is interpolated with a monotone cubic (no overshoot, eases through the keys).
var WV_SLIT = { wid: 0.95, tap: 1.1, k: 13 };
var WV_WAVES = [
  { name: 'set', keys: [
    [38, WV_SWELL, 1.2, 0], [42, WV_SWELL, 2.4, 0.45], [46, WV_SWELL, 3.6, 0.8], [49, WV_SWELL, 4.4, 1],
    [54, WV_PEAK, 5.8, 1], [58, WV_PRECURL, 6.9, 1], [62, WV_CURL, 7.75, 1], [64, WV_CURL, 8.0, 1], [65, WV_CURL, 8.1, 1],
    [69, WV_THROW, 8.35, 1], [74, WV_CRASH, 8.8, 1], [80, WV_FOAM, 11.0, 1], [87, WV_ROLL, 12.9, 1],
    [91, WV_ROLL, 14.3, 0.75], [95, WV_ROLL, 15.4, 0.4], [98, WV_ROLL, 16.1, 0]],
    // the slit opens in one step at 2.1 pt and closes in one step while it is still full width: as the
    // wave pitches, the barrel widens under it, and a shorter slit would show only its taper (a nub)
    slit: [[58, 0], [59, 2.1], [64, 2.8], [67, 2.95], [69, 2.9], [70, 0]],
    open: [[44, 0], [45, 1], [93, 1], [94, 0]] },
  { name: 'gentle', keys: [
    [16, WV_GSWELL, 1.2, 0], [20, WV_GSWELL, 2.4, 0.5], [25, WV_GSWELL, 3.8, 1],
    [30, WV_GCURL, 5.2, 1], [33, WV_GCURL, 5.85, 1], [38, WV_GCURL, 6.35, 1], [42, WV_GCURL, 7.4, 1],
    [45, WV_GOUT, 8.4, 0.94], [48, WV_GOUT, 9.4, 0.9],
    [56, WV_GOUT, 11.8, 0.8], [64, WV_GOUT, 14.25, 0.7], [68, WV_GSPILL, 15.4, 0.4], [71, WV_GSPILL, 16.1, 0.12], [72, WV_GSPILL, 16.3, 0]],
    open: [[21, 0], [22, 1], [67, 1], [68, 0]] }
];
function wvMono(ts, vs, x) {   // monotone cubic through the keys (no overshoot, eases at both ends)
  var n = ts.length;
  if (x <= ts[0]) return vs[0];
  if (x >= ts[n - 1]) return vs[n - 1];
  var d = [], m = [0], i;
  for (i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]));
  for (i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(0);
  for (i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    var a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { var k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  var j = 0; while (x > ts[j + 1]) j++;
  var h = ts[j + 1] - ts[j], u = (x - ts[j]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * vs[j] + (u3 - 2 * u2 + u) * h * m[j] + (-2 * u3 + 3 * u2) * vs[j + 1] + (u3 - u2) * h * m[j + 1];
}
// a side track [[frame, value], ...] read at loop frame fr (frames past 64 belong to the next loop)
function wvTrack(T, fr, dflt) {
  if (!T) return dflt;
  var G = fr; while (G < T[0][0]) G += 64;
  return wvMono(T.map(function (k) { return k[0]; }), T.map(function (k) { return k[1]; }), G);
}
// the state of one wave at loop frame fr (or null when it is not on screen)
function wvState(W, fr) {
  var K = W.keys, f0 = K[0][0], f1 = K[K.length - 1][0], F = fr;
  while (F < f0) F += 64;
  if (F > f1) return null;
  var ts = K.map(function (k) { return k[0]; });
  var A = K[0][1].A.map(function (a, ai) {
    return a.map(function (v, vi) { return wvMono(ts, K.map(function (k) { return k[1].A[ai][vi]; }), F); });
  });
  return { A: A, X: wvMono(ts, K.map(function (k) { return k[2]; }), F), rise: wvMono(ts, K.map(function (k) { return k[3]; }), F),
    slit: wvTrack(W.slit, fr, 0), open: wvTrack(W.open, fr, 1) };
}

// ── far swell ────────────────────────────────────────────────────────────────────────────────────
// Depth: while the near sea is calm, a distant swell rises behind it in the open right half, drifts
// right at about half the near speed (parallax) and lies down again before the small curl arrives.
// A long, low, plain swell in fade: it reads as a calm grey line at 1x. It keeps 1 pt clear of every
// near crest and lip, and its foot stays under the water (fade over the black sea is black).
var WV_FAR = [[33, 13.4, 0], [37, 13.8, 1.1], [40, 14.15, 1.45], [44, 14.5, 0.9], [47, 14.7, 0]];
function wvFar(fr) {
  var ts = WV_FAR.map(function (k) { return k[0]; });
  if (fr <= ts[0] || fr >= ts[ts.length - 1]) return '';
  var cx = wvMono(ts, WV_FAR.map(function (k) { return k[1]; }), fr), h = wvMono(ts, WV_FAR.map(function (k) { return k[2]; }), fr);
  if (h < 0.05) return '';
  var b = 3.8, fw = 2.3, y0 = WL + 0.4, top = WL - h;
  return fade('M' + f(cx - b) + ' ' + f(WL) + 'C' + f(cx - 0.5 * b) + ' ' + f(WL) + ' ' + f(cx - 0.42 * b) + ' ' + f(top) + ' ' + f(cx) + ' ' + f(top) +
    'C' + f(cx + 0.42 * fw) + ' ' + f(top) + ' ' + f(cx + 0.5 * fw) + ' ' + f(WL) + ' ' + f(cx + fw) + ' ' + f(WL) +
    'L' + f(cx + fw) + ' ' + f(y0) + 'L' + f(cx - b) + ' ' + f(y0) + 'Z');
}

// ── scene ─────────────────────────────────────────────────────────────────────────────────────────
function wvScene(t) {
  var fr = t * 64, s = ink(rectPath(0, WL, 18, 16 - WL)), cuts = '';
  WV_WAVES.forEach(function (W) {
    var st = wvState(W, fr); if (!st) return;
    var P = wvPlace(st.A, st.X, st.rise, st.open);
    s += ink(wvPath(P));
    if (st.slit > 0.08) cuts += cut(wvSlit(P, { len: st.slit, wid: WV_SLIT.wid, tap: WV_SLIT.tap, k: WV_SLIT.k }));
  });
  return s + cuts + cut(rectPath(-4, -4, 5, 26)) + cut(rectPath(17, -4, 5, 26)) + cut(rectPath(-4, 16, 26, 6)) + wvFar(fr);
}
