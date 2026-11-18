// 북두칠성 (Big Dipper) — variant B: elegance first.
// Seven crafted four-point sparkles (one cubic per side: needle tips, full concave body), sized by magnitude, with
// faint Alcor beside Mizar. The asterism is a half-tone hairline that runs behind the stars and thins as it reaches
// each outline, so every sparkle stays crisp while the dipper still reads as one connected figure — even where
// stars sit only 2.5 pt apart. One star at a time glints: it gathers in, its tall ray shoots up first, the side
// rays follow, then it settles a hair below rest and comes back. The glint travels handle tip → handle → pointer
// star with calm sky between; the poster catches Alioth, the brightest star, at the height of its glint.

var DB = {
  N: 64,
  hr: 0.64, k0: 0.5, tau0: 14,          // rest sparkle: horizontal ray = hr · vertical ray; body fullness; tip angle
  A: 4.0, Bx: 0.47, k1: 0.64, tau1: 8,  // glint: tall ray, horizontal ray = Bx · tall ray, slimmer body, finer tips
  rise: 4, fall: 7, dip: 3, pre: 2, gather: 0.12,   // glint timing (frames) and anticipation depth
  w0: 0.28, w1: 0.62                    // link width at a star outline / in open sky
};

// Star centres (pt): the real sky (gnomonic projection, north up) turned 7° and fitted to the live area, each centre
// on a 2× pixel centre so the vertical and horizontal rays render crisp; the handle's arc is eased into a steady
// curve (−9° → −22° → −50°). a = rest vertical ray by magnitude (1.8 … 3.3).
var DB_STARS = [
  { p: [2.75, 13.25], a: 1.94 },   // Alkaid  1.9
  { p: [4.75, 10.25], a: 1.81 },   // Mizar   2.0
  { p: [7.25, 9.25], a: 2.23 },    // Alioth  1.8
  { p: [10.25, 8.75], a: 1.2 },    // Megrez  3.3
  { p: [12.25, 10.25], a: 1.58 },  // Phecda  2.4
  { p: [15.75, 7.25], a: 1.58 },   // Merak   2.4
  { p: [14.25, 4.75], a: 2.23 }    // Dubhe   1.8
];
var DB_ALCOR = { p: [3.25, 8.75], a: 0.86 };   // Mizar's faint companion (4.0)
var DB_PATH = [0, 1, 2, 3, 4, 5, 6, 3];        // handle, then round the bowl and close it at Megrez
var DB_EVENTS = [
  { star: 2, peak: -0.4, gain: 1 },     // Alioth (the poster)
  { star: 6, peak: 20, gain: 1.04 },    // Dubhe, the pointer star
  { star: 0, peak: 42, gain: 0.95 }     // Alkaid, the tip of the handle
];

