// 옆에서 나오는 패널 (Side peek) — variant A · recognizability first
//
// Layerhover's own action: the Figma layers panel slides out from behind the screen's left edge, stays, then
// slides back behind it. What makes it read instantly, in order:
//   1. The screen edge — a crisp 1 pt slab (architectural 0.25 radius, not a round-capped stick), 15 pt tall so
//      it clearly runs past the panel at both ends.
//   2. A floating panel tucked BEHIND that edge — a clean 1 pt slot separates them; the free side has continuous
//      (squircle) corners like Figma UI3's floating panels; sidebar proportions (10 × 11, taller than wide).
//   3. A Figma layer tree carved into it — a frame '#' (Figma's own frame glyph) with its name, then two children
//      indented 1.5 pt: a text layer 'T' and a rectangle layer, each with a name of a different length.
// Everything sits on the 2x pixel grid (edges on 0.5 pt): the '#' has a 1.0 pt open centre and its inner stroke
// edges on whole pixels, name lines are 1.0 pt (2 px) tall, the content block has equal 1.5 pt padding.
//
// Motion (48 frames, 6 s): hold (the poster) → slides back with ease-in, content clipped by the panel's inner
// padding so the silhouette never breaks into a comb → hidden briefly → the panel PEEKS out as a small rounded
// tab and hesitates (anticipation) → launches with ease-out and a slight overshoot → the rows cascade in one after
// another and settle a moment later (follow-through) → hold. Seamless.

var FR = 48;

var P = {
  bar: { x0: 3.0, x1: 4.0, y0: 1.5, y1: 16.5, r: 0.25 },   // the screen edge
  gap: 1.0,                                                // slot: the panel runs behind the edge
  pad: 1.0,                                                // content is clipped this far inside the panel's visible edge
  panel: { y0: 3.5, y1: 14.5, R: 15.0, r: 2.0 },          // R = free (right) edge when fully out
  rows: [   // g = layer glyph at x (left), y (centre), size z; its name line from lx, length len
    { g: 'frame', x: 6.5, y: 6.0, z: 3.0, lx: 10.5, len: 3.0 },
    { g: 'text', x: 8.0, y: 9.5, z: 2.0, lx: 11.0, len: 2.0 },
    { g: 'rect', x: 8.0, y: 12.5, z: 2.0, lx: 11.0, len: 2.5 }
  ],
  lineH: 1.0
};

// ── shapes ───────────────────────────────────────────────────────────────
// continuous (squircle-like) rounded rect, radii [tl, tr, br, bl]: each corner curve starts 1.4 r from the
// corner with long handles, so the straight edge flows into the curve (no visible tangent break at 8x)
function contRect(x0, y0, x1, y1, rs) {
  function A(r) { return Math.min(r * 1.4, (x1 - x0) / 2, (y1 - y0) / 2); }
  var a, h, d = '';
  a = A(rs[0]); d += 'M' + f(x0 + a) + ' ' + f(y0);
  a = A(rs[1]); h = a * 0.762;
  d += 'L' + f(x1 - a) + ' ' + f(y0) + 'C' + f(x1 - a + h) + ' ' + f(y0) + ' ' + f(x1) + ' ' + f(y0 + a - h) + ' ' + f(x1) + ' ' + f(y0 + a);
  a = A(rs[2]); h = a * 0.762;
  d += 'L' + f(x1) + ' ' + f(y1 - a) + 'C' + f(x1) + ' ' + f(y1 - a + h) + ' ' + f(x1 - a + h) + ' ' + f(y1) + ' ' + f(x1 - a) + ' ' + f(y1);
  a = A(rs[3]); h = a * 0.762;
  d += 'L' + f(x0 + a) + ' ' + f(y1) + 'C' + f(x0 + a - h) + ' ' + f(y1) + ' ' + f(x0) + ' ' + f(y1 - a + h) + ' ' + f(x0) + ' ' + f(y1 - a);
  a = A(rs[0]); h = a * 0.762;
  d += 'L' + f(x0) + ' ' + f(y0 + a) + 'C' + f(x0) + ' ' + f(y0 + a - h) + ' ' + f(x0 + a - h) + ' ' + f(y0) + ' ' + f(x0 + a) + ' ' + f(y0);
  return d + 'Z';
}

