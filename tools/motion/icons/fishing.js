// Layerhover — 앉아서 낚시 (Fishing).
// 강태공: an angler in a conical straw hat (삿갓) sits hunched on a river boulder, both fists on one long tapered cane
// rod that bows out over the water to a slim two-tone float. Two nibbles, then the strike: he leans in, throws his
// weight back and looks up as the rod whips into a deep bow and a fish breaks the surface with a splash; it swings
// and flaps, twists free and dives back, and he casts again.
// Every part is a hand-drawn filled contour posed about real joints: the spine bends above a planted seat, the head
// lifts about the neck, the forearm turns about the elbow; the near fist continues the forearm, the far fist grips
// a hand-width up the rod, a V-shaped knuckle notch between them.

var ICON = {
  id: "fishing",
  frames: 64,
  at: function (t) { return fishScene(t * 64); }
};

// ── small helpers ────────────────────────────────────────────────────────────────────────────────
function trk(fr, keys) {          // keyframe track: [[frame, value, ease?], ...] (ease of the segment ending there)
  if (fr <= keys[0][0]) return keys[0][1];
  for (var i = 1; i < keys.length; i++) {
    if (fr <= keys[i][0]) {
      var a = keys[i - 1], b = keys[i];
      return lerp(a[1], b[1], (b[2] || smooth)((fr - a[0]) / (b[0] - a[0])));
    }
  }
  return keys[keys.length - 1][1];
}
function rad(d) { return d * Math.PI / 180; }
function deg(r) { return r * 180 / Math.PI; }
function lin(x) { return clamp(x); }
function seg2(a, b) { return 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]); }
function hangAngle(from, to) { return deg(Math.atan2(-(to[0] - from[0]), to[1] - from[1])); }  // 0 = straight down
// smooth closed/open curve through points; a point [x, y, 1] is a corner
function crv(pts, closed) {
  var n = pts.length;
  function P(i) { return closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; }
  function isCorner(i) { return P(i)[2] || (!closed && (i <= 0 || i >= n - 1)); }
  function tOut(i) { var p = P(i), a = P(i - 1), b = P(i + 1); return isCorner(i) ? [b[0] - p[0], b[1] - p[1]] : [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]; }
  function tIn(i) { var p = P(i), a = P(i - 1), b = P(i + 1); return isCorner(i) ? [p[0] - a[0], p[1] - a[1]] : [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]; }
  var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p1 = P(i), p2 = P(i + 1), to = tOut(i), ti = tIn(i + 1);
    d += 'C' + f(p1[0] + to[0] / 3) + ' ' + f(p1[1] + to[1] / 3) + ' ' + f(p2[0] - ti[0] / 3) + ' ' + f(p2[1] - ti[1] / 3) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
  }
  return d + (closed ? 'Z' : '');
}
// points along segments [i0, i1) of a crv path (segment j runs from point j to point j + 1)
function crvPts(d, i0, i1, per) {
  var segs = parsePath(d), out = [], cx = 0, cy = 0;
  per = per || 6;
  for (var j = 0; j < segs.length; j++) {
    var g = segs[j];
    if (g.c === 'M') { cx = g.p[0]; cy = g.p[1]; continue; }
    if (g.c === 'Z') continue;
    if (j - 1 >= i0 && j - 1 < i1) {
      for (var q = out.length ? 1 : 0; q <= per; q++) {
        var u = q / per, v = 1 - u;
        out.push([v * v * v * cx + 3 * v * v * u * g.p[0] + 3 * v * u * u * g.p[2] + u * u * u * g.p[4],
          v * v * v * cy + 3 * v * v * u * g.p[1] + 3 * v * u * u * g.p[3] + u * u * u * g.p[5]]);
      }
    }
    cx = g.p[g.p.length - 2]; cy = g.p[g.p.length - 1];
  }
  return out;
}
// the spine bends above a seated pelvis: points above yFull follow fn fully, points below yNone stay put
function skinY(fn, yFull, yNone) {
  return function (x, y) { var q = fn(x, y), k = smooth((yNone - y) / (yNone - yFull)); return [lerp(x, q[0], k), lerp(y, q[1], k)]; };
}
// the same along x: a thigh rooted in a moving pelvis (left of x0 follows fully, right of x1 stays put)
function skinX(fn, x0, x1) {
  return function (x, y) { var q = fn(x, y), k = smooth((x1 - x) / (x1 - x0)); return [lerp(x, q[0], k), lerp(y, q[1], k)]; };
}
function flatten(d, n) {          // path → polygons (for clipping at the water line)
  n = n || 8;
  var segs = parsePath(d), polys = [], cur = null, px = 0, py = 0;
  for (var i = 0; i < segs.length; i++) {
    var g = segs[i], p = g.p, k, u, v;
    if (g.c === 'M') { cur = [[p[0], p[1]]]; polys.push(cur); px = p[0]; py = p[1]; }
    else if (g.c === 'L') { cur.push([p[0], p[1]]); px = p[0]; py = p[1]; }
    else if (g.c === 'C') {
      for (k = 1; k <= n; k++) { u = k / n; v = 1 - u; cur.push([v * v * v * px + 3 * v * v * u * p[0] + 3 * v * u * u * p[2] + u * u * u * p[4], v * v * v * py + 3 * v * v * u * p[1] + 3 * v * u * u * p[3] + u * u * u * p[5]]); }
      px = p[4]; py = p[5];
    } else if (g.c === 'Q') {
      for (k = 1; k <= n; k++) { u = k / n; v = 1 - u; cur.push([v * v * px + 2 * v * u * p[0] + u * u * p[2], v * v * py + 2 * v * u * p[1] + u * u * p[3]]); }
      px = p[2]; py = p[3];
    }
  }
  return polys;
}
function aboveWater(d, ymax) {    // keep only what is above ymax (the rest would sit inside the water band)
  var polys = flatten(d, 10), s = '';
  for (var i = 0; i < polys.length; i++) {
    var P = polys[i], any = false;
    for (var j = 0; j < P.length; j++) { if (P[j][1] < ymax - 0.05) any = true; P[j] = [P[j][0], Math.min(P[j][1], ymax)]; }
    if (any) s += polyPath(P, true);
  }
  return s;
}

