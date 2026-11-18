// 향 (Incense) — variant A: recognisability first.
// A slim incense boat lies on the ground; one stick is planted near its left end and leans out over it —
// a bare bamboo foot, then the coated body with a crisp, flat burning end (no bead). From that end a
// calligraphic thread of smoke rises: it opens from a hairline, swells as it sways, and dissolves into
// a grey wisp. The swings travel up the plume, its manner changes through the loop (lazy S, a still
// moment when the thread rises tall and slim, drifting lean), and once a loop the plume divides into
// two wisps that open like a Y and close again: usually one plume, now and then two.
var ICON = {
  id: "incense",
  frames: 64,
  at: function (t) { return incenseScene(t); }
};

var CFG = {
  // holder and stick
  th: 1.0,              // boat thickness: a thin holder (deck on y = 15, crisp at 2×)
  foot: 4.0,            // x where the stick's axis meets the deck
  ang: 32,              // stick lean above horizontal (deg)
  len: 8.1,             // stick length, deck → burning end
  w0: 1.4, w1: 1.3,     // coated body width at its lower / upper end
  bam: 1.6, wb: 1.0,    // bare bamboo foot above the deck: length, width
  footCut: 0.25,        // the foot is cut level this far below the deck, hidden inside the boat
  // smoke
  gap: 0.35,            // air between the burning end and the first visible smoke
  topY: 1.3,            // the smoke never rises above this
  L: 11,                // smoke length along its spine
  wmax: 1.7,            // widest smoke
  needle: 1.2,          // the smoke opens from a hairline over this length ...
  needleG: 0.9,         // ... with gently convex sides
  wk: [[0, 0.3], [0.4, 0.85], [0.5, 0.85], [0.66, 0.62], [0.82, 0.45], [1, 0]],  // width along the length
  nib: 30, pmin: 0.65,  // broad-nib contrast: nib angle (deg), finest stroke (fraction of full)
  inkTo: 0.6,           // solid below this fraction of the smoke's length, grey above
  tmax: 56,             // how far the smoke swings off vertical once fully developed (deg)
  t0: 0.6,              // the thread rises straight this far before it starts to sway
  tgrow: 0.5,           // the sway grows to full over this fraction of the length
  lam: 8.8,             // wavelength of the sway along the spine (pt)
  ph: 0,                // poster phase (cycles)
  lean: -18,            // the top of the plume leans left (deg) over the stick, balancing it
  calmSlim: 0.3,        // in the still moment the thread is this much slimmer
  // the occasional second plume
  forkU: 0.3,           // where the plume divides (fraction of its length)
  dlen: 1.6,            // the division opens fully over this length above the fork
  side: 1,              // the second wisp peels off to the right (1) or left (-1)
  dA: 20, dB: 10,       // how far each wisp turns away from the other above the fork (deg)
  shareA: 0.8, shareB: 0.62, // how much of the plume's weight each wisp carries
  calmSplit: 0.45,      // divided wisps sway this much less
  twinLen: 0.9,         // the second wisp's length (fraction of the plume)
  bph: 0.06             // ... and it sways a little out of step towards its end (cycles)
};

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────
// closed outline of a variable-width stroke along sampled spine points P with widths W
function _outline(P, W) {
  var L = [], R = [], n = P.length - 1;
  for (var i = 0; i <= n; i++) {
    var a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)];
    var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    var nx = -ty / tl, ny = tx / tl, hw = W[i] / 2;
    L.push([P[i][0] + nx * hw, P[i][1] + ny * hw]);
    R.push([P[i][0] - nx * hw, P[i][1] - ny * hw]);
  }
  return polyPath(L.concat(R.reverse()), true);
}
// smooth interpolation through [u, value] keys
function _keys(K, u) {
  if (u <= K[0][0]) return K[0][1];
  for (var i = 1; i < K.length; i++) if (u <= K[i][0]) return lerp(K[i - 1][1], K[i][1], smooth((u - K[i - 1][0]) / (K[i][0] - K[i - 1][0])));
  return K[K.length - 1][1];
}
function _radius(a, b, c) {
  var cr = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return cr < 1e-9 ? 1e9 : dist(a, b) * dist(b, c) * dist(c, a) / (2 * cr);
}
// a looping signal that is exactly 0 at t = 0, so frame 0 stays the designed poster
function _drift(t, seed, amp) { return amp * (noise(t, seed, 2) - noise(0, seed, 2)); }

// ── holder and stick ────────────────────────────────────────────────────────────────────────────
var DECK = 16 - CFG.th;
var SD = [Math.cos(CFG.ang * Math.PI / 180), -Math.sin(CFG.ang * Math.PI / 180)];
var SN = [-SD[1], SD[0]];                   // the stick's normal, pointing to its underside
function _at(s, o) { o = o || 0; return [CFG.foot + SD[0] * s + SN[0] * o, DECK + SD[1] * s + SN[1] * o]; }
var TIP = _at(CFG.len);