// Figma layer-type glyphs, carved; (x, yc) = left edge and vertical centre, z = size. Returns an array of paths.
function glyphPaths(kind, x, yc, z) {
  var h = z / 2;
  if (kind === 'frame') {   // '#': 0.6 strokes whose centres sit 0.7 in → 1.0 open centre, inner edges on whole 2x pixels
    var w = 0.6, o = 0.7, y0 = yc - h;
    return [rectPath(x + o - w / 2, y0, w, z, 0), rectPath(x + z - o - w / 2, y0, w, z, 0),
      rectPath(x, y0 + o - w / 2, z, w, 0), rectPath(x, y0 + z - o - w / 2, z, w, 0)];
  }
  if (kind === 'text') {    // 'T': 0.6 strokes, centred stem
    var tw = 0.6, sx = x + h + tw / 2, ty = yc - h;
    return [polyPath([[x, ty], [x + z, ty], [x + z, ty + tw], [sx, ty + tw],
      [sx, yc + h], [sx - tw, yc + h], [sx - tw, ty + tw], [x, ty + tw]], true)];
  }
  return [rectPath(x, yc - h, z, z, z * 0.18)];   // rectangle layer
}
// how far a glyph may slide under the inner padding before it is dropped whole (no debris of half-cut strokes)
var GLYPH_KEEP = { frame: 0.4, text: 0.6, rect: 2.0 };

// Content is clipped at xm, the panel's inner padding next to the slot, so a row sliding under the screen edge
// never notches the panel's silhouette; a carved part left narrower than 0.6 pt is dropped.
function clipCut(d, fn, xm) {
  var d2 = tp(d, fn), maxX = -1e9;
  tp(d2, function (x, y) { if (x > maxX) maxX = x; return [x, y]; });
  if (maxX < xm + 0.6) return '';
  return cut(d2, function (x, y) { return [Math.max(x, xm), y]; });
}

// ── timing (T in frames, 0..48) ──────────────────────────────────────────
var TM = { holdEnd: 12, inEnd: 23, peek0: 27, peek1: 30, launch: 32, outEnd: 44 };
var PEEK = 2.2;   // how far the panel peeks out before it launches
var BACK = 1.3;   // overshoot of the launch (easeOutBack)
var PARK = 1.0;   // during the peek the rows wait this far behind, so the tab is a clean rounded shape
var STAGGER = 0.7;   // frames between the rows of the cascade
function easeInQ(x) { var c = clamp(x); return c * c; }
function travel() { return P.panel.R - (P.bar.x1 + P.gap - 0.2); }   // hidden: the free edge sits inside the slot
// panel offset: 0 = fully out, -travel() = hidden behind the edge
function X(T) {
  var D = travel();
  if (T < TM.holdEnd) return 0;
  if (T < TM.inEnd) return -D * easeInQ((T - TM.holdEnd) / (TM.inEnd - TM.holdEnd));          // slides back, ease-in
  if (T < TM.peek0) return -D;                                                                  // hidden
  if (T < TM.peek1) return -D + PEEK * easeOut((T - TM.peek0) / (TM.peek1 - TM.peek0));        // peeks out
  if (T < TM.launch) return -D + PEEK;                                                          // hesitates
  if (T < TM.outEnd) return lerp(-D + PEEK, 0, easeOutBack((T - TM.launch) / (TM.outEnd - TM.launch), BACK));
  return 0;
}
// row offset: rigid with the panel on the way back; on the way out the rows follow on the same curve, one after
// another, and overshoot a moment after the panel (follow-through)
function rowX(T, i) {
  var D = travel();
  if (T < TM.inEnd) return X(T);
  if (T < TM.launch) return -D + PEEK - PARK;
  var u = (T - TM.launch - STAGGER * (i + 1)) / (TM.outEnd - TM.launch);
  return u <= 0 ? -D + PEEK - PARK : lerp(-D + PEEK - PARK, 0, easeOutBack(u, BACK));
}

var ICON = {
  id: "peek",
  frames: FR,
  at: function (t) {
    var T = t * FR;
    var R = P.panel.R + X(T), left = P.bar.x0 + 0.25;   // the panel's hidden end stays under the edge
    var xm = P.bar.x1 + P.gap + P.pad;
    var s = ink(contRect(left, P.panel.y0, Math.max(R, left + 0.1), P.panel.y1, [0, P.panel.r, P.panel.r, 0]));
    for (var i = 0; i < P.rows.length; i++) {
      var r = P.rows[i], dx = rowX(T, i), mv = move(dx, 0);
      var parts = [rectPath(r.lx, r.y - P.lineH / 2, r.len, P.lineH, 0.2)];
      if (r.x + dx >= xm - GLYPH_KEEP[r.g]) parts = parts.concat(glyphPaths(r.g, r.x, r.y, r.z));
      for (var j = 0; j < parts.length; j++) s += clipCut(parts[j], mv, xm);
    }
    s += cut(rectPath(P.bar.x1, 0, P.gap, 18, 0));   // the slot
    s += front(rectPath(P.bar.x0, P.bar.y0, P.bar.x1 - P.bar.x0, P.bar.y1 - P.bar.y0, P.bar.r));   // the edge
    return s;
  }
};
