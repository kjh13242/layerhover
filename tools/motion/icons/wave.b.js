// 파도 (Waves) — variant B, elegance first.
// Waves rise out of a flat sea and roll slowly from left to right. A long set wave builds, pitches forward
// into a full curl (the poster: barrel + spiral slit), plunges, and its spiral unrolls into a white foam line
// before it settles; then a gentle wave rises into a small curl and lies down again. Far waves (small curls,
// drawn translucent) rise behind the near water and drift at roughly half speed — parallax depth.
// Every stage is a crafted pose with the same outline structure, so the morph never drops to crude geometry.
var ICON = {
  id: "wave",
  frames: 64,
  at: function (t) { return wvScene(t); }
};

var WV_SURF = 14;     // sea surface; the near water fills down to the ground line y = 16

// ── crest outline ─────────────────────────────────────────────────────────────────────────────────
// back foot → back (concave, then convex) → crest → outer lip → tip → barrel ceiling → slit (upper edge)
// → slit end → slit (lower edge) → barrel wall → face → front foot.  Every key pose uses this structure;
// where a pose has no lip yet, tip … wall collapse into one point on the front slope.
var WV_SEGS = [['a1', 'a2', 'm'], ['b1', 'b2', 'cr'], ['o1', 'o2', 'or'], ['d1', 'd2', 'tp'], ['u1', 'u2', 'si'],
  ['s1', 's2', 'se'], ['l1', 'l2', 'wl'], ['f1', 'f2', 'ff']];
var WV_KEYS = ['bf', 'a1', 'a2', 'm', 'b1', 'b2', 'cr', 'o1', 'o2', 'or', 'd1', 'd2', 'tp', 'u1', 'u2', 'si',
  's1', 's2', 'se', 'l1', 'l2', 'wl', 'f1', 'f2', 'ff'];

// poses are drawn in poster coordinates with the anchor (crest foot) at x = 8 on the surface
function wvPose(P) {
  var o = {}, lip = P.lip;
  WV_KEYS.forEach(function (k) {
    var p = P[k] || lip;
    o[k] = [p[0] - 8, p[1] - WV_SURF];
  });
  return o;
}
function wvFlat(P, k) {   // the same pose pressed flat into the surface; the front is smoothed (no point, no undercut)
  var o = {}; WV_KEYS.forEach(function (n) { o[n] = [P[n][0], P[n][1] * k]; });
  var tp = o.tp, f2 = o.f2;
  o.f1 = [tp[0] + (f2[0] - tp[0]) * 0.35, tp[1] + (f2[1] - tp[1]) * 0.35];
  o.d2 = [tp[0] - (o.f1[0] - tp[0]) * 0.5, tp[1] - (o.f1[1] - tp[1]) * 0.5];
  return o;
}

