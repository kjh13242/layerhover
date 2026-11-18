// 옆에서 나오는 패널 (Side peek) — final, built on variant B.
// The Figma layers panel slides out from the screen's left edge, stays, then slides back behind the edge.
//
// Drawing: the screen's left edge is a crisp 1 pt bezel bar on whole pixels at 2×. Out of it comes a Figma
// floating panel: square where it hides behind the edge, Figma's smoothed corners (60 %) on the free side.
// Inside, the layer tree is carved as negative space — a frame, an instance inside it, a text inside that —
// each a step further in, so the glyphs fall in one diagonal and the names end on one right edge.
// Motion (48 frames): hold · the layers retire one row at a time, top to bottom, and the empty panel
// slides back behind the edge with ease-in · hidden · the panel's edge peeks out — a ")" beside the
// edge — and waits · slides out with ease-out and a slight overshoot while the three layers follow
// one after another down the tree and settle. The edge never moves.
// Clean frames: a glyph is whole or absent, a name is clipped flat at the content margin and never shows
// less than 1 pt, so no frame carries half-cut debris.

// ── local helpers ─────────────────────────────────────────────────────────────────────────────────
function rad(d) { return d * Math.PI / 180; }
function P(q) { return f(q[0]) + ' ' + f(q[1]); }

// Figma "corner smoothing" (the squircle Figma draws), for one corner in local (s, t):
// s runs along the incoming edge (corner at 0), t along the outgoing edge.
function fsCorner(R, xi) {
  var p = (1 + xi) * R, m = 90 * (1 - xi);
  var arcLen = Math.sin(rad(m / 2)) * R * Math.SQRT2;
  var alpha = (90 - m) / 2, p34 = R * Math.tan(rad(alpha / 2)), beta = 45 * xi;
  var c = p34 * Math.cos(rad(beta)), d = c * Math.tan(rad(beta));
  var b = (p - arcLen - c - d) / 3, a = 2 * b;
  var th0 = rad(-45 - m / 2), th1 = rad(-45 + m / 2), k = 4 / 3 * Math.tan(rad(m) / 4) * R;
  var A0 = [-R + R * Math.cos(th0), R + R * Math.sin(th0)];
  var A3 = [-R + R * Math.cos(th1), R + R * Math.sin(th1)];
  var A1 = [A0[0] - k * Math.sin(th0), A0[1] + k * Math.cos(th0)];
  var A2 = [A3[0] + k * Math.sin(th1), A3[1] - k * Math.cos(th1)];
  return { p: p, curves: [
    [[-p + a, 0], [-p + a + b, 0], A0],
    [A1, A2, A3],
    [[A3[0] + d, A3[1] + c], [A3[0] + d, A3[1] + b + c], [0, p]]
  ] };
}
// one corner placed in the world, traversed clockwise: incoming direction U, outgoing V
function corner(cx, cy, U, V, R, xi) {
  var k = fsCorner(R, xi);
  function W(q) { return [cx + q[0] * U[0] + q[1] * V[0], cy + q[0] * U[1] + q[1] * V[1]]; }
  return { start: W([-k.p, 0]), segs: k.curves.map(function (cv) { return [W(cv[0]), W(cv[1]), W(cv[2])]; }) };
}
function cornerStr(cs) { return 'L' + P(cs.start) + cs.segs.map(function (s) { return 'C' + P(s[0]) + ' ' + P(s[1]) + ' ' + P(s[2]); }).join(''); }
// rectangle with Figma-smoothed corners, radii [tl, tr, br, bl] (0 = square)
function fsRect(x, y, w, h, radii, xi) {
  var C = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  var U = [[0, -1], [1, 0], [0, 1], [-1, 0]], V = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  var d = 'M' + P([x + (radii[0] > 0 ? fsCorner(radii[0], xi).p : 0), y]);
  [1, 2, 3, 0].forEach(function (i) { d += radii[i] > 0 ? cornerStr(corner(C[i][0], C[i][1], U[i], V[i], radii[i], xi)) : 'L' + P(C[i]); });
  return d + 'Z';
}
function box(x0, y0, x1, y1, r) { return rectPath(x0, y0, x1 - x0, y1 - y0, r || 0); }

