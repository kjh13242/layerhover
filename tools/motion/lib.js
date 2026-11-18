// Layerhover menu bar icons — shared drawing kit for motion scripts.
// The same code runs in tools/bin/motion-lab (local preview) and in the Figma import, so both give the same result.
// Plain ES2017, no imports; every helper is a global function.
//
// ── Icon file contract: tools/motion/icons/<id>.js ───────────────────────────────────────────────
//   var ICON = {
//     id: "leaf",
//     frames: 40,                  // 32–64 frames, played at 8 fps (a 4–8 s loop)
//     at: function (t) {           // t in [0, 1): frame i uses t = i / frames. Frame 0 is the still/poster.
//       return ink(...) + cut(...) + front(...) + fade(...);    // elements in an 18 × 18 pt viewBox
//     }
//   };
//   Put helper functions for the icon in the same file (they stay private to the icon).
//
// ── How layers combine (identical in Figma and motion-lab) ───────────────────────────────────────
//   shape = union(all ink) − union(all cut) + union(all front);   then fade is drawn on top at 50 %.
//   ink(d)    solid shape
//   cut(d)    negative space carved out of everything inked (details, folds, separations)
//   front(d)  solid shape added AFTER the cuts. Pair it with cutAround(d, gap) to place a part in front
//             of another with a clean gap: cutAround(petal, 0.8) + front(petal). (alias: top)
//   fade(d)   translucent 50 %, never cut (smoke tails, far things). There is one opacity level only.
//   Lines: hairline / cutLine / fadeLine / frontLine are constant-width round-capped strokes. Use them ONLY
//   for things that really are lines (fishing line, star links) or to carve a thin negative-space detail.
//   Every body part, stem, limb, rod, tail or wisp must be a FILLED shape: ribbon(), petal() or your own path.
//
// ── Paths ────────────────────────────────────────────────────────────────────────────────────────
//   Path strings accept M L H V C S Q T Z, absolute or relative. Arcs (A) are not supported: use circlePath,
//   ellipsePath or arcPts.
//   tp(d, fn)                transform every point of a path with fn(x, y) → [x, y]
//   xf(fn, svg)              transform every element of an SVG snippet (stroke widths are not scaled)
//   morph(a, b, k)           blend two paths with the same command structure (k = 0 → a, 1 → b)
//   morphKeys([p0, p1, ...], k)   blend through several key paths, k from 0 to 1 across the list
//   smoothPath(pts, closed, tension)   smooth curve through points (Catmull-Rom → cubic Béziers)
//   polyPath(pts, closed)    straight segments
//   circlePath(cx, cy, r)    ellipsePath(cx, cy, rx, ry, deg)    rectPath(x, y, w, h, r | [tl, tr, br, bl])
//   ribbon(spine, width, opts)        variable-width filled stroke along a smooth curve through `spine`
//                                     width: number | [w per spine point] | function(s) with s = 0..1 along it
//                                     opts.caps: [start, end], each 'flat' (default) | 'round'
//                                     A width that reaches 0 at an end gives a sharp tapered point.
//   petal(x, y, len, wid, deg, opts)  leaf / petal / tepal / flame from (x, y) pointing at deg
//                                     (0 = right, -90 = up). opts: peak (0..1, where it is widest, 0.45),
//                                     tip 'point' | 'round', base (0..1 width at the base), bend (pt, + = left),
//                                     fat (1 = default; > 1 fuller shoulders, < 1 slimmer)
//   sparkle(cx, cy, r, opts)          star with concave sides ✦. opts: rays (4), inner (0.22 = depth of the
//                                     sides), rot (deg), long (ratio of every second ray, e.g. 0.55)
//   star(cx, cy, r, inner, points, rot)   classic pointed star polygon
//   arcPts(cx, cy, r, a0, a1, n)      points on an arc (degrees; 0 = right, 90 = down)
//
// ── Point transforms (functions (x, y) → [x, y]) ─────────────────────────────────────────────────
//   rot(cx, cy, deg, dx, dy)   move(dx, dy)   scaleAt(cx, cy, sx, sy)   chain(f1, f2, ...) (applied in order)
//   bend(x0, y0, x1, y1, deflect)   bends everything along the axis (x0,y0)→(x1,y1) sideways by deflect·s²
//                                   (s = 0 at the root, 1 at the tip; + = to the left of the axis direction)
//
// ── Timing (t in 0..1) ───────────────────────────────────────────────────────────────────────────
//   smooth, smoother, easeIn, easeOut, easeInOut, easeOutBack(x, s)
//   seg(t, a, b, ease)          0 → 1 while t goes a → b
//   bump(t, a, b, c, d, ease)   rises a → b, holds, falls c → d
//   pulse(t, a, b)              one smooth 0 → 1 → 0 between a and b
//   loop(t, cycles, phase)      sine with whole cycles per loop (seamless)
//   noise(t, seed, octaves)     smooth looping noise in about [-1, 1] (seamless; good for wind and water)
//
// Coordinates: x to the right, y DOWN, in pt. Canvas 18 × 18. Live area 1–17 on both axes. Ground line y = 16.

