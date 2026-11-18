// 반가사유상 (Pensive Bodhisattva) — variant B: elegance first.
//
// One continuous bronze silhouette instead of parts on sticks: neck, shoulders, torso and the hanging arm are a
// single hand-drawn contour, the pensive forearm a tapered form merged into it, and the details are carved as
// negative space —
//   · a crown with a central lancet point between two rounded "mountain" shoulders (삼산관), lifted off the
//     bowed face by a brow line;
//   · the pensive window: the forearm rises from the knee, the fingers meet the cheek across a hairline, and a
//     lens of air opens between the forearm, the shoulder and the jaw;
//   · the crossed right shin as one long tapering form (knee 1.35 → ankle 0.95) ending in an upturned foot;
//   · the robe falling over the round stool in two tiers — an apron with a deep U swag whose corner overhangs a
//     lower tier that spreads to the ground — with the pendant leg (calf, slim ankle) in front, on a lotus pod.
// Motion — 고쳐 앉기 (re-settling), 6 s: hold the pose · the hand eases off the cheek · the back straightens and
// the head lifts after it, a touch past upright · a breath, the shoulders settle · the figure leans back in and
// the cheek comes to rest on the fingers last. Stool, drapery, crossed leg and footrest stay on the ground.

// ── pen: contours as anchor nodes with handles, like a vector editor ─────────────────────────────
// node = [x, y, outX, outY, inX, inY] (handle offsets from the anchor); without inX/inY the node is smooth.
function pen(nodes, closed) {
  var n = nodes.length, d = 'M' + f(nodes[0][0]) + ' ' + f(nodes[0][1]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var a = nodes[i], b = nodes[(i + 1) % n];
    var ox = a[2] || 0, oy = a[3] || 0;
    var ix = b.length > 4 ? b[4] : -(b[2] || 0), iy = b.length > 4 ? b[5] : -(b[3] || 0);
    d += 'C' + f(a[0] + ox) + ' ' + f(a[1] + oy) + ' ' + f(b[0] + ix) + ' ' + f(b[1] + iy) + ' ' + f(b[0]) + ' ' + f(b[1]);
  }
  return d + (closed ? 'Z' : '');
}
function shiftNodes(A, dx, dy) { return A.map(function (a) { var b = a.slice(); b[0] += dx; b[1] += dy; return b; }); }
// move a node (anchor and both handles) with a point transform
function xfNode(n, fn) {
  var a = fn(n[0], n[1]), o = fn(n[0] + (n[2] || 0), n[1] + (n[3] || 0));
  var ix = n.length > 4 ? n[4] : -(n[2] || 0), iy = n.length > 4 ? n[5] : -(n[3] || 0), q = fn(n[0] + ix, n[1] + iy);
  return [a[0], a[1], o[0] - a[0], o[1] - a[1], q[0] - a[0], q[1] - a[1]];
}
// a transform applied with weight w (0 = stays, 1 = full)
function wt(fn, w) { return function (x, y) { var q = fn(x, y); return [lerp(x, q[0], w), lerp(y, q[1], w)]; }; }
// scale along one axis through (cx, cy): foreshortening of a limb that tips toward the viewer
function axisScale(cx, cy, ux, uy, s) {
  return function (x, y) { var p = (x - cx) * ux + (y - cy) * uy; return [x + (s - 1) * p * ux, y + (s - 1) * p * uy]; };
}

