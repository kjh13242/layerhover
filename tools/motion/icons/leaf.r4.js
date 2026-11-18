// 나뭇잎 (Leaf) — round 4 (variant A, polished).
// "나뭇잎은 가지에 하나 펴있는걸로 이것도 바람 부는거에 따라 흔들흔들하게."
//
// What makes it read as "one leaf, spread open, on a branch" at 18 pt:
//   · the blade — broad, unequal shoulders drawn as analytic half-profiles (a full shoulder rising out of a
//     decurrent base, then an acuminate cos^k fall into a drip tip), laid along a bowed spine (a slight droop,
//     then a flick back), so the midrib is a living S and the tip sits on its axis;
//   · the venation — a tapering midrib and three alternate arching side veins, carved as cuts that leave the
//     midrib through a small flare (the fillet), arch towards the tip and thin to nothing inside the margin;
//   · the branch — a woody twig rising left → right: oblique pruning cut, a real taper (1.9 → 1.0), a turn at
//     the node, a concave lift to a separate slender terminal bud; the petiole leaves the node through round
//     fillets on both sides and curves into the blade.
//
// Motion (wind from the left), simulated, not keyframed: a breathing sway whose swings differ (noise-modulated);
// a first puff (the leaf eases back, then is pushed over and rebounds); the main gust bends it ~20° on its
// springy petiole, the blade twists about its midrib (unequal foreshortening of its two halves) and flutters,
// the tip lags, the twig dips and rebounds a beat later; the gust lets go, the leaf whips back past rest and
// settles into the sway. 56 frames, seamless.

var LA_PW = 1.02;    // petiole width (pt)
var LA_CFG = {
  L: 11.7,                                   // blade length
  twig: [[1.6, 15.0], [5.9, 14.45], [10.5, 13.95], [14.0, 12.55]],   // root, node, mid, bud base
  tw: [1.95, 1.45, 0.92],                      // twig width at root, node, bud base
  bud: { len: 2.4, wid: 1.1, neck: 0.8, lift: 18 },      // terminal bud (lifted above the twig axis, deg)
  aP: -93, aB: -62, Lp: 2.2,                 // petiole start / blade angle, petiole length
  droop: 3, flick: 5                          // bowed blade spine (deg)
};

// blade half-profiles in pt (x along the spine from the blade base, 0 → L). + side = left of the tip direction.
var LA_SIDE = {
  up: { W: 4.15, peak: 0.40, n: 2.4, dec: 0.85, k: 1.4 },
  lo: { W: 3.6,  peak: 0.52, n: 2.55, dec: 0.85, k: 1.12 }
};
function la_H(S, x, L) {
  var h = LA_PW / 2, s = x / L;
  if (s <= 0) return h;
  if (s >= 1) return 0;
  if (s <= S.peak) {
    var z = s / S.peak, o = Math.pow(1 - z, S.n);
    // a full shoulder (1 − (1 − z)^n) blended with its zero-slope twin, so the base leaves the petiole decurrently
    return h + (S.W - h) * ((1 - S.dec) * (1 - o) + S.dec * (1 - o * (1 + S.n * z)));
  }
  return S.W * Math.pow(Math.cos(Math.PI / 2 * (s - S.peak) / (1 - S.peak)), S.k);
}

// side veins: root u (fraction of L), side, take-off angle (deg), root width, end inset from the margin (pt)
var LA_VEINS = [
  { u: 0.27, side: 1, a: 60, w: 0.46, inset: 0.9 },
  { u: 0.40, side: -1, a: 60, w: 0.46, inset: 0.9 },
  { u: 0.53, side: 1, a: 58, w: 0.42, inset: 0.85 }
];
var LA_M0 = 0.13, LA_M1 = 0.80, LA_RF = 0.88;   // midrib span (u); veins end 88 % up their ramp, still arching            // midrib span (u)
var LA_MW = 0.88;                           // midrib width at its widest
function la_midW(s) {                       // opens from a point, smooth maximum, long taper into the tip
  return s < 0.3 ? LA_MW * Math.pow(Math.sin(Math.PI / 2 * s / 0.3), 1.1)
    : LA_MW * Math.pow(Math.max(0, Math.cos(Math.PI / 2 * (s - 0.3) / 0.7)), 0.7);
}

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

