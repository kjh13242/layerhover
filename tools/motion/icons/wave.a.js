// 파도 (Waves) — variant A: recognisability first.
// "왼쪽에서 천천히 오른쪽으로 … 얕기도 살짝 강하기도 긴 웨이브로 … 진짜 바다를 보는 것처럼"
// Long waves roll in from the left, one slightly stronger set wave and one shallow wave in turn.
// Every wave rises out of the flat sea and leads with the one feature that says "wave" at 18 pt: a crest
// whose lip curls forward. The set wave curls over an eye (the poster), throws its lip forward, lands it
// on the water in front (the tube), flings a few drops, and rolls on as low whitewater; then the shallow
// wave comes through, curls a little and rolls out, and the sea is calm until the next set.

var WL = 13.5;        // flat water level (pt), on the half-point grid

// ── anchor Béziers ───────────────────────────────────────────────────────────────────────────────
// anchor = [x, y, angleIn, handleIn, handleOut, angleOut]; angleOut defaults to angleIn (smooth),
// a different angleOut makes a designed corner (the lip tip). In-betweens interpolate the anchor
// parameters (not raw control points), so every in-between stays tangent-continuous like the keys.
function _dir(a) { var r = a * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
function _norm(A) { return A.map(function (r) { return [r[0], r[1], r[2], r[3], r[4], r[5] === undefined ? r[2] : r[5]]; }); }
// Handles < 0 are automatic: the circular-arc length for the angle each end makes with the chord
// (c/3 for a straight run, more as the end turns away), times |h| as a tension factor.
// Angles are interpolated exactly as written, so each key states which way its parts turn.
function _autoHandles(A) {
  for (var k = 0; k < A.length - 1; k++) {
    var p = A[k], q = A[k + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]), g = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
    var fit = function (a) {
      var d = Math.abs(((a - g) % 360 + 540) % 360 - 180) * Math.PI / 180; d = Math.min(d, 2.6);
      return d < 1e-3 ? L / 3 : L * (2 / 3) * Math.tan(d / 2) / Math.sin(d);
    };
    if (p[4] < 0) p[4] = -p[4] * fit(p[5]);
    if (q[3] < 0) q[3] = -q[3] * fit(q[2]);
  }
  return A;
}
function prepKeys(keys) { return keys.map(function (k) { return _autoHandles(_norm(k)); }); }
function poseAt(K, s) {
  var n = K.length - 1; s = clamp(s, 0, n);
  var i = Math.min(n - 1, Math.floor(s)), u = s - i, out = [];
  for (var a = 0; a < K[i].length; a++) {
    var r = [];
    for (var j = 0; j < 6; j++) r.push(lerp(K[i][a][j], K[i + 1][a][j], u));
    out.push(r);
  }
  return out;
}

// ── key poses ────────────────────────────────────────────────────────────────────────────────────
// Local coords: x = 0 at the crest station, y = 0 at the water, up is −. Every pose is a crest with a lip,
// drawn with the same nine anchors in the same roles, so in-betweens never have to grow a lip out of nothing:
//   foot · crest · outer lip (front) · outer lip (low) · tip · underside · hollow top · hollow wall · trough
// A hook: the crest pitches a tongue of water forward and down over a wide, shallow hollow.
// (cx, cy) = crest top; reach = how far the tongue throws; th = lip thickness; drop = how far the tip falls;
// back / front = distance from the crest to the foot / to the trough.
function hook(cx, cy, reach, th, drop, back, front, lean) {
  lean = lean || 0;
  var a = [cx + 0.78 * reach, cy + 0.2 * drop], b = [cx + reach, cy + 0.62 * drop], t = [cx + 0.9 * reach, cy + drop];
  var u = [b[0] - 0.99 * th, b[1] - 0.14 * th + 0.12 * drop], h = [cx + 0.42 * reach, cy + 1.05 * th + 0.06 * drop];
  var w = [cx + 0.02 * reach - 0.15 * th, cy + th + 0.45 * drop];
  return [
    [cx - back, 0, 0, 0, back * 0.42],
    [cx, cy, -10 - lean, back * 0.36, -1, -10 - lean],
    [a[0], a[1], 55, -1, -1], [b[0], b[1], 98, -1, -1],
    [t[0], t[1], 128, -1, -1, 246],
    [u[0], u[1], 214, -1, -1], [h[0], h[1], 184, -1, -1],
    [w[0], w[1], 122, -1, (cx + front - w[0]) * 0.4],
    [cx + front, 0, 0, front * 0.5, 0]
  ];
}
// a curl pose scaled about the crest station (handles scale too; angles are kept)
function scaled(K, k, dx) {
  return K.map(function (r) { return [r[0] * k + (dx || 0), r[1] * k, r[2], r[3] * k, r[4] * k, r[5]]; });
}
// the poster curl
var CURL = [[-6.6, 0, 0, 0, 4.2], [1.4, -9.85, -12, 3.2, 2.0], [5.2, -7.3, 88, 1.6, 1.5], [3.5, -4.4, 192, 1.1, 0.8],
  [1.95, -5.4, 240, 0.5, 0.45, 372], [3.85, -6.75, 272, 0.95, 0.9], [2.35, -8.3, 180, 0.85, 0.85], [0.75, -6.7, 97, 0.85, 1.7],
  [5.8, 0, 0, 3.3, 0]];