// ── head (local: origin at the face centre, upright) ──
var FACE_N = [[0, -1.38, 0.72, 0], [1.25, -0.1, 0, 0.82], [0, 1.52, -0.6, 0], [-1.25, -0.1, 0, -0.82]];
// crown: a lancet point between two rounded shoulders, on a band
var CROWN_N = [
  [-1.2, -0.36, -0.12, -0.08, 0.6, -0.5],
  [-1.32, -0.8, 0.0, -0.4, -0.02, 0.18],
  [-1.32, -1.62, 0.0, -0.3, 0.0, 0.3],         // band, left edge
  [-0.92, -2.14, 0.28, 0.0, -0.26, 0.0],       // left shoulder, a rounded mountain
  [-0.54, -1.9, 0.08, -0.3, -0.04, -0.2],      // valley
  [-0.08, -2.52, 0.06, -0.06, -0.2, 0.24],     // centre point (lancet)
  [0.08, -2.52, 0.2, 0.24, -0.06, -0.06],
  [0.54, -1.9, 0.04, -0.2, -0.08, -0.3],       // valley
  [0.92, -2.14, 0.26, 0.0, -0.28, 0.0],        // right shoulder
  [1.32, -1.62, 0.0, 0.3, 0.0, -0.3],
  [1.32, -0.8, 0.02, 0.18, 0.0, -0.4],
  [1.2, -0.36, -0.6, -0.5, 0.12, -0.08]
];
var BROW = 'M-1.3 -0.32C-0.8 -0.84 0.8 -0.84 1.78 -0.06';
var CHEEK = pen([[-1.3, 0.02, 0.02, 0.4], [-0.95, 1.05, 0.25, 0.3]], false);
var HS = 1.04;                                   // head scale
var HEAD_P = [7.62, 5.2, -14];                   // pensive: centre x, y, tilt
var HEAD_U = [0.0, -2.0];                        // upright: offset of the centre from the neck base
function headAt(x, y, a) { return chain(scaleAt(0, 0, HS), rot(0, 0, a), move(x, y)); }

// ── rig points ──
var PELVIS = [8.8, 10.5], ELBOW = [4.84, 8.95], LEAN = -7;
var GAP = 0.7;                                   // separation where one part passes in front of another
var FORE_AX = [0.29, -0.957];                   // forearm axis, elbow → wrist

// ── body: neck, shoulders, upper arm, left arm, torso to the lap (drawn upright; the rig leans it into the pose) ──
var BODY_D0 = [
  [0, 0, 0, 0.35, 0, -0.3],                  // 0 neck (set from the jaw below)
  [8.08, 6.62, -0.24, 0.14, 0.05, -0.3],     // 1 neck base
  [7.7, 6.98, -0.22, 0.08, 0.3, -0.08],      // 2 shoulder top
  [7.3, 7.42, -0.1, 0.2, 0.14, -0.18],       // 3 deltoid
  [5.7, 8.0, -0.2, 0.3, 0.5, -0.22],         // 4 upper arm meets the forearm (bottom of the cheek window)
  [4.95, 8.95, 0.3, 0.06, -0.12, -0.18],     // 5 elbow (tucked under the forearm)
  [5.5, 9.05, 0.55, -0.2, -0.3, 0.08],       // 6 elbow underside
  [7.62, 8.42, 0.18, 0.12, -0.55, 0.34],     // 7 armpit
  [8.1, 9.35, 0, 0.4, -0.06, -0.45],         // 8 waist
  [7.6, 10.6, 1.0, 0, 0, 0],                 // 9 hip (behind the leg)
  [10.0, 10.6, 0, 0, -1.0, 0],               // 10 hip
  [9.5, 9.75, 0.04, -0.5, 0, 0.3],           // 11 waist (runs behind the crossed leg)
  [9.9, 8.05, 0.2, 0.12, -0.05, 0.35],       // 12 armpit
  [10.12, 8.8, 0.0, 0.3, -0.08, -0.3],       // 13 left elbow, inner
  [10.0, 9.85, 0.0, 0.22, 0.02, -0.4],       // 14 left wrist, inner (behind the leg)
  [10.3, 10.14, 0.28, 0.08, -0.12, -0.18],   // 15 hand on the ankle
  [11.18, 9.66, 0.05, -0.3, 0.14, 0.25],     // 16 hand, outer
  [11.3, 8.65, -0.02, -0.5, 0.05, 0.42],     // 17 left elbow, outer
  [10.55, 7.34, -0.14, -0.24, 0.26, 0.36],   // 18 left shoulder
  [9.88, 6.96, -0.32, -0.08, 0.3, 0.08],     // 19 trapezius
  [9.36, 6.62, -0.05, -0.3, 0.3, 0.14],      // 20 neck base
  [0, 0, 0, 0, 0, 0.3]                       // 21 neck (set from the jaw below)
];
// right forearm and hand: one tapered form from the elbow on the knee to the fingertips on the cheek
// (elbow 1.2 → wrist 1.0 → palm 1.06 → fingertips 0.95, bending at the wrist toward the face)
var FORE = [[4.86, 8.64], [5.04, 7.9], [5.38, 7.12], [5.84, 6.46], [6.3, 6.06]];
var FORE_W = [1.2, 1.14, 1.0, 1.06, 0.95];
// rig: 'h' = follows the head (the neck enters the jaw), numbers = how much of the torso transform a node takes
var RIG = ['h', 1, 1, 1, 0.15, 0, 0, 0.55, 0.4, 0, 0, 0.4, 0.85, 0.55, 0.15, 0, 0.15, 0.55, 1, 1, 1, 'h'];
var NECK_D = [8.65, 6.1];
// the torso is drawn as it sits upright: nodes that follow the torso are raised by their weight (the pensive pose sinks 0.55)
var BODY_D = BODY_D0.map(function (n, i) { return typeof RIG[i] === 'number' ? shiftNodes([n], 0, -0.5 * RIG[i])[0] : n; });
var JAW = [[-0.68, 0.9], [0.68, 0.9]];              // where the neck enters the head (local)