// four-point star: tips on the axes; each side is one cubic that leaves a tip at half-angle tau and reaches k of the ray
function dbStar(cx, cy, a, b, k, tau) {
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

// outline of a star as a polygon (to measure where a link leaves it)
function dbStarPoly(d) {
  var segs = parsePath(d), pts = [], cur = null;
  segs.forEach(function (g) {
    if (g.c === 'M') { cur = [g.p[0], g.p[1]]; return; }
    if (g.c !== 'C') return;
    for (var q = 1; q <= 10; q++) {
      var u = q / 10, m = 1 - u;
      pts.push([m * m * m * cur[0] + 3 * m * m * u * g.p[0] + 3 * m * u * u * g.p[2] + u * u * u * g.p[4],
        m * m * m * cur[1] + 3 * m * m * u * g.p[1] + 3 * m * u * u * g.p[3] + u * u * u * g.p[5]]);
    }
    cur = [g.p[4], g.p[5]];
  });
  return pts;
}
// distance from a star's centre c, along unit direction u, to where that ray leaves its outline
function dbExit(poly, c, u) {
  var best = 0;
  for (var i = 0; i < poly.length; i++) {
    var p = poly[i], q = poly[(i + 1) % poly.length], ex = q[0] - p[0], ey = q[1] - p[1], den = u[0] * ey - u[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    var wx = p[0] - c[0], wy = p[1] - c[1], t = (wx * ey - wy * ex) / den, s = (wx * u[1] - wy * u[0]) / den;
    if (t > 0 && s >= 0 && s <= 1) best = Math.max(best, t);
  }
  return best;
}
// a link: a half-tone hairline running behind both stars; it thins as it reaches each star's outline, so the stars
// sit on the line crisply instead of being welded to it (it follows a glinting star's outline as that grows)
function dbLink(pa, pb, polyA, polyB) {
  var L = dist(pa, pb), u = [(pb[0] - pa[0]) / L, (pb[1] - pa[1]) / L];
  var eA = dbExit(polyA, pa, u), eB = dbExit(polyB, pb, [-u[0], -u[1]]), T = Math.min(0.9, 0.4 * Math.max(0.05, L - eA - eB));
  return fade(ribbon([pa, pb], function (s) {
    var e = Math.min(s * L - eA, L - eB - s * L);          // distance from the nearer star outline
    return e <= 0 ? DB.w0 : lerp(DB.w0, DB.w1, smooth(e / T));
  }, { caps: ['round', 'round'], samples: 60 }));
}

function dbDu(frame, peak) { var u = frame - peak; return u - DB.N * Math.round(u / DB.N); }
// glint envelope (u = frames from the peak): the star gathers in a little (anticipation), swells over `rise` frames,
// settles over `fall`, dips a hair below rest (follow-through) and rests
function dbEnv(u) {
  var r = DB.rise, fl = DB.fall, dp = DB.dip, pre = DB.pre;
  if (u <= -r - pre || u >= fl + dp) return 0;
  if (u < -r) return -DB.gather * Math.sin(Math.PI / 2 * (u + r + pre) / pre);
  if (u < 0) return lerp(-DB.gather, 1, smoother((u + r) / r));
  if (u < fl) return 1 - 1.06 * smooth(u / fl);
  return -0.06 * (1 - smooth((u - fl) / dp));
}
function dbGlint(fr, i, lag) {
  var g = 0;
  DB_EVENTS.forEach(function (e) { if (e.star === i) { var v = e.gain * dbEnv(dbDu(fr, e.peak) - lag); if (Math.abs(v) > Math.abs(g)) g = v; } });
  return g;
}

var ICON = {
  id: "dipper",
  frames: DB.N,
  at: function (t) {
    var fr = t * DB.N, links = '', stars = '', shapes = [];
    DB_STARS.forEach(function (st, i) {
      // overlapping action: the tall ray leads, the body slims a third of a frame later, the side rays follow
      var p = st.p, gv = dbGlint(fr, i, 0), gk = Math.max(0, dbGlint(fr, i, 0.35)), gh = dbGlint(fr, i, 0.7);
      var A = Math.min(DB.A, p[1] - 1.02, 16.98 - p[1]), B = Math.min(DB.A * DB.Bx, p[0] - 1.02, 16.98 - p[0]);   // stay in the live area
      var d = dbStar(p[0], p[1], Math.min(A, lerp(st.a, DB.A, gv)), Math.min(B, lerp(st.a * DB.hr, DB.A * DB.Bx, gh)),
        lerp(DB.k0, DB.k1, Math.min(1, gk)), lerp(DB.tau0, DB.tau1, Math.min(1, gk)));
      shapes.push(dbStarPoly(d));
      stars += ink(d);
    });
    for (var n = 1; n < DB_PATH.length; n++) {
      var ia = DB_PATH[n - 1], ib = DB_PATH[n];
      links += dbLink(DB_STARS[ia].p, DB_STARS[ib].p, shapes[ia], shapes[ib]);
    }
    stars += ink(dbStar(DB_ALCOR.p[0], DB_ALCOR.p[1], DB_ALCOR.a, DB_ALCOR.a * DB.hr, DB.k0, DB.tau0));
    return links + stars;
  }
};