// set wave
var WV_SWELL = wvPose({
  bf: [1.8, 14], a1: [4.3, 14], a2: [5.6, 13.1], m: [6.6, 12.2],
  b1: [7.6, 11.3], b2: [8.7, 9.8], cr: [10.0, 9.8],
  o1: [10.75, 9.8], o2: [11.35, 10.0], or: [11.75, 10.3],
  d1: [11.9, 10.42], d2: [12.02, 10.55], lip: [12.12, 10.68],
  f1: [11.95, 11.6], f2: [12.6, 13.95], ff: [15.2, 14]
});
var WV_PEAK = wvPose({
  bf: [1.5, 14], a1: [4.0, 14], a2: [5.2, 12.5], m: [6.1, 11.0],
  b1: [6.95, 9.6], b2: [8.4, 7.2], cr: [10.1, 7.2],
  o1: [11.3, 7.2], o2: [12.3, 7.55], or: [12.9, 8.15],
  d1: [13.2, 8.4], d2: [13.45, 8.75], tp: [13.5, 9.1],
  u1: [13.35, 8.95], u2: [13.1, 8.8], lip: [12.85, 8.85],
  f1: [12.3, 9.65], f2: [11.9, 13.95], ff: [15.4, 14]
});
var WV_PRECURL = wvPose({
  bf: [1.3, 14], a1: [3.8, 14], a2: [4.8, 12.0], m: [5.55, 10.25],
  b1: [6.35, 8.4], b2: [7.6, 5.0], cr: [9.95, 5.0],
  o1: [12.0, 5.0], o2: [13.6, 6.15], or: [13.7, 7.85],
  d1: [13.75, 9.2], d2: [13.05, 9.95], tp: [12.1, 9.9],
  u1: [12.75, 9.55], u2: [12.85, 7.55], si: [11.35, 7.35],
  s1: [11.15, 7.33], s2: [10.95, 7.38], se: [10.8, 7.5],
  l1: [10.95, 7.6], l2: [11.05, 7.75], wl: [11.15, 7.95],
  f1: [10.6, 8.8], f2: [10.6, 13.95], ff: [15.2, 14]
});
var WV_CURL = wvPose({
  bf: [1.2, 14], a1: [3.7, 14], a2: [4.6, 11.8], m: [5.3, 9.9],
  b1: [6.05, 7.85], b2: [7.2, 3.75], cr: [9.85, 3.75],
  o1: [12.4, 3.75], o2: [14.1, 5.25], or: [14.1, 7.45],
  d1: [14.1, 9.3], d2: [13.35, 10.35], tp: [11.9, 10.05],
  u1: [13.2, 9.95], u2: [13.25, 6.55], si: [10.75, 6.2],
  s1: [9.45, 6.12], s2: [7.95, 6.45], se: [6.95, 7.85],
  l1: [7.9, 7.05], l2: [9.35, 6.75], wl: [10.4, 7.1],
  f1: [9.6, 8.0], f2: [9.65, 13.95], ff: [15.1, 14]
});
var WV_PLUNGE = wvPose({
  bf: [1.0, 14], a1: [3.9, 14], a2: [5.0, 12.0], m: [5.8, 10.3],
  b1: [6.6, 8.6], b2: [8.0, 4.6], cr: [10.45, 4.6],
  o1: [12.8, 4.6], o2: [14.6, 6.1], or: [14.8, 8.5],
  d1: [14.95, 10.5], d2: [14.5, 12.3], tp: [13.7, 12.85],
  u1: [14.1, 12.25], u2: [14.0, 7.9], si: [11.6, 7.35],
  s1: [10.45, 7.2], s2: [9.1, 7.45], se: [8.2, 8.55],
  l1: [9.2, 8.0], l2: [10.45, 7.95], wl: [11.3, 8.25],
  f1: [10.55, 9.2], f2: [10.6, 13.95], ff: [15.4, 14]
});
var WV_CLOSE = wvPose({
  bf: [1.8, 14], a1: [4.6, 14], a2: [5.9, 12.4], m: [6.8, 11.0],
  b1: [7.7, 9.6], b2: [9.0, 6.8], cr: [11.2, 6.8],
  o1: [13.1, 6.8], o2: [14.6, 7.9], or: [14.75, 9.6],
  d1: [14.85, 11.1], d2: [14.6, 12.8], tp: [14.1, 13.5],
  u1: [14.25, 12.7], u2: [14.1, 10.0], si: [12.6, 9.6],
  s1: [12.0, 9.5], s2: [11.3, 9.6], se: [10.8, 10.0],
  l1: [11.35, 9.95], l2: [11.9, 10.05], wl: [12.3, 10.3],
  f1: [11.9, 11.0], f2: [12.0, 13.95], ff: [15.4, 14]
});
var WV_FOAM = wvPose({
  bf: [2.4, 14], a1: [5.2, 14], a2: [6.8, 12.9], m: [7.9, 12.0],
  b1: [9.0, 11.1], b2: [10.4, 9.6], cr: [11.8, 9.6],
  o1: [12.75, 9.6], o2: [13.55, 9.95], or: [14.05, 10.45],
  d1: [14.2, 10.62], d2: [14.32, 10.82], tp: [14.4, 11.0],
  u1: [14.38, 11.02], u2: [14.36, 11.04], si: [14.34, 11.06],
  s1: [13.6, 10.62], s2: [12.0, 10.65], se: [9.7, 11.65],
  l1: [11.9, 11.25], l2: [13.45, 11.3], wl: [14.2, 11.72],
  f1: [14.4, 12.3], f2: [14.5, 13.95], ff: [16.6, 14]
});
var WV_SETTLE = wvPose({
  bf: [3.0, 14], a1: [5.8, 14], a2: [7.5, 13.25], m: [8.7, 12.6],
  b1: [9.8, 12.0], b2: [11.1, 11.0], cr: [12.4, 11.0],
  o1: [13.2, 11.0], o2: [13.85, 11.22], or: [14.3, 11.55],
  d1: [14.42, 11.67], d2: [14.52, 11.8], lip: [14.6, 11.95],
  f1: [14.62, 12.6], f2: [14.9, 14.0], ff: [16.6, 14]
});
// gentle wave: a small, chunky curl that still reads at actual size
var WV_GSWELL = wvPose({
  bf: [3.0, 14], a1: [5.0, 14], a2: [6.2, 13.45], m: [7.1, 12.85],
  b1: [7.9, 12.3], b2: [8.9, 11.6], cr: [9.9, 11.6],
  o1: [10.5, 11.6], o2: [11.0, 11.75], or: [11.35, 11.95],
  d1: [11.47, 12.03], d2: [11.57, 12.12], lip: [11.65, 12.22],
  f1: [11.6, 12.9], f2: [12.2, 14.0], ff: [14.2, 14]
});
var WV_GPEAK = wvPose({
  bf: [2.4, 14], a1: [4.6, 14], a2: [5.75, 12.85], m: [6.55, 11.7],
  b1: [7.3, 10.6], b2: [8.15, 8.7], cr: [9.75, 8.7],
  o1: [11.4, 8.7], o2: [12.75, 9.6], or: [12.8, 10.9],
  d1: [12.85, 12.0], d2: [12.2, 12.55], tp: [11.35, 12.5],
  u1: [11.85, 12.15], u2: [11.75, 11.05], lip: [11.0, 10.95],
  f1: [10.45, 11.45], f2: [10.6, 14.0], ff: [13.6, 14]
});
var WV_GSPILL = wvPose({
  bf: [3.4, 14], a1: [5.6, 14], a2: [6.9, 13.2], m: [7.9, 12.45],
  b1: [8.8, 11.75], b2: [10.0, 11.0], cr: [11.1, 11.0],
  o1: [11.85, 11.0], o2: [12.55, 11.2], or: [12.95, 11.6],
  d1: [13.2, 11.85], d2: [13.25, 12.2], lip: [13.12, 12.55],
  f1: [13.0, 12.85], f2: [13.45, 14.0], ff: [15.3, 14]
});

