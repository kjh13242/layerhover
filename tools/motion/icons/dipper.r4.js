// 북두칠성 (Big Dipper) — round 4.
// Seven crafted four-point twinkles (one cubic per side: needle tips, full concave body), sized by magnitude, heavy
// enough to hold their own beside the system glyphs. The asterism is a crisp solid hairline that stops short of
// every star, so each star floats in its own clear space and the lines never read as sticks. One star at a time
// glints — it gathers in, the tall ray shoots first, the body fills, the side rays follow, then it settles a hair
// below rest — and the hairlines step back from it as it grows. The light travels along the dipper — Mizar,
// Alioth (the poster), Megrez, Phecda — into the bowl, then the sky rests.

var DP = {
  N: 64,
  hr: 0.56, k0: 0.64, tau0: 19,      // rest twinkle: side ray = hr · tall ray; body fullness; tip half-angle (deg)
  k1: 0.62, tau1: 17,               // glint body
  rise: 4, fall: 7, dip: 3, pre: 2, gather: 0.12,   // glint timing (frames) and anticipation depth
  link: 0.7, gap: 0.35               // asterism hairline width; clear space it keeps from every star outline
};

// Star centres (pt): the real sky turned 9° and fitted to the live area, on 2× pixel centres. Alkaid, Mizar, Megrez,
// Phecda and Dubhe are nudged ≤ 0.5 pt from the true figure so every hairline keeps a visible run at rest.
// a = rest tall ray by magnitude; b = side ray where it has to be held in (default a · hr).
var DP_STARS = [
  { p: [2.25, 13.75], a: 2.5, b: 1.05 },   // 0 Alkaid  1.9
  { p: [4.25, 10.25], a: 2.35, b: 0.82 },  // 1 Mizar   2.0
  { p: [7.25, 9.25], a: 2.7, b: 0.92 },    // 2 Alioth  1.8
  { p: [10.75, 8.25], a: 1.85, b: 0.74 },  // 3 Megrez  3.3
  { p: [12.75, 10.25], a: 2.3, b: 0.9 },   // 4 Phecda  2.4
  { p: [15.75, 7.25], a: 2.2, b: 0.9 },    // 5 Merak   2.4
  { p: [13.75, 4.25], a: 2.75, b: 1.2 }    // 6 Dubhe   1.8
];
var DP_PATH = [0, 1, 2, 3, 4, 5, 6, 3];
// glints: [star, peak frame, tall ray, side ray]
var DP_GLINTS = [
  [1, 50, 4.0, 0.95],    // Mizar, in the handle
  [2, -0.4, 4.7, 0.95],  // Alioth — the poster
  [3, 12, 3.7, 0.82],    // Megrez, the faintest — the biggest change
  [4, 24, 4.0, 1.05]     // Phecda, the bowl's floor: the light has crossed into the bowl
];