// a long low boat: a flat deck for the ash, a shallow hull resting on the ground line, the ends
// sweeping up into fine points
function boatPath() {
  var d = DECK;
  return 'M1.8 ' + f(d - 0.55) + 'C2.5 ' + f(d - 0.15) + ' 3.4 ' + f(d) + ' 4.6 ' + f(d) + 'L13.4 ' + f(d) +
    'C14.6 ' + f(d) + ' 15.5 ' + f(d - 0.15) + ' 16.2 ' + f(d - 0.55) +
    'C16.32 ' + f(d - 0.61) + ' 16.42 ' + f(d - 0.53) + ' 16.36 ' + f(d - 0.42) + 'C15.7 15.62 14.7 16 13.3 16L4.7 16' +
    'C3.3 16 2.3 15.62 1.64 ' + f(d - 0.42) + 'C1.58 ' + f(d - 0.53) + ' 1.68 ' + f(d - 0.61) + ' 1.8 ' + f(d - 0.55) + 'Z';
}

// a straight length of the stick between s0 and s1 with square ends, corners softened by r
function _rod(s0, s1, w0, w1, r) {
  var h0 = w0 / 2, h1 = w1 / 2;
  function p(s, o) { return _at(s, o).map(f).join(' '); }
  return 'M' + p(s0 + r, -h0) + 'L' + p(s1 - r, -h1) + 'Q' + p(s1, -h1) + ' ' + p(s1, -h1 + r) +
    'L' + p(s1, h1 - r) + 'Q' + p(s1, h1) + ' ' + p(s1 - r, h1) + 'L' + p(s0 + r, h0) +
    'Q' + p(s0, h0) + ' ' + p(s0, h0 - r) + 'L' + p(s0, -h0 + r) + 'Q' + p(s0, -h0) + ' ' + p(s0 + r, -h0) + 'Z';
}
// the stick: the bare bamboo foot runs down into the boat (cut level, out of sight below the deck);
// the coated body starts with a crisp shoulder and ends flat at the ember
function stickPath() {
  var yc = DECK + CFG.footCut, wb = CFG.wb;
  function sAtY(o) { return (yc - DECK - SN[1] * o) / SD[1]; }   // where an edge line reaches y = yc
  var top = CFG.bam + 0.3;
  var bamboo = polyPath([_at(sAtY(-wb / 2), -wb / 2), _at(top, -wb / 2), _at(top, wb / 2), _at(sAtY(wb / 2), wb / 2)], true);
  return ink(bamboo) + ink(_rod(CFG.bam, CFG.len, CFG.w0, CFG.w1, 0.1));
}

// ── smoke ───────────────────────────────────────────────────────────────────────────────────────
// Each wisp is a sine-generated curve: the direction of its spine swings about the vertical, more and
// more as it rises, and the swings travel up. Integrating the direction gives round, even bends — the
// way smoke (and rivers) meander — instead of the pointy crests of a sine wave in x.
var NS = 220;

// the air: how the plume behaves at time t (every term loops, and is the poster at t = 0)
function air(t) {
  var calm = bump(t, 0.12, 0.2, 0.28, 0.38);                    // a still moment: the thread rises tall ...
  return {
    tmax: CFG.tmax * (1 - 0.08 * calm) + _drift(t, 3, 6),
    t0: CFG.t0 + 1.4 * calm,
    grow: CFG.tgrow * (1 - 0.35 * calm),                         // ... curls sooner once it starts ...
    wide: 1 - CFG.calmSlim * calm,                               // ... and is slimmer
    lean: CFG.lean + _drift(t, 7, 9),                            // the air drifts
    a2: 0.16 + _drift(t, 11, 0.1)                                // a second, faster ripple
  };
}

// direction of the plume at arc length s (deg; -90 = straight up)
function thetaMain(s, t, A, dph, damp) {
  var u = s / CFG.L, amp = A.tmax * smooth((s - A.t0) / (CFG.L * A.grow)) * (1 - (damp || 0));
  var p1 = TAU * (s / CFG.lam - 2 * t + CFG.ph + (dph || 0));
  var p2 = TAU * (s / 4.6 - 3 * t + 0.3);
  return -90 + A.lean * u * u + amp * (Math.sin(p1) + A.a2 * Math.sin(p2));
}

// integrate a wisp from p0 along s0..s1 with direction fn(s) (deg)
function _trace(p0, s0, s1, fn) {
  var n = Math.max(2, Math.round(NS * (s1 - s0) / CFG.L)), ds = (s1 - s0) / n;
  var P = [p0.slice()], S = [s0], D = [fn(s0)], x = p0[0], y = p0[1];
  for (var i = 1; i <= n; i++) {
    var a = fn(s0 + (i - 0.5) * ds) * Math.PI / 180;
    x += Math.cos(a) * ds; y += Math.sin(a) * ds; P.push([x, y]); S.push(s0 + i * ds); D.push(fn(s0 + i * ds));
  }
  return { P: P, S: S, D: D };
}