// wave timelines: key poses, ages, anchor x per key; born = loop time when it starts, life = loop fraction
var WV_WAVES = [
  { born: -0.472, life: 0.8, at: [0, 0.09, 0.2, 0.37, 0.49, 0.59, 0.68, 0.745, 0.82, 0.89, 0.95, 1],
    keys: [wvFlat(WV_SWELL, 0.04), wvFlat(WV_SWELL, 0.35), WV_SWELL, WV_PEAK, WV_PRECURL, WV_CURL, WV_PLUNGE, WV_CLOSE,
      WV_FOAM, WV_SETTLE, wvFlat(WV_SETTLE, 0.35), wvFlat(WV_SETTLE, 0.04)],
    x: [3.4, 4.0, 4.8, 5.9, 7.0, 8.0, 8.45, 8.85, 9.5, 9.9, 10.2, 10.4] },
  { born: 0.17, life: 0.47, at: [0, 0.1, 0.3, 0.55, 0.78, 0.9, 1],
    keys: [wvFlat(WV_GSWELL, 0.04), wvFlat(WV_GSWELL, 0.35), WV_GSWELL, WV_GPEAK, WV_GSPILL, wvFlat(WV_GSPILL, 0.35), wvFlat(WV_GSPILL, 0.04)],
    x: [3.0, 3.6, 4.6, 6.6, 8.4, 9.3, 10.0] }
];

