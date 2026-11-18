// 북두칠성 (Big Dipper) — variant A: recognisability first.
//
// Drawing
//   · The seven stars sit at their TRUE sky positions: gnomonic projection of the J2000 coordinates (north up, east
//     left, the autumn "ladle holding water" view), turned 16° so the figure rises along the diagonal, scaled 1.1×.
//     The four stars that glint are pixel-fitted to 2× pixel centres so their long rays render as crisp single-pixel
//     columns; the other three keep their exact places. Shape error vs the sky: 0.13 pt RMS. The bowl keeps its real
//     trapezoid (wide at the Dubhe–Megrez rim, narrow at the bottom) and the handle its gentle bend at Mizar.
//   · The bowl is drawn closed: in tests the open cup read as a random zigzag, the closed quadrilateral as the Dipper.
//   · Every star is one crafted four-ray twinkle (8 cubics, concave sides, needle tips), taller than wide, sized by
//     magnitude: Alioth / Dubhe largest, Megrez visibly the faint one. Alcor rides beside Mizar as the telling detail.
//   · Links are 0.6 pt hairlines with flat ends that stop a constant 0.34 pt air gap short of each star's outline,
//     tucking into the notch between two rays, so every link is as long as it can be while the stars float free.
// Motion (64 frames, 8 s)
//   · The light travels along the dipper, one star at a time: Alkaid → Alioth (poster) → Phecda → Dubhe, then a
//     longer rest. Each glint: the star draws in a touch (anticipation), shoots up into a tall scintillation twinkle
//     (vertical ray first, side rays a beat later), holds, and settles slowly; its links give way and return; the
//     linked neighbours answer with a small late twinkle (follow-through).

var DIP_FRAMES = 64;

// Alkaid, Mizar, Alioth, Megrez, Phecda, Merak, Dubhe — centres in pt, and rest ray length by magnitude
// (1.86, 2.04, 1.77, 3.31, 2.44, 2.37, 1.79).
var DIP_POS = [[2.25, 14.25], [4.4, 10.85], [7.25, 9.75], [9.92, 8.45], [12.25, 9.75], [15.7, 6.3], [13.75, 3.75]];
var DIP_SIZE = [1.24, 1.13, 1.3, 0.78, 1.04, 1.06, 1.3];
var DIP_LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]];   // handle, then the closed bowl
var DIP_ALCOR = [3.15, 10.5, 0.48];                                         // in the true direction from Mizar

var DIP_LINE = 0.6, DIP_GAP = 0.34;

// rest twinkle, as fractions of the vertical ray: side ray, side waist, roundness at the waist; plus tip shaping
var DIP_REST = { aspect: 0.6, w: 0.32, h: 0.22, k: 0.5, lat: 0.045, kh: 0.22, lath: 0.08 };
// glint twinkle (absolute pt): a brighter, fuller core and longer rays
var DIP_GLINT = { w: 0.7, h: 0.28, k: 0.36, lat: 0.09, kh: 0.26, lath: 0.08 };
// glints: [star, peak frame, vertical ray, side ray] — side rays stay short where the handle links run nearly level
var DIP_GLINTS = [[2, 0, 3.0, 1.15], [4, 15, 2.8, 1.1], [6, 30, 2.7, 1.2], [0, 49, 2.65, 1.2]];
var DIP_ECHO = 0.2;

function dipAdd(p, q, k) { return [p[0] + q[0] * k, p[1] + q[1] * k]; }
function dipUnit(p) { var l = Math.hypot(p[0], p[1]) || 1; return [p[0] / l, p[1] / l]; }

// A twinkle is one closed path of 8 cubics: four rays, and between each pair of tips one concave side drawn as two
// cubics meeting at the side's innermost point. That point lies on the normal of the tip-to-tip chord with its
// tangent parallel to the chord, so even a tall star's sides stay single, balanced concave sweeps (no S-bends).
// st: rv / rh = vertical / side ray, w = how close the sides come to the centre, h = roundness there,
// k / kh = how far down a vertical / side ray the side keeps hugging it, lat / lath = how open those tips are.
function dipTwinkle(st, cx, cy) {
  var T = [[0, -st.rv], [st.rh, 0], [0, st.rv], [-st.rh, 0]], segs = [];
  for (var i = 0; i < 4; i++) {
    var A = T[i], B = T[(i + 1) % 4], t = dipUnit([B[0] - A[0], B[1] - A[1]]), n = [t[1], -t[0]];
    var M = [n[0] * st.w, n[1] * st.w];
    var ua = dipUnit(A), ub = dipUnit(B), pa = M[0] * ua[0] + M[1] * ua[1], pb = M[0] * ub[0] + M[1] * ub[1];
    var sa = dipUnit([M[0] - ua[0] * pa, M[1] - ua[1] * pa]), sb = dipUnit([M[0] - ub[0] * pb, M[1] - ub[1] * pb]);
    var la = Math.hypot(A[0], A[1]) - pa, lb = Math.hypot(B[0], B[1]) - pb, va = i % 2 === 0;   // A is a vertical tip?
    var ka = va ? st.k : st.kh, kb = va ? st.kh : st.k, aa = va ? st.lat : st.lath, ab = va ? st.lath : st.lat;
    segs.push([dipAdd(dipAdd(A, ua, -ka * la), sa, aa), dipAdd(M, t, -st.h), M]);
    segs.push([dipAdd(M, t, st.h), dipAdd(dipAdd(B, ub, -kb * lb), sb, ab), B]);
  }
  var s0 = segs[segs.length - 1][2], d = 'M' + f(cx + s0[0]) + ' ' + f(cy + s0[1]);
  segs.forEach(function (g) { d += 'C' + f(cx + g[0][0]) + ' ' + f(cy + g[0][1]) + ' ' + f(cx + g[1][0]) + ' ' + f(cy + g[1][1]) + ' ' + f(cx + g[2][0]) + ' ' + f(cy + g[2][1]); });
  return d + 'Z';
}