// ── crossed right leg (fixed): knee, calf, slim ankle, upturned foot ──
var LEG_N = [
  [4.2, 10.3, 0.0, -0.42, 0.0, 0.4],         // 0 knee, leftmost
  [5.05, 9.6, 1.5, 0.08, -0.48, 0],          // 1 knee top
  [10.25, 10.42, 0.5, 0.04, -1.8, -0.3],     // 2 ankle top
  [11.85, 10.14, 0.34, -0.06, -0.5, 0.06],   // 3 sole (facing up)
  [12.92, 10.3, 0.02, 0.46, 0.2, -0.22],     // 4 toe tip, softly rounded
  [12.28, 11.18, -0.42, 0.1, 0.4, -0.06],    // 5 top of the foot
  [11.0, 11.42, -0.24, 0.02, 0.34, 0.02],    // 6 heel
  [10.4, 11.34, -1.2, 0.0, 0.2, 0.02],       // 7 ankle, under
  [6.3, 11.12, -0.8, -0.04, 1.3, 0.1],       // 8 calf, fullest
  [4.88, 10.92, -0.3, -0.06, 0.36, 0.04]     // 9 under the knee
];

// torso transform: kt = 0 leans toward the knee (pensive), 1 sits upright; br lifts the chest (breath)
function torsoXf(kt, br) { return chain(rot(PELVIS[0], PELVIS[1], LEAN * (1 - kt)), move(0, 0.55 * (1 - kt) - 0.12 * br)); }