// ── numbers ───────────────────────────────────────────────────────────────────────────────────────
var TAU = Math.PI * 2;
function f(n) { return Math.round(n * 1000) / 1000; }
function clamp(x, a, b) { if (a === undefined) a = 0; if (b === undefined) b = 1; return x < a ? a : x > b ? b : x; }
function lerp(a, b, k) { return a + (b - a) * k; }
function mix(p, q, k) { return [lerp(p[0], q[0], k), lerp(p[1], q[1], k)]; }
function dist(p, q) { return Math.hypot(q[0] - p[0], q[1] - p[1]); }

// ── easing and timing ─────────────────────────────────────────────────────────────────────────────
function smooth(x) { var c = clamp(x); return c * c * (3 - 2 * c); }
function smoother(x) { var c = clamp(x); return c * c * c * (c * (c * 6 - 15) + 10); }
function easeIn(x) { var c = clamp(x); return c * c * c; }
function easeOut(x) { var c = 1 - clamp(x); return 1 - c * c * c; }
function easeInOut(x) { var c = clamp(x); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; }
function easeOutBack(x, s) { if (s === undefined) s = 1.7; var c = clamp(x) - 1; return 1 + (s + 1) * c * c * c + s * c * c; }
function seg(t, a, b, e) { return (e || smooth)((t - a) / (b - a)); }
function bump(t, a, b, c, d, e) { return seg(t, a, b, e) * (1 - seg(t, c, d, e)); }
function pulse(t, a, b) { var u = (t - a) / (b - a); return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; }
function loop(t, cycles, phase) { return Math.sin(TAU * ((cycles === undefined ? 1 : cycles) * t + (phase || 0))); }
function wrap01(x) { return x - Math.floor(x); }
function noise(t, seed, octaves) {
  octaves = octaves || 3; seed = seed === undefined ? 1 : seed;
  var s = 0, n = 0;
  for (var k = 1; k <= octaves; k++) {
    var ph = wrap01(Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453);
    s += Math.sin(TAU * (k * t + ph)) / k; n += 1 / k;
  }
  return s / n * 1.6;
}

// ── point transforms ──────────────────────────────────────────────────────────────────────────────
function rot(cx, cy, deg, dx, dy) {
  var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); dx = dx || 0; dy = dy || 0;
  return function (x, y) { return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy]; };
}
function move(dx, dy) { return function (x, y) { return [x + dx, y + dy]; }; }
function scaleAt(cx, cy, sx, sy) { if (sy === undefined) sy = sx; return function (x, y) { return [cx + (x - cx) * sx, cy + (y - cy) * sy]; }; }
function chain() {
  var fns = Array.prototype.slice.call(arguments).filter(Boolean);
  return function (x, y) { var p = [x, y]; for (var i = 0; i < fns.length; i++) p = fns[i](p[0], p[1]); return p; };
}
function bend(x0, y0, x1, y1, deflect) {
  var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = uy, ny = -ux;
  return function (x, y) {
    var s = clamp(((x - x0) * ux + (y - y0) * uy) / L, 0, 1.25), d = deflect * s * s;
    return [x + nx * d, y + ny * d];
  };
}