// ── fixed geometry (pt, world), idle pose ───────────────────────────────────────────────────────
var WY = 16;                       // water line
var HIP = [4.8, 11.6];             // the spine bends above this seat point
var NECK = [5.5, 7.7];             // the head lifts about this point
var E0 = [5.85, 9.15];             // elbow pivot at rest
var FORE0 = 21;                    // forearm angle at rest (deg above horizontal, body-relative)
var FORE_L = 2.66;                 // elbow pivot → grip (the rod axis inside the near fist)
var HAT_AT = [5.55, 5.67];         // centre of the hat's underside (a 0.6 shadow gap over the head)
var HAT_TILT = 8;                  // front brim lower: he looks down at his float
var FLOAT_X = 14.9;
var ROD_L = 8.4, GRIP_AT = 0.22;   // rod length from the butt; the near fist sits this far up the rod

// conical straw hat — local: underside centre at 0,0, apex up; flared, concave sides, tapered brim tips
var HAT = tp('M0 -2.45Q0.13 -2.45 0.26 -2.3C0.9 -1.38 1.78 -0.62 2.95 -0.12C3.08 -0.06 3.06 0.14 2.9 0.14' +
  'C2.05 0.12 1.1 -0.04 0 -0.04C-1.1 -0.04 -2.05 0.12 -2.9 0.14C-3.06 0.14 -3.08 -0.06 -2.95 -0.12' +
  'C-1.78 -0.62 -0.9 -1.38 -0.26 -2.3Q-0.13 -2.45 0 -2.45Z', scaleAt(0, 0, 0.9, 1));

// upper body: head below the hat's shadow line (a 0.6 gap), nape, hunched back, seat, belly, chest, throat notch,
// then the face profile up to the brow: chin, lips, nose wedge, shadowed brow
var TORSO = 'M5.1 6.245C4.8 6.255 4.6 6.46 4.6 6.7C4.6 6.84 4.476 6.904 4.3 7.0' +                // round occiput, nape
  'C3.75 7.3 3.42 7.95 3.32 8.65C3.2 9.55 3.22 10.45 3.42 11.15C3.65 11.85 4.2 12.2 4.8 12.2' +
  'C5.4 12.2 5.95 11.8 6.2 11.2C6.35 10.8 6.4 10.4 6.4 10.0C6.42 9.5 6.46 9.0 6.4 8.55' +
  'C6.36 8.25 6.3 8.02 6.22 7.86' +                                  // throat notch
  'C6.42 7.8 6.68 7.64 6.82 7.47' +                                  // jaw → chin
  'C6.9 7.38 6.96 7.28 6.94 7.18' +                                  // chin → lips
  'C6.93 7.12 6.95 7.08 6.92 7.04' +                                 // under the nose
  'L7.17 6.93' +                                                      // nose wedge: underside → tip
  'C7.04 6.83 6.93 6.75 6.89 6.66' +                                 // ridge → bridge
  'C6.87 6.62 6.9 6.58 6.86 6.5' +                                   // shadowed brow
  'C6.1 6.4 5.45 6.255 5.1 6.245Z';