// bowed blade frame: the heading along the spine droops, then flicks back; returns (x, y) → screen point
function la_frame(B, aEnd, L, droop, flick, bendPt, kUp, kLo) {
  var step = 0.05, n = Math.ceil(L / step) + 2, px = [B[0]], py = [B[1]], ph = [];
  var head = function (x) {
    var q = x / L;
    return (aEnd + droop * smooth(q / 0.7) - flick * smooth((q - 0.6) / 0.4)) * Math.PI / 180 + 2 * bendPt / L * q;
  };
  for (var i = 0; i <= n; i++) ph.push(head(i * step));
  for (i = 1; i <= n; i++) { var a = (ph[i - 1] + ph[i]) / 2; px.push(px[i - 1] + Math.cos(a) * step); py.push(py[i - 1] + Math.sin(a) * step); }
  return function (x, y) {
    var u = clamp(x / step, 0, n - 1e-6), j = Math.floor(u), k = u - j;
    var sx = lerp(px[j], px[j + 1], k), sy = lerp(py[j], py[j + 1], k), an = lerp(ph[j], ph[j + 1], k);
    var sc = lerp(1, y > 0 ? kUp : kLo, smooth(x / (0.16 * L)));   // the decurrent base stays attached to the petiole
    return [sx + Math.sin(an) * y * sc, sy - Math.cos(an) * y * sc];
  };
}

// one side vein in local coordinates: the offset from the midrib eases in by a sine ramp from just inside the
// midrib, so it leaves at the take-off angle and arches towards the tip, ending `inset` inside the margin
function la_vein(vn, L, X, mw, thin) {
  var S = vn.side > 0 ? LA_SIDE.up : LA_SIDE.lo, x0 = vn.u * L, y0 = -0.12, ta = Math.tan(vn.a * Math.PI / 180);
  var A = 2, Lr = 3, x2 = x0 + 2;
  for (var it = 0; it < 8; it++) {             // solve: ramp height A, ramp length Lr, end x2 (75 % up the ramp)
    Lr = (A - y0) * Math.PI / 2 / ta; x2 = x0 + LA_RF * Lr;
    A = y0 + (la_H(S, x2, L) - vn.inset - y0) / Math.sin(Math.PI / 2 * LA_RF);
  }
  var loc = [], len = 0, N = 24;
  for (var i = 0; i <= N; i++) {
    var x = lerp(x0, x2, i / N);
    loc.push([x, y0 + (A - y0) * Math.sin(Math.PI / 2 * clamp((x - x0) / Lr))]);
  }
  for (i = 1; i < loc.length; i++) len += dist(loc[i - 1], loc[i]);
  // the width swells where the vein crosses the midrib's edge: that flare is the fillet on both sides
  var de = (mw / 2 - y0) / Math.sin(Math.atan(ta)), w0 = vn.w * thin;
  var W = function (q) { var d = q * len; return w0 * Math.pow(1 - q, 0.62) + 0.13 * Math.exp(-Math.pow((d - de) / 0.5, 2)); };
  return ribbon(loc.map(function (p) { return X(p[0], p[1] * vn.side); }), W, { samples: 2 });
}

