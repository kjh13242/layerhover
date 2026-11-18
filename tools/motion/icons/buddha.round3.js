// 반가사유상 (Pensive Bodhisattva) — v2, redrawn wide (about 13 × 14.5 pt).
// Front view, slightly 3/4, of the gilt-bronze statue as one silhouette:
//  · signature: the right forearm rises from the knee to the cheek on a clean diagonal, and the negative-space
//    triangle between forearm, flank and the bowed head is the largest opening in the icon;
//  · the crossed right shin is a near-horizontal bar across the lap, the D-shaped knee at the far left under the
//    elbow, the up-turned foot poking out at the right with the left hand laid over the ankle;
//  · slender bare torso with sloping shoulders, an oval face bowed onto the fingertips, a three-peaked crown;
//  · the robe falls over the round stool in three bell-flared tiers, each hem overhanging the one below; one
//    crescent seam under the calf sets the crossed leg in front of it; the left leg hangs to a small lotus seat.
//  · Kept deliberately quiet: no brow cut and no robe fold — at 2x those read as a blindfold and barrel hoops.
// Motion (고쳐 앉기, 7 s): pensive → a small settling dip → the back straightens, the head lifts after it and the
// hand eases off the cheek (trailing the face) → one breath → the figure sinks back and the cheek finds the fingers.
// Robe, stool, crossed leg, pendant leg and lotus never move.

// ── pen: anchors with explicit handles ───────────────────────────────────────────────────────────────
// node = [x, y, ox, oy, ix, iy]: out / in handle offsets from the anchor. Without ix, iy the node is smooth.
function hin(q) { return q.length > 4 ? [q[4], q[5]] : [-q[2], -q[3]]; }
function pen(N, closed) {
  var n = N.length, d = 'M' + f(N[0][0]) + ' ' + f(N[0][1]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var a = N[i], b = N[(i + 1) % n], bi = hin(b);
    d += 'C' + f(a[0] + a[2]) + ' ' + f(a[1] + a[3]) + ' ' + f(b[0] + bi[0]) + ' ' + f(b[1] + bi[1]) + ' ' + f(b[0]) + ' ' + f(b[1]);
  }
  return d + (closed ? 'Z' : '');
}
function xn(q, fn) {
  var a = fn(q[0], q[1]), o = fn(q[0] + q[2], q[1] + q[3]), qi = hin(q), i = fn(q[0] + qi[0], q[1] + qi[1]);
  return [a[0], a[1], o[0] - a[0], o[1] - a[1], i[0] - a[0], i[1] - a[1]];
}
function mirror(R) {
  var all = R.slice();
  for (var k = R.length - 2; k >= 1; k--) { var q = R[k], qi = hin(q); all.push([-q[0], q[1], -qi[0], qi[1], -q[2], q[3]]); }
  return pen(all, true);
}
function morphNodes(A, B, k) { return A.map(function (q, i) { return q.map(function (v, j) { return lerp(v, B[i][j], k); }); }); }
function P2(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }

// a limb as one smooth filled form: Catmull-Rom spine, edges offset by their own half-widths.
// key = [x, y, outerHalfWidth (left of travel), innerHalfWidth]
function limb(keys, sub) {
  sub = sub || 10;
  var n = keys.length, L = [], R = [], P = [];
  function cr(a, b, c, d, u) { var u2 = u * u, u3 = u2 * u; return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); }
  for (var i = 0; i < n - 1; i++) {
    var k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
    for (var j = 0; j < sub; j++) {
      var u = j / sub, q = [];
      for (var c = 0; c < 4; c++) q.push(cr(k0[c], k1[c], k2[c], k3[c], u));
      P.push(q);
    }
  }
  P.push(keys[n - 1].slice());
  for (var m = 0; m < P.length; m++) {
    var a = P[Math.max(0, m - 1)], b = P[Math.min(P.length - 1, m + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    var nx = ty / tl, ny = -tx / tl;
    L.push([P[m][0] + nx * P[m][2], P[m][1] + ny * P[m][2]]);
    R.push([P[m][0] - nx * P[m][3], P[m][1] - ny * P[m][3]]);
  }
  return polyPath(L.concat(R.reverse()), true);
}

// ── head (local: chin at 0,0, up = −y) ───────────────────────────────────────────────────────────────
var FACE = mirror([
  [0, 0, 0.78, 0, -0.78, 0],
  [1.18, -1.4, 0, -0.5, 0, 0.62],
  [1.1, -2.42, -0.03, -0.2, 0.03, 0.4],
  [0, -2.75, -0.62, 0, 0.62, 0]
]);
// 삼산관: a band that steps past the temples and flares, two corner peaks, shallow saddles, a taller centre peak
var CROWN = mirror([
  [0, -2.1, 0.7, 0, -0.7, 0],
  [1.24, -2.12, 0.04, -0.16, -0.4, 0],         // the band steps out past the temples
  [1.3, -2.78, 0.0, -0.22, 0.0, 0.24],         // band sides, flaring a little
  [0.9, -3.28, -0.18, 0.0, 0.2, 0.0],          // corner mound, round
  [0.47, -3.16, -0.08, -0.16, 0.1, -0.02],      // shallow saddle
  [0, -3.78, -0.34, 0, 0.34, 0]                 // centre mound, taller and round
]);

// ── crossed right shin (fixed) ───────────────────────────────────────────────────────────────────────
var SHIN = pen([
  [3.75, 9.7, 2.4, 0.02, -0.32, 0.0],         // knee top: a tight corner where the elbow sits
  [10.9, 10.12, 0.3, 0.0, -2.2, 0.0],          // ankle, top
  [11.8, 9.5, 0.4, -0.1, -0.3, 0.16],          // heel of the up-turned foot
  [13.5, 9.36, 0.5, 0.0, -0.6, 0.0],           // sole
  [14.55, 9.7, 0.06, 0.26, -0.16, -0.14],      // toes
  [14.05, 10.2, -0.36, 0.06, 0.3, -0.1],       // under the toes
  [12.4, 10.55, -0.6, 0.0, 0.6, -0.06],        // foot, underneath
  [11.15, 10.84, -1.6, 0.1, 0.4, 0.0],         // ankle, underneath
  [6.4, 11.28, -1.4, 0.0, 1.7, 0.0],           // calf, fullest
  [3.75, 11.22, -0.3, -0.04, 0.8, 0.06],       // knee underside
  [3.02, 10.5, 0.0, -0.46, 0.0, 0.4]           // knee front, flat and near vertical
], true);

// ── robe over the round stool (fixed) ────────────────────────────────────────────────────────────────
var DRAPE = pen([
  [3.9, 10.9, 2.0, 0.0, 0, 0],                 // under the knee (hidden by the shin)
  [10.4, 10.9, 0.3, 0.0, -2.0, 0.0],
  [11.0, 11.6, 0.0, 0.6, 0.0, -0.3],           // behind the pendant leg (cut free by its gap)
  [11.0, 16, -1.0, 0.0, 0.0, -1.2],
  [1.8, 16, 0.42, -0.1, 0.6, 0.0],             // bottom tier's hem, a soft point on the ground
  [2.75, 14.7, -0.18, -0.02, 0.0, 0.55],       // bell-flared, tucked under the middle tier
  [2.15, 14.52, 0.42, -0.1, 0.18, 0.06],       // middle tier's hem corner
  [3.0, 13.14, -0.18, -0.02, 0.0, 0.5],        // bell-flared, tucked under the top tier
  [2.45, 12.96, 0.45, -0.16, 0.18, 0.06],      // top tier's hem corner
  [3.5, 11.1, -0.12, -0.3, 0.0, 0.7]
], true);
// the seam under the calf: nothing at the knee, opening to 0.75, joining the pendant leg's gap
var SEAM = ribbon([[3.85, 11.22], [5.0, 11.56], [7.0, 11.66], [9.2, 11.54], [10.75, 11.4]], function (s) {
  return 0.78 * Math.sin(Math.PI * Math.min(1, s * 1.4) / 2) * (s < 0.75 ? 1 : 1 - (s - 0.75) * 0.8);
});

// ── pendant left leg and lotus footrest (fixed) ──────────────────────────────────────────────────────
var SOLE = 15.1;
var LEG_N = [
  [10.55, 10.6, 0.7, -0.2, 0, 0],              // knee, inner (under the crossed ankle)
  [12.75, 10.75, 0.18, 0.45, -0.6, 0.06],      // knee, outer (under the crossed foot)
  [12.98, 12.45, 0.0, 0.75, 0.0, -0.6],        // calf swell, outer
  [12.62, 14.3, -0.03, 0.22, 0.05, -0.7],      // ankle, front
  [13.15, 14.58, 0.28, 0.08, -0.24, -0.12],    // instep
  [13.7, 14.88, 0.06, 0.12, -0.14, -0.08],     // toes
  [13.42, SOLE, -0.42, 0, 0.18, 0],            // sole under the toes
  [11.95, SOLE, -0.2, 0, 0.42, 0],             // heel, under
  [11.62, 14.78, 0, -0.2, -0.02, 0.2],         // heel, back
  [11.72, 14.3, -0.04, -0.46, 0.05, 0.18],     // ankle, back
  [11.1, 12.4, -0.06, -0.7, 0.06, 0.7]         // calf, inner
];
var LEG = pen(LEG_N, true);
var LEG_LOW = pen([[12.98, 12.45, 0, 0.75, 0, 0]].concat(LEG_N.slice(3, 10), [[11.1, 12.4, 0, 0, 0.06, 0.7]]), true);
var LOTUS = pen([
  [11.15, 16, 1.0, 0, -0.03, -0.12],
  [14.35, 16, 0.03, -0.12, -1.0, 0],
  [14.7, 15.38, 0.02, -0.2, -0.02, 0.28],
  [14.58, 14.86, -0.12, 0.08, 0.08, 0.16],     // right petal tip, rising past the sole
  [14.0, SOLE, -0.4, 0, 0.22, -0.04],
  [11.55, SOLE, -0.22, -0.04, 0.4, 0],
  [10.98, 14.86, -0.08, 0.16, 0.12, 0.08],     // left petal tip
  [10.86, 15.38, 0.02, 0.28, -0.02, -0.2]
], true);

// ── hands (local: wrist at 0,0, fingers up = −y, the face to +x) ─────────────────────────────────────
var HAND_PENSIVE = [
  [-0.45, 0.3, 0.0, -0.3, 0, 0],               // wrist, outer
  [-0.6, -0.75, 0.0, -0.24, 0.02, 0.34],       // knuckle bump of the curled fingers
  [-0.24, -1.3, -0.05, -0.22, -0.15, 0.13],    // the finger lobe leaves the bump
  [0.32, -2.08, 0.25, 0.0, -0.24, 0.0],        // fingertips, round
  [0.74, -1.52, 0.0, 0.28, 0.04, -0.32],       // inner edge of the fingers, along the cheek
  [0.68, -0.52, -0.03, 0.34, 0.03, -0.36],     // palm swell, face side
  [0.45, 0.3, -0.2, 0, 0, -0.2]                // wrist, inner
];
var HAND_EASED = [
  [-0.45, 0.3, 0.0, -0.3, 0, 0],
  [-0.54, -0.72, 0.0, -0.22, 0.0, 0.32],
  [-0.12, -1.36, 0.06, -0.2, -0.15, 0.15],
  [0.55, -1.92, 0.23, -0.02, -0.21, 0.02],
  [0.84, -1.36, -0.02, 0.27, 0.04, -0.25],
  [0.7, -0.46, -0.03, 0.32, 0.03, -0.32],
  [0.45, 0.3, -0.2, 0, 0, -0.2]
];

// ── torso, neck and the left arm as one contour ──────────────────────────────────────────────────────
// rig: 'h' = rides with the head (head-local), otherwise the node follows the body by how high it sits.
var TORSO = [
  [[-0.64, -0.45, -0.02, 0.5, 0.02, -0.3], 'h'],      // neck, left, under the jaw
  [[7.05, 7.5, -0.06, 0.4, 0.55, -0.1]],               // right shoulder, a round cap
  [[7.45, 8.9, 0.02, 0.5, -0.04, -0.5]],               // flank, drawing in to the waist
  [[7.45, 10.4, 0.8, 0, 0, -0.4]],                     // hip (behind the shin)
  [[10.2, 10.4, 0, -0.4, -0.8, 0]],
  [[10.15, 9.2, 0, -0.32, 0, 0.36]],                   // waist, right
  [[10.6, 8.15, 0.14, 0, -0.14, 0]],                   // top of the window inside the left arm
  [[11.02, 8.75, 0, 0.32, 0, -0.24]],                  // left arm, inner
  [[10.95, 9.45, -0.04, 0.22, 0.04, -0.26]],           // left wrist, inner
  [[10.8, 10.3, 0.3, 0.0, 0, -0.25]],                  // fingertips over the ankle (inside the shin)
  [[11.7, 9.95, 0.15, -0.15, -0.3, 0.1]],              // the hand merges into the heel it rests on
  [[12.02, 9.3, 0.04, -0.26, -0.06, 0.2]],             // wrist, outer
  [[12.12, 8.4, -0.04, -0.36, 0.04, 0.32]],            // elbow, outer
  [[11.7, 7.4, -0.14, -0.22, 0.14, 0.3]],              // left shoulder cap
  [[10.0, 6.85, -0.1, -0.2, 0.4, 0.04]],           // the neck flares into the shoulder, right
  [[0.64, -0.45, -0.02, -0.3, 0.02, 0.5], 'h'],        // neck, right
  [[0, -1.3, -0.4, 0, 0.4, 0], 'h']                    // inside the head
];

// key poses: 0 = pensive (poster), 1 = upright
function pose(c) {
  var kT = c.torso, kH = c.head, kA = c.hand;
  return {
    up: 0.95 * kT + 0.2 * c.breath - 0.1 * c.dip,       // how far the shoulders rise
    right: 0.28 * kT,
    widen: 0.12 * c.breath,
    chin: [lerp(9.0, 9.3, kH) - 0.05 * c.dip, lerp(6.6, 5.35, kH) + 0.14 * c.dip + 0.07 * c.nestle - 0.16 * c.breath],
    tilt: lerp(-15, 2, kH) - 2.5 * c.dip - 1.5 * c.nestle,
    elbow: [4.25, 9.45],
    wrist: P2([6.2, 7.2], [5.85, 7.4], kA),
    hand: lerp(-78, -66, kA),
    relax: smooth(kA)
  };
}

function armR(p) {
  var E = p.elbow, W = p.wrist, dx = W[0] - E[0], dy = W[1] - E[1];
  var a = Math.atan2(dy, dx), len = Math.hypot(dx, dy), aH = p.hand * Math.PI / 180;
  function at(o, ang, d, side) { return [o[0] + Math.cos(ang) * d - Math.sin(ang) * (side || 0), o[1] + Math.sin(ang) * d + Math.cos(ang) * (side || 0)]; }
  var fore = limb([
    at(E, a, -0.55, 0.15).concat([0.25, 0.45]),         // buried in the knee
    at(E, a, -0.3, -0.02).concat([0.6, 0.52]),       // olecranon, bulging back over the knee
    at(E, a, 0.05, -0.04).concat([0.7, 0.6]),
    at(E, a, 0.34 * len).concat([0.62, 0.6]),        // muscle belly
    at(E, a, 0.72 * len).concat([0.5, 0.47]),
    W.concat([0.43, 0.42]),                          // wrist
    at(W, aH, 0.3).concat([0.44, 0.44])
  ], 8);
  var upper = limb([
    at(E, a, 0.5 * len).concat([0.56, 0.56]),
    at(E, a, 0.72 * len).concat([0.5, 0.47]),
    W.concat([0.43, 0.42]),
    at(W, aH, 0.3).concat([0.44, 0.44])
  ], 8);
  var hx = chain(scaleAt(0, 0, 1.15), rot(0, 0, p.hand + 90), move(W[0], W[1]));
  var hand = pen(morphNodes(HAND_PENSIVE, HAND_EASED, p.relax).map(function (q) { return xn(q, hx); }), true);
  return { fore: fore, upper: upper, hand: hand };
}

function figure(p) {
  var headX = chain(scaleAt(0, 0, 1.12), rot(0, 0, p.tilt), move(p.chin[0], p.chin[1]));
  function body(x, y) {
    var w = clamp((10.3 - y) / 3.2);
    return [x + p.right * w + p.widen * (x - 9) * w * 0.15, y - p.up * w];
  }
  var torso = TORSO.map(function (e) {
    var q = e[0];
    if (e[1] === 'h') { var h = headX(q[0], q[1]), qi = hin(q); return [h[0], h[1], q[2], q[3], qi[0], qi[1]]; }
    return xn(q, body);
  });
  var s = '';
  s += ink(DRAPE) + ink(SHIN) + ink(pen(torso, true)) + ink(FACE, headX) + ink(CROWN, headX);
  s += cut(SEAM);
  var arm = armR(p);
  // once the fingers leave the cheek, the hand floats in front of the chest with its own clean gap
  var gap = 0.6 * smooth(p.relax / 0.4);
  s += cutAround(arm.upper, 0.5) + (gap > 0.05 ? cutAround(arm.hand, gap) : '') + front(arm.fore) + front(arm.hand);
  s += cutAround(LEG_LOW, 0.62) + cutAround(LOTUS, 0.62) + front(LEG) + front(LOTUS);
  return s;
}

function channels(t) {
  var up = function (a, b) { return seg(t, a, b, easeInOut); };
  return {
    torso: up(0.16, 0.40) - up(0.60, 0.84),
    head: up(0.19, 0.44) - up(0.62, 0.88),
    hand: up(0.23, 0.46) - up(0.60, 0.83),
    dip: pulse(t, 0.09, 0.22),
    breath: pulse(t, 0.41, 0.56) - 0.4 * pulse(t, 0.53, 0.67),
    nestle: pulse(t, 0.86, 0.98)
  };
}

var ICON = {
  id: "buddha",
  frames: 56,
  at: function (t) { return figure(pose(channels(t))); }
};