// seat, thigh rising to the knee; the shin swells at the calf and narrows to the ankle; a straw-sandalled foot:
// round heel, flat sole laid along the boulder's slope, blunt toe, instep rising back to the ankle
var LEGS = 'M3.8 11.0C3.8 11.75 4.2 12.2 4.8 12.2C5.7 12.2 6.65 11.55 7.35 11.1' +
  'C7.28 11.55 7.32 12.2 7.56 12.64' +                                                      // calf → back of the ankle
  'C7.48 12.86 7.52 13.14 7.74 13.24L9.08 13.8' +                                           // heel, sole
  'C9.3 13.89 9.48 13.8 9.46 13.62C9.44 13.48 9.3 13.4 9.12 13.3' +                         // blunt toe
  'C8.86 13.16 8.6 12.92 8.54 12.74' +                                                   // instep → front of the ankle
  'C8.42 12.3 8.42 11.4 8.44 10.7C8.44 10.2 8.12 9.95 7.72 9.97' +                          // shin, knee
  'C7.15 9.99 6.5 10.25 5.95 10.5C5.2 10.85 4.4 10.6 3.8 11.0Z';
// river boulder: a flat seat plane under him, the slope under his feet running parallel to the sole (a 0.6 gap),
// then rolling down into the water
var STONE = crv([[1.5, 16.95, 1], [1.5, 15.7], [1.68, 14.5], [1.98, 13.78], [2.95, 13.06], [3.95, 12.86], [5.0, 12.84], [5.95, 12.93],
  [6.85, 13.3], [7.7, 13.8], [8.7, 14.2], [9.55, 14.62], [10.05, 15.15], [10.25, 15.85], [10.3, 16.4, 1], [10.3, 16.95, 1]], true);
// one facet: it opens on the stone's left flank and runs down across its face, tapering from 0.6 to nothing —
// a split river stone, not a tar mound (kept away from the figure, so the seat and the feet stay calm)
var FACET = [[2.3, 12.95], [2.72, 13.75], [3.05, 14.55], [3.3, 15.35]];

// the forearm frame: a along the forearm from the elbow pivot, b to its upper side (rest pose → world)
var D0 = [Math.cos(rad(FORE0)), -Math.sin(rad(FORE0))], N0 = [D0[1], -D0[0]];
function fw(a, b, w, c) { return [E0[0] + D0[0] * a + N0[0] * b, E0[1] + D0[1] * a + N0[1] * b, w, c]; }

// the near arm, one hand-drawn piece: shoulder → back of the upper arm → elbow → sagging sleeve → cuff → wrist,
// back along the top of the forearm → (hidden inside the chest) → shoulder.
// [x, y, w, corner]: w = 0 rides the body, 1 rides the forearm (blends at the elbow). The sleeve ends in a crisp
// cuff (a 0.2 step down to the wrist on both sides); the hand takes over from the wrist.
var ARM0 = [[5.62, 7.52, 0], [5.18, 7.8, 0], [4.94, 8.55, 0], [5.0, 9.3, 0], [5.24, 9.74, 0.35], [5.68, 9.9, 0.8],
  fw(0.03, -0.77, 1), fw(0.30, -0.81, 1), fw(0.74, -0.86, 1), fw(1.22, -0.76, 1), fw(1.66, -0.6, 1, 1), fw(1.70, -0.38, 1, 1),
  fw(2.2, -0.36, 1), fw(2.5, -0.28, 1), fw(2.5, 0.28, 1), fw(2.2, 0.36, 1), fw(1.70, 0.36, 1, 1), fw(1.66, 0.58, 1, 1),
  fw(1.0, 0.61, 1), fw(0.04, 0.63, 1), [5.9, 7.95, 0]];
var ARM_CUT = [1, 7];              // the sleeve cut rides ARM0 from the shoulder to where the forearm leaves the belly
var SLEEVE = [0.62, 0.55, 0.62, 0.33];   // widest opening (behind the elbow), where it is fully open, where it starts to close, how long it closes

// near (right) fist, a mitten that continues the forearm (forearm frame): the back of the hand rises from the wrist
// to the knuckle corner, a flat front face where the fingers curl round the rod, the heel of the hand below.
// The rod crosses the palm diagonally and leaves through the far fist.
var FIST_N = 'M1.98 0.36C2.25 0.44 2.5 0.64 2.8 0.66C3.02 0.67 3.16 0.54 3.18 0.34' +
  'L3.22 -0.32C3.23 -0.54 3.1 -0.68 2.88 -0.69L2.42 -0.68C2.2 -0.67 2.06 -0.52 1.98 -0.36Z';