// a small curl, drawn with a relatively heavier lip so it still holds at half size
var CURL_S = [[-6.0, 0, 0, 0, 3.4], [0.8, -5.0, -8, 1.6, 1.25], [3.25, -3.55, 88, 0.95, 0.85], [2.2, -1.75, 192, 0.65, 0.48],
  [1.25, -2.35, 240, 0.3, 0.27, 372], [2.25, -3.1, 272, 0.48, 0.45], [1.45, -3.85, 180, 0.42, 0.42], [0.55, -3.1, 97, 0.45, 1.1],
  [4.0, 0, 0, 2.1, 0]];

var B_KEYS = prepKeys([
  hook(-0.4, -2.3, 1.5, 0.95, 1.3, 6.4, 3.0),         // 0 ripple: a low swell whose crest just tips over
  scaled(CURL_S, 1.0, -0.3),                          // 1 the swell stands up and curls
  CURL,                                               // 2 curl — the poster
  // 3 plunge: the lip lands on the water in front and closes the tube
  [[-7.2, 0, 0, 0, 4.4], [2.1, -8.7, -8, 3.0, -1], [5.75, -6.6, 66, -1, -1], [6.4, -2.6, 94, -1, -1],
   [6.0, 0.75, 112, 0.45, 0.5, 264], [4.95, -2.3, 272, -1, -1], [3.3, -6.75, 195, -1, -1], [1.3, -4.6, 100, -1, 1.4],
   [7.0, 0, 0, 3.0, 0]],
  // 4 crash: the crest drops, the tube shrinks to an air pocket
  [[-6.8, 0, 0, 0, 4.0], [2.8, -4.9, -6, 2.8, -1], [6.1, -3.5, 58, -1, -1], [7.0, -1.3, 95, -1, -1],
   [6.75, 0.3, 125, 0.35, 0.35, 250], [5.75, -0.9, 215, -1, -1], [4.65, -1.4, 180, -1, -1], [3.65, -0.8, 135, -1, 0.8],
   [8.6, 0, 0, 1.4, 0]],
  hook(3.0, -2.7, 2.0, 1.0, 1.7, 8.0, 4.2),           // 5 foam roll: the broken wave rolls on, low
  hook(5.0, -1.9, 1.5, 0.9, 1.2, 9.4, 3.2)            // 6 ripple again
]);

// shallow wave (S): rises, curls a little, spills, rolls on as foam
var S_KEYS = prepKeys([
  hook(-0.4, -1.9, 1.35, 0.9, 1.1, 5.0, 2.6),
  hook(0.3, -3.5, 2.0, 1.0, 1.7, 6.0, 3.4, 4),
  CURL_S,
  hook(2.6, -2.7, 1.9, 0.95, 1.5, 7.4, 3.6),
  hook(4.0, -1.6, 1.35, 0.85, 1.05, 7.8, 2.8)
]);