// ── the screen edge ──────────────────────────────────────────────────────────────────────────────
// the screen's edge: a crisp bezel bar on whole points, 1 pt wide, barely softened corners
function edgeBar(E) { return rectPath(E.x, E.y0, E.w, E.y1 - E.y0, E.r); }

// ── layer-type glyphs (Figma: frame ▣, instance ◆, text T), all on the 0.5 grid ───────────────────
// frame: a 2 × 2 square with 0.5 walls around a 1 × 1 core — each wall is one whole pixel at 2×.
function glyphFrame(x0, y0) {
  return box(x0, y0, x0 + 2.0, y0 + 2.0, 0.3) +          // outer contour, clockwise
    'M' + P([x0 + 0.5, y0 + 0.5]) + 'L' + P([x0 + 0.5, y0 + 1.5]) + 'L' + P([x0 + 1.5, y0 + 1.5]) + 'L' + P([x0 + 1.5, y0 + 0.5]) + 'Z';
}
// instance: a diamond with crisp (barely blunted) tips; its centre sits on a half pixel at 2× so it
// renders as a true 1·3·5·3·1 diamond, not a blob
function glyphInstance(cx, cy, r) {
  var k = 0.08;
  return 'M' + P([cx - k, cy - r + k]) + 'Q' + P([cx, cy - r]) + ' ' + P([cx + k, cy - r + k]) +
    'L' + P([cx + r - k, cy - k]) + 'Q' + P([cx + r, cy]) + ' ' + P([cx + r - k, cy + k]) +
    'L' + P([cx + k, cy + r - k]) + 'Q' + P([cx, cy + r]) + ' ' + P([cx - k, cy + r - k]) +
    'L' + P([cx - r + k, cy + k]) + 'Q' + P([cx - r, cy]) + ' ' + P([cx - r + k, cy - k]) + 'Z';
}
function glyphText(cx, cy, w, h, st) {
  var x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, e = 0.12;
  return 'M' + P([x0, y0 + e]) + 'Q' + P([x0, y0]) + ' ' + P([x0 + e, y0]) + 'L' + P([x1 - e, y0]) + 'Q' + P([x1, y0]) + ' ' + P([x1, y0 + e]) +
    'L' + P([x1, y0 + st]) + 'L' + P([cx + st / 2, y0 + st]) + 'L' + P([cx + st / 2, y1 - e]) + 'Q' + P([cx + st / 2, y1]) + ' ' + P([cx + st / 2 - e, y1]) +
    'L' + P([cx - st / 2 + e, y1]) + 'Q' + P([cx - st / 2, y1]) + ' ' + P([cx - st / 2, y1 - e]) + 'L' + P([cx - st / 2, y0 + st]) +
    'L' + P([x0, y0 + st]) + 'Z';
}
// a layer name: 1 pt tall, 0.3 ends; `flat` squares the left end where the content margin clips it
function nameLine(x0, x1, cy, flat) { var r = 0.3; return rectPath(x0, cy - 0.5, x1 - x0, 1.0, [flat ? 0 : r, r, r, flat ? 0 : r]); }

// ── geometry (pt; dominant edges on the 0.5 grid) ─────────────────────────────────────────────────
var EDGE = { x: 3.5, w: 1.0, y0: 2.0, y1: 16.0, r: 0.3 };
var CLIP = EDGE.x + EDGE.w + 1.0;                      // the panel is seen right of this line (gap 1.0)
var PANEL = { x1: 14.5, y0: 4.0, y1: 14.0, R: 2.0, RL: 1.5, xi: 0.6 };
var X0 = CLIP + 1.0;                                   // content margin: nothing is carved left of it
var NAME_END = 13.5;                                   // every layer name ends on this edge
var ROWS = [                                           // the tree: frame ▸ instance ▸ text, one step in each
  { y: 6.0, ind: 0.0, glyph: function (x, y) { return glyphFrame(x, y - 1.0); } },
  // the diamond sits 0.25 high so its bottom tip clears the T by a full 1.0
  { y: 9.0, ind: 1.0, glyph: function (x, y) { return glyphInstance(x + 1.25, y - 0.25, 1.25); } },
  { y: 12.0, ind: 2.0, glyph: function (x, y) { return glyphText(x + 1.0, y, 2.0, 2.0, 0.7); } }
];
var GLYPH_TOL = 0.15;                                  // a glyph shows only while (almost) whole
var NAME_MIN = 1.0;                                    // a name shows only while at least this much is seen

