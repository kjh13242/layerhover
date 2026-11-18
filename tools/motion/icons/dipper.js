// 북두칠성 (Big Dipper) — final, built on variant B.
// Seven crafted four-point twinkles (one cubic per side: needle tips, full concave body), sized by magnitude. The
// asterism is a half-tone thread of straight bands running centre to centre behind the stars, so the black sits in
// the stars and the lines recede. One star at a time glints: it gathers in, its tall ray shoots up first, the body
// fills, the side rays follow, then it settles a hair below rest and comes back. The light travels along the
// dipper — handle tip, the handle's brightest star, the pointer star — then the sky rests.

var DP = {
  N: 64,
  hr: 0.58, k0: 0.5, tau0: 14,      // rest twinkle (taller than wide): side ray = hr · tall ray; body; tip half-angle
  k1: 0.5, tau1: 13,                // glint: the body grows with the rays, so the core brightens instead of pinching
  rise: 4, fall: 7, dip: 3, pre: 2, gather: 0.12,   // glint timing (frames) and anticipation depth
  link: 0.7                         // half-tone thread width (a literal line: STYLE's 0.6–0.7 hairline range)
};

// Star centres (pt): the real sky (gnomonic projection, north up) turned 9° and fitted to the live area, each centre
// on a 2× pixel centre so the tall and side rays render crisp. Dubhe sits 0.5 pt left of its true place so its glint
// clears Merak. a = rest tall ray by magnitude; b = side ray where it has to be held in (default a · hr): Mizar's
// side tips are what Alioth's and Alkaid's glints pass closest to, so it grows tall instead of wide.
var DP_STARS = [
  { p: [2.75, 13.25], a: 1.94 },   // 0 Alkaid  1.9
  { p: [4.75, 10.25], a: 1.78, b: 0.94 },   // 1 Mizar   2.0
  { p: [7.25, 9.25], a: 2.23 },    // 2 Alioth  1.8
  { p: [10.25, 8.75], a: 1.2 },    // 3 Megrez  3.3
  { p: [12.25, 10.25], a: 1.55 },  // 4 Phecda  2.4
  { p: [15.75, 7.25], a: 1.55 },   // 5 Merak   2.4
  { p: [13.75, 4.75], a: 2.23 }    // 6 Dubhe   1.8
];
var DP_PATH = [0, 1, 2, 3, 4, 5, 6, 3];        // handle, then round the bowl and close it at Megrez
// glints: [star, peak frame, tall ray, side ray]. Every glint is a tall flare, not a fat ✦ (that reads as an AI
// sparkle). Alioth's side ray is held in where the handle is tight; Dubhe's tall ray stops 0.5 pt short of the bowl's
// floor (Phecda–Merak) instead of touching it, and its live-area cap would stop it at 3.73 anyway.
var DP_GLINTS = [
  [0, 50, 4.0, 1.5],     // Alkaid, the tip of the handle
  [2, -0.4, 4.0, 1.35],  // Alioth — the poster
  [6, 14, 3.15, 1.6]     // Dubhe, the pointer star
];

// four-point twinkle: tips on the axes; each side is one cubic that leaves a tip at half-angle tau and reaches k of the ray
function dpStar(cx, cy, a, b, k, tau) {
  var s = Math.sin(tau * Math.PI / 180), c = Math.cos(tau * Math.PI / 180);
  var T = [[0, -a], [b, 0], [0, a], [-b, 0]], U = [[0, -1], [1, 0], [0, 1], [-1, 0]], L = [a, b, a, b];
  var d = 'M' + f(cx) + ' ' + f(cy - a);
  for (var i = 0; i < 4; i++) {
    var j = (i + 1) % 4, A = T[i], B = T[j], ua = U[i], ub = U[j];
    var c1 = [A[0] + k * L[i] * (-c * ua[0] + s * ub[0]), A[1] + k * L[i] * (-c * ua[1] + s * ub[1])];
    var c2 = [B[0] + k * L[j] * (-c * ub[0] + s * ua[0]), B[1] + k * L[j] * (-c * ub[1] + s * ua[1])];
    d += 'C' + f(cx + c1[0]) + ' ' + f(cy + c1[1]) + ' ' + f(cx + c2[0]) + ' ' + f(cy + c2[1]) + ' ' + f(cx + B[0]) + ' ' + f(cy + B[1]);
  }
  return d + 'Z';
}

// a link: one straight half-tone band from star centre to star centre; its flat ends hide under the star bodies
function dpLink(pa, pb) {
  var L = dist(pa, pb), h = DP.link / 2, nx = -(pb[1] - pa[1]) / L * h, ny = (pb[0] - pa[0]) / L * h;
  return fade(polyPath([[pa[0] + nx, pa[1] + ny], [pb[0] + nx, pb[1] + ny], [pb[0] - nx, pb[1] - ny], [pa[0] - nx, pa[1] - ny]], true));
}

function dpDu(frame, peak) { var u = frame - peak; return u - DP.N * Math.round(u / DP.N); }
// glint envelope (u = frames from the peak): the star gathers in a little (anticipation), swells over `rise` frames,
// settles over `fall`, dips a hair below rest (follow-through) and rests
function dpEnv(u) {
  var r = DP.rise, fl = DP.fall, dp = DP.dip, pre = DP.pre;
  if (u <= -r - pre || u >= fl + dp) return 0;
  if (u < -r) return -DP.gather * Math.sin(Math.PI / 2 * (u + r + pre) / pre);
  if (u < 0) return lerp(-DP.gather, 1, smoother((u + r) / r));
  if (u < fl) return 1 - 1.06 * smooth(u / fl);
  return -0.06 * (1 - smooth((u - fl) / dp));
}

var ICON = {
  id: "dipper",
  frames: DP.N,
  at: function (t) {
    var fr = t * DP.N, links = '', stars = '';
    for (var n = 1; n < DP_PATH.length; n++) links += dpLink(DP_STARS[DP_PATH[n - 1]].p, DP_STARS[DP_PATH[n]].p);
    DP_STARS.forEach(function (st, i) {
      var p = st.p, b0 = st.b || st.a * DP.hr, a = st.a, b = b0, k = DP.k0, tau = DP.tau0;
      DP_GLINTS.forEach(function (g) {
        if (g[0] !== i) return;
        // overlapping action: the tall ray leads, the body fills a third of a frame later, the side rays follow
        var gv = dpEnv(dpDu(fr, g[1])), gk = Math.max(0, dpEnv(dpDu(fr, g[1]) - 0.35)), gh = dpEnv(dpDu(fr, g[1]) - 0.7);
        var A = Math.min(g[2], p[1] - 1.02, 16.98 - p[1]), B = Math.min(g[3], p[0] - 1.02, 16.98 - p[0]);   // stay in the live area
        a = Math.min(A, lerp(st.a, A, gv)); b = Math.min(B, lerp(b0, B, gh));
        k = lerp(DP.k0, DP.k1, Math.min(1, gk)); tau = lerp(DP.tau0, DP.tau1, Math.min(1, gk));
      });
      stars += ink(dpStar(p[0], p[1], a, b, k, tau));
    });
    return links + stars;
  }
};