// ── paths ─────────────────────────────────────────────────────────────────────────────────────────
function _tokens(d) {
  var re = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g, out = [], m;
  while ((m = re.exec(d)) !== null) out.push(m[1] !== undefined ? m[1] : parseFloat(m[2]));
  return out;
}
function parsePath(d) {
  var tk = _tokens(String(d)), i = 0, cmd = null, segs = [], cx = 0, cy = 0, sx = 0, sy = 0, lastC = null, lastQ = null;
  function num() {
    var v = tk[i];
    if (typeof v !== 'number') throw new Error('path: expected a number at token ' + i + ' in "' + String(d).slice(0, 90) + '"');
    i++; return v;
  }
  while (i < tk.length) {
    if (typeof tk[i] === 'string') cmd = tk[i++];
    else if (cmd === null) throw new Error('path must start with M: "' + String(d).slice(0, 90) + '"');
    else if (cmd === 'M') cmd = 'L';
    else if (cmd === 'm') cmd = 'l';
    else if (cmd === 'Z' || cmd === 'z') throw new Error('path: numbers after Z without a command: "' + String(d).slice(0, 90) + '"');
    var C = cmd.toUpperCase(), rel = cmd !== C, ox = rel ? cx : 0, oy = rel ? cy : 0, x = cx, y = cy, x1, y1, x2, y2;
    if (C === 'Z') { segs.push({ c: 'Z', p: [] }); cx = sx; cy = sy; lastC = lastQ = null; continue; }
    if (C === 'A') throw new Error('arcs (A) are not supported: use circlePath, ellipsePath or arcPts');
    if (C === 'M') { x = num() + ox; y = num() + oy; segs.push({ c: 'M', p: [x, y] }); sx = x; sy = y; lastC = lastQ = null; }
    else if (C === 'L') { x = num() + ox; y = num() + oy; segs.push({ c: 'L', p: [x, y] }); lastC = lastQ = null; }
    else if (C === 'H') { x = num() + ox; y = cy; segs.push({ c: 'L', p: [x, y] }); lastC = lastQ = null; }
    else if (C === 'V') { x = cx; y = num() + oy; segs.push({ c: 'L', p: [x, y] }); lastC = lastQ = null; }
    else if (C === 'C') {
      x1 = num() + ox; y1 = num() + oy; x2 = num() + ox; y2 = num() + oy; x = num() + ox; y = num() + oy;
      segs.push({ c: 'C', p: [x1, y1, x2, y2, x, y] }); lastC = [x2, y2]; lastQ = null;
    } else if (C === 'S') {
      x1 = lastC ? 2 * cx - lastC[0] : cx; y1 = lastC ? 2 * cy - lastC[1] : cy;
      x2 = num() + ox; y2 = num() + oy; x = num() + ox; y = num() + oy;
      segs.push({ c: 'C', p: [x1, y1, x2, y2, x, y] }); lastC = [x2, y2]; lastQ = null;
    } else if (C === 'Q') {
      x1 = num() + ox; y1 = num() + oy; x = num() + ox; y = num() + oy;
      segs.push({ c: 'Q', p: [x1, y1, x, y] }); lastQ = [x1, y1]; lastC = null;
    } else if (C === 'T') {
      x1 = lastQ ? 2 * cx - lastQ[0] : cx; y1 = lastQ ? 2 * cy - lastQ[1] : cy; x = num() + ox; y = num() + oy;
      segs.push({ c: 'Q', p: [x1, y1, x, y] }); lastQ = [x1, y1]; lastC = null;
    } else throw new Error('path: unknown command ' + cmd);
    cx = x; cy = y;
  }
  return segs;
}
function pathStr(segs) {
  var s = '';
  for (var i = 0; i < segs.length; i++) {
    var g = segs[i]; s += g.c;
    for (var j = 0; j < g.p.length; j++) s += (j ? ' ' : '') + f(g.p[j]);
  }
  return s;
}
function tp(d, fn) {
  if (!fn) return d;
  var segs = parsePath(d);
  for (var i = 0; i < segs.length; i++) {
    var p = segs[i].p;
    for (var j = 0; j < p.length; j += 2) { var q = fn(p[j], p[j + 1]); p[j] = q[0]; p[j + 1] = q[1]; }
  }
  return pathStr(segs);
}
function xf(fn, svg) { return String(svg).replace(/ d="([^"]*)"/g, function (m, d) { return ' d="' + tp(d, fn) + '"'; }); }
function morph(a, b, k) {
  var A = parsePath(a), B = parsePath(b);
  if (A.length !== B.length) throw new Error('morph: paths have different structure (' + A.length + ' vs ' + B.length + ' segments)');
  for (var i = 0; i < A.length; i++) {
    if (A[i].c !== B[i].c) throw new Error('morph: segment ' + i + ' is ' + A[i].c + ' in one path and ' + B[i].c + ' in the other');
    for (var j = 0; j < A[i].p.length; j++) A[i].p[j] = lerp(A[i].p[j], B[i].p[j], k);
  }
  return pathStr(A);
}
function morphKeys(paths, k) {
  var n = paths.length - 1, x = clamp(k) * n, i = Math.min(n - 1, Math.floor(x));
  return morph(paths[i], paths[i + 1], x - i);
}
function polyPath(pts, closed) {
  var s = '';
  for (var i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + f(pts[i][0]) + ' ' + f(pts[i][1]);
  return s + (closed ? 'Z' : '');
}
function smoothPath(pts, closed, tension) {
  if (tension === undefined) tension = 1;
  var n = pts.length; if (n < 2) return '';
  var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i], p2 = pts[(i + 1) % n];
    var p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
    d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6 * tension) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6 * tension) + ' ' +
      f(p2[0] - (p3[0] - p1[0]) / 6 * tension) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6 * tension) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
  }
  return d + (closed ? 'Z' : '');
}

