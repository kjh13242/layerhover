// 나뭇잎 (Leaf) — variant A: recognisability first.
// "나뭇잎은 가지에 하나 펴있는걸로 이것도 바람 부는거에 따라 흔들흔들하게."
//
// What makes it read as "one leaf, spread open, on a branch" at 18 pt:
//   · the blade — broad, slightly unequal shoulders, margins that turn concave and draw out into a drip tip
//     (the acuminate tip is what separates a leaf from an almond, a petal or a flame), a decurrent base that
//     flows out of the stalk instead of a blade sitting on a stick;
//   · the venation — a tapering midrib and two near-opposite pairs of arching side veins, carved as cuts that
//     thin out to points, with softly rounded crotches;
//   · the branch — a woody twig: oblique pruning cut, gentle taper, a slight angle at the node, a slender
//     pointed terminal bud; the petiole leaves the node on a trumpet-flared foot and curves into the blade.
// Pose: the leaf stands up from the twig and leans a little towards the bud — the archetypal leaf angle.
//
// Motion (wind from the left), simulated, not keyframed: a breathing sway; a first puff (the leaf eases back,
// then is pushed over and rebounds); the main gust bends it ~20° on its springy petiole, the blade twists
// about its midrib (unequal foreshortening of its two halves) and flutters, the tip lags, the twig dips;
// the gust lets go, the leaf whips back past rest and settles into the sway. 56 frames, seamless.

var LA_PW = 1.02;    // petiole width (pt)
var LA_CFG = {
  L: 12.3,                                   // blade length
  twig: [[1.4, 15.25], [6.2, 14.2], [11.2, 13.95], [14.4, 13.6]],   // root, node, mid, bud base
  tip: [16.7, 13.05],                        // bud tip
  tw: [1.56, 1.14],                          // twig width root → bud
  aP: -86, aB: -64, Lp: 2.0,                 // petiole start / blade angle, petiole length
  droop: 0.6
};

// side veins in blade units (u along the midrib 0 → 1 = tip, v across, + = left of the tip direction)
var LA_VEINS = [   // two near-opposite pairs: leave the midrib steeply (~62°), arch towards the tip (~25°)
  { pts: [[0.285, 0.0], [0.32, 0.068], [0.47, 0.146]], w: 0.62 },
  { pts: [[0.335, 0.0], [0.37, -0.066], [0.515, -0.13]], w: 0.62 },
  { pts: [[0.515, 0.0], [0.547, 0.06], [0.655, 0.106]], w: 0.6 },
  { pts: [[0.565, 0.0], [0.593, -0.05], [0.672, -0.083]], w: 0.6 }
];
var LA_MIDRIB = [[0.13, 0], [0.4, 0], [0.62, 0], [0.785, 0]];

function la_dir(deg) { var a = deg * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }
function la_ang(p, q) { return Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI; }
function la_add(p, d, k) { return [p[0] + d[0] * k, p[1] + d[1] * k]; }

// constant-curvature arc: start p0 heading a0 (deg), end heading a1, arc length len
function la_arc(p0, a0, a1, len, n) {
  n = n || 6; var pts = [p0.slice()], p = p0.slice(), step = len / (n * 8);
  for (var i = 1; i <= n * 8; i++) {
    var a = lerp(a0, a1, (i - 0.5) / (n * 8)), d = la_dir(a);
    p = [p[0] + d[0] * step, p[1] + d[1] * step];
    if (i % 8 === 0) pts.push(p.slice());
  }
  return pts;
}

// blade outline in local units: u along the midrib from the base (0) to the tip (L), v across (+ = left of the tip direction).
// The base is decurrent: both margins leave the petiole edges tangentially and flare out, so the stalk flows into the blade.
// Broad, slightly unequal shoulders; the margins turn concave near the end and draw out into a drip tip.
function la_bladeLocal(L) {
  var h = LA_PW / 2;
  var p = function (u, v) { return f(u * L) + ' ' + f(v * L); };
  var q = function (u, vpt) { return f(u * L) + ' ' + f(vpt); };
  return 'M' + q(0, h) +
    'C' + q(0.09, h + 0.05) + ' ' + p(0.19, 0.27) + ' ' + p(0.42, 0.27) +
    'C' + p(0.60, 0.27) + ' ' + p(0.725, 0.185) + ' ' + p(0.825, 0.094) +
    'C' + p(0.872, 0.051) + ' ' + p(0.94, 0.011) + ' ' + p(1, 0) +
    'C' + p(0.94, -0.012) + ' ' + p(0.872, -0.047) + ' ' + p(0.805, -0.088) +
    'C' + p(0.705, -0.15) + ' ' + p(0.62, -0.245) + ' ' + p(0.46, -0.245) +
    'C' + p(0.24, -0.245) + ' ' + q(0.11, -h - 0.05) + ' ' + q(0, -h) + 'Z';
}