// ── fillets where the petiole meets the twig ──────────────────────────────────────────────────────
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
// walk along polyline P (P[0] = start) for distance r; returns the points passed, ending exactly at distance r
function la_walk(P, r) {
  var out = [P[0]], left = r;
  for (var k = 1; k < P.length; k++) {
    var a = out[out.length - 1], l = dist(a, P[k]);
    if (l >= left) { out.push(mix(a, P[k], left / l)); return out; }
    out.push(P[k]); left -= l;
  }
  return out;
}
function la_unit(a, b) { var x = b[0] - a[0], y = b[1] - a[1], l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
// a rolling-ball fillet (radius rho) in each of the two concave corners where the petiole's sides meet the
// twig's upper edge: the petiole flows into the branch tangentially on both sides, in every frame
function la_fillets(twigD, petD, N, rho) {
  var ts = la_sides(twigD), ps = la_sides(petD), out = '';
  var e0 = ts[0], e1 = ts[1], pt = ps[0][ps[0].length - 1];
  var near = function (E) { var m = 1e9; E.forEach(function (q) { m = Math.min(m, dist(q, pt)); }); return m; };
  var top = near(e0) < near(e1) ? e0 : e1;   // the twig's upper edge: the side nearer the petiole's top
  ps.forEach(function (P) {
    var h = la_hit(P, top); if (!h) return;
    var A = [h.p].concat(P.slice(h.i + 1));                         // along the petiole side, towards the blade
    var away = la_unit(N, h.p), fw = [h.p].concat(top.slice(h.j + 1)), bw = [h.p].concat(top.slice(0, h.j + 1).reverse());
    var Bp = la_dot(la_unit(h.p, la_walk(fw, 0.4).pop()), away) > 0 ? fw : bw;   // along the twig, away from the petiole
    var u1 = la_unit(h.p, la_walk(A, 0.3).pop()), u2 = la_unit(h.p, la_walk(Bp, 0.3).pop());
    var th = Math.acos(clamp(la_dot(u1, u2), -1, 1)), a = rho / Math.tan(th / 2);
    var WA = la_walk(A, a), WB = la_walk(Bp, a), T1 = WA[WA.length - 1], T2 = WB[WB.length - 1];
    var t1 = la_unit(WA[WA.length - 2], T1), t2 = la_unit(WB[WB.length - 2], T2);   // local tangents at the ends
    var k = 4 / 3 * Math.tan((Math.PI - th) / 4) * rho;
    var d = 'M' + la_P(h.p);
    for (var i = 1; i < WA.length; i++) d += 'L' + la_P(WA[i]);
    d += 'C' + la_P(la_add(T1, t1, -k)) + ' ' + la_P(la_add(T2, t2, -k)) + ' ' + la_P(T2);
    for (var j = WB.length - 2; j >= 1; j--) d += 'L' + la_P(WB[j]);
    out += ink(d + 'Z');
  });
  return out;
}
function la_dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
function la_P(p) { return f(p[0]) + ' ' + f(p[1]); }

var LA_TIP = null;   // last drawn blade tip (for checks)

// S = pose: th (swing, deg, + = clockwise), ph (twist about the midrib, deg), bend (extra tip bend, pt), dl (twig flex at the bud, pt, + = up)
function la_draw(C, S) {
  var L = C.L, T0 = C.twig, R = T0[0], M0 = T0[2], BB = T0[3];
  // ── twig: tapers 1.95 → 1.45 at the node → 0.92 at the bud ──
  var d0 = la_dir(la_ang(T0[1], R)), R0 = la_add(R, d0, 0.7);
  // one ribbon from the root through the node, then a narrowing neck into a slender terminal bud lifted
  // ~20° above the twig's line: both bud edges convex, tapering to a point over its last half-point
  var tA = la_ang(M0, BB), bA = tA - C.bud.lift, bd = la_dir(bA);
  var TT = la_add(BB, bd, C.bud.len);
  var spine = [R0].concat(T0, [TT]);
  var acc = [0]; for (var i = 1; i < spine.length; i++) acc.push(acc[i - 1] + dist(spine[i - 1], spine[i]));
  var tot = acc[acc.length - 1], dR = acc[1], dN = acc[2], dB = acc[4];
  var twig = ribbon(spine, function (s) {
    var dd = s * tot;
    if (dd <= dR) return C.tw[0];
    var r = clamp((dd - dR) / (dB - dR)), rN = (dN - dR) / (dB - dR);   // one smooth taper passing ~1.45 at the node
    var w = lerp(C.tw[0], C.tw[2], Math.pow(r, Math.log((C.tw[0] - C.tw[1]) / (C.tw[0] - C.tw[2])) / Math.log(rN)));
    if (dd <= dB - 0.6) return w;
    var nk = C.bud.neck, q = (dd - dB - 0.15) / (tot - dB - 0.15);          // bud: 0 at the neck → 1 at the tip
    if (q <= 0) return lerp(w, nk, smooth((dd - dB + 0.6) / 0.75));
    if (q <= 0.42) return lerp(nk, C.bud.wid, smooth(q / 0.42));
    return C.bud.wid * Math.pow(Math.max(0, Math.cos(Math.PI / 2 * Math.min(1, (q - 0.42) / 0.58))), 0.8);
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
  //    Its foot meets the twig through round fillets (a quarter circle each side), in every frame. ──
  var tilt = la_ang(Rb, M) - la_ang(R, M0);
  var aRoot = C.aP + tilt + 0.08 * S.th, aEnd = C.aB + tilt + S.th;
  var pet = la_arc(N, aRoot, aEnd, C.Lp, 6), B = pet[pet.length - 1];
  var U = la_dir(aEnd), petLen = C.Lp + 0.25, rho = 0.6, surf = C.tw[1] / 2 - 0.32;
  var petiole = ribbon(pet.concat([la_add(B, U, 0.25)]), function (s) { return lerp(LA_PW + 0.16, LA_PW, smooth(s / 0.6)); }, { samples: 16 });
  var foot = la_fillets(twig, petiole, N, 0.48);

  // ── blade ──
  // twist: the blade turns about its midrib. Its cross-section is a shallow V (each half tilted 14°), so the two
  // halves foreshorten unequally and the midrib slides off-centre — the 3-D cue that the leaf is turning.
  var al = 14 * Math.PI / 180, ph = S.ph * Math.PI / 180;
  var kUp = Math.cos(ph + al) / Math.cos(al), kLo = Math.cos(ph - al) / Math.cos(al);
  var X = la_frame(B, aEnd, L, C.droop, C.flick, S.bend, kUp, kLo);
  var up = [], lo = [], NS = 110;
  for (i = 0; i <= NS; i++) {
    var x = L * (1 - Math.pow(1 - i / NS, 1.2));      // a little denser towards the tip
    up.push(X(x, la_H(LA_SIDE.up, x, L)));
    lo.push(X(x, -la_H(LA_SIDE.lo, x, L)));
  }
  lo.pop();
  var blade = polyPath(up.concat(lo.reverse()), true);
  LA_TIP = X(L, 0);

  // as the blade turns, the midrib groove narrows and its shallow ends drop out of sight; veins thin, not shorten
  var turnK = 1 - Math.min(1, kUp, kLo), mt = 1 - 0.45 * turnK;
  var m0 = LA_M0 * L + 1.2 * turnK, m1 = LA_M1 * L - 1.2 * turnK, mid = [];
  for (i = 0; i <= 24; i++) mid.push(X(lerp(m0, m1, i / 24), 0));
  var midW = function (q) { return la_midW(q) * mt; };
  var vs = '';
  LA_VEINS.forEach(function (vn) {
    var k = vn.side > 0 ? kUp : kLo, q = (vn.u * L - m0) / (m1 - m0);
    vs += cut(la_vein(vn, L, X, midW(clamp(q)), 0.5 + 0.5 * Math.min(1, k)));
  });

  return ink(twig) + cut(rootCut) + ink(petiole) + foot + ink(blade) + cut(ribbon(mid, midW, { samples: 3 })) + vs;
}

// ── wind and the leaf's response ──────────────────────────────────────────────────────────────────
// Wind from the left. F = push on the leaf (0 calm … ~1.2 in the gust), G = how hard it worries the blade (twist).
function la_wind(t) {
  var breeze = (0.14 + 0.07 * noise(t, 5, 2)) * Math.sin(TAU * (6 * t + 0.6)) + 0.03 * noise(t, 3, 2);   // breathing sway
  var puff = bump(t, 0.08, 0.17, 0.19, 0.29, smooth);
  var gust = 0.74 * seg(t, 0.27, 0.48, smoother) * (1 - seg(t, 0.56, 0.64, smooth));
  var turb = 0.5 * Math.sin(TAU * (9 * t + 0.13)) + 0.3 * Math.sin(TAU * (13 * t + 0.71)) + 0.2 * Math.sin(TAU * (18 * t + 0.37));
  var flut = 0.55 * Math.sin(TAU * (11 * t + 0.42)) + 0.45 * Math.sin(TAU * (16 * t + 0.08));
  return { F: breeze + 0.8 * puff + gust * (1 + 0.16 * turb), G: Math.max(0.28 * puff, gust * (0.6 + 0.4 * flut)) };
}
// Three damped oscillators (swing, twist, twig) driven by the wind, run until the loop repeats exactly
// (steady state of a periodic drive), so the seam is seamless and every overshoot and bounce is physical.
var LA_SIM = null;
function la_sim() {
  if (LA_SIM) return LA_SIM;
  var NS = 1120, SUB = 6, dt = 1 / (NS * SUB);
  var wT = TAU * 7 / 1.25, zT = 0.3, wP = TAU * 7 / 0.8, zP = 0.34, wD = TAU * 7 / 1.5, zD = 0.26;
  var th = 0, thv = 0, ph = 0, phv = 0, dl = 0, dlv = 0;
  var out = { th: [], thv: [], ph: [], dl: [], F: [] };
  for (var lp = 0; lp < 8; lp++) {
    for (var i = 0; i < NS; i++) {
      if (lp === 7) { var w0 = la_wind(i / NS); out.th.push(th); out.thv.push(thv); out.ph.push(ph); out.dl.push(dl); out.F.push(w0.F); }
      for (var k = 0; k < SUB; k++) {
        var w = la_wind((i * SUB + k) * dt);
        thv += (wT * wT * (16.5 * w.F - th) - 2 * zT * wT * thv) * dt; th += thv * dt;
        phv += (wP * wP * (38 * w.G - ph) - 2 * zP * wP * phv) * dt; ph += phv * dt;
        dlv += (wD * wD * (-0.8 * w.F - 0.02 * th - dl) - 2 * zD * wD * dlv) * dt; dl += dlv * dt;
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