// outline points of a path of M / C segments (to measure clearances)
function dipFlatten(d) {
  var segs = parsePath(d), pts = [], cur = null;
  segs.forEach(function (g) {
    if (g.c === 'M' || g.c === 'L') { cur = [g.p[0], g.p[1]]; pts.push(cur); }
    else if (g.c === 'C') {
      for (var k = 1; k <= 12; k++) {
        var u = k / 12, m = 1 - u, w0 = m * m * m, w1 = 3 * m * m * u, w2 = 3 * m * u * u, w3 = u * u * u;
        pts.push([w0 * cur[0] + w1 * g.p[0] + w2 * g.p[2] + w3 * g.p[4], w0 * cur[1] + w1 * g.p[1] + w2 * g.p[3] + w3 * g.p[5]]);
      }
      cur = [g.p[4], g.p[5]];
    }
  });
  return pts;
}
// distance from centre p along u where a flat-ended line of half-width hw stays `gap` clear of the outline points
function dipClear(pts, p, u, hw, gap) {
  var best = 0;
  pts.forEach(function (q) {
    var dx = q[0] - p[0], dy = q[1] - p[1], along = dx * u[0] + dy * u[1], e = Math.abs(-dx * u[1] + dy * u[0]) - hw;
    if (e <= 0) best = Math.max(best, along + gap);
    else if (e < gap) best = Math.max(best, along + Math.sqrt(gap * gap - e * e));
  });
  return best;
}

// ── timing ──
function dipFr(t, peak) { return (wrap01(t - peak / DIP_FRAMES + 0.5) - 0.5) * DIP_FRAMES; }   // frames from a peak
// a glint: rises over ~3 frames, holds 1, settles over 6
function dipEnv(fr, lag) {
  var x = fr - (lag || 0);
  if (x <= -3.2 || x >= 7) return 0;
  if (x <= 0) return Math.pow(smooth((x + 3.2) / 3.2), 0.85);
  if (x <= 1) return 1;
  return 1 - smooth((x - 1) / 6);
}
function dipLinked(i, j) {
  return DIP_LINKS.some(function (l) { return (l[0] === i && l[1] === j) || (l[1] === i && l[0] === j); });
}

function dipStar(i, t) {
  var p = DIP_POS[i], r = DIP_SIZE[i], pre = 0, echo = 0;
  // anticipation: just before it flares, the star draws in a little
  DIP_GLINTS.forEach(function (g) { if (g[0] === i) pre = Math.max(pre, pulse(dipFr(t, g[1]), -5.5, -3.2)); });
  r *= 1 - 0.1 * pre;
  var rest = { rv: r, rh: r * DIP_REST.aspect, w: r * DIP_REST.w, h: r * DIP_REST.h, k: DIP_REST.k, lat: DIP_REST.lat, kh: DIP_REST.kh, lath: DIP_REST.lath };
  var st = Object.assign({}, rest);
  DIP_GLINTS.forEach(function (g) {
    var fr = dipFr(t, g[1]);
    if (g[0] === i) {
      // the vertical ray leads, the core follows, the side rays come a beat later
      var em = dipEnv(fr, 0), ec = dipEnv(fr, 0.3), eh = dipEnv(fr, 0.6);
      if (em > 0 || eh > 0) {
        st.rv = lerp(rest.rv, g[2], em); st.k = lerp(rest.k, DIP_GLINT.k, em); st.lat = lerp(rest.lat, DIP_GLINT.lat, em);
        st.w = lerp(rest.w, DIP_GLINT.w, ec); st.h = lerp(rest.h, DIP_GLINT.h, ec);
        st.rh = lerp(rest.rh, g[3], eh); st.kh = lerp(rest.kh, DIP_GLINT.kh, eh); st.lath = lerp(rest.lath, DIP_GLINT.lath, eh);
      }
    } else if (dipLinked(i, g[0])) {
      echo = Math.max(echo, DIP_ECHO * dipEnv(fr, 2.2));   // a linked neighbour answers, a little later
    }
  });
  st.rv *= 1 + echo;
  var d = dipTwinkle(st, p[0], p[1]);
  return { d: d, pts: dipFlatten(d) };
}

var ICON = {
  id: "dipper",
  frames: DIP_FRAMES,
  at: function (t) {
    var s = '', stars = [], hw = DIP_LINE / 2;
    for (var i = 0; i < 7; i++) { stars.push(dipStar(i, t)); s += ink(stars[i].d); }
    var ar = DIP_ALCOR[2];
    s += ink(dipTwinkle({ rv: ar, rh: ar * DIP_REST.aspect, w: ar * DIP_REST.w, h: ar * DIP_REST.h, k: DIP_REST.k, lat: 0.03, kh: DIP_REST.kh, lath: 0.03 }, DIP_ALCOR[0], DIP_ALCOR[1]));
    DIP_LINKS.forEach(function (l) {
      var P = DIP_POS[l[0]], Q = DIP_POS[l[1]], L = dist(P, Q), u = [(Q[0] - P[0]) / L, (Q[1] - P[1]) / L];
      var c0 = dipClear(stars[l[0]].pts, P, u, hw, DIP_GAP), c1 = dipClear(stars[l[1]].pts, Q, [-u[0], -u[1]], hw, DIP_GAP);
      if (L - c0 - c1 < 0.15) return;
      var a = dipAdd(P, u, c0), b = dipAdd(Q, u, -c1), n = [-u[1] * hw, u[0] * hw];
      s += ink(polyPath([[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]], true));
    });
    return s;
  }
};