// far (left) fist, a hand-width up the rod (grip frame: u along the rod, v to its upper side). Its back edge leans
// away from the near fist's front face: a V-shaped notch, closed on the rod's axis and open toward its underside.
var FAR_TURN = 0.35;
var FIST_F = 'M0.52 0.56L0.55 -0.54C0.55 -0.67 0.63 -0.75 0.76 -0.75L1.06 -0.74C1.24 -0.73 1.34 -0.64 1.37 -0.48' +
  'L1.52 0.40C1.56 0.64 1.44 0.876 1.18 0.86L0.86 0.84C0.66 0.83 0.54 0.72 0.52 0.56Z';

// the float: slim spindle; its cap is set off by a curved cut (two-tone). local: water line at 0
var FLOAT = 'M0 -2.6C0.12 -2.6 0.3 -2.1 0.45 -1.55C0.6 -1.05 0.66 -0.55 0.6 -0.15C0.52 0.3 0.3 0.55 0 0.62' +
  'C-0.3 0.55 -0.52 0.3 -0.6 -0.15C-0.66 -0.55 -0.6 -1.05 -0.45 -1.55C-0.3 -2.1 -0.12 -2.6 0 -2.6Z';
var FLOAT_BAND = 'M-0.75 -1.6C-0.3 -1.48 0.3 -1.48 0.75 -1.6L0.75 -0.85C0.3 -0.73 -0.3 -0.73 -0.75 -0.85Z';
var FLOAT_H = 2.6;

// the fish — local: mouth at 0,0, body hanging along +y; back (with a swept dorsal fin) toward -x, deep belly
// toward +x, slim wrist, forked tail
var FISH = 'M0 0C-0.38 0.04 -0.68 0.34 -0.76 0.86C-0.8 1.08 -0.8 1.22 -0.8 1.32' +
  'L-1.24 2.0C-1.0 1.98 -0.82 2.06 -0.7 2.2' +
  'C-0.58 2.5 -0.42 2.78 -0.22 3.02C-0.44 3.46 -0.84 3.9 -1.02 4.26C-0.62 4.14 -0.26 3.92 0 3.77' +
  'C0.27 3.92 0.64 4.14 1.04 4.26C0.86 3.9 0.46 3.46 0.24 3.02C0.56 2.6 0.9 1.96 0.88 1.18C0.86 0.5 0.46 0.05 0 0Z';
var FISH_EYE = [-0.24, 0.72];
var FISH_LEN = 4.26;

// hanging assembly, measured down the line from the tip: line → float (slid down to the knot) → gap → mouth
var L1 = 0.5, KNOT = 1.45, HANG = L1 + FLOAT_H + KNOT;

// ── rod: a cane that bends like a real one (curvature grows toward the tip, length is kept) ─────
function rodPts(grip, dg, drop, every) {
  var th = rad(dg), dr = rad(drop), n = 48, ds = ROD_L / n;
  var x = grip[0] - Math.cos(th) * GRIP_AT, y = grip[1] + Math.sin(th) * GRIP_AT, out = [[x, y]];
  for (var i = 1; i <= n; i++) {
    var ph = th - dr * Math.pow((i - 0.5) / n, 1.2);
    x += Math.cos(ph) * ds; y -= Math.sin(ph) * ds;
    if (i % (every || 4) === 0) out.push([x, y]);
  }
  return out;
}
function rodW(s) { return 0.66 + 0.56 * Math.pow(1 - s, 1.4); }

// ── timeline (frame numbers, 64 per loop) ────────────────────────────────────────────────────────
// 0–6 idle · 7/9/11 nibble 1 (three one-frame bobs; the tip answers a frame later) · 12–21 idle · 22/24 nibble 2
// · 25.5–28 the bite: the float is dragged under, he leans in · 28–31 STRIKE: he throws his weight back and looks up,
// the rod whips into a deep bow, the fish breaks the surface (30) and is clear (31) · 31–41 it swings and flaps
// · 41–44 it twists free and dives back · 45–52 recast · 52–57 the float settles · idle
var BOBS = [[7, 0.7], [9, 1.0], [11, 0.55], [22, 0.85], [24, 1.0]];
function bobAt(fr, lag) { var v = 0; for (var i = 0; i < BOBS.length; i++) v += BOBS[i][1] * Math.max(0, 1 - Math.abs(fr - BOBS[i][0] - (lag || 0))); return v; }
var BITE = [[0, 0], [25.5, 0], [27, 0.66, easeIn], [28, 1.0]];
function floatSink(fr) { return fr > 28 ? 1 : 0.52 * bobAt(fr) + trk(fr, BITE); }
// the rod tip follows each tap a frame later and springs 0.3 pt past rest
function tipLoad(fr) { return fr > 28 ? 1 : 0.5 * bobAt(fr, 1) - 0.1 * bobAt(fr, 2) + trk(fr, BITE); }

