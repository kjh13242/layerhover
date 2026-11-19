// 학 (Crane) — s2: 두루미 standing on two long legs, dancing (courtship gesture).
// Facing left: soft S neck into a slim pointed head-and-beak, slim body, two long tapered legs with a backward
// knee, and the drooping tertial plume (bustle) — which is the folded wing, set off from the breast by a 0.6 cut.
// Motion: poster still → the plume rises and opens into a half-open wing (primaries lag) while the neck stretches
// up and the beak tips skyward → a held breath → the wing folds back down as the crane bows, body pitching
// forward on flexed knees → it rises slowly to the poster. Feet stay planted on y = 16.
var ICON = {
  id: "crane",
  frames: 56,
  at: function (t) { return c2Scene(t); }
};

// smooth closed curve through points; [x, y, 1] marks a sharp corner
function c2Crv(pts) {
  var n = pts.length;
  function P(i) { return pts[(i % n + n) % n]; }
  function tan(i) {
    if (P(i)[2]) return [0, 0];
    return [(P(i + 1)[0] - P(i - 1)[0]) / 6, (P(i + 1)[1] - P(i - 1)[1]) / 6];
  }
  var d = 'M' + f(P(0)[0]) + ' ' + f(P(0)[1]);
  for (var i = 0; i < n; i++) {
    var a = P(i), b = P(i + 1), ta = tan(i), tb = tan(i + 1);
    d += 'C' + f(a[0] + ta[0]) + ' ' + f(a[1] + ta[1]) + ' ' + f(b[0] - tb[0]) + ' ' + f(b[1] - tb[1]) + ' ' + f(b[0]) + ' ' + f(b[1]);
  }
  return d + 'Z';
}
function c2Mix(A, B, k, k2, lagged) {
  return A.map(function (p, i) { var q = B[i], kk = lagged && lagged.indexOf(i) >= 0 ? k2 : k, r = [lerp(p[0], q[0], kk), lerp(p[1], q[1], kk)]; if (p[2]) r.push(1); return r; });
}
function c2Map(A, fn) { return A.map(function (p) { var q = fn(p[0], p[1]); if (p[2]) q.push(1); return q; }); }

// ── key shapes (facing left) ─────────────────────────────────────────────────────────────────────
var C2_BODY = [[6.4, 8.9], [8.6, 7.5], [11.6, 7.6], [13.8, 9.2, 1], [11.8, 10.9], [9.4, 11.5], [6.9, 10.7]];

// wing: folded = the drooping tertial plume over the back; raised = half-open wing lifted above the back
var C2_WING_FOLD = [[8.8, 8.1], [10.6, 7.6], [12.8, 8.0], [15.9, 11.6, 1], [14.6, 11.4, 1], [15.1, 13.5, 1], [13.6, 12.1, 1], [12.9, 13.6, 1], [11.6, 11.9], [9.9, 11.4]];
var C2_WING_LIFT = [[8.8, 8.1], [9.5, 6.0], [11.0, 4.5], [15.1, 2.7, 1], [13.7, 5.0, 1], [15.9, 4.9, 1], [14.0, 6.6, 1], [15.6, 8.0, 1], [12.8, 9.8], [10.4, 10.6]];

// neck spines: base → mid → upper → back of head; and head direction (deg) per pose
var C2_NECK = {
  stand: { s: [[7.5, 9.2], [6.0, 7.1], [6.25, 4.7], [5.6, 3.0]], h: 173 },
  call:  { s: [[7.5, 9.2], [6.4, 7.0], [6.9, 4.9], [6.6, 3.7]], h: 204 },
  bow:   { s: [[7.5, 9.2], [5.8, 7.3], [4.7, 6.6], [4.0, 7.3]], h: 118 }
};

function c2Pose(A, B, k) {
  return { s: A.s.map(function (p, i) { return mix(p, B.s[i], k); }), h: lerp(A.h, B.h, k) };
}

function c2Scene(t) {
  // timeline: poster still → wings lift with the neck stretched up (call) → hold → wings fold into a bow → rise
  var lift = bump(t, 0.08, 0.32, 0.46, 0.70, smooth);
  var tips = bump(t, 0.10, 0.36, 0.49, 0.73, smooth);              // primaries lag the arm
  var breath = 0.07 * bump(t, 0.30, 0.38, 0.46, 0.54) * loop(t, 7, 0.1);
  var call = bump(t, 0.10, 0.32, 0.44, 0.64, smooth);
  var bow = bump(t, 0.555, 0.765, 0.79, 0.985, smooth);
  var dip = 0.4 * bow + 0.2 * call;
  var tilt = -6 * bow + 2 * call;

  var pose = c2Pose(C2_NECK.stand, C2_NECK.call, call);
  pose = c2Pose(pose, C2_NECK.bow, bow);
  var T = chain(rot(10, 10.4, tilt), move(0, dip));

  var s = '';
  s += c2Leg([9.4, 10.3 + dip], [9.3, 15.6], dip);
  s += c2Leg([10.8, 10.3 + dip], [11.6, 15.6], dip);
  s += ink(c2Crv(C2_BODY), T);
  var sp = pose.s, hb = sp[3], hr = (pose.h + 180) * Math.PI / 180;
  s += ink(ribbon(sp, [1.95, 1.3, 1.1, 1.12]), T);
  s += ink(petal(hb[0] + 0.45 * Math.cos(hr), hb[1] + 0.45 * Math.sin(hr), 3.8, 1.45, pose.h, { peak: 0.2, base: 0.6, fat: 1.3 }), T);
  var W = c2Crv(c2Mix(C2_WING_FOLD, C2_WING_LIFT, lift + breath * 0.5, tips + breath, [3, 4, 5, 6, 7]));
  s += cutAround(W, 0.6, T) + front(W, T);
  return xf(scaleAt(10.4, 16, 1.08), s);
}

function c2Leg(hip, foot, kneeBack) {
  var knee = [lerp(hip[0], foot[0], 0.42) + 0.35 + 0.8 * kneeBack, lerp(hip[1], foot[1], 0.42)];
  var leg = ribbon([hip, knee, foot], [1.5, 1.12, 1.06]);
  var toe = ribbon([[foot[0] + 0.4, 15.5], [foot[0] - 1.4, 15.58]], [1.0, 0.8], { caps: ['round', 'round'] });
  return ink(leg) + ink(toe);
}