function panel(dx) {
  return ink(fsRect(CLIP + dx, PANEL.y0, PANEL.x1 - CLIP, PANEL.y1 - PANEL.y0, [PANEL.RL, PANEL.R, PANEL.R, PANEL.RL], PANEL.xi));
}
// one layer row at offset dx. Leaving, the row retires as a unit (glyph and name on the same frame);
// arriving, the name may lead, clipped flat at the margin, and the glyph appears only whole.
function row(i, dx, leaving) {
  var r = ROWS[i], x = X0 + r.ind + dx, s = '';
  var whole = x >= X0 - GLYPH_TOL;
  if (whole) s += cut(r.glyph(Math.max(x, X0), r.y));
  else if (leaving) return '';
  var n0 = x + 3.0, n1 = NAME_END + dx, a = Math.max(n0, X0);
  if (n1 - a >= NAME_MIN) s += cut(nameLine(a, n1, r.y, n0 < X0));
  return s;
}

// ── timing (48 frames, 6 s at 8 fps) ──────────────────────────────────────────────────────────────
var N = 48;
var TRAVEL = (PANEL.x1 - CLIP) + 0.5;                  // panel fully behind the edge
var PEEK = 2.0;                                        // how much of the panel's edge shows at the peek
var PEEK_X = PEEK - (PANEL.x1 - CLIP);                 // panel offset at the peek
var F = { leave: 15, gone: 23, peek0: 25, peek1: 28, come: 30, over: 8, settle: 4 };   // frames
var LAG = [0.7, 1.0, 1.3];                             // the layers trail the panel, a little more down the tree
var OVER = 0.55, OVER_ROW = 0.75;                      // overshoot of the panel and of the layers

function easeInPow(x, p) { return Math.pow(clamp(x), p); }
// arrive: ease-out to a slight overshoot, then a soft return home (velocity stays continuous)
function arrive(fr, f0, from, over) {
  if (fr <= f0) return from;
  if (fr <= f0 + F.over) return lerp(from, over, easeOut((fr - f0) / F.over));
  if (fr <= f0 + F.over + F.settle) return lerp(over, 0, smooth((fr - f0 - F.over) / F.settle));
  return 0;
}
// leaving: ease-in. The layers use the same curve but arrive behind the edge a little sooner (ahead), so
// they retire in the first, slow part of the move and the panel's last sliver leaves clean.
function leave(fr, ahead) { return -TRAVEL * easeInPow((fr - F.leave) / (F.gone - F.leave - (ahead || 0)), 2.0); }
var AHEAD = 1.2;                                       // frames
function panelX(fr) {
  if (fr <= F.leave) return 0;
  if (fr <= F.gone) return leave(fr);
  if (fr <= F.peek0) return -TRAVEL;
  if (fr <= F.come) return lerp(-TRAVEL, PEEK_X, easeOut((fr - F.peek0) / (F.peek1 - F.peek0)));
  return arrive(fr, F.come, PEEK_X, OVER);
}
var ROW_WAIT = CLIP - NAME_END - 0.1;                  // during the peek the names wait just behind the edge
function rowX(i, fr) {
  if (fr <= F.gone) return leave(fr, AHEAD);           // 0 before F.leave
  if (fr <= F.come + LAG[i]) return Math.min(ROW_WAIT, panelX(fr));
  return arrive(fr, F.come + LAG[i], ROW_WAIT, OVER_ROW);
}

var ICON = {
  id: "peek",
  frames: N,
  at: function (t) {
    var fr = t * N, px = panelX(fr), s = panel(px), leaving = fr > F.leave && fr <= F.gone;
    for (var i = 0; i < ROWS.length; i++) s += row(i, Math.min(rowX(i, fr), px + 0.15), leaving);
    return s + cut(box(-10, -10, CLIP, 30)) + front(edgeBar(EDGE));
  }
};