// pose: kt torso (0..1), kh head (0..1, may overshoot), ka hand eases off the cheek (0..1), br breath (0..1)
function figure(kt, kh, ka, br) {
  var T = torsoXf(kt, br);
  var F = chain(axisScale(ELBOW[0], ELBOW[1], FORE_AX[0], FORE_AX[1], 1 - 0.15 * ka), rot(ELBOW[0], ELBOW[1], -8 * ka));
  // the head rides on the neck: offset from the neck base blends from bowed to upright
  var nbP = torsoXf(0, 0)(NECK_D[0], NECK_D[1]), nb = T(NECK_D[0], NECK_D[1]);
  var off = [lerp(HEAD_P[0] - nbP[0], HEAD_U[0], kh), lerp(HEAD_P[1] - nbP[1], HEAD_U[1], kh)];
  var hx = nb[0] + off[0], hy = nb[1] + off[1], ha = lerp(HEAD_P[2], 0, kh);
  var H = headAt(hx, hy, ha);
  var body = BODY_D.map(function (n, i) {
    var r = RIG[i];
    if (r === 'h') { var j = JAW[i === 0 ? 0 : 1], p = H(j[0], j[1]); return [p[0], p[1], n[2], n[3], n[4], n[5]]; }
    return xfNode(n, wt(T, r));
  });
  var s = '';
  // drapery over the round stool, cascading in two tiers: a short apron with a U hem whose corner overhangs
  // a longer lower tier that spreads to the ground. Both run on behind the pendant leg.
  s += ink(pen([
    [5.3, 12.8, -0.06, 0.6, 0, 0],
    [4.36, 15.45, -0.12, 0.34, 0.42, -0.95],
    [4.9, 16.0, 0, 0, -0.38, 0],
    [12.0, 16.0, 0, 0, 0, 0],
    [11.6, 12.4, 0, 0, 0.0, 1.6]
  ], true));
  var APRON = [
    [6.0, 10.9, -0.1, 0.8, 0, 0],
    [5.02, 12.98, 0.5, 0.55, 0.14, -0.62],
    [8.2, 14.3, 1.5, 0.0, -1.55, 0.0],
    [11.7, 13.0, 0, 0, 0.5, 0.75],
    [11.45, 10.9, 0, 0, 0, 0]
  ];
  s += ink(pen(APRON, true));
  s += cutLine(pen(shiftNodes([[4.55, 12.85, 0.45, 0.6], APRON[2], [11.3, 13.5, 0, 0, -0.85, 0.14]], 0, 0.36), false), GAP);
  // pendant left leg (its knee passes behind the crossed foot) on a lotus pod
  var SHIN = [
    [11.35, 11.0, 0, 0, 0, 0],
    [12.62, 11.0, 0.06, 0.6, 0, 0],
    [12.74, 12.85, -0.02, 0.6, 0.02, -0.6],      // shin bone, gently convex
    [12.64, 14.35, 0.02, 0.22, 0.02, -0.45],     // ankle, front
    [13.62, 14.7, 0.3, 0.05, -0.45, -0.1],       // instep
    [13.92, 15.05, 0, 0, 0.1, -0.15],            // toes
    [11.74, 15.05, 0, -0.3, 0, 0],               // heel
    [11.76, 14.2, -0.06, -0.55, 0.02, 0.36],     // ankle, back
    [11.28, 12.45, 0.0, -0.55, 0.06, 0.62]       // calf, fullest
  ];
  s += ink(pen(SHIN, true));
  s += ink(pen([
    [11.35, 15.05, 0.9, -0.06, -0.34, 0],
    [13.9, 15.02, 0.55, 0.0, -0.7, -0.02],      // under the toes
    [14.82, 15.62, 0.02, 0.24, 0.0, -0.36],     // the pod's rounded shoulder falls away beyond the toes
    [14.4, 16.0, -0.2, 0, 0.26, 0],
    [11.35, 16.0, -0.34, 0, 0.9, 0]
  ], true));
  s += cutLine(pen([[10.93, 11.55, 0.0, 0.4], [10.92, 12.45, 0.0, 0.55, 0.0, -0.4], [11.4, 14.2, 0.04, 0.4, -0.06, -0.55], [11.39, 16.3, 0, 0, 0, -0.6]], false), GAP);
  // body, and the forearm rising from the knee to the cheek
  s += ink(pen(body, true));
  s += ink(ribbon(FORE.map(function (q) { return F(q[0], q[1]); }), FORE_W, { caps: ['round', 'round'] }));
  // crossed leg in front: thin separations above (lap, elbow, hand) and below (drapery, pendant knee)
  s += ink(pen(LEG_N, true));
  s += cutLine(pen([[4.08, 9.76, 0.2, -0.3]].concat(shiftNodes(LEG_N.slice(1, 4), 0, -0.36)), false), GAP);
  s += cutLine(pen(shiftNodes([[13.0, 10.75, -0.25, 0.25], LEG_N[5], LEG_N[6], LEG_N[7], LEG_N[8], LEG_N[9]], 0, 0.36), false), GAP);
  // head
  s += ink(pen(FACE_N, true), H) + ink(pen(CROWN_N, true), H) + cutLine(BROW, 0.6, H);
  // fingertips rest on the cheek: a hairline of air along the face contour
  s += cutLine(CHEEK, 0.6, chain(scaleAt(0, 0, 1.03), H));
  return s;
}

var ICON = {
  id: "buddha",
  frames: 48,
  at: function (t) {
    // hold the pensive pose · ease the hand off · sit up (the head follows the back, a touch past upright)
    // · breathe in and let the shoulders settle · lean back in; the cheek comes to rest on the fingers last
    var ka = seg(t, 0.08, 0.28, smoother) * (1 - seg(t, 0.62, 0.84, smoother));
    var kt = seg(t, 0.12, 0.38, smoother) * (1 - seg(t, 0.62, 0.86, smoother));
    var kh = (seg(t, 0.16, 0.42, smoother) + 0.05 * pulse(t, 0.34, 0.52)) * (1 - seg(t, 0.64, 0.9, smoother));
    var br = bump(t, 0.26, 0.42, 0.46, 0.62, smoother);
    return xf(scaleAt(9.0, 16, 1.02), figure(kt, kh, ka, br));
  }
};