// width profiles (s = 0 → 1 along the part)
function la_veinW(w0) { return function (s) { return w0 * Math.pow(Math.max(0, 1 - s), 0.55); }; }   // thins out to a point
var LA_MW = 0.8;     // midrib width at its widest
function la_midW(s) {                       // opens from a point, smooth maximum, long taper into the tip
  return s < 0.18 ? LA_MW * Math.pow(Math.sin(Math.PI / 2 * s / 0.18), 0.8)
    : LA_MW * Math.pow(Math.max(0, Math.cos(Math.PI / 2 * (s - 0.18) / 0.82)), 0.7);
}
function la_unit(a, b) { var x = b[0] - a[0], y = b[1] - a[1], l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
function la_dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
// the two side polylines of a flat-capped ribbon() path (left edge, then the right edge reversed), both start → end
function la_sides(d) {
  var g = parsePath(d), pts = [];
  for (var i = 0; i < g.length; i++) if (g[i].c === 'M' || g[i].c === 'L') pts.push([g[i].p[0], g[i].p[1]]);
  var h = pts.length / 2; return [pts.slice(0, h), pts.slice(h).reverse()];
}
// first crossing of polyline P (scanned from its start) with polyline Q
function la_hit(P, Q) {
  for (var i = 0; i < P.length - 1; i++) for (var j = 0; j < Q.length - 1; j++) {
    var a = P[i], b = P[i + 1], c = Q[j], e = Q[j + 1], d1 = [b[0] - a[0], b[1] - a[1]], d2 = [e[0] - c[0], e[1] - c[1]];
    var den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-9) continue;
    var s = ((c[0] - a[0]) * d2[1] - (c[1] - a[1]) * d2[0]) / den, r = ((c[0] - a[0]) * d1[1] - (c[1] - a[1]) * d1[0]) / den;
    if (s >= 0 && s <= 1 && r >= 0 && r <= 1) return { p: [a[0] + d1[0] * s, a[1] + d1[1] * s], i: i, j: j };
  }
  return null;
}
// walk forward along polyline P from point p (lying on segment k) for distance r; returns the points passed
function la_walk(P, p, k, r) {
  var out = [p], cur = p, left = r;
  for (var idx = k + 1; idx < P.length; idx++) {
    var nx = P[idx], l = Math.hypot(nx[0] - cur[0], nx[1] - cur[1]);
    if (l >= left) { out.push([cur[0] + (nx[0] - cur[0]) * left / l, cur[1] + (nx[1] - cur[1]) * left / l]); return out; }
    out.push(nx); left -= l; cur = nx;
  }
  return out;
}
// rounded crotch where a vein cut leaves the midrib cut: finds the true corner on the acute (tip) side from the
// actual edges and rounds it with a circular (rolling-ball) fillet of radius rho, so the ink wedge between vein and
// midrib ends in a soft round instead of a needle
function la_crotch(midPath, veinPath, J, dM, rho) {
  var ms = la_sides(midPath), vsd = la_sides(veinPath);
  var vMid = function (P) { return P[Math.floor(P.length / 2)]; };
  var vTip = la_dot(la_unit(J, vMid(vsd[0])), dM) > la_dot(la_unit(J, vMid(vsd[1])), dM) ? vsd[0] : vsd[1];
  var vEnd = vTip[vTip.length - 1], crossS = function (P) { var q = P[Math.floor(P.length * 0.5)]; return (dM[0] * (q[1] - J[1]) - dM[1] * (q[0] - J[0])); };
  var sideV = dM[0] * (vEnd[1] - J[1]) - dM[1] * (vEnd[0] - J[0]);
  var mSide = crossS(ms[0]) * sideV > 0 ? ms[0] : ms[1];               // midrib edge on the vein's side
  var h = la_hit(vTip, mSide); if (!h) return '';
  var e1 = la_unit(h.p, la_walk(mSide, h.p, h.j, 0.5).pop()), e2 = la_unit(h.p, la_walk(vTip, h.p, h.i, 0.5).pop());
  var th = Math.acos(clamp(la_dot(e1, e2), -1, 1));
  rho = Math.min(rho, 0.75 * Math.tan(th / 2));        // legs never longer than 0.75 pt: a twisted (more acute) crotch stays crisp
  var a = rho / Math.tan(th / 2);
  var A = la_walk(mSide, h.p, h.j, a), Bw = la_walk(vTip, h.p, h.i, a), T1 = A[A.length - 1], T2 = Bw[Bw.length - 1];
  var k = 4 / 3 * Math.tan((Math.PI - th) / 4) * rho;
  var P1 = la_add(T1, e1, -k), P2 = la_add(T2, e2, -k);
  // nudge the shared edges into the white so the patch overlaps the existing cut (no hairline seam)
  var inw = la_unit([(T1[0] + T2[0]) / 2, (T1[1] + T2[1]) / 2], h.p), sh = function (p) { return la_add(p, inw, 0.06); };
  var d = 'M' + la_P(sh(h.p));
  for (var i = 1; i < A.length; i++) d += 'L' + la_P(i === A.length - 1 ? T1 : sh(A[i]));
  d += 'C' + la_P(P1) + ' ' + la_P(P2) + ' ' + la_P(T2);
  for (var j = Bw.length - 2; j >= 1; j--) d += 'L' + la_P(sh(Bw[j]));
  return d + 'Z';
}
function la_P(p) { return f(p[0]) + ' ' + f(p[1]); }

