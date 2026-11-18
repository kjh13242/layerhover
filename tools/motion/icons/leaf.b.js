// 나뭇잎 (Leaf) — variant B · "elegance first"
// "나뭇잎은 가지에 하나 펴있는걸로 이것도 바람 부는거에 따라 흔들흔들하게." — one leaf spread open on a twig,
// swaying in the wind.
// The whole icon is one calligraphic gesture: a pruned twig enters at the top left, dips at the node under the
// leaf's weight and lifts to a slim terminal bud; from the node the petiole sweeps down in an S, the blade bows
// out broad and asymmetric and ends in a long drip tip. Thick (twig root, blade) and thin (petiole, bud, tip)
// alternate. Inside, arcuate venation — a midrib and one lateral per side that echo the outline — instead of
// a fishbone: three calm lines, carved as tapered cuts.
var ICON = {
  id: "leaf",
  frames: 48,
  at: function (t) { return drawAll(pose(t)); }
};

// ── wind and pose ──────────────────────────────────────────────────────────────────────────────
// A breeze that comes and goes, and one gust per loop: the air lulls and the leaf sinks back (anticipation)
// → the gust lifts it → turbulent hold, the blade fluttering (its halves foreshorten in turn as it twists)
// → release, overshoot, settle. Swing, blade lag, twist and twig flex are damped springs driven by that wind,
// simulated until the loop is periodic, so follow-through and overlap come out of the physics; frame 0 is
// the rest pose by construction (the state at t = 0 is subtracted).
function wind(t) {
  var calm = 0.12 + 0.18 * Math.sin(TAU * (2 * t + 0.3)) + 0.06 * noise(t, 4, 2);
  var lull = -0.16 * pulse(t, 0.09, 0.21);
  var env = seg(t, 0.19, 0.30) * (1 - seg(t, 0.47, 0.63));
  var turb = 1 + 0.26 * Math.sin(TAU * (6 * t + 0.15)) + 0.12 * Math.sin(TAU * (11 * t + 0.6));
  return calm + lull + env * turb;
}
function flutter(t) { return seg(t, 0.22, 0.31) * (1 - seg(t, 0.49, 0.62)) * Math.sin(TAU * (6 * t + 0.42)); }
var SIM = null;
function simulate() {
  var N = 1440, dt = 1 / N, loops = 7, out = [];
  var w1 = TAU / 0.27, z1 = 0.24, A1 = 9;               // swing about the node (deg)
  var w2 = TAU / 0.15, z2 = 0.3, A2 = 2.0, C2 = 0.9;    // blade lag behind the petiole (deg)
  var w3 = TAU / 0.15, z3 = 0.25, A3 = 0.55, C3 = 0.0005; // twist about the midrib (rad)
  var w4 = TAU / 0.21, z4 = 0.34, A4 = 0.26, C4 = 0.02; // twig flex at the bud (pt)
  var th = 0, thv = 0, be = 0, bev = 0, ph = 0, phv = 0, de = 0, dev = 0;
  for (var L = 0; L < loops; L++) {
    for (var i = 0; i < N; i++) {
      var t = i / N, W = wind(t);
      var tha = w1 * w1 * (A1 * W - th) - 2 * z1 * w1 * thv;
      var bea = w2 * w2 * (A2 * W - be) - 2 * z2 * w2 * bev - C2 * tha;
      var pha = w3 * w3 * (A3 * flutter(t) + C3 * thv - ph) - 2 * z3 * w3 * phv;
      var dea = w4 * w4 * (A4 * W + C4 * th - de) - 2 * z4 * w4 * dev;
      thv += tha * dt; th += thv * dt;
      bev += bea * dt; be += bev * dt;
      phv += pha * dt; ph += phv * dt;
      dev += dea * dt; de += dev * dt;
      if (L === loops - 1) out.push([th, be, ph, de]);
    }
  }
  var z = out[0];
  return { N: N, s: out.map(function (v) { return [v[0] - z[0], v[1] - z[1], v[2] - z[2], v[3] - z[3]]; }) };
}
function pose(t) {
  if (!SIM) SIM = simulate();
  var u = wrap01(t) * SIM.N, i = Math.floor(u), k = u - i, a = SIM.s[i % SIM.N], b = SIM.s[(i + 1) % SIM.N];
  var v = [0, 1, 2, 3].map(function (j) { return lerp(a[j], b[j], k); });
  var tw = Math.tan(R(22)), c = Math.cos(v[2]), sn = Math.sin(v[2]);
  // the narrower half B is folded less steeply, so it foreshortens less than A
  return { swing: -v[0], lag: -v[1], fa: softSide(c + tw * sn), fb: 1 - 0.55 * (1 - softSide(c - tw * sn)), flex: v[3] };
}
// projected width of one half of the (slightly V-folded) blade as it turns; eases into its limits
function softSide(x) { return x >= 0.92 ? Math.min(1.03, x) : 0.92 - 0.14 * (1 - Math.exp(-(0.92 - x) / 0.14)); }