// ── shapes ────────────────────────────────────────────────────────────────────────────────────────
function circlePath(cx, cy, r) {
  var k = 0.5523 * r;
  return 'M' + f(cx + r) + ' ' + f(cy) +
    'C' + f(cx + r) + ' ' + f(cy + k) + ' ' + f(cx + k) + ' ' + f(cy + r) + ' ' + f(cx) + ' ' + f(cy + r) +
    'C' + f(cx - k) + ' ' + f(cy + r) + ' ' + f(cx - r) + ' ' + f(cy + k) + ' ' + f(cx - r) + ' ' + f(cy) +
    'C' + f(cx - r) + ' ' + f(cy - k) + ' ' + f(cx - k) + ' ' + f(cy - r) + ' ' + f(cx) + ' ' + f(cy - r) +
    'C' + f(cx + k) + ' ' + f(cy - r) + ' ' + f(cx + r) + ' ' + f(cy - k) + ' ' + f(cx + r) + ' ' + f(cy) + 'Z';
}
function ellipsePath(cx, cy, rx, ry, deg) {
  return tp(circlePath(0, 0, 1), chain(scaleAt(0, 0, rx, ry), rot(0, 0, deg || 0), move(cx, cy)));
}
function rectPath(x, y, w, h, r) {
  var rs = Array.isArray(r) ? r.slice() : [r || 0, r || 0, r || 0, r || 0], m = Math.min(w, h) / 2, k = 0.4477;
  for (var i = 0; i < 4; i++) rs[i] = Math.min(rs[i] || 0, m);
  var tl = rs[0], tr = rs[1], br = rs[2], bl = rs[3];
  return 'M' + f(x + tl) + ' ' + f(y) + 'L' + f(x + w - tr) + ' ' + f(y) +
    'C' + f(x + w - tr * k) + ' ' + f(y) + ' ' + f(x + w) + ' ' + f(y + tr * k) + ' ' + f(x + w) + ' ' + f(y + tr) +
    'L' + f(x + w) + ' ' + f(y + h - br) +
    'C' + f(x + w) + ' ' + f(y + h - br * k) + ' ' + f(x + w - br * k) + ' ' + f(y + h) + ' ' + f(x + w - br) + ' ' + f(y + h) +
    'L' + f(x + bl) + ' ' + f(y + h) +
    'C' + f(x + bl * k) + ' ' + f(y + h) + ' ' + f(x) + ' ' + f(y + h - bl * k) + ' ' + f(x) + ' ' + f(y + h - bl) +
    'L' + f(x) + ' ' + f(y + tl) +
    'C' + f(x) + ' ' + f(y + tl * k) + ' ' + f(x + tl * k) + ' ' + f(y) + ' ' + f(x + tl) + ' ' + f(y) + 'Z';
}
function arcPts(cx, cy, r, a0, a1, n) {
  n = n || 12; var out = [];
  for (var i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
}
function star(cx, cy, r, inner, points, rotDeg) {
  points = points || 5; if (inner === undefined) inner = 0.45; var r0 = (rotDeg === undefined ? -90 : rotDeg) * Math.PI / 180, pts = [];
  for (var i = 0; i < points * 2; i++) { var a = r0 + Math.PI * i / points, rr = i % 2 ? r * inner : r; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  return polyPath(pts, true);
}
function sparkle(cx, cy, r, opts) {
  opts = opts || {};
  var n = opts.rays || 4, inner = opts.inner === undefined ? 0.22 : opts.inner, r0 = (opts.rot || 0) * Math.PI / 180 - Math.PI / 2, lg = opts.long || 1, d = '';
  for (var i = 0; i < n; i++) {
    var a = r0 + TAU * i / n, rr = i % 2 ? r * lg : r, a2 = r0 + TAU * (i + 1) / n, rr2 = (i + 1) % 2 ? r * lg : r, am = (a + a2) / 2;
    if (i === 0) d += 'M' + f(cx + Math.cos(a) * rr) + ' ' + f(cy + Math.sin(a) * rr);
    d += 'Q' + f(cx + Math.cos(am) * r * inner) + ' ' + f(cy + Math.sin(am) * r * inner) + ' ' + f(cx + Math.cos(a2) * rr2) + ' ' + f(cy + Math.sin(a2) * rr2);
  }
  return d + 'Z';
}
function _cr(p0, p1, p2, p3, u) {
  var u2 = u * u, u3 = u2 * u;
  return [0, 1].map(function (j) {
    return 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3);
  });
}
function _sample(pts, sub) {
  if (pts.length < 2) throw new Error('ribbon: the spine needs at least 2 points');
  var out = [];
  for (var i = 0; i < pts.length - 1; i++) {
    var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (var k = 0; k < sub; k++) out.push(pts.length === 2 ? mix(p1, p2, k / sub) : _cr(p0, p1, p2, p3, k / sub));
  }
  out.push(pts[pts.length - 1].slice(0, 2));
  return out;
}
function ribbon(spine, width, opts) {
  opts = opts || {};
  var caps = opts.caps || ['flat', 'flat'], P = _sample(spine, opts.samples || 10), L = [0];
  for (var i = 1; i < P.length; i++) L.push(L[i - 1] + dist(P[i - 1], P[i]));
  var total = L[L.length - 1] || 1;
  function w(j) {
    var s = L[j] / total;
    if (typeof width === 'function') return Math.max(0, width(s));
    if (Array.isArray(width)) {
      var x = s * (width.length - 1), k = Math.floor(x);
      return k >= width.length - 1 ? width[width.length - 1] : lerp(width[k], width[k + 1], x - k);
    }
    return width;
  }
  var left = [], right = [], N = [];
  for (var j = 0; j < P.length; j++) {
    var a = P[Math.max(0, j - 1)], b = P[Math.min(P.length - 1, j + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    var nx = -ty / tl, ny = tx / tl, hw = w(j) / 2;
    N.push([nx, ny, tx / tl, ty / tl]);
    left.push([P[j][0] + nx * hw, P[j][1] + ny * hw]); right.push([P[j][0] - nx * hw, P[j][1] - ny * hw]);
  }
  function cap(j, sgn) {   // sgn +1 = end, -1 = start; sweeps from one side to the other through the outward direction
    var r = w(j) / 2, out = []; if (r < 0.01) return out;
    var n = N[j], sx = sgn > 0 ? n[0] : -n[0], sy = sgn > 0 ? n[1] : -n[1], ox = sgn > 0 ? n[2] : -n[2], oy = sgn > 0 ? n[3] : -n[3];
    for (var k = 1; k < 8; k++) { var th = Math.PI * k / 8, c = Math.cos(th), s = Math.sin(th); out.push([P[j][0] + r * (sx * c + ox * s), P[j][1] + r * (sy * c + oy * s)]); }
    return out;
  }
  var pts = left.slice();
  if (caps[1] === 'round') pts = pts.concat(cap(P.length - 1, 1));
  pts = pts.concat(right.reverse());
  if (caps[0] === 'round') pts = pts.concat(cap(0, -1));
  return polyPath(pts, true);
}
function petal(x, y, len, wid, deg, opts) {
  opts = opts || {};
  var peak = opts.peak === undefined ? 0.45 : opts.peak, base = opts.base || 0, bendv = opts.bend || 0, fat = opts.fat || 1;
  var round = opts.tip === 'round', tipw = round ? 0.42 : 0;
  var a = deg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), nx = uy, ny = -ux, spine = [];
  for (var i = 0; i <= 6; i++) { var s = i / 6, side = bendv * 4 * s * (1 - s); spine.push([x + ux * len * s + nx * side, y + uy * len * s + ny * side]); }
  var prof = function (s) {
    if (s <= peak) return wid * (base + (1 - base) * Math.pow(Math.sin(Math.PI / 2 * s / peak), 1 / fat));
    return wid * (tipw + (1 - tipw) * Math.pow(Math.max(0, Math.cos(Math.PI / 2 * (s - peak) / (1 - peak))), 1 / fat));
  };
  return ribbon(spine, prof, { caps: [base > 0 ? 'round' : 'flat', round ? 'round' : 'flat'], samples: 8 });
}

// ── elements ──────────────────────────────────────────────────────────────────────────────────────
function _path(d, attrs) { return '<path d="' + d + '" ' + attrs + '/>'; }
function ink(d, fn) { return _path(tp(d, fn), 'fill="#000"'); }
function cut(d, fn) { return _path(tp(d, fn), 'fill="#f00"'); }
function front(d, fn) { return _path(tp(d, fn), 'fill="#00f"'); }
var top = front;
function fade(d, fn) { return _path(tp(d, fn), 'fill="#000" fill-opacity="0.5"'); }
function cutAround(d, gap, fn) {
  return _path(tp(d, fn), 'fill="#f00" stroke="#f00" stroke-width="' + f(2 * (gap === undefined ? 0.8 : gap)) + '" stroke-linejoin="round"');
}
function _stroke(d, w, color, extra) {
  return _path(d, 'fill="none" stroke="' + color + '" stroke-width="' + f(w) + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || ''));
}
function hairline(d, w, fn) { return _stroke(tp(d, fn), w === undefined ? 0.7 : w, '#000'); }
function cutLine(d, w, fn) { return _stroke(tp(d, fn), w === undefined ? 0.8 : w, '#f00'); }
function frontLine(d, w, fn) { return _stroke(tp(d, fn), w === undefined ? 0.7 : w, '#00f'); }
var topLine = frontLine;
function fadeLine(d, w, fn) { return _stroke(tp(d, fn), w === undefined ? 0.7 : w, '#000', ' stroke-opacity="0.5"'); }