function dpStarPts(cx, cy, a, b, k, tau) {
  var s = Math.sin(tau * Math.PI / 180), c = Math.cos(tau * Math.PI / 180);
  var T = [[0, -a], [b, 0], [0, a], [-b, 0]], U = [[0, -1], [1, 0], [0, 1], [-1, 0]], L = [a, b, a, b], segs = [];
  for (var i = 0; i < 4; i++) {
    var j = (i + 1) % 4, A = T[i], B = T[j], ua = U[i], ub = U[j];
    var c1 = [A[0] + k * L[i] * (-c * ua[0] + s * ub[0]), A[1] + k * L[i] * (-c * ua[1] + s * ub[1])];
    var c2 = [B[0] + k * L[j] * (-c * ub[0] + s * ua[0]), B[1] + k * L[j] * (-c * ub[1] + s * ua[1])];
    segs.push([[cx + A[0], cy + A[1]], [cx + c1[0], cy + c1[1]], [cx + c2[0], cy + c2[1]], [cx + B[0], cy + B[1]]]);
  }
  return segs;
}
function dpStarPath(segs) {
  var d = 'M' + f(segs[0][0][0]) + ' ' + f(segs[0][0][1]);
  segs.forEach(function (q) { d += 'C' + f(q[1][0]) + ' ' + f(q[1][1]) + ' ' + f(q[2][0]) + ' ' + f(q[2][1]) + ' ' + f(q[3][0]) + ' ' + f(q[3][1]); });
  return d + 'Z';
}
function dpFlat(segs) {
  var out = [];
  segs.forEach(function (q) {
    for (var i = 0; i < 24; i++) {
      var u = i / 24, v = 1 - u;
      out.push([v * v * v * q[0][0] + 3 * v * v * u * q[1][0] + 3 * v * u * u * q[2][0] + u * u * u * q[3][0],
                v * v * v * q[0][1] + 3 * v * v * u * q[1][1] + 3 * v * u * u * q[2][1] + u * u * u * q[3][1]]);
    }
  });
  return out;
}
// a link: one straight solid hairline band from star centre to star centre (4 points, flat ends hidden in the stars)
function dpLink(pa, pb) {
  var L = dist(pa, pb), h = DP.link / 2, nx = -(pb[1] - pa[1]) / L * h, ny = (pb[0] - pa[0]) / L * h;
  return ink(polyPath([[pa[0] + nx, pa[1] + ny], [pb[0] + nx, pb[1] + ny], [pb[0] - nx, pb[1] - ny], [pa[0] - nx, pa[1] - ny]], true));
}

function dpDu(frame, peak) { var u = frame - peak; return u - DP.N * Math.round(u / DP.N); }
function dpEnv(u) {
  var r = DP.rise, fl = DP.fall, dp = DP.dip, pre = DP.pre;
  if (u <= -r - pre || u >= fl + dp) return 0;
  if (u < -r) return -DP.gather * Math.sin(Math.PI / 2 * (u + r + pre) / pre);
  if (u < 0) return lerp(-DP.gather, 1, smoother((u + r) / r));
  if (u < fl) return 1 - 1.06 * smooth(u / fl);
  return -0.06 * (1 - smooth((u - fl) / dp));
}

function dpStars(fr) {
  return DP_STARS.map(function (st, i) {
    var p = st.p, b0 = st.b || st.a * DP.hr, a = st.a, b = b0, k = DP.k0, tau = DP.tau0;
    DP_GLINTS.forEach(function (g) {
      if (g[0] !== i) return;
      var du = dpDu(fr, g[1]), gv = dpEnv(du), gk = Math.max(0, dpEnv(du - 0.35)), gh = dpEnv(du - 0.7);
      var A = Math.min(g[2], p[1] - 1.02, 16.98 - p[1]), B = Math.min(g[3], p[0] - 1.02, 16.98 - p[0]);
      a = Math.min(A, lerp(st.a, A, gv)); b = Math.min(B, lerp(b0, B, gh));
      k = lerp(DP.k0, DP.k1, Math.min(1, gk)); tau = lerp(DP.tau0, DP.tau1, Math.min(1, gk));
    });
    var shapes = [dpStarPts(p[0], p[1], a, b, k, tau)];
    var pts = [];
    shapes.forEach(function (sg) { pts = pts.concat(dpFlat(sg)); });
    return { p: p, shapes: shapes, pts: pts };
  });
}

var ICON = {
  id: "dipper",
  frames: DP.N,
  at: function (t) {
    var S = dpStars(t * DP.N), links = '', stars = '';
    for (var n = 1; n < DP_PATH.length; n++) links += dpLink(S[DP_PATH[n - 1]].p, S[DP_PATH[n]].p);
    S.forEach(function (s) { s.shapes.forEach(function (sg) { var d = dpStarPath(sg); stars += cutAround(d, DP.gap) + front(d); }); });
    return links + stars;
  }
};
