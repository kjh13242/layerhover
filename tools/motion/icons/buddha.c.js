// 반가사유상 (Pensive Bodhisattva) — variant C: gesture first.
// One confident silhouette in the front view of National Treasure 83: a low crown of three lotus-petal
// lobes, the head bowed and leaning onto two fingertips, the forearm propped on the crossed knee (the
// hand-to-cheek triangle is the main window), the crossed shin as a near-horizontal ending in an upturned
// foot, the robe falling over the round stool as a bell with two layered folds, the pendant leg on a lotus.
// Motion (고쳐 앉기): rest → gather → the back straightens first, the head lifts after it and the hand lets
// go last → one breath, the shoulders settle → the body sinks back and the hand rises to meet the cheek.

// ── helpers ────────────────────────────────────────────────────────────────────────────────────
// pen: Figma-style pen tool. Knot = [x, y, dir, inLen, outLen, outDir?] (dir in degrees, 0 = right, 90 = down)
function pen(K, closed) {
  var R = Math.PI / 180, n = K.length, d = 'M' + f(K[0][0]) + ' ' + f(K[0][1]), last = closed ? n : n - 1;
  for (var k = 0; k < last; k++) {
    var A = K[k], B = K[(k + 1) % n];
    var ao = (A[5] !== undefined ? A[5] : A[2]) * R, ai = B[2] * R;
    d += 'C' + f(A[0] + Math.cos(ao) * A[4]) + ' ' + f(A[1] + Math.sin(ao) * A[4]) + ' ' +
      f(B[0] - Math.cos(ai) * B[3]) + ' ' + f(B[1] - Math.sin(ai) * B[3]) + ' ' + f(B[0]) + ' ' + f(B[1]);
  }
  return d + (closed ? 'Z' : '');
}
// move a knot through a point transform, turning its tangents with it
function tk(q, fn) {
  var R = Math.PI / 180, p = fn(q[0], q[1]);
  function dir(a) { var e = 0.05, r = fn(q[0] + Math.cos(a * R) * e, q[1] + Math.sin(a * R) * e); return Math.atan2(r[1] - p[1], r[0] - p[0]) / R; }
  return [p[0], p[1], dir(q[2]), q[3], q[4], q[5] !== undefined ? dir(q[5]) : undefined];
}
// mirror-symmetric closed shape from the right half (bottom axis knot → top axis knot)
function sym(K) {
  var full = K.slice();
  for (var k = K.length - 2; k >= 1; k--) {
    var q = K[k];
    full.push([-q[0], q[1], -(q[5] !== undefined ? q[5] : q[2]), q[4], q[3], q[5] !== undefined ? -q[2] : undefined]);
  }
  return pen(full, true);
}
// tapered stroke for negative-space details; ends = relative width at start / end
function brush(spine, w, ends) {
  ends = ends || [0, 0.25];
  return ribbon(spine, function (s) {
    var a = Math.min(1, s / 0.35) * (1 - ends[0]) + ends[0];
    var b = Math.min(1, (1 - s) / 0.35) * (1 - ends[1]) + ends[1];
    return w * Math.sqrt(Math.max(0, Math.min(a, b)));
  });
}
function P2(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
// a smooth curve running alongside a spine: each knot pushed out sideways by off[i] (side +1 = right of travel)
function alongside(spine, off, side) {
  return spine.map(function (q, i) {
    var a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    return [q[0] - side * ty / tl * off[i], q[1] + side * tx / tl * off[i]];
  });
}

// ── head (local: chin at 0,0, up = -y) ──────────────────────────────────────────────────────────
// full round face, a low band, and three upright lotus-petal lobes: the 三山冠 of National Treasure 83
var FACE = sym([
  [0, 0, 0, 0.56, 0.64],
  [1.3, -1.12, -90, 0.6, 0.5],
  [1.18, -2.25, -100, 0.4, 0.3],
  [0, -2.62, 180, 0.7, 0.7]
]);
var BAND = rectPath(-1.2, -2.6, 2.4, 0.4, 0.2);
var LOBES = [
  petal(0, -2.4, 1.18, 0.98, -90, { peak: 0.4, tip: 'point', base: 0.8, fat: 1.3 }),
  petal(-0.86, -2.38, 0.86, 0.8, -94, { peak: 0.42, tip: 'point', base: 0.8, fat: 1.3 }),
  petal(0.86, -2.38, 0.86, 0.8, -86, { peak: 0.42, tip: 'point', base: 0.8, fat: 1.3 })
];


// key poses: 0 = pensive (poster), 1 = upright. Channels move with their own timing (see ICON.at).
function pose(c) {
  var kT = c.torso, kH = c.head, kA = c.hand;
  return {
    bend: lerp(1.0, 0.3, kT) + 0.12 * c.dip,
    squash: lerp(0.95, 1.035, kT) + 0.03 * c.breath - 0.012 * c.dip,
    widen: 1 + 0.035 * c.breath,
    chin: [lerp(8.45, 9.1, kH) - 0.06 * c.dip, lerp(6.35, 5.72, kH) + 0.14 * c.dip + 0.07 * c.nestle - 0.14 * c.breath],
    tilt: lerp(-17, 3, kH) - 2.5 * c.dip - 1.5 * c.nestle,
    bow: lerp(0.92, 1, kH),
    wrist: P2([6.28, 7.5], [6.12, 7.7], kA),
    tip: P2([6.95, 5.95], [6.72, 6.42], kA),
    tipW: lerp(0.32, 0.44, kA)
  };
}

function figure(p) {
  var ink_ = '', cut_ = '', front_ = '';
  var body = chain(scaleAt(9.5, 10.4, p.widen, p.squash), bend(9.5, 10.4, 9.5, 5.6, p.bend));
  var headX = chain(scaleAt(0, 0, 1, p.bow), rot(0, 0, p.tilt), move(p.chin[0], p.chin[1]));
  function B(q) { return tk(q, body); }
  function H(q) { return tk(q, headX); }

  // torso: neck knots ride with the head, so head, neck and shoulders flow as one silhouette
  var torso = pen([
    H([-0.7, -0.5, 100, 0.2, 0.42]),
    B([7.95, 6.75, 152, 0.38, 0.3]),
    B([7.45, 7.25, 120, 0.2, 0.2]),
    B([7.9, 7.95, 50, 0.2, 0.1, 82]),
    B([8.55, 9.12, 90, 0.5, 0.4]),
    B([8.4, 10.4, 98, 0.35, 0.3, 0]),
    B([10.6, 10.4, 0, 0.7, 0.3, -90]),
    B([10.35, 9.12, -94, 0.4, 0.5]),
    B([10.82, 7.95, -70, 0.12, 0.15, -45]),
    B([11.25, 7.55, -78, 0.15, 0.22]),
    B([10.95, 7.02, 205, 0.25, 0.3]),
    B([10.4, 6.72, 210, 0.3, 0.38]),
    H([0.7, -0.5, -100, 0.42, 0.2]),
    H([0, -1.2, 180, 0.4, 0.4])
  ], true);
  ink_ += ink(torso) + ink(FACE, headX) + ink(BAND, headX);
  LOBES.forEach(function (l) { ink_ += ink(l, headX); });

  // left arm (viewer's right): hangs from the shoulder, the hand laid on the right ankle
  var sh = body(10.72, 7.42), el = body(11.5, 8.66);
  ink_ += ink(ribbon([sh, P2(sh, el, 0.55), el, [11.36, 9.4], [10.95, 9.82], [10.6, 10.0]],
    [1.42, 1.16, 0.98, 0.94, 1.06, 0.7], { caps: ['round', 'round'] }));

  // crossed right shin: round knee jutting past the elbow, tapering to a slim ankle, foot turned up
  ink_ += ink(pen([
    [4.2, 10.52, -90, 0.4, 0.4],
    [4.98, 9.76, 0, 0.42, 1.9],
    [10.9, 9.97, 2, 1.7, 0.5],
    [12.3, 9.68, -28, 0.38, 0.22],
    [12.55, 10.14, 100, 0.2, 0.25],
    [11.9, 10.72, 170, 0.32, 0.35],
    [10.9, 10.95, 184, 0.35, 1.3],
    [6.9, 11.18, 186, 1.2, 0.8],
    [4.95, 11.27, 170, 0.45, 0.4]
  ], true));
  cut_ += cut(brush([[5.0, 11.5], [8, 11.38], [10.4, 11.04]], 0.6, [0.7, 0.9]));

  // drapery over the stool: a quiet bell flaring onto the ground
  ink_ += ink(pen([
    [5.7, 10.9, 0, 0.3, 1.6],
    [10.6, 10.9, 0, 1.6, 0.2, 90],
    [10.6, 16, 90, 1.4, 0.2, 180],
    [3.95, 16, 180, 0.3, 0.2, -36],
    [5.5, 13.2, -84, 1.1, 0.75],
    [5.45, 10.9, -96, 0.6, 0.3, 0]
  ], true));
  // one long fold: the cloth slides off the propped knee and sweeps down to the pendant foot
  cut_ += cut(ribbon([[6.62, 12.72], [7.15, 13.55], [8.1, 14.28], [9.15, 14.78]], function (s) {
    return 0.64 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + 0.94 * s)), 0.5);
  }));

  // the outer layer's hem: opens from the bell's edge (a cloth corner) and slides off toward the floor
  cut_ += cut(ribbon([[4.62, 13.9], [5.45, 14.4], [6.15, 14.66], [6.75, 14.78]], function (s) {
    return 0.64 * Math.pow(Math.max(0, 1 - s), 0.6);
  }));
  // pendant left leg, the foot on a lotus cushion
  var leg = pen([
    [10.25, 10.95, 0, 0.3, 0.3],
    [11.85, 11.05, 92, 0.4, 0.6],
    [11.9, 12.4, 98, 0.5, 0.9],
    [11.72, 14.45, 100, 0.8, 0.22],
    [12.2, 15.25, 70, 0.3, 0.3, 180],
    [10.4, 15.25, 180, 0.3, 0.3, -75],
    [10.72, 14.45, -84, 0.22, 1.0],
    [10.25, 10.95, -96, 1.2, 0.3, 0]
  ], true);
  ink_ += ink(leg);
  cut_ += cut(brush([[10.0, 11.3], [10.22, 12.8], [10.48, 14.35], [10.2, 15.2]], 0.66, [0.3, 0.6]));
  // lotus footrest: a low dome the foot settles into
  ink_ += ink(pen([[9.75, 16, 180, 0.2, 0.32, -78], [11.35, 14.98, 0, 0.95, 0.95], [12.95, 16, 78, 0.32, 0.2, 180]], true));

  // right arm (front): elbow seated on the knee, forearm up, fingertips resting on the cheek
  var elbow = [5.25, 9.6], mid = P2(elbow, p.wrist, 0.5); mid = [mid[0] - 0.1, mid[1] - 0.04];
  var hand = P2(p.wrist, p.tip, 0.45);
  var spine = [elbow, mid, p.wrist, hand, p.tip];
  var widths = [1.2, 1.06, 1.0, 1.05, p.tipW];
  // separation: one smooth tapering sliver from the window up to the fingertips, closing at the contact
  var g = 0.3, sepSpine = alongside(spine.slice(1), widths.slice(1).map(function (w, i) { return w / 2 + g * [1.5, 1.15, 1, 0.75][i]; }), 1);
  cut_ += cut(ribbon(sepSpine, function (s) { return (s < 0.5 ? lerp(1.15, 0.6, s / 0.5) : 0.6) * Math.min(1, (1 - s) / 0.22); }));
  front_ += front(ribbon(spine, widths, { caps: ['round', 'round'] }));
  return ink_ + cut_ + front_;
}

var ICON = {
  id: "buddha",
  frames: 56,
  at: function (t) {
    // 7 s: rest in thought → gather → sit up (back leads, head follows, hand lets go last)
    //      → a breath, shoulders settle → sink back (hand rises to meet the cheek) → nestle → rest
    var up = function (a, b) { return seg(t, a, b, easeInOut); };
    var c = {
      torso: up(0.16, 0.40) - up(0.60, 0.84),
      head: up(0.19, 0.44) - up(0.62, 0.88),
      hand: up(0.23, 0.46) - up(0.60, 0.83),
      dip: pulse(t, 0.09, 0.22),
      breath: pulse(t, 0.41, 0.56) - 0.4 * pulse(t, 0.53, 0.67),
      nestle: pulse(t, 0.86, 0.98)
    };
    return xf(chain(scaleAt(8.7, 16, 1.05), move(0.35, 0)), figure(pose(c)));
  }
};