// S = pose: th (swing, deg, + = clockwise), ph (twist about the midrib, deg), bend (extra tip bend, pt), dl (twig flex at the bud, pt, + = up)
function la_draw(C, S) {
  var L = C.L, T0 = C.twig, R = T0[0], M0 = T0[2], TT = C.tip;
  // ── twig + terminal bud: one ribbon. Tapers from the root, then swells (C1-smooth) into a slender pointed bud ──
  var d0 = la_dir(la_ang(T0[1], R)), R0 = la_add(R, d0, 0.7);
  var spine = [R0].concat(T0, [TT]);
  var acc = [0]; for (var i = 1; i < spine.length; i++) acc.push(acc[i - 1] + Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1]));
  var sR = acc[1] / acc[acc.length - 1], sB = acc[acc.length - 2] / acc[acc.length - 1];
  var twW = function (s) { return lerp(C.tw[0], C.tw[1], clamp((s - sR) / (sB - sR))); };
  var wJ = C.tw[1], wMax = 1.42;
  var twig = ribbon(spine, function (s) {
    if (s <= sB) return twW(s);
    var q = (s - sB) / (1 - sB);
    return q < 0.38 ? lerp(wJ, wMax, smooth(q / 0.38)) : wMax * Math.pow(Math.max(0, Math.cos(Math.PI / 2 * (q - 0.38) / 0.62)), 0.95);
  }, { samples: 24 });
  // oblique pruning cut at the root
  var d = [-d0[0], -d0[1]], n = [-d[1], d[0]], g = -20 * Math.PI / 180;
  var e = [n[0] * Math.cos(g) + d[0] * Math.sin(g), n[1] * Math.cos(g) + d[1] * Math.sin(g)];
  var rootCut = polyPath([la_add(R, e, 1.6), la_add(R, e, -1.6), la_add(la_add(R, e, -1.6), d, -2.5), la_add(la_add(R, e, 1.6), d, -2.5)], true);
  // twig flex: the finished twig bends about its root; the node the leaf grows from follows
  var bf = bend(R0[0], R0[1], TT[0], TT[1], S.dl);
  twig = tp(twig, bf); rootCut = tp(rootCut, bf);
  var N = bf(T0[1][0], T0[1][1]), Rb = bf(R[0], R[1]), M = bf(M0[0], M0[1]);

  // ── petiole: the spring. Its root turns with the twig (and a little with the swing); its end carries the blade.
  //    Its foot flares like a trumpet bell into the twig, which gives soft fillets in every frame. ──
  var tilt = la_ang(Rb, M) - la_ang(R, M0);
  var aRoot = C.aP + tilt + 0.3 * S.th, aEnd = C.aB + tilt + S.th;
  var pet = la_arc(N, aRoot, aEnd, C.Lp, 4), B = pet[pet.length - 1];
  var U = la_dir(aEnd), V = [U[1], -U[0]];
  var petLen = C.Lp + 0.25;
  var petiole = ribbon(pet.concat([la_add(B, U, 0.25)]), function (s) {
    var dd = s * petLen; return LA_PW + 1.7 * Math.pow(Math.max(0, 1 - dd / 1.35), 2);
  }, { samples: 12 });

  // ── blade ──
  // twist: the blade turns about its midrib. Its cross-section is a shallow V (each half tilted 14°), so the two
  // halves foreshorten unequally and the midrib slides off-centre — the 3-D cue that the leaf is turning.
  var al = 14 * Math.PI / 180, ph = S.ph * Math.PI / 180;
  var kUp = Math.cos(ph + al) / Math.cos(al), kLo = Math.cos(ph - al) / Math.cos(al);
  var droop = C.droop + S.bend;
  var toW = function (u, v) {
    var w = smooth(u / (0.16 * L));                     // the decurrent base stays attached to the petiole
    var vv = v * lerp(1, v > 0 ? kUp : kLo, w) - droop * Math.pow(Math.max(0, u) / L, 2);
    return [B[0] + U[0] * u + V[0] * vv, B[1] + U[1] * u + V[1] * vv];
  };
  var blade = tp(la_bladeLocal(L), toW);
  var mapPts = function (pts) { return pts.map(function (p) { return toW(p[0] * L, p[1] * L); }); };
  var midrib = ribbon(mapPts(LA_MIDRIB), la_midW, { samples: 16 });
  var vs = '';
  LA_VEINS.forEach(function (vn) {
    // veins on a half that turns away retract a little (foreshortened, they sink into the blade)
    var p0 = vn.pts[0], side = vn.pts[2][1] > 0 ? 1 : -1, k = side > 0 ? kUp : kLo, lam = 0.35 + 0.65 * Math.min(1, k);
    var pts = vn.pts.map(function (p) { return [p0[0] + (p[0] - p0[0]) * lam, p0[1] + (p[1] - p0[1]) * lam]; });
    var W = mapPts(pts), vein = ribbon(W, la_veinW(vn.w), { samples: 16 });
    vs += cut(vein) + cut(la_crotch(midrib, vein, W[0], la_unit(W[0], toW(p0[0] * L + 0.3, 0)), 0.33));
  });

  return ink(twig) + cut(rootCut) + ink(petiole) + ink(blade) + cut(midrib) + vs;
}