var LEAN = [[0, 0], [26.5, 0], [28, 3], [29, -3, easeIn], [30, -9.5], [31, -13.5, easeOut], [32.5, -11.5], [34, -12.4],
  [41, -12], [43, -8.5], [45, -4.0], [47, -1.2], [48.4, -2.0], [50.2, 2.6], [51.6, 1.4], [54, -0.3], [57, 0]];
var LIFT = [[0, 0], [26.5, 0], [28, 1.5], [29, 0.5], [30, -3.5], [31, -6, easeOut], [33, -5.6], [47, -5.6], [52, 0]];
var HATLAG = [[0, 0], [29, 0], [30, 3.5], [31, 5], [32, 1], [33, -1.5], [35, 0.4], [37, 0],
  [49.6, 0], [50.6, -1.8], [52, 0.9], [54, 0]];
var FORE = [[0, FORE0], [27, FORE0], [28, 18], [29, 17.5, easeIn], [30, 15, easeOut], [31, 13.5], [33, 14],
  [41, 14], [43, 17], [45, 20], [47, 22], [48.4, 24.5], [50.2, 15], [51.6, 18], [54, FORE0]];
var ROD0 = 50.5;                   // rest: the tip hangs plumb over the float
var RODDEG = [[0, ROD0], [26.5, ROD0], [27, 49.5], [28, 46], [29, 63, easeIn], [30, 79, easeOut], [31, 85], [32, 83], [34, 84],
  [41, 84], [42, 72, easeOut], [43, 65], [45, 61], [47, 59], [48.4, 62], [49.3, 55, easeIn], [50.2, 45, lin], [51.6, 48], [53.5, 51.5], [56, ROD0]];
var DROP = [[28.5, 62], [29, 70], [30, 94, easeOut], [31, 100], [32, 90], [33, 97], [34, 89], [35, 94], [36, 88],
  [37, 92], [38, 87], [39, 90], [40, 87], [41, 90], [42, 40, easeOut], [43, 56], [44, 44], [45, 50], [46, 46],
  [48.4, 46], [50.2, 30], [51.4, 42, easeOut], [52.6, 26], [53.6, 35], [54.6, 28], [55.8, 31], [57.4, 30]];
function rodDrop(fr) { return fr >= 28.5 ? trk(fr, DROP) : 30 + 48 * Math.min(tipLoad(fr), 0.75); }   // every tug loads the tip

// the fish on the line: swing angle about the rod tip (deg from straight down, + = right) and flaps
var SWING = [[30, 6], [31, 6], [32, 3], [33, -8], [34, -15, easeOut], [35, -6], [36, 9], [37, 12, easeOut],
  [38, 4], [39, -8], [40, -6], [41, 3]];
var FLAP = [[30, 0], [31, 0.6], [32, 1], [33, -1], [34, 0.7], [35, -0.9], [36, 0.5], [37, -0.6], [38, 0.9], [39, -1],
  [40, 0.8], [41, -1], [42, 0.9], [43, -0.8], [44, 0.6]];
var F_BREAK = 29.85;               // the fish's mouth leaves the water
var DIVE = [[41, 0], [42, 1.5, easeIn], [43, 4.5, lin], [44, 6.8, easeOut], [45, 9]];   // the released fish's fall
var DIVE_X = 14.6;                 // where it goes back in

