// 반가사유상 (Pensive Bodhisattva) — variant g, GESTURE.
// A slightly turned three-quarter view built around the pensive gesture: the crowned head bows onto two fingertips,
// the forearm rises in one long diagonal from the knee to the cheek, and the slender body makes one S-curve down to
// the crossed shin, the robe cascading over the round stool, the pendant leg on its lotus footrest.
// Motion — 고쳐 앉기: the hand eases off the cheek, the back straightens and the head lifts, a breath, then it sinks back.

var ICON = {
  id: "buddha",
  frames: 48,
  at: function (t) { return buddhaScene(t); }
};

// smooth closed/open curve through points; a point [x, y, 1] is a corner
function gCrv(pts, closed) {
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
function gLerpPts(a, b, k) { return a.map(function (p, i) { var q = b[i]; return p[2] ? [lerp(p[0], q[0], k), lerp(p[1], q[1], k), 1] : [lerp(p[0], q[0], k), lerp(p[1], q[1], k)]; }); }
function gTx(pts, fn) { return pts.map(function (p) { var q = fn(p[0], p[1]); return p[2] ? [q[0], q[1], 1] : q; }); }

// ── fixed base: stool drum, two-tier robe cascade, lotus footrest (never move) ──────────────────
var STOOL = gCrv([[5.5, 14.9, 1], [9.95, 14.9, 1], [10.3, 16, 1], [5.15, 16, 1]], true);
// the robe: one flared bell falling over the stool from under the crossed shin, its hem softly scalloped
var ROBE = gCrv([[5.3, 10.9], [7.7, 11.1], [10.1, 10.9], [10.4, 12.4], [10.85, 14.3, 1], [9.3, 14.1], [7.75, 14.3], [6.2, 14.1], [4.6, 14.3, 1],
  [5.0, 12.4]], true);
// the cascade: one pleat opening at the hem and closing upward
var FOLDS = [[[7.75, 14.4], [7.6, 13.6], [7.85, 12.75]]];
var FOOTREST = gCrv([[11.0, 16, 1], [11.15, 15.2], [12.9, 14.95], [14.65, 15.2], [14.8, 16, 1]], true);

// ── key poses: P = pensive (poster), U = upright ────────────────────────────────────────────────
// torso (closed): neck front, near shoulder, near waist, near hip, far hip, far waist, far shoulder, nape
var TORSO_P = [[5.9, 6.35], [4.75, 7.0], [5.75, 7.7], [6.55, 9.0], [6.2, 10.4, 1], [9.5, 10.4, 1], [9.25, 8.9], [9.7, 7.7], [9.2, 6.8], [7.0, 6.2]];
var TORSO_U = [[6.4, 5.5], [5.25, 6.25], [6.0, 7.1], [6.65, 8.8], [6.2, 10.4, 1], [9.5, 10.4, 1], [9.3, 8.8], [9.8, 7.2], [9.5, 6.3], [7.6, 5.5]];
var POSE = {
  P: { head: [5.3, 4.9], tilt: -17, farSh: [8.6, 7.4], rest: null },
  U: { head: [6.5, 4.15], tilt: -1, farSh: [9.0, 6.6] }
};
var ELBOW = [2.7, 9.5];             // the near elbow rests on the crossed knee
var TIP_OFF = [3.75, 7.0];            // where the fingertips ease to, off the cheek

// head (local: centre 0,0, upright): an oval face, fuller at the cheeks, a soft chin; a low three-peaked crown
var HEAD = [[0, -1.65], [1.0, -1.3], [1.3, -0.2], [1.05, 0.95], [0.3, 1.65], [-0.45, 1.6], [-1.05, 0.95], [-1.3, -0.2], [-1.0, -1.3]];
var CROWN = [[-1.3, -0.95, 1], [-1.45, -1.75], [-1.1, -2.2], [-0.6, -1.95], [-0.3, -2.55], [0.0, -2.75], [0.3, -2.55], [0.6, -1.95], [1.1, -2.2], [1.45, -1.75], [1.3, -0.95, 1], [0.7, -1.3], [0, -1.42], [-0.7, -1.3]];
var CHEEK = [-1.2, 0.55];             // where the fingertips rest

function headFn(c, tilt) { return chain(scaleAt(0, 0, 1.1), rot(0, 0, tilt), move(c[0], c[1])); }

function buddhaScene(t) {
  // hand first, then the back, the head last on the rise; reverse order on the way down
  var kA = bump(t, 0.10, 0.36, 0.66, 0.92, easeInOut);
  var kT = bump(t, 0.13, 0.40, 0.62, 0.88, easeInOut);
  var kH = bump(t, 0.16, 0.44, 0.58, 0.86, easeInOut);
  var breath = 0.25 * pulse(t, 0.42, 0.62);

  var s = '';
  s += ink(STOOL) + ink(ROBE);
  FOLDS.forEach(function (fp) { s += cut(ribbon(fp, function (u) { return 0.8 * (1 - smooth(u)); })); });
  s += ink(FOOTREST);

  // pendant (left) leg: calf, ankle, foot on the footrest
  var leg = gCrv([[10.6, 11.0], [11.9, 10.9], [12.3, 12.0], [12.2, 13.0], [12.35, 13.65], [13.6, 13.95], [14.25, 14.2], [13.95, 14.45, 1],
    [11.45, 14.45, 1], [11.35, 13.8], [11.1, 12.8], [10.6, 12.0]], true);
  s += cutAround(leg, 0.6) + front(leg);

  // torso and head (one silhouette through the neck)
  var torso = gLerpPts(TORSO_P, TORSO_U, kT).map(function (p, i) { return (i <= 1 || i >= 7) ? [p[0], p[1] - breath] : p; });
  s += ink(gCrv(torso, true));
  var hc = mix(POSE.P.head, POSE.U.head, kH), tilt = lerp(POSE.P.tilt, POSE.U.tilt, kH);
  hc = [hc[0], hc[1] - breath];
  var HF = headFn(hc, tilt);
  s += ink(gCrv(HEAD, true), HF);
  s += cutAround(gCrv(CROWN, true), 0.6, HF) + front(gCrv(CROWN, true), HF);

  // crossed (right) shin across the lap: round knee at the left, tapering to the ankle, the foot over the far knee
  var lap = gCrv([[2.0, 9.85], [3.2, 9.7], [6.0, 9.95], [9.3, 10.0], [10.6, 9.75], [11.9, 9.35], [12.65, 9.5], [12.5, 10.15], [11.5, 10.85],
    [9.6, 11.2], [6.0, 11.45], [3.0, 11.65], [1.85, 10.95]], true);
  s += cutAround(lap, 0.6) + front(lap);

  // far arm: hangs from the shoulder, the elbow out, the hand resting on the crossed ankle
  var fs = mix([9.55, 7.35], [9.85, 6.75], kT);
  fs = [fs[0], fs[1] - breath];
  var farArm = ribbon([fs, [10.35, 8.6], [10.55, 9.75]], [1.3, 1.15, 0.95], { caps: ['round', 'flat'] });
  var farHand = petal(10.55, 9.45, 1.25, 1.05, 100, { peak: 0.45, base: 0.9, tip: 'round', fat: 1.3 });
  s += front(farArm) + front(farHand);
  var ax = mix([9.25, 8.0], [9.5, 7.5], kT);
  s += cut(ribbon([ax, [9.5, 8.8], [9.85, 9.55]], function (u) { return 0.7 * Math.sin(Math.PI * u); }));

  // near arm: the upper arm hides behind the forearm; one long diagonal from the elbow on the knee to the cheek
  var sh = [lerp(3.95, 4.5, kT), lerp(7.45, 6.75, kT) - breath];
  var upper = ribbon([sh, mix(sh, ELBOW, 0.5), ELBOW], [1.35, 1.25, 1.2], { caps: ['round', 'flat'] });
  var cheek = HF(CHEEK[0], CHEEK[1]);
  var tip = mix(cheek, TIP_OFF, kA);
  var dir = [tip[0] - ELBOW[0], tip[1] - ELBOW[1]], L = Math.hypot(dir[0], dir[1]);
  var u = [dir[0] / L, dir[1] / L];
  var wrist = [tip[0] - u[0] * 1.35, tip[1] - u[1] * 1.35];
  var fore = ribbon([ELBOW, wrist], [1.4, 0.95], { caps: ['round', 'flat'] });
  var hand = petal(wrist[0] - u[0] * 0.15, wrist[1] - u[1] * 0.15, 1.55, 1.1, Math.atan2(u[1], u[0]) * 180 / Math.PI, { peak: 0.4, base: 0.85, tip: 'round', bend: -0.15, fat: 1.3 });
  s += ink(upper);
  s += cutAround(hand, 0.5) + front(fore) + front(hand);
  return s;
}