// crest position → pose; smooth within each stretch so the key poses breathe
function ramp(X, pts) {
  if (X <= pts[0][0]) return pts[0][1];
  for (var i = 0; i < pts.length - 1; i++) {
    var a = pts[i], b = pts[i + 1];
    if (X <= b[0]) return lerp(a[1], b[1], smooth((X - a[0]) / (b[0] - a[0])));
  }
  return pts[pts.length - 1][1];
}
// A wave rises out of the flat sea: `rise` lifts the crest from the waterline (0) to its full height (1).
// The lip is held deeper while the wave is young — the tip deeper than the crest, the hollow deeper still —
// so the tip surfaces first and the hollow opens from below (never a sealed sliver at the waterline).
// Each anchor gets one affine map for itself and its two handles, so tangents stay continuous.
var SINK = [0, 0, 0.35, 0.7, 1.0, 1.45, 1.6, 1.6, 0];
function waveShape(K, s, X, rise) {
  var A = poseAt(K, s), n = A.length, cy = A[1][1], lk = lerp(0.6, 1, rise), deep = (1 - rise) * -cy;
  function T(i) {
    if (i <= 1 || i === n - 1) return function (x, y) { return [X + x, WL + y * rise]; };
    return function (x, y) { return [X + x, WL + cy * rise + (y - cy) * lk + deep * SINK[i]]; };
  }
  var p0 = T(0)(A[0][0], A[0][1]), d = 'M' + f(p0[0]) + ' ' + f(p0[1]);
  for (var k = 0; k < n - 1; k++) {
    var p = A[k], q = A[k + 1], u = _dir(p[5]), v = _dir(q[2]);
    var c1 = T(k)(p[0] + u[0] * p[4], p[1] + u[1] * p[4]), c2 = T(k + 1)(q[0] - v[0] * q[3], q[1] - v[1] * q[3]), e = T(k + 1)(q[0], q[1]);
    d += 'C' + f(c1[0]) + ' ' + f(c1[1]) + ' ' + f(c2[0]) + ' ' + f(c2[1]) + ' ' + f(e[0]) + ' ' + f(e[1]);
  }
  return d + 'L' + f(X + A[n - 1][0]) + ' ' + f(WL + 1) + 'L' + f(X + A[0][0]) + ' ' + f(WL + 1) + 'Z';
}