function pose(fr) {
  var lean = trk(fr, LEAN), UB = rot(HIP[0], HIP[1], lean), spine = skinY(UB, 10.0, 12.0);
  var nk = UB(NECK[0], NECK[1]), HL = rot(nk[0], nk[1], trk(fr, LIFT));
  var torsoFn = function (x, y) {   // the head (above the throat) lifts about the neck; the spine bends above the seat
    var p = spine(x, y), k = smooth((7.95 - y) / 0.5);
    if (k <= 0) return p;
    var q = HL(p[0], p[1]); return [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  };
  var fa = rad(trk(fr, FORE) - lean), E = UB(E0[0], E0[1]);
  var d = [Math.cos(fa), -Math.sin(fa)], n = [d[1], -d[0]];
  var grip = [E[0] + d[0] * FORE_L, E[1] + d[1] * FORE_L];
  var rd = trk(fr, RODDEG), drop = rodDrop(fr), rp = rodPts(grip, rd, drop);
  var lag = trk(fr, HATLAG);       // the hat lags the head and floats up off it a little while it does
  return { lean: lean, UB: UB, spine: spine, HL: HL, torsoFn: torsoFn, E: E, d: d, n: n, fa: fa, grip: grip, rd: rd, drop: drop,
    rp: rp, tip: rp[rp.length - 1], hatFn: chain(move(0, -0.03 * Math.max(0, lag)), rot(0, 0, HAT_TILT + lag), move(HAT_AT[0], HAT_AT[1]), UB, HL) };
}

// the arm in this pose: body anchors ride the upper body, forearm anchors ride the elbow pivot, the elbow blends
function armPts(P) {
  return ARM0.map(function (a) {
    var b = P.UB(a[0], a[1]), out = b;
    if (a[2] > 0) {
      var r = [a[0] - E0[0], a[1] - E0[1]], u = r[0] * D0[0] + r[1] * D0[1], v = r[0] * N0[0] + r[1] * N0[1];
      var q = [P.E[0] + P.d[0] * u + P.n[0] * v, P.E[1] + P.d[1] * u + P.n[1] * v];
      out = [lerp(b[0], q[0], a[2]), lerp(b[1], q[1], a[2])];
    }
    return a[3] ? [out[0], out[1], 1] : out;
  });
}
// a point in the grip frame (u along the rod at the grip, v to its upper side)
function gripFrame(P) {
  var th = rad(P.rd), r = [Math.cos(th), -Math.sin(th)], m = [r[1], -r[0]], g = P.grip;
  return function (u, v) { return [g[0] + r[0] * u + m[0] * v, g[1] + r[1] * u + m[1] * v]; };
}

function fishScene(fr) {
  var P = pose(fr), tip = P.tip, s = '';

  // boulder, legs (thigh root skinned to the pelvis), upper body, hat
  s += ink(STONE) + cut(ribbon(FACET, function (u) { return 0.62 * (1 - smooth(u)); }));
  s += ink(LEGS, skinX(P.spine, 5.6, 7.6)) + ink(TORSO, P.torsoFn);
  s += ink(HAT, P.hatFn);

  // the near arm in front of the body; a sleeve cut rides its back edge (sharp at the shoulder, open at the elbow)
  var A = armPts(P), arm = crv(A, true);
  var cutPts = crvPts(arm, ARM_CUT[0], ARM_CUT[1], 8);
  s += cut(ribbon(cutPts, function (u) { return 2 * SLEEVE[0] * smooth(u / SLEEVE[1]) * (1 - smooth((u - SLEEVE[2]) / SLEEVE[3])); }, { samples: 3 }));
  s += front(arm);

  // rod in front of everything it crosses (a clean gap), held in two fists
  var G = gripFrame(P), rp = P.rp, mid = ribbon(rp.slice(1, 9), function (u) { return rodW(lerp(1 / 12, 8 / 12, u)); });
  var fine = rodPts(P.grip, P.rd, P.drop, 1), k0 = 7, s0 = k0 / 48;
  var shaft = [fine[k0]].concat(fine.filter(function (p, i) { return i > k0 && (i - k0) % 3 === 0; }));
  if ((48 - k0) % 3 !== 0) shaft.push(fine[48]);
  s += cutAround(mid, 0.6) + front(ribbon(shaft, function (u) { return Math.min(1.0, rodW(lerp(s0, 1, u))); }, { caps: ['flat', 'round'] }));
  var FA = function (a, b) { return [P.E[0] + P.d[0] * a + P.n[0] * b, P.E[1] + P.d[1] * a + P.n[1] * b]; };
  // the far fist turns part of the way from the rod toward its own forearm (about its centre, a hand-width up the rod)
  var ph = rad(FAR_TURN * (P.rd - deg(P.fa))), cph = Math.cos(ph), sph = Math.sin(ph);
  var FF = function (u, v) { var du = u - 1.0; return G(1.0 + du * cph + v * sph, -du * sph + v * cph); };
  s += front(FIST_N, FA) + front(FIST_F, FF);

  // ── what hangs on the line ──
  var floatFn = null, fishFn = null, top;
  if (fr < 28.6 || fr >= 52.5) {
    // the float rides the water and dips on every tug
    var sk = fr >= 52.5 ? trk(fr, [[52.5, 0.55], [53.5, 0.14], [54.5, 0.3], [55.5, 0.05], [56.5, 0.1], [58, 0]]) : floatSink(fr);
    floatFn = chain(rot(0, 0, -5 + 4 * sk), move(FLOAT_X, WY + sk * 2.8));
    top = floatFn(0, -FLOAT_H);
    if (sk > 0.92) { top = [FLOAT_X - 0.2, WY + 0.25]; floatFn = null; }
    s += hairline(sagLine(tip, top, 0.35 * (1 - sk)), 0.6);
  } else if (fr < F_BREAK) {
    // the bite and the first instant of the strike: float pulled under, the line taut into the water
    s += hairline(seg2(tip, [FLOAT_X - 0.25, WY + 0.25]), 0.6);
  } else if (fr < 41) {
    // the strike: the fish breaks the surface on a taut line, then swings and flaps under the bowed rod
    var sw = rad(trk(fr, SWING)), hangM = [tip[0] + Math.sin(sw) * HANG, tip[1] + Math.cos(sw) * HANG];
    var ue = easeOut(clamp((fr - F_BREAK) / (31 - F_BREAK)));
    var mouth = [lerp(FLOAT_X - 0.3, hangM[0], ue), lerp(WY + 0.4, hangM[1], ue)];
    var a = hangAngle(tip, mouth), dd = [-Math.sin(rad(a)), Math.cos(rad(a))];
    var knot = [mouth[0] - dd[0] * KNOT, mouth[1] - dd[1] * KNOT];
    floatFn = chain(rot(0, 0, a), move(knot[0], knot[1]));
    top = floatFn(0, -FLOAT_H);
    s += hairline(seg2(tip, top), 0.6) + hairline(seg2(knot, mouth), 0.6);
    var flap = trk(fr, FLAP);
    fishFn = chain(bend(0, 0, 0, FISH_LEN, flap * 0.85), rot(0, 0, a + flap * 7), move(mouth[0], mouth[1]));
  } else {
    // released: the fish twists free and dives back; the bare float dangles, then flies out on the cast
    var tau = fr - 41, P41 = pose(41), sw0 = rad(trk(41, SWING));
    var m0 = [P41.tip[0] + Math.sin(sw0) * HANG, P41.tip[1] + Math.cos(sw0) * HANG];
    // it drops head over tail, slows as it enters the water, and the tail goes under last
    var c0 = [m0[0], m0[1] + 2.1], cc = [c0[0] + 0.3 * tau, c0[1] + trk(fr, DIVE)];
    if (cc[1] < WY + 1.6) {
      var spin = -deg(sw0) + 66 * tau, flap2 = trk(fr, FLAP);
      fishFn = chain(move(0, -2.1), bend(0, -2.1, 0, 2.16, flap2 * 0.85), rot(0, 0, spin), move(cc[0], cc[1]));
    }
    var swF = rad(10 * Math.sin(tau * 1.4) * Math.exp(-tau / 2.4));
    var dang = [tip[0] + Math.sin(swF) * (L1 + FLOAT_H), tip[1] + Math.cos(swF) * (L1 + FLOAT_H)];
    var fp, fa2;
    if (fr < 48.2) { fp = dang; fa2 = hangAngle(tip, fp); }
    else {
      var k = clamp((fr - 48.2) / (52.5 - 48.2)), land = [FLOAT_X, WY + 0.55 * 2.8], c = [17.0, dang[1] - 3.0];
      fp = [(1 - k) * (1 - k) * dang[0] + 2 * (1 - k) * k * c[0] + k * k * land[0], (1 - k) * (1 - k) * dang[1] + 2 * (1 - k) * k * c[1] + k * k * land[1]];
      fa2 = lerp(hangAngle(tip, fp), -5 + 4 * 0.55, smooth(clamp((k - 0.55) / 0.45)));
    }
    floatFn = chain(rot(0, 0, fa2), move(fp[0], fp[1]));
    top = floatFn(0, -FLOAT_H);
    s += hairline(seg2(tip, top), 0.6);
  }
  if (floatFn) {
    s += ink(aboveWater(tp(FLOAT, floatFn), WY + 0.6));
    // the light band shows only while enough of it is above the water (no slivers at the water line)
    var bt = floatFn(0, -1.5)[1];
    if (bt < WY - 0.55) s += cut(aboveWater(tp(FLOAT_BAND, floatFn), WY - 0.1));
  }
  if (fishFn) {
    s += ink(aboveWater(tp(FISH, fishFn), WY + 0.6));
    var eye = fishFn(FISH_EYE[0], FISH_EYE[1]);
    if (eye[1] < WY - 0.5) s += cut(circlePath(eye[0], eye[1], 0.22));
  }

  // ── water: one brush stroke with travelling crests, and splash ──
  s += ink(waterPath(fr));
  s += splash(fr);
  return s;
}

// fishing line hanging from the tip with a slight sag toward the angler
function sagLine(a, b, sag) {
  var mx = lerp(a[0], b[0], 0.6) - sag, my = lerp(a[1], b[1], 0.6);
  return 'M' + f(a[0]) + ' ' + f(a[1]) + 'Q' + f(mx) + ' ' + f(my) + ' ' + f(b[0]) + ' ' + f(b[1]);
}

// water: a brush stroke — dead-straight top on y 16, the underside thinning from under the stone toward a soft point;
// ripple rings travel out along the top as small crests
var RINGS = [[7, 0.36, FLOAT_X], [9, 0.45, FLOAT_X], [11, 0.32, FLOAT_X], [22, 0.42, FLOAT_X], [24, 0.45, FLOAT_X],
  [27.6, 0.55, FLOAT_X], [29.9, 0.62, FLOAT_X - 0.3], [43.6, 0.6, DIVE_X], [52.5, 0.55, FLOAT_X]];
function waterTop(x) { var k = clamp((x - 15.6) / 1.35); return WY + 0.3 * k * k; }
function waterPath(fr) {
  var pts = [];
  for (var x = 9.3; x <= 16.9001; x += 0.1) {
    var y = waterTop(x), fall = 1 - smooth((x - 15.9) / 1.0);
    for (var i = 0; i < RINGS.length; i++) {
      var age = fr - RINGS[i][0];
      if (age < 0 || age > 6) continue;
      var k = age / 6, h = RINGS[i][1] * Math.pow(1 - k, 1.4), r = 0.95 + 2.3 * easeOut(k), w = 0.62 + 0.35 * k;
      for (var sg = -1; sg <= 1; sg += 2) {
        var uu = (x - (RINGS[i][2] + sg * r)) / w;
        if (Math.abs(uu) < 1) y -= fall * h * Math.pow(Math.cos(Math.PI * uu / 2), 2);
      }
    }
    pts.push([x, y]);
  }
  var d = 'M2.0 16L9.3 16' + smoothPath(pts, false).replace(/^M[^C]*/, '');
  return d + 'C16.93 16.31 16.92 16.33 16.88 16.36C16.5 16.6 15.8 16.7 14.9 16.7C13.0 16.7 11.0 16.95 9.5 16.95L2.0 16.95Z';
}

// splash: a slim two-horned crown where the fish breaks out (and, smaller, where it dives back), plus a few short drops
function droplet(x, y, r, dg) {   // round head at x,y, short tail pointing back along dg
  var d = 'M' + (-1.5 * r) + ' 0C' + (-1.0 * r) + ' ' + (-0.4 * r) + ' ' + (-0.7 * r) + ' ' + (-r) + ' 0 ' + (-r) +
    'C' + (0.56 * r) + ' ' + (-r) + ' ' + r + ' ' + (-0.56 * r) + ' ' + r + ' 0C' + r + ' ' + (0.56 * r) + ' ' + (0.56 * r) + ' ' + r + ' 0 ' + r +
    'C' + (-0.7 * r) + ' ' + r + ' ' + (-1.0 * r) + ' ' + (0.4 * r) + ' ' + (-1.5 * r) + ' 0Z';
  return tp(d, chain(rot(0, 0, dg), move(x, y)));
}
function crown(x, age, sc) {
  if (age <= 0 || age >= 2) return '';
  var cr = Math.sin(Math.PI * age / 2);
  return ink(petal(x - 0.42 * sc, WY + 0.2, 1.75 * sc * cr + 0.01, 0.48 * sc * cr + 0.01, -122, { tip: 'point', bend: 0.4, base: 0.4, peak: 0.3 })) +
    ink(petal(x + 0.42 * sc, WY + 0.2, 1.6 * sc * cr + 0.01, 0.46 * sc * cr + 0.01, -58, { tip: 'point', bend: -0.4, base: 0.4, peak: 0.3 }));
}
function splash(fr) {
  // [start frame, x, scale, [[vx, vy, size], ...]] — uneven sizes and angles so no two drops mirror each other
  var s = '', bursts = [[29.2, FLOAT_X - 0.3, 1.0, [[-1.05, -1.55, 0.85], [0.78, -1.95, 0.72]]],
    [43.4, DIVE_X, 0.75, [[-1.2, -1.35, 0.72], [0.95, -1.9, 0.62]]]];
  for (var b = 0; b < bursts.length; b++) {
    var age = fr - bursts[b][0], dirs = bursts[b][3], sc = bursts[b][2];
    s += crown(bursts[b][1], age, sc);
    if (age <= 1.0 || age > 3.8) continue;       // drops fly once the crown has risen, clear of the fish
    for (var i = 0; i < dirs.length; i++) {
      var v = dirs[i], tt = age - 0.6;
      var x = bursts[b][1] + (0.6 * Math.sign(v[0]) + v[0] * tt * 1.1) * sc, y = WY - 0.6 + (v[1] * tt + 0.66 * tt * tt) * sc;
      if (y > WY - 0.75 || x > 16.6 || x < 9.8) continue;          // drops fall back into the water or leave the frame
      var vy = v[1] + 1.32 * tt, a = deg(Math.atan2(vy, v[0]));
      s += ink(droplet(x, y, (0.44 - 0.06 * tt) * Math.sqrt(sc) * v[2], a));
    }
  }
  return s;
}
