// 고양이와 나비 (cat and butterfly) — variant B: elegance first.
// A cat flopped on its back, head resting on the floor (tilted, eyes closed in happy arches), lazily paws at a
// butterfly. Silhouette rhythm left → right: pointed ears, the head set apart by a clean gap, a tucked far paw,
// the reaching near paw (the hero), the soft belly with a haunch crease, and a long tail that curls on the floor.
// Motion (6 s): the butterfly teases → the near paw cocks back and swats → the butterfly startles up and away, the
// tail flicks, the head lifts to watch → the butterfly loops through the open sky, an ear twitches → it dips to the
// left, the far paw bats lazily → everything drifts back to the poster pose.

// ── local helpers ───────────────────────────────────────────────────────────────────────────────
// smooth width profile through stops [[s, right, left], ...] (cubic Hermite, C1)
function prof(stops) {
  return function (s) {
    var n = stops.length;
    if (s <= stops[0][0]) return [stops[0][1], stops[0][2]];
    if (s >= stops[n - 1][0]) return [stops[n - 1][1], stops[n - 1][2]];
    var i = 0; while (i < n - 2 && s > stops[i + 1][0]) i++;
    var a = stops[i], b = stops[i + 1], h = b[0] - a[0], u = (s - a[0]) / h;
    var h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
    var out = [];
    for (var k = 1; k <= 2; k++) {
      var pa = stops[Math.max(0, i - 1)], nb = stops[Math.min(n - 1, i + 2)];
      var ma = i > 0 ? (b[k] - pa[k]) / (b[0] - pa[0]) : (b[k] - a[k]) / h;
      var mb = i + 2 < n ? (nb[k] - a[k]) / (nb[0] - a[0]) : (b[k] - a[k]) / h;
      out.push(h00 * a[k] + h10 * h * ma + h01 * b[k] + h11 * h * mb);
    }
    return out;
  };
}
// half-elliptical end cap for limbA (ratio = cap length / half-width; > 1 gives a softly pointed oval tip)
function capPts(p, tn, w, ratio, sgn) {
  var nx = -tn[1], ny = tn[0], h = (w[0] + w[1]) / 2, off = (w[0] - w[1]) / 2, a = h * ratio, out = [];
  var cx = p[0] + nx * off, cy = p[1] + ny * off;
  for (var k = 1; k < 14; k++) {
    var th = sgn > 0 ? Math.PI * k / 14 : Math.PI * (1 - k / 14);
    out.push([cx + nx * h * Math.cos(th) + sgn * tn[0] * a * Math.sin(th), cy + ny * h * Math.cos(th) + sgn * tn[1] * a * Math.sin(th)]);
  }
  return out;
}
// asymmetric variable-width limb: wfn(s) → [right, left] half-widths (right = right-hand side walking root → tip)
function limbA(spine, wfn, opts) {
  opts = opts || {};
  var P = _sample(spine, opts.samples || 16), L = [0];
  for (var i = 1; i < P.length; i++) L.push(L[i - 1] + dist(P[i - 1], P[i]));
  var total = L[L.length - 1] || 1, R = [], Lf = [], T = [];
  for (var j = 0; j < P.length; j++) {
    var a = P[Math.max(0, j - 1)], b = P[Math.min(P.length - 1, j + 1)];
    var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    var w = wfn(L[j] / total);
    R.push([P[j][0] - ty * w[0], P[j][1] + tx * w[0]]);
    Lf.push([P[j][0] + ty * w[1], P[j][1] - tx * w[1]]);
    T.push([tx, ty]);
  }
  var pts = R.slice();
  if (opts.endCap) pts = pts.concat(capPts(P[P.length - 1], T[T.length - 1], wfn(1), opts.endCap, 1));
  pts = pts.concat(Lf.reverse());
  if (opts.startCap) pts = pts.concat(capPts(P[0], T[0], wfn(0), opts.startCap, -1));
  return polyPath(pts, true);
}
// points along a path outline
function bez3(p0, p1, p2, p3, u) {
  var v = 1 - u;
  return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
    v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
}
function outlinePts(d, per) {
  var segs = parsePath(d), out = [], cur = [0, 0];
  per = per || 12;
  for (var i = 0; i < segs.length; i++) {
    var g = segs[i], p = g.p, k;
    if (g.c === 'M') { cur = [p[0], p[1]]; out.push(cur); }
    else if (g.c === 'L') { for (k = 1; k <= per; k++) out.push(mix(cur, [p[0], p[1]], k / per)); cur = [p[0], p[1]]; }
    else if (g.c === 'C') { for (k = 1; k <= per; k++) out.push(bez3(cur, [p[0], p[1]], [p[2], p[3]], [p[4], p[5]], k / per)); cur = [p[4], p[5]]; }
    else if (g.c === 'Q') { for (k = 1; k <= per; k++) { var u = k / per, v = 1 - u; out.push([v * v * cur[0] + 2 * v * u * p[0] + u * u * p[2], v * v * cur[1] + 2 * v * u * p[1] + u * u * p[3]]); } cur = [p[2], p[3]]; }
  }
  return out;
}
// a separation cut that hugs the outside of a closed contour where keep(point) is true
function rimCut(d, keep, off, w, rise, fall) {
  var pts = outlinePts(d, 14), n = pts.length, area = 0, i;
  if (dist(pts[0], pts[n - 1]) < 1e-6) { pts.pop(); n--; }
  for (i = 0; i < n; i++) { var a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  var sg = area > 0 ? 1 : -1, offp = [];
  for (i = 0; i < n; i++) {
    var p0 = pts[(i - 1 + n) % n], p2 = pts[(i + 1) % n], tx = p2[0] - p0[0], ty = p2[1] - p0[1], tl = Math.hypot(tx, ty) || 1;
    offp.push([pts[i][0] + sg * ty / tl * off, pts[i][1] - sg * tx / tl * off]);
  }
  var s0 = 0; while (s0 < n && keep(pts[s0])) s0++;
  var run = [], best = [];
  for (var k = 1; k <= n; k++) {
    var j = (s0 + k) % n;
    if (keep(pts[j])) run.push(offp[j]); else { if (run.length > best.length) best = run; run = []; }
  }
  if (run.length > best.length) best = run;
  if (best.length < 3) return '';
  var thin = [];
  for (i = 0; i < best.length; i += 3) thin.push(best[i]);
  if (thin[thin.length - 1] !== best[best.length - 1]) thin.push(best[best.length - 1]);
  return ribbon(thin, function (u) {
    var p = rise > 0 ? Math.min(1, u / rise) : 1, q = fall > 0 ? Math.min(1, (1 - u) / fall) : 1;
    return w * Math.sqrt(Math.sin(Math.PI / 2 * p)) * Math.sqrt(Math.sin(Math.PI / 2 * q));
  }, { samples: 3 });
}
function bboxOf(d) {
  var pts = outlinePts(d, 8), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (var i = 0; i < pts.length; i++) { x0 = Math.min(x0, pts[i][0]); y0 = Math.min(y0, pts[i][1]); x1 = Math.max(x1, pts[i][0]); y1 = Math.max(y1, pts[i][1]); }
  return [x0, y0, x1, y1];
}

// ── the head (front view, upright, centred on the face) ─────────────────────────────────────────
// right half, mirrored: muzzle → cheek → ear (outer edge, tip, inner edge) → forehead
var HEAD_R = [[0, 1.85], [0.75, 1.85, 1.3, 1.78, 1.85, 1.45], [2.5, 1.08, 2.88, 0.6, 2.88, 0.05],
  [2.88, -0.45, 2.72, -0.85, 2.6, -1.25], [2.5, -1.9, 2.46, -2.72, 2.36, -3.24], [2.31, -3.5, 2.08, -3.55, 1.96, -3.36],
  [1.62, -2.92, 1.2, -2.35, 0.88, -2.02], [0.6, -1.9, 0.32, -1.86, 0, -1.86]];
// right half from R, left half mirrored from L (so each ear can move on its own)
function mirrorHead(R, L) {
  var d = 'M' + R[0][0] + ' ' + R[0][1], i;
  for (i = 1; i < R.length; i++) d += 'C' + R[i].map(f).join(' ');
  for (i = L.length - 1; i >= 1; i--) {
    var c = L[i], prev = i > 1 ? L[i - 1] : L[0], e = prev.length === 2 ? prev : prev.slice(4);
    d += 'C' + [-c[2], c[3], -c[0], c[1], -e[0], e[1]].map(f).join(' ');
  }
  return d + 'Z';
}
// turn the ear (segments 4–6) about its base; + = outward
function earTurn(R, deg) {
  if (!deg) return R;
  var o = R[3].slice(4), n = R[6].slice(4), out = R.map(function (s) { return s.slice(); });
  function tr(si, k, w) { var p = rot((o[0] + n[0]) / 2, (o[1] + n[1]) / 2, deg * w)(R[si][k], R[si][k + 1]); out[si][k] = p[0]; out[si][k + 1] = p[1]; }
  tr(4, 0, 0.5); tr(4, 2, 1); tr(4, 4, 1); tr(5, 0, 1); tr(5, 2, 1); tr(5, 4, 1); tr(6, 0, 1); tr(6, 2, 0.5);
  return out;
}
function headPath(earR, earL) { return mirrorHead(earTurn(HEAD_R, earR), earTurn(HEAD_R, earL)); }
var HEAD = headPath(0, 0);
function lid(ax, ay, bx, by, sag, th, ex) {
  var pts = [];
  for (var i = 0; i <= 8; i++) { var u = i / 8; pts.push([lerp(ax, bx, u), lerp(ay, by, u) + sag * 4 * u * (1 - u)]); }
  return ribbon(pts, function (u) { return th * Math.pow(Math.sin(Math.PI * u), ex || 0.9); });
}

// ── foreleg, drawn as one closed contour in the shoulder frame (base at 0,0, leg rising along −y) ──
// back of the arm (left) → knuckles → toe tip → pads → wrist crease → front of the arm (right)
var LEG = smoothPath([[-1.25, 0.6], [-1.06, -0.5], [-0.85, -1.5], [-0.7, -2.3], [-0.58, -2.9], [-0.46, -3.4],
  [-0.38, -3.92], [0.0, -4.48], [0.62, -4.74], [1.24, -4.64], [1.7, -4.26], [1.8, -3.88],
  [1.6, -3.56], [1.14, -3.4], [0.72, -3.3], [0.54, -3.1], [0.5, -2.82], [0.56, -2.2], [0.68, -1.4], [0.92, -0.5], [1.25, 0.6]], true);
var LEG_DENSE = outlinePts(LEG, 8);
// joints: a plane through the joint (normal points to the distal side) with a soft blend zone
var ELBOW = { c: [-0.06, -2.15], n: [0, -1], soft: 0.55 };
var WRIST = { c: [0.05, -3.25], n: [0.594, -0.804], soft: 0.45 };
function jw(p, J) { return smooth(((p[0] - J.c[0]) * J.n[0] + (p[1] - J.c[1]) * J.n[1] + J.soft) / (2 * J.soft)); }
// pose the leg: elbow bend and wrist flex in degrees (+ = clockwise on screen), then place it with fn
function legPath(elbow, wrist, fn) {
  var pts = LEG_DENSE.map(function (p) {
    var q = rot(WRIST.c[0], WRIST.c[1], wrist * jw(p, WRIST))(p[0], p[1]);
    q = rot(ELBOW.c[0], ELBOW.c[1], elbow * jw(p, ELBOW))(q[0], q[1]);
    return fn(q[0], q[1]);
  });
  return polyPath(pts, true);
}

// ── the butterfly (right half, body on x = 0, head up) ──────────────────────────────────────────
// forewing: a rounded triangle — leading edge sweeping to a soft apex, a straight outer margin, a defined tornus
var FW = 'M0.18 -0.22C0.66 -1.12 1.46 -1.94 2.42 -2.28C2.86 -2.42 3.14 -2.16 3.04 -1.8' +
  'C2.88 -1.3 2.62 -0.8 2.26 -0.42C2.06 -0.2 1.78 -0.06 1.4 -0.02C0.95 0.03 0.55 0.05 0.2 0.04Z';
// hindwing: a rounded lobe with a soft point at the trailing corner
var HW = 'M0.22 0.24C0.85 0.18 1.62 0.3 1.95 0.66C2.22 0.98 2.08 1.42 1.72 1.66' +
  'C1.44 1.86 1.2 2.12 0.92 2.12C0.6 2.1 0.38 1.6 0.22 1.0Z';
// a, ah: fore / hind wing stroke, 0 = spread flat, 1 = raised (seen from above they narrow toward the body)
function butterfly(bx, by, deg, sc, a, ah) {
  var R = chain(scaleAt(0, 0, sc), rot(0, 0, deg), move(bx, by)), s = '';
  var kf = 1 - 0.34 * a, kh = 1 - 0.34 * ah;
  s += ink(FW, chain(scaleAt(0, 0, kf, 1), R)) + ink(FW, chain(scaleAt(0, 0, -kf, 1), R));
  s += ink(HW, chain(scaleAt(0, 0, kh, 1), R)) + ink(HW, chain(scaleAt(0, 0, -kh, 1), R));
  // thorax wider than the head, abdomen tapering to a soft end
  s += ink(ribbon([[0, -0.66], [0, -0.36], [0, 0.12], [0, 0.8], [0, 1.45]], [0.8, 0.76, 0.94, 0.74, 0.56], { caps: ['round', 'round'] }), R);
  return s;
}

// ── timing helpers ──────────────────────────────────────────────────────────────────────────────
// keyframes [[t, [values], ease], ...] covering 0..1; ease shapes the segment that starts at that key
function keys(t, K) {
  for (var i = 0; i < K.length - 1; i++) {
    if (t >= K[i][0] && t <= K[i + 1][0]) {
      var e = (K[i][2] || smooth)((t - K[i][0]) / (K[i + 1][0] - K[i][0]));
      return K[i][1].map(function (v, j) { return lerp(v, K[i + 1][1][j], e); });
    }
  }
  return K[K.length - 1][1].slice();
}
function accel(x) { var c = clamp(x); return c * c * (2 - c); }            // gathers speed, still lands softly
function snap(x) { var c = clamp(x); return 1 - Math.pow(1 - c, 2.4); }     // fast out, soft landing
// a closed, smooth path through timed points (Catmull-Rom, periodic)
function loopPath(t, P) {
  var n = P.length - 1, i = 0;
  while (i < n - 1 && t > P[i + 1][0]) i++;
  var u = (t - P[i][0]) / (P[i + 1][0] - P[i][0]);
  function q(k) { return P[((k % n) + n) % n]; }
  var p0 = q(i - 1), p1 = P[i], p2 = P[i + 1], p3 = q(i + 2);
  var out = [];
  for (var j = 1; j < p1.length; j++) out.push(_cr([0, p0[j]], [0, p1[j]], [0, p2[j]], [0, p3[j]], u)[1]);
  return out;
}

// near paw [shoulder swing, elbow, wrist] in degrees. The swat goes up at the butterfly: rest → cocked back (paw
// opened) → the arm extends as the wrist snaps forward → the paw flops → slow, lazy return
var NEAR = [[0, [14, 0, -18]], [0.1, [14, 0, -18]], [0.2, [2, 10, -34], accel], [0.27, [24, -16, 22], snap],
  [0.33, [28, -8, 34]], [0.56, [14, 0, -18], smoother], [1, [14, 0, -18]]];
// far paw: rests curled, then one lazy bat later in the loop
var FAR = [[0, [-18, 28, 14]], [0.5, [-18, 28, 14]], [0.58, [-22, 22, -24], accel], [0.655, [4, -6, 20], snap],
  [0.71, [6, 2, 30]], [0.9, [-18, 28, 14], smoother], [1, [-18, 28, 14]]];
// butterfly: [t, x, y, tilt] — teases the paw, startles up and away, loops through the open sky, comes back
var FLIGHT = [[0, 12.6, 4.9, 12], [0.11, 12.95, 5.3, 16], [0.21, 12.6, 5.85, 8], [0.27, 12.25, 5.55, 0],
  [0.34, 11.1, 4.3, -16], [0.46, 9.4, 4.1, -18], [0.585, 9.0, 5.45, -4], [0.66, 9.3, 4.6, 6],
  [0.75, 10.2, 3.95, 12], [0.87, 11.7, 4.15, 18], [1, 12.6, 4.9, 12]];

var ICON = {
  id: "cat",
  frames: 48,
  at: function (t) {
    var s = '';
    // ── body: back on the floor, soft belly up; the haunch crease shows the folded hind leg
    var BODY = 'M5.0 16C5.4 14.5 6.9 13.2 8.8 12.7C10.3 12.2 12.0 12.1 13.2 12.4' +
      'C14.3 12.7 14.95 13.6 14.95 14.7C14.95 15.5 14.55 16 13.9 16Z';
    s += ink(BODY);
    s += cut(ribbon([[12.4, 11.95], [12.72, 12.9], [13.25, 13.8], [13.95, 14.4]], function (u) { return 0.66 * Math.pow(1 - u, 0.8); }));

    // ── tail: lies on the floor; the curl loosens and re-curls lazily and flicks after each swipe (tip lags)
    function tailAng(x) {
      return 4 * loop(x, 2, 0.15) + 2 * noise(x, 4, 2) + 13 * bump(x, 0.28, 0.34, 0.37, 0.52) + 8 * bump(x, 0.66, 0.71, 0.73, 0.86);
    }
    var TS = [[13.0, 15.4], [14.4, 15.4], [15.45, 15.2], [16.05, 14.5], [16.2, 13.5], [15.95, 12.65], [15.4, 12.3]];
    var ts = [TS[0], TS[1], TS[2]], acc = 0, gain = [0, 0, 0, 0.12, 0.25, 0.45, 0.6];
    for (var i = 3; i < TS.length; i++) {
      acc += gain[i] * tailAng(wrap01(t - 0.012 * (i - 3)));
      var v = rot(0, 0, acc)(TS[i][0] - TS[i - 1][0], TS[i][1] - TS[i - 1][1]);
      ts.push([ts[i - 1][0] + v[0], ts[i - 1][1] + v[1]]);
    }
    s += ink(limbA(ts, prof([[0, 0.6, 0.95], [0.25, 0.6, 0.66], [0.6, 0.52, 0.52], [1, 0.46, 0.46]]), { endCap: 1.3 }));

    // ── forelegs
    var B = keys(t, FAR), A = keys(t, NEAR);
    s += ink(legPath(B[1], B[2], chain(scaleAt(0, 0, 0.9), rot(0, 0, B[0]), move(8.5, 13.4))));
    // the near leg is the part closest to us: drawn in front, so no cut (haunch crease) can touch it
    var nearLeg = legPath(A[1], A[2], chain(rot(0, 0, A[0]), move(10.6, 13.3)));

    // ── head resting on the floor, tilted back; lifts a little to watch the swipe; the up ear twitches
    var tilt = -30 + 3.5 * bump(t, 0.2, 0.3, 0.42, 0.6) - 2.5 * bump(t, 0.6, 0.66, 0.74, 0.9);
    var twitch = 28 * pulse(t, 0.5, 0.548) + 18 * pulse(t, 0.565, 0.615);
    var HD = headPath(twitch, 0), HT = chain(scaleAt(0, 0, 0.95), rot(0, 0, tilt));
    var bb = bboxOf(tp(HD, HT)), M = move(4.55, 16 - bb[3]), HM = chain(HT, M);
    s += ink(HD, HM);
    s += cut(rimCut(HD, function (p) { return p[0] > -0.9 && p[1] > -0.9; }, 0.3, 0.62, 0, 0.15), HM);
    s += cut(lid(-1.72, 0.32, -0.45, 0.32, -0.36, 0.62, 1.2), HM) + cut(lid(0.45, 0.32, 1.72, 0.32, -0.36, 0.62, 1.2), HM);
    s += front(nearLeg);

    // ── butterfly: lazy flaps, quicker while it escapes; bobs with each stroke
    var ph = 7 * t + seg(t, 0.26, 0.42), fl = Math.pow((1 - Math.cos(TAU * ph)) / 2, 1.3);
    var fh = Math.pow((1 - Math.cos(TAU * (ph - 0.07))) / 2, 1.3);
    var fp = loopPath(t, FLIGHT), bob = -0.22 * Math.sin(TAU * ph);
    s += butterfly(fp[0], fp[1] + bob, fp[2], 0.95, fl, fh);
    return s;
  }
};