// once a loop the plume divides: a fork runs down from the top, the two wisps open like a Y and rise
// side by side, then they close again from the bottom up
function split(t) {
  var sep = seg(t, 0.44, 0.64) * (1 - seg(t, 0.74, 0.93));
  return { sep: sep, fork: lerp(0.98, CFG.forkU, sep) * CFG.L };
}
// how far above the fork the division has opened (0 → 1)
function _div(x) { return smooth(x / CFG.dlen); }

// width of a wisp at arc length s (its length ends at sEnd): a hairline that opens with convex sides,
// a thread that fills as it sways, and a tail that thins to nothing
function _w(s, sEnd, A) {
  var open = Math.pow(Math.sin(Math.PI / 2 * clamp(s / CFG.needle)), CFG.needleG);
  return CFG.wmax * A.wide * open * _keys(CFG.wk, s / sEnd);
}
// ... with a broad-nib contrast: strokes running across the nib are full, strokes along it finer
function _width(s, dir, sEnd, A) {
  var nib = lerp(CFG.pmin, 1, Math.abs(Math.sin((dir - CFG.nib) * Math.PI / 180)));
  return _w(s, sEnd, A) * lerp(1, nib, smooth((s - 0.8) / 2.4));
}
// soften the width along a wisp (a short moving average that leaves both pointed ends alone)
function _soften(W, r) {
  var out = [];
  for (var i = 0; i < W.length; i++) {
    var rr = Math.min(r, i, W.length - 1 - i), sum = 0, n = 0;
    for (var j = i - rr; j <= i + rr; j++) { sum += W[j]; n++; }
    out.push(sum / n);
  }
  return out;
}

function smoke(t) {
  var A = air(t), Z = split(t), src = [TIP[0] + 0.03, TIP[1] - CFG.gap], sf = Z.fork, sep = Z.sep;
  function g(s) { return s > sf ? _div(s - sf) : 0; }
  // the plume; above a fork it sways a little less and turns a little away from the second wisp
  var C = _trace(src, 0, CFG.L, function (s) {
    return thetaMain(s, t, A, 0, CFG.calmSplit * sep * g(s)) - CFG.side * sep * CFG.dA * g(s);
  });
  var wisps = [{ T: C, end: CFG.L, share: function (s) { return 1 - (1 - CFG.shareA) * sep * g(s); } }];
  // keep the plume under the top line: shrink it about its source if it rose too high (positions
  // only; the stroke widths stay as designed)
  var minY = Infinity;
  C.P.forEach(function (p) { minY = Math.min(minY, p[1]); });
  var k = minY < CFG.topY ? (src[1] - CFG.topY) / (src[1] - minY) : 1;
  if (sep > 0.002) {
    // the second wisp peels off one edge of the plume at the fork and turns away to that side; it
    // grows from nothing, so its outer edge leaves the plume's outline without a step
    var n = C.P.length - 1, iF = Math.max(1, Math.min(n - 3, Math.round(sf / CFG.L * n)));
    var d = C.D[iF] * Math.PI / 180, half = _width(C.S[iF], C.D[iF], CFG.L, A) / 2 / k;
    var p0 = [C.P[iF][0] - CFG.side * Math.sin(d) * half, C.P[iF][1] + CFG.side * Math.cos(d) * half];
    var endB = CFG.L * CFG.twinLen;
    var B = _trace(p0, C.S[iF], endB, function (s) {
      return thetaMain(s, t, A, CFG.bph * sep * smooth((s - sf) / 5), CFG.calmSplit * sep * g(s)) + CFG.side * sep * CFG.dB * g(s);
    });
    wisps.push({ T: B, end: endB, share: function (s) { return CFG.shareB * smooth((s - sf) / CFG.dlen) * smooth(sep / 0.25); } });
  }
  var solid = '', grey = '', sCut = CFG.inkTo * CFG.L;
  wisps.forEach(function (w) {
    var P = w.T.P.map(function (p) { return [src[0] + (p[0] - src[0]) * k, src[1] + (p[1] - src[1]) * k]; });
    var W = w.T.S.map(function (s, i) { return _width(s, w.T.D[i], w.end, A) * w.share(s); });
    // never wider than a bend allows (no folded inner edges), then soften
    for (var q = 4; q < P.length - 4; q++) W[q] = Math.min(W[q], 1.6 * _radius(P[q - 4], P[q], P[q + 4]));
    W = _soften(_soften(W, 4), 4);
    // solid below inkTo of the plume's length, grey above; the grey starts a hair early, under the
    // solid, so no seam shows between them
    var ci = 0;
    while (ci < w.T.S.length - 1 && w.T.S[ci] < sCut) ci++;
    if (ci > 1) solid += ink(_outline(P.slice(0, ci + 1), W.slice(0, ci + 1)));
    var g0 = Math.max(0, ci - 2);
    if (P.length - g0 > 2) grey += _outline(P.slice(g0), W.slice(g0));
  });
  // all grey in one path, so where two wisps overlap the grey does not double up
  return solid + (grey ? fade(grey) : '');
}

function incenseScene(t) {
  return ink(boatPath()) + stickPath() + smoke(t);
}
