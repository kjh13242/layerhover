// 옆에서 나오는 패널 (Side peek) — variant B, "elegance first".
// The Figma layers panel slides out from the screen's left edge, stays, then slides back behind the edge.
//
// Drawing: the screen's left edge is drawn as the display itself sees it — a calligraphic bracket whose
// stem is the bezel and whose rounded corners run into the top and bottom edges, thinning away to the
// right (thick → thin). Out of it comes a crisp Figma panel: square where it hides behind the edge, Figma's
// smoothed corners (60 %) on the free side. Inside, the layer tree is carved as negative space — a frame,
// an instance inside it, a text inside that — each a step further in, so the glyphs fall in one diagonal
// and the names end on one right edge.
// Motion (48 frames): hold 2 s · slides back behind the edge with ease-in, the layers draining away just
// ahead of it · hidden · the panel's edge peeks out — a ")" answering the bracket's "(" — and waits ·
// slides out with ease-out and a slight overshoot while the three layers follow one after another down
// the tree, overshoot a touch more and settle. The bracket never moves.

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

// ── the screen edge: a calligraphic bracket ───────────────────────────────────────────────────────
// Outer contour: straight bezel, round display corners (radius Ro), straight top and bottom edges.
// Inner contour: one smooth curve per corner from the bezel to the arm's tip, so the stroke thins
// continuously from W (the bezel) to TW (the tip).
function bracket(B) {
  var X = B.x, Y0 = B.y0, Y1 = B.y1, W = B.w, Ro = B.ro, Ri = B.ri, TX = B.tx, TW = B.tw;
  var k = 0.5523, tr = 0.3, xi = X + W, cy0 = Y0 + W + Ri, cy1 = Y1 - W - Ri, L = TX - xi;
  return 'M' + P([TX - tr, Y0]) + 'L' + P([X + Ro, Y0]) +
    'C' + P([X + Ro * (1 - k), Y0]) + ' ' + P([X, Y0 + Ro * (1 - k)]) + ' ' + P([X, Y0 + Ro]) +
    'L' + P([X, Y1 - Ro]) +
    'C' + P([X, Y1 - Ro * (1 - k)]) + ' ' + P([X + Ro * (1 - k), Y1]) + ' ' + P([X + Ro, Y1]) +
    'L' + P([TX - tr, Y1]) + 'Q' + P([TX, Y1]) + ' ' + P([TX, Y1 - tr]) +
    'L' + P([TX, Y1 - TW + 0.15]) + 'Q' + P([TX, Y1 - TW]) + ' ' + P([TX - 0.2, Y1 - TW]) +
    'C' + P([xi + L * 0.42, Y1 - TW - 0.08]) + ' ' + P([xi, cy1 + Ri * 0.75]) + ' ' + P([xi, cy1]) +
    'L' + P([xi, cy0]) +
    'C' + P([xi, cy0 - Ri * 0.75]) + ' ' + P([xi + L * 0.42, Y0 + TW + 0.08]) + ' ' + P([TX - 0.2, Y0 + TW]) +
    'Q' + P([TX, Y0 + TW]) + ' ' + P([TX, Y0 + TW - 0.15]) +
    'L' + P([TX, Y0 + tr]) + 'Q' + P([TX, Y0]) + ' ' + P([TX - tr, Y0]) + 'Z';
}

// ── layer-type glyphs (Figma: frame ▢, instance ◆, text T) ────────────────────────────────────────
function glyphFrame(cx, cy, s, w) {           // hollow square: outer contour clockwise, inner counter-clockwise
  var o = s / 2, i = o - w;
  return box(cx - o, cy - o, cx + o, cy + o, 0.3) +
    'M' + P([cx - i, cy - i]) + 'L' + P([cx - i, cy + i]) + 'L' + P([cx + i, cy + i]) + 'L' + P([cx + i, cy - i]) + 'Z';
}
function glyphInstance(cx, cy, r) {
  var k = 0.16;
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
function nameLine(x0, x1, cy, h) { return box(x0, cy - h / 2, x1, cy + h / 2, 0.3); }

// ── geometry (pt; dominant edges on the 0.5 grid) ─────────────────────────────────────────────────
var EDGE = { x: 3.0, w: 1.5, y0: 1.5, y1: 16.5, ro: 3.5, ri: 2.0, tx: 7.5, tw: 0.9 };   // tx ≥ x + ro + 0.3
var CLIP = EDGE.x + EDGE.w + 1.0;                      // the panel is seen right of this line (gap 1.0)
var PANEL = { x1: 15.0, y0: 4.0, y1: 14.0, R: 2.5, xi: 0.6 };
var X0 = CLIP + 1.0;                                   // content margin
var NAME_END = 13.5;                                   // every layer name ends on this edge
var ROWS = [                                           // the tree: frame ▸ instance ▸ text, one step in each
  { y: 6.0, ind: 0.0, glyph: function (x, y) { return glyphFrame(x + 1.0, y, 2.0, 0.6); } },
  // the diamond's centre sits on a half pixel at 2× so it renders as a true 1·3·5·3·1 diamond, not a blob
  { y: 9.0, ind: 1.0, glyph: function (x, y) { return glyphInstance(x + 1.25, y + 0.25, 1.25); } },
  { y: 12.0, ind: 2.0, glyph: function (x, y) { return glyphText(x + 1.0, y, 2.0, 2.0, 0.7); } }
];

function panel(dx) {
  return ink(fsRect(CLIP - 6 + dx, PANEL.y0, PANEL.x1 - CLIP + 6, PANEL.y1 - PANEL.y0, [0, PANEL.R, PANEL.R, 0], PANEL.xi));
}
function row(i, dx) {
  var r = ROWS[i], x = X0 + r.ind + dx;
  return cut(r.glyph(x, r.y)) + cut(nameLine(x + 3.0, NAME_END + dx, r.y, 1.0));
}

// ── timing (48 frames, 6 s at 8 fps) ──────────────────────────────────────────────────────────────
var N = 48;
var TRAVEL = (PANEL.x1 - CLIP) + 0.5;                  // panel fully behind the edge
var PEEK = 2.0;                                        // how much of the panel's edge shows at the peek
var PEEK_X = PEEK - (PANEL.x1 - CLIP);                 // panel offset at the peek
var F = { leave: 12, gone: 21, peek0: 27, peek1: 30, come: 32, over: 8, settle: 4 };   // frames
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
// they drain away in the fast part of the move and the panel's last sliver leaves clean.
function leave(fr, ahead) { return -TRAVEL * easeInPow((fr - F.leave) / (F.gone - F.leave - (ahead || 0)), 2.2); }
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

// The layers live inside the panel's content area: they slide under its 1 pt left margin rather than
// being sliced against the screen edge, so the ink beside the edge never thins below the margin.
// (Only while the panel is wide enough that the margin stays clear of its smoothed corners.)
function margin(dx) {
  var seen = PANEL.x1 + dx - CLIP;                     // visible width of the panel
  return seen >= 4.4 ? front(box(CLIP, PANEL.y0, X0, PANEL.y1)) : '';
}

var ICON = {
  id: "peek",
  frames: N,
  at: function (t) {
    var fr = t * N, px = panelX(fr), s = panel(px);
    for (var i = 0; i < ROWS.length; i++) s += row(i, rowX(i, fr));
    return s + cut(box(-10, -10, CLIP, 30)) + margin(px) + front(bracket(EDGE));
  }
};
