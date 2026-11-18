// 고양이와 나비 (cat and butterfly) — final, built on variant B.
// A cat flopped on its back on the floor, head resting on its cheek (eyes closed), forepaws up. A butterfly
// teases above the near paw. Silhouette left → right: pointed ears, the head set apart by a clean gap, a soft
// far paw, the raised hero paw, the belly with a haunch crease, a long tail curling on the floor.
// Motion (6 s, 48 frames): hold → the butterfly dips to tease, an ear twitches → the hero paw cocks down
// (f5–f10) → strikes up (f10–f12) as the butterfly lifts off just over it → overshoot, the haunch kicks, the
// tail flicks, the head lifts to watch → slow return → the butterfly glides, loops left and dips → the far paw
// bats lazily → the butterfly glides home; the cat breathes and its raised paw sways while it waits.

// ── pen: contours from anchor nodes with tangent directions (deg, 0 = right, 90 = down) ─────────────
// node: [x, y, dir, lenIn, lenOut] or [x, y, dirIn, lenIn, dirOut, lenOut]; fillet() expands to two nodes
function D(deg) { var r = deg * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
function pnode(a) {
  var di = a[2], li = a[3], dO = a.length > 5 ? a[4] : a[2], lo = a.length > 5 ? a[5] : a[4], u = D(di), v = D(dO);
  return { p: [a[0], a[1]], i: [a[0] - u[0] * li, a[1] - u[1] * li], o: [a[0] + v[0] * lo, a[1] + v[1] * lo] };
}
function pnodes(A) {
  var out = [];
  A.forEach(function (a) { if (a.fillet) out = out.concat(a.fillet.map(pnode)); else out.push(pnode(a)); });
  return out;
}
function P2(p) { return f(p[0]) + ' ' + f(p[1]); }
function pbuild(N, closed) {
  var d = 'M' + P2(N[0].p), n = N.length, last = closed === false ? n - 1 : n;
  for (var k = 0; k < last; k++) { var a = N[k], b = N[(k + 1) % n]; d += 'C' + P2(a.o) + ' ' + P2(b.i) + ' ' + P2(b.p); }
  return d + (closed === false ? '' : 'Z');
}
function pen(A, closed) { return pbuild(pnodes(A), closed); }
// a true-radius round corner at T, travelling aIn then aOut
function fillet(T, aIn, aOut, r, lin, lout) {
  var phi = Math.abs(((aOut - aIn + 540) % 360) - 180), dd = r * Math.tan(phi * Math.PI / 360), h = 4 / 3 * Math.tan(phi * Math.PI / 720) * r;
  var u = D(aIn), v = D(aOut);
  return { fillet: [[T[0] - u[0] * dd, T[1] - u[1] * dd, aIn, lin, h], [T[0] + v[0] * dd, T[1] + v[1] * dd, aOut, h, lout]] };
}
function isect(p, u, q, v) {
  var d = u[0] * v[1] - u[1] * v[0]; if (Math.abs(d) < 1e-9) return null;
  var s = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / d;
  return [p[0] + u[0] * s, p[1] + u[1] * s];
}
function ang(p, q) { return Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI; }

// ── outlines, for the fillets and the head gap ──────────────────────────────────────────────────────
function bez3(p0, p1, p2, p3, u) {
  var v = 1 - u;
  return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
    v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
}
function outline(d, per) {          // first closed subpath as a polygon
  var segs = parsePath(d), out = [], cur = [0, 0], k;
  per = per || 16;
  for (var i = 0; i < segs.length; i++) {
    var g = segs[i], p = g.p;
    if (g.c === 'M') { if (out.length) break; cur = [p[0], p[1]]; out.push(cur); }
    else if (g.c === 'L') { for (k = 1; k <= 4; k++) out.push(mix(cur, [p[0], p[1]], k / 4)); cur = [p[0], p[1]]; }
    else if (g.c === 'C') { for (k = 1; k <= per; k++) out.push(bez3(cur, [p[0], p[1]], [p[2], p[3]], [p[4], p[5]], k / per)); cur = [p[4], p[5]]; }
    else if (g.c === 'Z') break;
  }
  if (dist(out[0], out[out.length - 1]) < 1e-6) out.pop();
  return out;
}
function ptIn(p, P) {
  var c = false;
  for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
    var a = P[i], b = P[j];
    if (((a[1] > p[1]) !== (b[1] > p[1])) && (p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
  }
  return c;
}
function crossings(A, B) {
  var out = [];
  for (var i = 0; i < A.length; i++) {
    var a0 = A[i], a1 = A[(i + 1) % A.length];
    for (var j = 0; j < B.length; j++) {
      var b0 = B[j], b1 = B[(j + 1) % B.length];
      var d = (a1[0] - a0[0]) * (b1[1] - b0[1]) - (a1[1] - a0[1]) * (b1[0] - b0[0]);
      if (Math.abs(d) < 1e-12) continue;
      var u = ((b0[0] - a0[0]) * (b1[1] - b0[1]) - (b0[1] - a0[1]) * (b1[0] - b0[0])) / d;
      var v = ((b0[0] - a0[0]) * (a1[1] - a0[1]) - (b0[1] - a0[1]) * (a1[0] - a0[0])) / d;
      if (u >= 0 && u < 1 && v >= 0 && v < 1) out.push({ i: i, j: j, u: u, v: v, p: mix(a0, a1, u) });
    }
  }
  return out;
}
// walk along a closed polygon from a point on segment k (param u), direction dir, for distance s
function walk(P, k, u, dir, s) {
  var n = P.length, cur = mix(P[k], P[(k + 1) % n], u), idx = dir > 0 ? (k + 1) % n : k, pts = [], left = s, tan = null;
  for (var g = 0; g < 4 * n; g++) {
    var nx = P[idx], d = dist(cur, nx);
    if (d > 1e-9) tan = [(nx[0] - cur[0]) / d, (nx[1] - cur[1]) / d];
    if (d >= left) { var e = [cur[0] + tan[0] * left, cur[1] + tan[1] * left]; pts.push(e); return { pts: pts, end: e, tan: tan }; }
    left -= d; cur = nx; pts.push(cur); idx = (idx + dir + n) % n;
  }
  return { pts: pts, end: cur, tan: tan || [1, 0] };
}
// concave fillets of radius r where limb outline dA leaves body outline dB (every crossing that pick() accepts)
function rootFillets(dA, dB, r, pick) {
  var A = outline(dA, 24), B = outline(dB, 24), X = crossings(A, B), s = '';
  X.forEach(function (x) {
    if (pick && !pick(x.p)) return;
    var dirA = ptIn(walk(A, x.i, x.u, 1, 0.08).end, B) ? -1 : 1, dirB = ptIn(walk(B, x.j, x.v, 1, 0.08).end, A) ? -1 : 1;
    var ea = walk(A, x.i, x.u, dirA, 0.15).end, eb = walk(B, x.j, x.v, dirB, 0.15).end;
    var va = [ea[0] - x.p[0], ea[1] - x.p[1]], vb = [eb[0] - x.p[0], eb[1] - x.p[1]];
    var th = Math.acos(clamp((va[0] * vb[0] + va[1] * vb[1]) / (Math.hypot(va[0], va[1]) * Math.hypot(vb[0], vb[1])), -1, 1));
    if (th > 2.95 || th < 0.2) return;
    var dd = r / Math.tan(th / 2), h = 4 / 3 * Math.tan((Math.PI - th) / 4) * r;
    var wa = walk(A, x.i, x.u, dirA, dd), wb = walk(B, x.j, x.v, dirB, dd);
    var d = 'M' + P2(x.p);
    wa.pts.forEach(function (p) { d += 'L' + P2(p); });
    d += 'C' + P2([wa.end[0] - wa.tan[0] * h, wa.end[1] - wa.tan[1] * h]) + ' ' + P2([wb.end[0] - wb.tan[0] * h, wb.end[1] - wb.tan[1] * h]) + ' ' + P2(wb.end);
    wb.pts.slice(0, -1).reverse().forEach(function (p) { d += 'L' + P2(p); });
    s += d + 'Z';
  });
  return s;
}
// a separation cut hugging the outside of a closed contour where keep(point) is true (from B)
function rimCut(d, keep, off, w, rise, fall) {
  var pts = outline(d, 14), n = pts.length, area = 0, i;
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
  var L = 0; for (i = 1; i < thin.length; i++) L += dist(thin[i - 1], thin[i]);
  return ribbon(thin, function (u) {
    var p = rise > 0 ? Math.min(1, u * L / rise) : 1, q = fall > 0 ? Math.min(1, (1 - u) * L / fall) : 1;
    return w * Math.sin(Math.PI / 2 * p) * Math.sin(Math.PI / 2 * q);
  }, { samples: 3 });
}
function bboxOf(d) {
  var pts = outline(d, 10), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (var i = 0; i < pts.length; i++) { x0 = Math.min(x0, pts[i][0]); y0 = Math.min(y0, pts[i][1]); x1 = Math.max(x1, pts[i][0]); y1 = Math.max(y1, pts[i][1]); }
  return [x0, y0, x1, y1];
}

// ── foreleg: a rig of ~12 designed nodes, rebuilt for every pose (no skinning, so the wrist never pinches)
// arm frame: shoulder at (0, 0), forearm up along −y, wrist joint at (0, −Lf); the mitten bends b° clockwise
// (toward the pads). Back edge (left) → one convex arc over the wrist → knuckles → softly squared toe →
// pads → wrist crease (concave fillet) → front edge → base (hidden in the chest).
var LEG = { Lf: 3.7, ye: -1.9, hbE: 0.86, hfE: 0.69, hw: 0.5, Lm: 1.52, hk: 0.68, hp: 0.6, rc: 0.42, rk: 0.3, rarc: 1.2 };
function legNodes(b, L) {
  var W = [0, -L.Lf], m = -90 + b, M = D(m), Nk = D(m - 90), cv = 9 * smooth(b / 45);   // cv: knuckle/pad convexity
  var bkDir = ang([-L.hbE, L.ye], [-L.hw, -L.Lf]), frDir = ang([L.hw, -L.Lf], [L.hfE, L.ye]);
  // miter corners of the bend (well defined for any bend): outside over the wrist, inside at the crease
  var cb = Math.cos(b * Math.PI / 360), Bn = D(b / 2);
  var ho = (L.hw + L.hk) / 2 / cb, hi = (L.hw + L.hp) / 2 / cb;
  var To = [W[0] - Bn[0] * ho, W[1] - Bn[1] * ho], Tc = [W[0] + Bn[0] * hi, W[1] + Bn[1] * hi];
  var toeK = [W[0] + Nk[0] * L.hk + M[0] * L.Lm, W[1] + Nk[1] * L.hk + M[1] * L.Lm];
  var toeP = [W[0] - Nk[0] * L.hp + M[0] * L.Lm, W[1] - Nk[1] * L.hp + M[1] * L.Lm];
  var el = L.ye - L.Lf * 0.04, open = 1 - smooth(b / 50);   // nearly straight wrists get long, soft transitions
  return [
    [-0.98, 0.9, -96, 0.3, 0.75],
    [-L.hbE, el, -90, 0.62, 0.62],
    fillet(To, bkDir, m - cv, L.rarc + 1.6 * open, 0.5, 0.36),
    fillet(toeK, m + cv, m + 84, L.rc, 0.36, 0.22),
    fillet(toeP, m + 96, m + 180 - cv, L.rc, 0.22, 0.34),
    fillet(Tc, m + 180 + cv, frDir, L.rk + 1.2 * open, 0.32, 0.8),
    [0.92, 0.9, 98, 1.1, 0.3]
  ];
}
// place a leg: g = [forearm angle a (−90 = up), wrist bend b, lift along the forearm], at shoulder S
function legPath(g, S, sc, flip, L) {
  var F = D(g[0]);
  return tp(pen(legNodes(g[1], L || LEG)), chain(flip ? scaleAt(0, 0, -1, 1) : null, scaleAt(0, 0, sc), rot(0, 0, g[0] + 90),
    move(S[0] + F[0] * g[2], S[1] + F[1] * g[2])));
}
var LEG_FAR = { Lf: 3.25, ye: -1.7, hbE: 0.86, hfE: 0.7, hw: 0.56, Lm: 1.32, hk: 0.68, hp: 0.62, rc: 0.42, rk: 0.3, rarc: 1.2 };

// ── the head (front view, upright; face centred at 0,0, eye line y ≈ 0.3) ───────────────────────────
// right half crown → chin: forehead, inner ear base (filleted), pointed ear, one convex sweep down the
// cheek, jaw, a faint concave, the whisker pad, chin. Mirrored for the left half; each ear can turn.
var HEAD_R = [
  [0, -1.92, 0, 0.4, 0.42],
  fillet([0.93, -2.05], -6, -50, 0.14, 0.42, 0.55),
  fillet([2.26, -3.6], -50, 74, 0.2, 0.55, 1.05),
  [2.92, 0.1, 92, 1.3, 0.62],
  [2.06, 1.52, 146, 0.55, 0.36],
  [1.14, 1.88, 172, 0.3, 0.26],
  [0, 2.1, 180, 0.5, 0.5]
];
var EAR_BASE = [1.72, -2.1];
function headPath(earR, earL) {
  function half(earDeg) {
    var N = pnodes(HEAD_R), R = rot(EAR_BASE[0], EAR_BASE[1], earDeg);
    // nodes after expansion: 0 crown, 1–2 inner ear base, 3–4 tip, 5 cheek, 6 jaw, 7 concave, 8 chin
    [[1, 0.35], [2, 1], [3, 1], [4, 1], [5, 0.08]].forEach(function (q) {
      var n = N[q[0]], w = q[1], Rw = rot(EAR_BASE[0], EAR_BASE[1], earDeg * w);
      n.p = Rw(n.p[0], n.p[1]); n.i = Rw(n.i[0], n.i[1]); n.o = Rw(n.o[0], n.o[1]);
    });
    return N;
  }
  var A = half(earR), B = half(earL), N = A.slice();
  for (var k = B.length - 2; k >= 1; k--) {
    var n = B[k];
    N.push({ p: [-n.p[0], n.p[1]], i: [-n.o[0], n.o[1]], o: [-n.i[0], n.i[1]] });
  }
  return pbuild(N);
}
// closed eye: a clean crescent arch from two cubics (outer and inner arc, same curvature)
function eyePath(cx, cy, len, sagO, sagI) {
  var x0 = cx - len / 2, x1 = cx + len / 2, ho = 4 / 3 * sagO, hi = 4 / 3 * sagI;
  return 'M' + P2([x0, cy]) + 'C' + P2([x0 + 0.06, cy - ho]) + ' ' + P2([x1 - 0.06, cy - ho]) + ' ' + P2([x1, cy]) +
    'C' + P2([x1 - 0.2, cy - hi]) + ' ' + P2([x0 + 0.2, cy - hi]) + ' ' + P2([x0, cy]) + 'Z';
}

// ── body: the trunk (chest and belly, back on the floor) and the hind thigh, split by the haunch crease ──
// the crease starts under the hero leg (so it opens flush with the leg's front edge) and thins out at the hip
function trunkPath(breath) {
  var up = -0.2 * breath;
  return pen([
    [3.6, 16.0, -80, 0.3, 1.0],
    [4.9, 13.2, -40, 0.8, 0.9],
    [7.5, 12.3 + up * 0.8, -12, 1.0, 1.0],
    [10.0, 11.85 + up, 0, 0.9, 0.55],
    [11.25, 12.05 + up, 52, 0.3, 0.55],
    [12.55, 13.6 + up * 0.5, 44, 0.55, 0.55],
    [14.05, 14.6, 26, 0.5, 0.4],
    [14.7, 16.0, 90, 0.4, 0.2],
    [9.0, 16.0, 180, 2.0, 2.0]
  ]);
}
function thighPath(breath) {
  var up = -0.2 * breath;
  return pen([
    fillet([11.8, 12.0 + up], 56, -12, 0.32, 0.3, 0.5),
    [13.25, 11.98 + up, 2, 0.6, 0.6],
    [14.95, 14.0, 90, 0.95, 0.75],
    fillet([14.75, 16.0], 100, 180, 0.4, 0.4, 0.4),
    [12.6, 16.0, 180, 0.4, 0.3],
    [14.05, 14.6, -40, 0.3, 206, 0.1],
    [12.9, 13.5 + up * 0.5, 228, 0.55, 0.6]
  ]);
}
var HIP = [13.4, 14.8];

// ── tail: lies on the floor from the rump, curls up at the end; tapers 1.5 → 0.55, soft round tip ─────
var TAIL_S = [[12.6, 15.3], [14.2, 15.32], [15.35, 15.12], [16.08, 14.42], [16.25, 13.45], [15.95, 12.62], [15.32, 12.28]];
function tailW(s) {
  var K = [[0, 1.55], [0.3, 1.2], [0.7, 0.98], [1, 0.8]], i = 0;
  while (i < K.length - 2 && s > K[i + 1][0]) i++;
  return lerp(K[i][1], K[i + 1][1], smooth((s - K[i][0]) / (K[i + 1][0] - K[i][0])) * 0.35 + (s - K[i][0]) / (K[i + 1][0] - K[i][0]) * 0.65);
}

// ── butterfly (right half; body on x = 0, head up) ───────────────────────────────────────────────────
// forewing: a rounded triangle — leading edge to a soft apex, straight outer margin, defined tornus (B)
var FW = 'M0.18 -0.22C0.66 -1.12 1.46 -1.94 2.42 -2.28C2.86 -2.42 3.14 -2.16 3.04 -1.8' +
  'C2.88 -1.3 2.62 -0.8 2.26 -0.42C2.06 -0.2 1.78 -0.06 1.4 -0.02C0.95 0.03 0.55 0.05 0.2 0.04Z';
// hindwing: a rounded lobe with a soft point at the trailing corner (B)
var HW = 'M0.22 0.24C0.85 0.18 1.62 0.3 1.95 0.66C2.22 0.98 2.08 1.42 1.72 1.66' +
  'C1.44 1.86 1.2 2.12 0.92 2.12C0.6 2.1 0.38 1.6 0.22 1.0Z';
// body: one contour — small head, a slight neck notch, the thorax, an abdomen tapering to a soft point
var BB_R = [[0, -0.72, 0, 0.16, 0.16], [0.27, -0.53, 90, 0.1, 0.07], [0.215, -0.37, 50, 0.05, 0.08],
  [0.47, -0.04, 90, 0.18, 0.2], [0.4, 0.42, 98, 0.16, 0.25], [0.25, 0.98, 106, 0.2, 0.16], [0, 1.4, 180, 0.11, 0.11]];
var BBODY = (function () {
  var N = pnodes(BB_R), out = N.slice();
  for (var k = N.length - 2; k >= 1; k--) { var n = N[k]; out.push({ p: [-n.p[0], n.p[1]], i: [-n.o[0], n.o[1]], o: [-n.i[0], n.i[1]] }); }
  return pbuild(out);
})();
// a, ah: fore / hind wing raise, 0 = spread flat, 1 = raised (seen from above they foreshorten to the root)
function butterfly(bx, by, deg, sc, a, ah) {
  var R = chain(scaleAt(0, 0, sc), rot(0, 0, deg), move(bx, by));
  function wing(side, kx, ky, ox, oy) {
    return chain(function (x, y) { return [side * (ox + (x - ox) * kx), oy + (y - oy) * ky]; }, R);
  }
  var kfx = 1 - 0.24 * a, kfy = 1 - 0.12 * a, khx = 1 - 0.15 * ah, khy = 1 - 0.05 * ah;
  return ink(FW, wing(1, kfx, kfy, 0.19, -0.1)) + ink(FW, wing(-1, kfx, kfy, 0.19, -0.1)) +
    ink(HW, wing(1, khx, khy, 0.22, 0.4)) + ink(HW, wing(-1, khx, khy, 0.22, 0.4)) + ink(BBODY, R);
}

// ── timing ──────────────────────────────────────────────────────────────────────────────────────────
var NF = 48;
// keys [[frame, [values], ease], ...] — ease shapes the segment that ENDS at that key
function kf(fr, K) {
  if (fr <= K[0][0]) return K[0][1].slice();
  for (var k = 1; k < K.length; k++) {
    if (fr <= K[k][0]) {
      var a = K[k - 1], b = K[k], u = (fr - a[0]) / (b[0] - a[0]), e = (b[2] || smooth)(u);
      return a[1].map(function (v, i) { return lerp(v, b[1][i], e); });
    }
  }
  return K[K.length - 1][1].slice();
}
// hero paw [forearm angle, wrist bend, lift]: hold → cock down toward the chest → strike up at the butterfly
// (forearm 13° right of vertical, wrist open, shoulder sliding out) → overshoot → settle → slow return
var N_REST = [-80, 65, 0], N_COCK = [-90, 76, -0.6], N_HIT = [-77, 26, 0.9], N_OVER = [-75, 20, 1.1], N_SET = [-77.5, 30, 0.8];
var NEAR_K = [[0, N_REST], [4.5, N_REST], [10, N_COCK, easeInOut], [12, N_HIT, easeOut], [13, N_OVER, smooth],
  [14.5, N_SET, smooth], [23.5, N_REST, smoother], [48, N_REST]];
// far paw: rests drooped, one smaller lazy bat when the butterfly dips to it
var F_REST = [-99, 46, 0], F_COCK = [-102, 66, -0.3], F_BAT = [-86, 28, 0.95], F_OVER = [-84, 24, 1.05];
var FAR_K = [[0, F_REST], [25, F_REST], [29, F_COCK, easeInOut], [31, F_BAT, easeOut], [32, F_OVER, smooth],
  [41, F_REST, smoother], [48, F_REST]];
// butterfly [x, y, tilt]: hovers → dips to tease the paw → lifts off one frame before the strike lands, up and
// away → glides into a loop to the left → dips to the far paw → glides home
var FLY_K = [[0, [12.7, 5.0, 6]], [5, [12.85, 5.5, 10]], [8.5, [12.55, 5.95, 2]], [10, [12.45, 6.05, -3]],
  [13, [13.7, 3.85, 14], easeOut], [15, [13.8, 3.7, 10], smooth], [19, [12.4, 4.0, -12]], [23, [10.6, 4.25, -16]],
  [27, [9.4, 4.85, -8]], [30, [9.05, 5.45, 0]], [33, [9.6, 4.8, 10]], [37, [10.6, 4.35, 14]], [42, [11.85, 4.45, 12]],
  [48, [12.7, 5.0, 6], smooth]];

var ICON = {
  id: "cat",
  frames: NF,
  at: function (t) {
    var fr = t * NF, s = '';
    var breath = 0.5 - 0.5 * Math.cos(TAU * 3 * t);

    // ── body
    var kick = 10 * bump(fr, 12.5, 14, 15, 19.5);
    var HK = rot(HIP[0], HIP[1], kick);
    var trunk = trunkPath(breath), thigh = tp(thighPath(breath), HK);
    s += ink(trunk) + ink(thigh);

    // ── tail
    function tailAng(x) {
      var q = x * NF;
      return 4 * loop(x, 2, 0.15) + 2 * noise(x, 4, 2) + 12 * bump(q, 12, 15, 16, 23) - 5 * bump(q, 16, 20, 21, 27);
    }
    var ts = [TAIL_S[0], TAIL_S[1], TAIL_S[2]], acc = 0, gain = [0, 0, 0, 0.12, 0.25, 0.45, 0.6];
    for (var i = 3; i < TAIL_S.length; i++) {
      acc += gain[i] * tailAng(wrap01(t - 0.014 * (i - 3)));
      var v = rot(0, 0, acc)(TAIL_S[i][0] - TAIL_S[i - 1][0], TAIL_S[i][1] - TAIL_S[i - 1][1]);
      ts.push([ts[i - 1][0] + v[0], ts[i - 1][1] + v[1]]);
    }
    var tail = ribbon(ts, tailW, { caps: ['flat', 'round'], samples: 12 });
    s += ink(tail) + ink(rootFillets(tail, thigh, 0.4, function (p) { return p[1] < 15.6; }));

    // ── forelegs
    var fa = kf(fr, FAR_K), na = kf(fr, NEAR_K);
    var sway = 3.5 * bump(fr, 25, 31, 40, 47) * Math.sin(TAU * (fr - 25) / 22);
    na[0] += sway;
    var lift = -0.15 * breath;
    var farLeg = legPath(fa, [8.1, 13.25 + lift], 0.88, false, LEG_FAR);
    var nearLeg = legPath(na, [10.65, 12.85 + lift], 1, false);
    s += ink(farLeg) + ink(rootFillets(farLeg, trunk, 0.4, function (p) { return p[1] < 15; }));

    // ── head resting on its cheek; lifts a little to watch the strike; the upper ear twitches at the tease
    var tilt = -24 + 3 * bump(fr, 11, 14, 17, 24);
    var twitch = 26 * pulse(fr, 7, 8.4) + 16 * pulse(fr, 8.8, 10);
    var HD = headPath(twitch, 0), HT = chain(scaleAt(0, 0, 0.95), rot(0, 0, tilt));
    var bb = bboxOf(tp(HD, HT)), HM = chain(HT, move(4.4, 16.25 - bb[3]));
    var squash = function (x, y) { var u = 16 - y; return [x, 16 - Math.log(1 + Math.exp(12 * u)) / 12]; };
    var head = tp(tp(HD, HM), squash);
    s += ink(head);
    s += cut(rimCut(head, function (p) { return p[0] > 4.9 && p[1] < 15.45 && p[1] > 11.6; }, 0.31, 0.62, 0, 0.6));
    s += cut(eyePath(-1.08, 0.36, 1.25, 0.82, 0.22), HM) + cut(eyePath(1.08, 0.36, 1.25, 0.82, 0.22), HM);

    // ── the hero paw in front of everything
    s += cut(rectPath(0, 16, 18, 2));
    // a clean gap along the hero arm's back edge, above the belly, wherever the far paw comes close
    var NS = [10.65, 12.85 + lift], NF_ = D(na[0]);
    s += cut(rimCut(nearLeg, function (p) {
      return p[1] < 11.75 && NF_[0] * (p[1] - NS[1]) - NF_[1] * (p[0] - NS[0]) < 0.1;
    }, 0.35, 0.72, 0.4, 0.4));
    s += front(nearLeg) + front(rootFillets(nearLeg, trunk, 0.4, function (p) { return p[1] < 15; }));

    // ── butterfly: lazy flaps with two glides; a doubled stroke as it lifts off; banks into its turns
    var glide = bump(fr, 15, 16.5, 21, 23) + bump(fr, -6, -4, 1.5, 3) + bump(fr, 42, 44, 50, 52);
    var ph = 7 * t + smoother((fr - 10) / 3);
    var fl = Math.pow(0.5 - 0.5 * Math.cos(TAU * ph), 1.3) * (1 - glide);
    var fh = Math.pow(0.5 - 0.5 * Math.cos(TAU * (ph - 0.07)), 1.3) * (1 - glide);
    var fp = kf(fr, FLY_K), bob = -0.15 * Math.sin(TAU * ph) * (1 - glide);
    s += butterfly(fp[0], fp[1] + bob, fp[2], 1.0, fl, fh);
    return s;
  }
};