// Each wave travels on its own phase φ (uniform in time). The crest position slows through the break
// zone (breaking waves lose speed), so the plunge and the crash play out inside the frame.
var TRACK = [[0, -9], [0.14, -2], [0.27, 3], [0.4, 6.3], [0.45, 7.0], [0.56, 7.4], [0.68, 8.2], [0.79, 11.8], [0.9, 16.8], [1, 22]];
function track(ph) {
  for (var i = 0; i < TRACK.length - 1; i++) {
    var a = TRACK[i], b = TRACK[i + 1];
    if (ph <= b[0]) {
      // monotone cubic (Fritsch–Carlson style tangents from the neighbours)
      var m = function (j) {
        var p = TRACK[Math.max(0, j - 1)], q = TRACK[Math.min(TRACK.length - 1, j + 1)];
        return (q[1] - p[1]) / (q[0] - p[0]);
      };
      var h = b[0] - a[0], u = (ph - a[0]) / h, m0 = m(i) * h, m1 = m(i + 1) * h;
      var h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
      return h00 * a[1] + h10 * m0 + h01 * b[1] + h11 * m1;
    }
  }
  return TRACK[TRACK.length - 1][1];
}
// Spray: when the lip lands, three drops are flung up in front of the curtain and fall back into the sea.
// Each drop is a teardrop pointing along its flight. Near the surface it is still part of the sea; once it
// is clear of the water it is lifted in front with a clean gap.
var DROPS = [  // launch phase, flight time (phase), start (local x), rise (pt), drift (pt), size
  [0.55, 0.12, 7.55, 3.4, 0.25, 1.2],
  [0.556, 0.10, 8.6, 2.4, 0.3, 1.0],
  [0.588, 0.07, 8.05, 1.3, 0.2, 0.75]
];
var DROP_GAP = 0.6;
// A drop: a round head (radius r) leading in direction `deg`, a tail tapering to a point `len` behind
// the head centre. The tail leaves the head on its tangents and bows in slightly, like a falling bead.
function teardrop(hx, hy, r, len, deg) {
  var a = deg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  var tx = hx - ux * len, ty = hy - uy * len, b = Math.acos(Math.min(0.99, r / len));
  function onHead(th) { return [hx + r * (Math.cos(th) * -ux + Math.sin(th) * nx), hy + r * (Math.cos(th) * -uy + Math.sin(th) * ny)]; }
  function arc(t0, t1) {           // cubic arc on the head from angle t0 to t1 (measured from the tail side)
    var k = 4 / 3 * Math.tan((t1 - t0) / 4) * r, p0 = onHead(t0), p1 = onHead(t1);
    var d0 = [-Math.sin(t0) * -ux + Math.cos(t0) * nx, -Math.sin(t0) * -uy + Math.cos(t0) * ny];
    var d1 = [-Math.sin(t1) * -ux + Math.cos(t1) * nx, -Math.sin(t1) * -uy + Math.cos(t1) * ny];
    return 'C' + f(p0[0] + d0[0] * k) + ' ' + f(p0[1] + d0[1] * k) + ' ' + f(p1[0] - d1[0] * k) + ' ' + f(p1[1] - d1[1] * k) + ' ' + f(p1[0]) + ' ' + f(p1[1]);
  }
  var pA = onHead(b), pB = onHead(TAU - b), pull = 0.12 * r;   // sides bow in a touch toward the axis
  var sA = [pA[0] - tx, pA[1] - ty], sB = [pB[0] - tx, pB[1] - ty];
  return 'M' + f(tx) + ' ' + f(ty) +
    'C' + f(tx + sA[0] * 0.4 - nx * pull) + ' ' + f(ty + sA[1] * 0.4 - ny * pull) + ' ' + f(pA[0] - sA[0] * 0.3) + ' ' + f(pA[1] - sA[1] * 0.3) + ' ' + f(pA[0]) + ' ' + f(pA[1]) +
    arc(b, Math.PI) + arc(Math.PI, TAU - b) +
    'C' + f(pB[0] - sB[0] * 0.3) + ' ' + f(pB[1] - sB[1] * 0.3) + ' ' + f(tx + sB[0] * 0.4 + nx * pull) + ' ' + f(ty + sB[1] * 0.4 + ny * pull) + ' ' + f(tx) + ' ' + f(ty) + 'Z';
}
function spray(ph, X) {
  var s = '';
  for (var i = 0; i < DROPS.length; i++) {
    var d = DROPS[i], p = (ph - d[0]) / d[1];
    if (p <= 0 || p >= 1) continue;
    var x = X + d[2] + d[4] * p, y = WL + 0.4 - 4 * d[3] * p * (1 - p);          // a ballistic arc
    var vx = d[4], vy = -4 * d[3] * (1 - 2 * p), a = Math.atan2(vy, vx) * 180 / Math.PI;
    var r = 0.5 * d[5], drop = teardrop(x, y, r, r * 2.5, a);
    s += (y + r * 2.6 < WL - DROP_GAP) ? cutAround(drop, DROP_GAP) + front(drop) : ink(drop);
  }
  return s;
}
var PHASE_B = 0.45, LAG_S = 0.45;   // set wave at the poster when t = 0; the shallow wave 3.6 s behind

var ICON = {
  id: "wave",
  frames: 64,
  at: function (t) {
    var s = ink(rectPath(0, WL, 18, 16 - WL));
    var XB = track(wrap01(t + PHASE_B));
    var sb = ramp(XB, [[-2, 0], [3, 1], [7.0, 2], [7.4, 3], [8.2, 4], [12.5, 5], [18, 6]]);
    s += ink(waveShape(B_KEYS, sb, XB, smooth((XB + 0.5) / 4.5)));
    s += spray(wrap01(t + PHASE_B), XB);
    var XS = track(wrap01(t + PHASE_B - LAG_S));
    var ss = ramp(XS, [[-2, 0], [3.5, 1], [7.6, 2], [12.5, 3], [18, 4]]);
    s += ink(waveShape(S_KEYS, ss, XS, smooth((XS + 0.5) / 4.5)));
    s += cut(rectPath(-4, -4, 5, 26)) + cut(rectPath(17, -4, 5, 26)) + cut(rectPath(-4, 16, 26, 6));
    return s;
  }
};