// ── geometry helpers ───────────────────────────────────────────────────────────────────────────
function R(a) { return a * Math.PI / 180; }
function smax(a, b, k) { return (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2; }   // smooth maximum (fillet)
// sweep a width profile along a Catmull-Rom spine → edges, samples and arc lengths
function sweep(spine, wfn, sub) {
  var P = [], i, k; sub = sub || 24;
  for (i = 0; i < spine.length - 1; i++) {
    var p0 = spine[Math.max(0, i - 1)], p1 = spine[i], p2 = spine[i + 1], p3 = spine[Math.min(spine.length - 1, i + 2)];
    for (k = 0; k < sub; k++) P.push(_cr(p0, p1, p2, p3, k / sub));
  }
  P.push(spine[spine.length - 1].slice());
  var L = [0];
  for (i = 1; i < P.length; i++) L.push(L[i - 1] + dist(P[i - 1], P[i]));
  var tot = L[L.length - 1], left = [], right = [], dirs = [];
  for (i = 0; i < P.length; i++) {
    var a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    var nx = -ty / tl, ny = tx / tl, hw = wfn(L[i] / tot, L[i], tot) / 2;
    left.push([P[i][0] + nx * hw, P[i][1] + ny * hw]);
    right.push([P[i][0] - nx * hw, P[i][1] - ny * hw]);
    dirs.push([tx / tl, ty / tl]);
  }
  return { left: left, right: right, pts: P, len: L, total: tot, dirs: dirs };
}
function pointAt(sw, s) {
  var target = s * sw.total;
  for (var i = 1; i < sw.len.length; i++) if (sw.len[i] >= target) {
    var k = (target - sw.len[i - 1]) / (sw.len[i] - sw.len[i - 1] || 1);
    return { p: mix(sw.pts[i - 1], sw.pts[i], k), dir: sw.dirs[i], i: i };
  }
  return { p: sw.pts[sw.pts.length - 1], dir: sw.dirs[sw.dirs.length - 1], i: sw.pts.length - 1 };
}

// ── the twig: pruned obliquely at the root, dips at the node under the leaf, tapers to a terminal bud ──
var TWIG = [[1.5, 3.8], [3.2, 4.45], [5.0, 4.75], [6.8, 4.58], [8.55, 4.02], [10.2, 3.28], [11.6, 2.65], [12.45, 2.29]];
var NODE_S = 0.375;              // node position (fraction of the twig)
function twigW(s) { return lerp(1.4, 0.9, Math.pow(s, 0.62)) - 0.08 * smooth((s - 0.93) / 0.07); }
// the bud: a slim pointed ovoid, fuller on its upper side and lifted a little off the twig's line
function budPath() { return petal(12.05, 2.48, 2.45, 1.18, -24, { peak: 0.42, base: 0.72, bend: -0.12, fat: 1.08 }); }

// ── the leaf in a local frame: x along its spine from the node (pt), y across it (side A = y < 0, the
//    fuller outer side). Each half of the blade is an analytic profile — a full shoulder (1 − (1 − u)^n)
//    rising out of the petiole through a fillet, and an acuminate fall (cos^k) into the drip tip. ──
var PET = 1.9, TIP = 14.4, HP = 0.5, FIL = 0.42;
var SIDE = {
  A: { W: 3.8, peak: 0.33, n: 2.4, k: 1.4, foot: 0.36 },
  B: { W: 3.08, peak: 0.44, n: 2.55, k: 1.5, foot: 0.42 }
};
function bladeH(S, x) {           // half-width of the blade alone (extends below the petiole near the base)
  var BLN = TIP - PET, s = (x - PET) / BLN;
  if (s <= 0) return HP + (S.W - HP) * S.n / (S.peak * BLN) * (x - PET);
  if (s <= S.peak) return HP + (S.W - HP) * (1 - Math.pow(1 - s / S.peak, S.n));
  if (s >= 1) return 0;
  return S.W * Math.pow(Math.cos(Math.PI / 2 * (s - S.peak) / (1 - S.peak)), S.k);
}
function halfW(S, x) {            // petiole (with a foot flaring into the twig) ∪ blade, joined by a fillet
  var pet = HP + S.foot * smooth((1.0 - x) / 1.2);
  if (x >= TIP) return 0;
  var h = smax(pet, bladeH(S, x), FIL);
  // the fillet must not lift the drip tip off its point: fade the petiole term out along the blade
  if (x > PET + 2) h = bladeH(S, x) + (h - bladeH(S, x)) * Math.max(0, 1 - (x - PET - 2) / 1.5);
  return h;
}
var X_FOOT = -0.35;
function leafOutline() {          // local points: side A from the foot to the tip, then side B back
  var A = [], B = [], n = 90, i;
  for (i = 0; i <= n; i++) {
    var u = i / n, x = X_FOOT + (TIP - X_FOOT) * (1 - Math.pow(1 - u, 1.15));   // a little denser at the tip
    A.push([x, -halfW(SIDE.A, x)]);
    B.push([x, halfW(SIDE.B, x)]);
  }
  A[A.length - 1] = [TIP, 0]; B.pop();
  return A.concat(B.reverse());
}
var OUTLINE = leafOutline();

// bendable spine: heading along the leaf integrated to positions; y offsets along the normal
function leafFrame(node, base, P) {
  var step = 0.05, x0 = -1.0, n = Math.ceil((TIP + 0.6 - x0) / step), ph = [], px = [], py = [], i, a;
  function head(x) {
    var g = smooth(clamp(x / PET)), h = base + P.petRoot * (1 - g) + P.swing * g;
    if (x > PET) {
      var q = (x - PET) / (TIP - PET);
      h += P.droop * smooth(q / 0.7) - P.flick * smooth((q - 0.6) / 0.4) + P.lag * smooth(q);
    }
    return R(h);
  }
  for (i = 0; i <= n; i++) { ph.push(head(x0 + i * step)); px.push(0); py.push(0); }
  var i0 = Math.round(-x0 / step);
  px[i0] = node[0]; py[i0] = node[1];
  for (i = i0 + 1; i <= n; i++) { a = (ph[i - 1] + ph[i]) / 2; px[i] = px[i - 1] + Math.cos(a) * step; py[i] = py[i - 1] + Math.sin(a) * step; }
  for (i = i0 - 1; i >= 0; i--) { a = (ph[i + 1] + ph[i]) / 2; px[i] = px[i + 1] - Math.cos(a) * step; py[i] = py[i + 1] - Math.sin(a) * step; }
  return function (x, y) {
    var u = (x - x0) / step, j = Math.max(0, Math.min(n - 1, Math.floor(u))), k = u - j;
    var sx = lerp(px[j], px[j + 1], k), sy = lerp(py[j], py[j + 1], k), an = lerp(ph[j], ph[j + 1], k);
    var g = smooth((x - PET) / 1.6), sc = 1 + ((y < 0 ? P.fa : P.fb) - 1) * g;
    return [sx - Math.sin(an) * y * sc, sy + Math.cos(an) * y * sc];
  };
}

// ── venation (cuts) ────────────────────────────────────────────────────────────────────────────
// Arcuate ("triple-nerved") venation, as in cinnamon or dogwood: a midrib and one long lateral per side.
// Each lateral springs from the midrib, sweeps out, runs with the margin and converges towards the tip,
// tapering to nothing — three calm lines echoing the outline instead of a fishbone.
// midrib: a needle-fine start near the base, a steady line, then a long taper before the tip
var M0 = 3.0, M1 = 12.0, MW = 0.8;
function midribW(q) { var u = q / 0.145; return MW * (u < 1 ? Math.pow(smooth(u), 0.75) : 1) * (q < 0.45 ? 1 - 0.1 * q / 0.45 : 0.9 * Math.pow((1 - q) / 0.55, 0.75)); }
// laterals: each one's distance from the midrib is the margin's own profile × a course fraction, eased in by a
// smooth ramp out of the midrib — so it rises in one continuous curve (no elbow) and settles into a course that
// echoes the outline, converging towards the tip and tapering to nothing.
//            from x, ramp length, ends at x, course fraction start/end, root width, side
var LATERALS = [[4.95, 2.0, 9.9, 0.56, 0.46, 0.72, -1], [6.0, 2.0, 10.3, 0.58, 0.5, 0.74, 1]];
function lateral(X, v, mw, fs) {
  var x0 = v[0], L = v[1], x2 = v[2], f1 = v[3], f2 = v[4], w0 = v[5], sg = v[6];
  var S = sg < 0 ? SIDE.A : SIDE.B, rt = Math.min(1, fs);
  // a turning half foreshortens: its lateral retracts and slims so the ink beside it never becomes a sliver
  x2 -= 8 * (1 - rt); w0 *= 0.5 + 0.5 * rt;
  // the root starts hidden inside the midrib, just past its centre line
  var y0 = -0.12;
  var Y = function (x) {
    var r = Math.sin(Math.PI / 2 * clamp((x - x0) / L)), fr = lerp(f1, f2, smooth((x - x0) / (x2 - x0)));
    return y0 + (fr * bladeH(S, x) - y0) * r;
  };
  var loc = [], i, n = 30, len = 0;
  for (i = 0; i <= n; i++) { var x = lerp(x0, x2, i / n); loc.push([x, Y(x)]); }
  for (i = 1; i < loc.length; i++) len += dist(loc[i - 1], loc[i]);
  // the width swells where the lateral crosses the midrib's edge: that flare is the fillet on both sides
  var a0 = Math.atan2(loc[1][1] - loc[0][1], loc[1][0] - loc[0][0]);
  var hm = mw / 2, de = (hm - y0) / Math.max(0.3, Math.sin(a0)), fl = 0.2;
  var W = function (q) { var d = q * len; return w0 * Math.pow(1 - q, 0.6) + fl * Math.exp(-Math.pow((d - de) / 0.6, 2)); };
  return cut(ribbon(loc.map(function (p) { return X(p[0], p[1] * sg); }), W, { samples: 2 }));
}
function venation(X, P, m0, m1, mt) {
  var s = '';
  LATERALS.forEach(function (v) { s += lateral(X, v, midribW((v[0] - m0) / (m1 - m0)) * mt, v[6] < 0 ? P.fa : P.fb); });
  return s;
}

// ── draw ───────────────────────────────────────────────────────────────────────────────────────
function drawAll(P) {
  P.petRoot = 26; P.droop = 6; P.flick = 6;
  // twig, flexed about its root by the wind and the leaf's pull
  var rest = sweep(TWIG, twigW), nd0 = pointAt(rest, NODE_S);
  var bendF = bend(TWIG[0][0], TWIG[0][1], TWIG[TWIG.length - 1][0], TWIG[TWIG.length - 1][1], -(P.flex || 0));
  var tw = sweep(TWIG.map(function (p) { return bendF(p[0], p[1]); }), twigW);
  // oblique pruning cut at the root: the upper edge runs further back than the lower one (about 45°)
  var iCut = 0;
  while (iCut < tw.len.length - 1 && tw.len[iCut] < 1.3) iCut++;
  var pts = tw.right.concat(tw.left.slice(iCut).reverse());
  // the cut's acute corner (first point) gets a small radius so it reads as cut wood, not a blade edge
  var c0 = pts[0], rr = 0.2, k = 1;
  while (dist(pts[k], c0) < rr + 0.02) k++;
  var cA = pts[k], cB = pts[pts.length - 1];
  var uA = [cA[0] - c0[0], cA[1] - c0[1]], la = Math.hypot(uA[0], uA[1]), uB = [cB[0] - c0[0], cB[1] - c0[1]], lb = Math.hypot(uB[0], uB[1]);
  var qA = [c0[0] + uA[0] / la * rr, c0[1] + uA[1] / la * rr], qB = [c0[0] + uB[0] / lb * rr, c0[1] + uB[1] / lb * rr];
  var twigD = 'M' + f(qA[0]) + ' ' + f(qA[1]) + polyPath(pts.slice(k), false).replace(/^M/, 'L') + 'L' + f(qB[0]) + ' ' + f(qB[1]) + 'Q' + f(c0[0]) + ' ' + f(c0[1]) + ' ' + f(qA[0]) + ' ' + f(qA[1]) + 'Z';
  var s = ink(twigD) + ink(budPath(), bendF);

  var nd = pointAt(tw, NODE_S);
  var node = [nd.p[0] - nd.dir[1] * 0.2, nd.p[1] + nd.dir[0] * 0.2];
  var turn = (Math.atan2(nd.dir[1], nd.dir[0]) - Math.atan2(nd0.dir[1], nd0.dir[0])) * 180 / Math.PI;
  var X = leafFrame(node, 47 + turn, P);
  s += ink(polyPath(OUTLINE.map(function (p) { return X(p[0], p[1]); }), true));
  // as the blade turns, the groove narrows and its shallow ends drop out of sight
  var turnK = 1 - Math.min(1, P.fa, P.fb), mt = 1 - 0.45 * turnK, m0 = M0 + 1.2 * turnK, m1 = M1 - 1.2 * turnK;
  var mid = [];
  for (var i = 0; i <= 32; i++) mid.push(X(lerp(m0, m1, i / 32), 0));
  s += cut(ribbon(mid, function (q) { return midribW(q) * mt; }, { samples: 3 }));
  s += venation(X, P, m0, m1, mt);
  return s;
}