// ── wind and the leaf's response ──────────────────────────────────────────────────────────────────
// Wind from the left. F = push on the leaf (0 calm … ~1.2 in the gust), G = how hard it worries the blade (twist).
function la_wind(t) {
  var breeze = 0.05 * Math.sin(TAU * (6 * t + 0.6)) + 0.02 * noise(t, 3, 2);   // breathing sway
  var puff = bump(t, 0.08, 0.17, 0.19, 0.29, smooth);
  var gust = seg(t, 0.33, 0.45, smooth) * (1 - seg(t, 0.56, 0.64, smooth));
  var turb = 0.5 * Math.sin(TAU * (9 * t + 0.13)) + 0.3 * Math.sin(TAU * (13 * t + 0.71)) + 0.2 * Math.sin(TAU * (18 * t + 0.37));
  var flut = 0.55 * Math.sin(TAU * (11 * t + 0.42)) + 0.45 * Math.sin(TAU * (16 * t + 0.08));
  return { F: breeze + 0.42 * puff + gust * (1 + 0.16 * turb), G: Math.max(0.28 * puff, gust * (0.6 + 0.4 * flut)) };
}
// Three damped oscillators (swing, twist, twig) driven by the wind, run until the loop repeats exactly
// (steady state of a periodic drive), so the seam is seamless and every overshoot and bounce is physical.
var LA_SIM = null;
function la_sim() {
  if (LA_SIM) return LA_SIM;
  var NS = 1120, SUB = 6, dt = 1 / (NS * SUB);
  var wT = TAU * 7 / 1.25, zT = 0.3, wP = TAU * 7 / 0.8, zP = 0.34, wD = TAU * 7 / 1.5, zD = 0.3;
  var th = 0, thv = 0, ph = 0, phv = 0, dl = 0, dlv = 0;
  var out = { th: [], thv: [], ph: [], dl: [], F: [] };
  for (var lp = 0; lp < 6; lp++) {
    for (var i = 0; i < NS; i++) {
      if (lp === 5) { var w0 = la_wind(i / NS); out.th.push(th); out.thv.push(thv); out.ph.push(ph); out.dl.push(dl); out.F.push(w0.F); }
      for (var k = 0; k < SUB; k++) {
        var w = la_wind((i * SUB + k) * dt);
        thv += (wT * wT * (16.5 * w.F - th) - 2 * zT * wT * thv) * dt; th += thv * dt;
        phv += (wP * wP * (38 * w.G - ph) - 2 * zP * wP * phv) * dt; ph += phv * dt;
        dlv += (wD * wD * (-0.45 * w.F - 0.012 * th - dl) - 2 * zD * wD * dlv) * dt; dl += dlv * dt;
      }
    }
  }
  LA_SIM = out; return out;
}
function la_pose(t) {
  var S = la_sim(), n = S.th.length, x = wrap01(t) * n, i = Math.floor(x) % n, j = (i + 1) % n, k = x - Math.floor(x);
  var g = function (a) { return lerp(a[i], a[j], k) - a[0]; };     // relative to frame 0, so the poster is the rest pose
  return { th: g(S.th), ph: g(S.ph), bend: -0.0016 * g(S.thv) + 0.45 * g(S.F), dl: g(S.dl) };
}

var ICON = {
  id: "leaf",
  frames: 56,
  at: function (t) {
    return la_draw(LA_CFG, la_pose(t));
  }
};