// far waves: rise from behind the near water, curl small, drift right at about half speed, sink again
var WV_FAR = [
  { born: -0.3, life: 0.6, sc: 0.68, at: [0, 0.3, 0.5, 0.78, 1],
    keys: [WV_GSWELL, WV_GSWELL, WV_GPEAK, WV_GSPILL, WV_GSPILL], x: [11.3, 12.1, 12.9, 13.7, 14.3] },
  { born: 0.29, life: 0.6, sc: 0.66, at: [0, 0.3, 0.52, 0.78, 1],
    keys: [WV_GSWELL, WV_GSWELL, WV_GPEAK, WV_GSPILL, WV_GSPILL], x: [3.4, 4.2, 5.0, 5.9, 6.5] }
];

// ── interpolation ─────────────────────────────────────────────────────────────────────────────────
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
function wvAge(W, t) { var a = wrap01(t - W.born) / W.life; return a < 1 ? a : -1; }
function wvPoseAt(W, age) {
  var P = {};
  WV_KEYS.forEach(function (k) {
    P[k] = [wvMono(W.at, W.keys.map(function (K) { return K[k][0]; }), age), wvMono(W.at, W.keys.map(function (K) { return K[k][1]; }), age)];
  });
  return P;
}

// ── geometry helpers ──────────────────────────────────────────────────────────────────────────────
function wvCubic(p0, p1, p2, p3, n, out) {
  for (var i = 1; i <= n; i++) {
    var u = i / n, v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
}
function wvClipX(poly, xmin, xmax) {
  function pass(pts, keep, x) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var A = pts[i], B = pts[(i + 1) % pts.length], ia = keep(A[0]), ib = keep(B[0]);
      if (ia) out.push(A);
      if (ia !== ib) { var u = (x - A[0]) / (B[0] - A[0]); out.push([x, A[1] + (B[1] - A[1]) * u]); }
    }
    return out;
  }
  var p = pass(poly, function (x) { return x >= xmin; }, xmin);
  return pass(p, function (x) { return x <= xmax; }, xmax);
}
function wvClipBelow(poly, ymax) {   // keep the part above y = ymax (hidden parts never leave the water)
  var out = [];
  for (var i = 0; i < poly.length; i++) {
    var A = poly[i], B = poly[(i + 1) % poly.length], ia = A[1] <= ymax, ib = B[1] <= ymax;
    if (ia) out.push(A);
    if (ia !== ib) { var u = (ymax - A[1]) / (B[1] - A[1]); out.push([A[0] + (B[0] - A[0]) * u, ymax]); }
  }
  return out;
}
function wvOutline(P, ax, dy, sc) {
  dy = dy || 0; sc = sc || 1;
  function q(p) { return [ax + sc * p[0], WV_SURF + dy + sc * p[1]]; }
  var pts = [q([P.bf[0], 1.2]), q(P.bf)], last = q(P.bf);
  for (var i = 0; i < WV_SEGS.length; i++) {
    var c = WV_SEGS[i], p3 = q(P[c[2]]);
    wvCubic(last, q(P[c[0]]), q(P[c[1]]), p3, 24, pts); last = p3;
  }
  pts.push(q([P.ff[0], 1.2]));
  var poly = wvClipBelow(wvClipX(pts, 1, 17), WV_SURF + 1);
  wvOutline.last = poly;
  return poly.length > 2 ? polyPath(poly, true) : '';
}
// topmost boundary of a polygon at each sample x (Infinity where it has none)
function wvTop(poly, xs) {
  var out = xs.map(function () { return Infinity; });
  for (var i = 0; i < poly.length; i++) {
    var A = poly[i], B = poly[(i + 1) % poly.length], x0 = Math.min(A[0], B[0]), x1 = Math.max(A[0], B[0]);
    if (x1 - x0 < 1e-9) continue;
    for (var j = 0; j < xs.length; j++) {
      var x = xs[j]; if (x < x0 || x > x1) continue;
      var y = A[1] + (B[1] - A[1]) * (x - A[0]) / (B[0] - A[0]);
      if (y < out[j]) out[j] = y;
    }
  }
  return out;
}
// where two swells overlap, their union leaves a V-shaped crease; bridge it with a tangent arc (a fillet)
function wvFillet(pa, pb, r) {
  var st = 0.05, xs = []; for (var x = 1; x <= 17.0001; x += st) xs.push(x);
  var A = wvTop(pa, xs), B = wvTop(pb, xs), n = xs.length, d = '';
  function env(j) { return Math.min(A[j], B[j]); }
  for (var j = 1; j < n; j++) {
    if (!isFinite(A[j]) || !isFinite(B[j]) || !isFinite(A[j - 1]) || !isFinite(B[j - 1])) continue;
    if ((A[j - 1] - B[j - 1]) * (A[j] - B[j]) > 0) continue;               // no crossing here
    var k = Math.round(r / st), j0 = j - k, j1 = j + k;
    if (j0 < 1 || j1 > n - 2) continue;
    if (![j0 - 1, j0, j0 + 1, j1 - 1, j1, j1 + 1].every(function (q) { return isFinite(env(q)); })) continue;
    var yc = env(j); if (yc < WV_SURF - 4) continue;                         // only creases low on the water
    var s0 = (env(j0 + 1) - env(j0 - 1)) / (2 * st), s1 = (env(j1 + 1) - env(j1 - 1)) / (2 * st);
    if (!(s0 > 0.05 && s1 < -0.05)) continue;                                // a real V: down on the left, up on the right
    var P0 = [xs[j0], env(j0)], P2 = [xs[j1], env(j1)];
    // control point where the two tangents meet
    var xm = (P2[1] - P0[1] + s0 * P0[0] - s1 * P2[0]) / (s0 - s1), P1 = [xm, P0[1] + s0 * (xm - P0[0])];
    if (!(xm > P0[0] && xm < P2[0])) continue;
    var pts = [];
    for (var i2 = 0; i2 <= 16; i2++) {
      var u = i2 / 16, w = 1 - u;
      pts.push([w * w * P0[0] + 2 * w * u * P1[0] + u * u * P2[0], w * w * P0[1] + 2 * w * u * P1[1] + u * u * P2[1]]);
    }
    for (var q = j1; q >= j0; q--) pts.push([xs[q], env(q) + 0.02]);
    d += polyPath(pts, true);
  }
  return d;
}

// ── scene ─────────────────────────────────────────────────────────────────────────────────────────
function wvScene(t) {
  var s = '';
  // far waves first, translucent (far things); the near water is drawn over them without a seam
  WV_FAR.forEach(function (D) {
    var a = wvAge(D, t); if (a < 0) return;
    var rise = smooth(a / 0.3) * (1 - smooth((a - 0.72) / 0.28));
    var d = wvOutline(wvPoseAt(D, a), wvMono(D.at, D.x, a), 3.0 * (1 - rise), D.sc);
    if (d) s += fade(d);
  });
  var polys = [];
  WV_WAVES.forEach(function (W) {
    var age = wvAge(W, t); if (age < 0) return;
    var d = wvOutline(wvPoseAt(W, age), wvMono(W.at, W.x, age));
    if (d) { s += ink(d); polys.push(wvOutline.last); }
  });
  for (var i = 0; i < polys.length; i++) for (var j = i + 1; j < polys.length; j++) {
    var fl = wvFillet(polys[i], polys[j], 1.1); if (fl) s += ink(fl);
  }
  s += ink(rectPath(1, WV_SURF, 16, 16 - WV_SURF, [0, 0, 0.35, 0.35]));
  return s;
}
