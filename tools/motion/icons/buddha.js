// Layerhover — 반가사유상 (Pensive Bodhisattva), v5 (pictogram rework after the v4 review).
// A frontal pictogram drawn for legibility at 18 pt, in priority order:
//  1. the right fingertips at the cheek of a slightly bowed head; the forearm rises steeply from the knee, and an open
//     triangle of negative space sits between forearm, upper arm and neck;
//  2. the right shin crossed over the lap: a short near-horizontal bar, knee at the left, an up-turned foot at the right;
//  3. a slender bare torso and an oval head under a low three-peaked diadem;
//  4. the left leg hanging straight down to a small lotus footrest, the robe cascading over a round stool in folds.
// Arms are hand-drawn tapered contours (shoulder 1.35 → elbow 0.95, elbow 1.25 → wrist 0.7) with a soft elbow corner on
// the knee and a slim petal hand set off from the jaw by a clean cut.
// Motion (고쳐 앉기): the hand eases off the cheek, the back straightens and the head lifts (about 1.7 pt), the shoulders
// settle with a small overshoot, a breath, then the figure sinks back and the fingertips land on the cheek last.
// Stool, robe, legs and footrest stay planted.

var ICON = {
  id: "buddha",
  frames: 48,
  at: function (t) { return bpScene(t * 48); }
};

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────
function bpTrk(fr, keys) {
  if (fr <= keys[0][0]) return keys[0][1];
  for (var i = 1; i < keys.length; i++) {
    if (fr <= keys[i][0]) { var a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], (b[2] || smooth)((fr - a[0]) / (b[0] - a[0]))); }
  }
  return keys[keys.length - 1][1];
}
// smooth closed curve through points; [x, y, 1] marks a corner
function bpCrv(pts, closed) {
  var n = pts.length;
  function P(i) { return closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; }
  function isC(i) { return P(i)[2] || (!closed && (i <= 0 || i >= n - 1)); }
  function tO(i) { var p = P(i), a = P(i - 1), b = P(i + 1); return isC(i) ? [b[0] - p[0], b[1] - p[1]] : [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]; }
  function tI(i) { var p = P(i), a = P(i - 1), b = P(i + 1); return isC(i) ? [p[0] - a[0], p[1] - a[1]] : [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]; }
  var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p1 = P(i), p2 = P(i + 1), to = tO(i), ti = tI(i + 1), k1 = isC(i) ? 0.22 : 1 / 3, k2 = isC(i + 1) ? 0.22 : 1 / 3;
    d += 'C' + f(p1[0] + to[0] * k1) + ' ' + f(p1[1] + to[1] * k1) + ' ' + f(p2[0] - ti[0] * k2) + ' ' + f(p2[1] - ti[1] * k2) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
  }
  return d + (closed ? 'Z' : '');
}
function bpMap(pts, fn) { return pts.map(function (p) { var q = fn(p[0], p[1]); return p[2] ? [q[0], q[1], 1] : q; }); }
function bpAdd(p, v, s) { return [p[0] + v[0] * s, p[1] + v[1] * s]; }
function bpUnit(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; }
function linear(x) { return clamp(x); }

var BP_DX = 0.6;                   // the drawing is built left of centre, shifted and scaled at the end
var BP_SC = 1.08;

// ── fixed parts (world, pt) ──────────────────────────────────────────────────────────────────────
var BP_HIP = [7.9, 11.8];          // the upper body pivots and straightens above this point

// robe over the round stool: a draped seat (top hidden behind the shin), a narrow waist, a flared hem
var BP_ROBE = bpCrv([[4.0, 11.2, 1], [10.1, 11.2, 1], [10.2, 12.2], [9.75, 13.2], [9.6, 14.3], [9.85, 15.3], [10.15, 16, 1],
  [3.4, 16, 1], [3.75, 15.3], [4.25, 14.3], [4.45, 13.2], [4.1, 12.2]], true);
// one deep drape swag across the robe over the round stool, thinning to nothing at both ends
var BP_FOLDS = [[[4.75, 12.95], [6.6, 13.75], [8.75, 13.15]]];
function bpFoldW(s) { return 0.66 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 0.6) * (1 - 0.3 * s); }
// pendant left leg: a tapered shin hanging from under the lap to a slim ankle, a small foot turned out (+x)
var BP_LEG = bpCrv([[9.75, 11.0, 1], [11.5, 11.0, 1], [11.45, 12.2], [11.25, 13.3], [11.2, 14.15], [11.55, 14.4], [12.5, 14.55],
  [12.9, 14.85], [12.85, 15.2, 1], [10.1, 15.2, 1], [10.05, 14.5], [9.95, 13.3], [9.75, 12.2]], true);
// lotus footrest: a low pod on the ground with softly rounded ends
var BP_REST = bpCrv([[10.55, 16, 1], [10.65, 15.5], [11.0, 15.1], [13.5, 15.1], [13.9, 15.5], [14.0, 16, 1]], true);
// crossed right shin: knee cap at the left, a near-horizontal bar tapering 1.5 → 1.1 to the ankle, the foot turned up
var BP_SHIN = bpCrv([[3.0, 10.85], [3.25, 10.1], [4.0, 9.9], [5.4, 10.05], [7.4, 10.35], [9.9, 10.55], [10.7, 10.4], [11.25, 9.95], [11.6, 9.62],
  [11.9, 9.66], [12.0, 10.2], [11.8, 11.05], [11.3, 11.55], [10.2, 11.62], [7.4, 11.52], [5.4, 11.6], [3.95, 11.75], [3.3, 11.5]], true);

// gap along the top of the shin: the torso sits behind it
var BP_LAPGAP = [[6.3, 9.85], [7.4, 10.03], [9.9, 10.23], [10.6, 10.1]];

// ── upper body (upright pose, world) ─────────────────────────────────────────────────────────────
// slender bare torso: neck, sloping shoulders, narrow waist, into the lap (hidden behind the shin)
var BP_TORSO = [[7.95, 7.35], [7.5, 7.6], [7.25, 8.1], [7.2, 8.9], [7.0, 9.9], [6.6, 11.4, 1], [9.9, 11.4, 1],
  [9.85, 9.9], [9.95, 8.9], [9.9, 8.1], [9.6, 7.6], [9.05, 7.35]];
var BP_NECK = [8.5, 7.5];
var BP_HS = 0.88;                  // head scale
var BP_NL = -0.1;                  // extra neck lift when upright (pt, - = up)
// head and neck (local: neck base at 0,0, up = -y): an oval face, the jaw tucking into a short neck
var BP_FACE = bpCrv([[0, -3.45], [1.2, -3.12], [1.3, -2.4], [1.0, -1.3], [0.66, -0.75], [0.72, 0.0], [1.05, 0.8, 1], [-1.05, 0.8, 1],
  [-0.72, 0.0], [-0.66, -0.75], [-1.0, -1.3], [-1.3, -2.4], [-1.2, -3.12]], true);
// the crown: a low diadem hugging the head, three crisp peaks, the middle one 0.3 taller (top at -4.6)
var BP_CROWN = bpCrv([[-1.24, -2.6, 1], [-1.33, -3.35], [-1.36, -3.98], [-1.12, -4.2], [-0.66, -3.98, 1], [-0.32, -4.4], [0, -4.5], [0.32, -4.4],
  [0.66, -3.98, 1], [1.12, -4.2], [1.36, -3.98], [1.33, -3.35], [1.24, -2.6, 1], [0, -3.1]], true);
var BP_CHEEK = [-1.45, -2.3];       // where the fingertips rest (head local, jaw side)

var BP_ELBOW = [3.6, 10.15];        // the right elbow rests on the right knee
var BP_SHR = [7.85, 8.75];          // right shoulder joint (upright frame; the arm flows out of the shoulder contour)
var BP_HAND = 1.35;                 // hand length

// ── timeline: 48 frames ──────────────────────────────────────────────────────────────────────────
// 0–5 pensive · 5–17 the hand eases, back straightens, head lifts (head lags) · 17–21 shoulders settle ·
// 21–27 upright, one breath · 27–40 sinks back, the head bows to the hand last · 40–47 pensive
var BP_K = [[0, 0], [6, 0], [17, 1.12, easeInOut], [21, 1], [27, 1], [38, -0.05, easeInOut], [44, 0], [48, 0]];
var BP_KA = [[0, 0], [4, 0], [5, 0.3, linear], [15, 1, easeOut], [28, 1], [38, 0.3, easeInOut], [39, 0, linear], [48, 0]];
var BP_KH = [[0, 0], [7, 0], [19, 1, easeInOut], [26, 1], [38, 0, easeInOut], [48, 0]];
var BP_BREATH = [[0, 0], [18, 0], [22, 1], [27, 0], [48, 0]];

// right arm as one hand-drawn contour: upper arm out of the shoulder, a soft elbow on the knee, forearm to the wrist
function bpArm(S, E, W) {
  var u1 = bpUnit(S, E), u2 = bpUnit(E, W);
  var top1 = [u1[1], -u1[0]], bot1 = [-u1[1], u1[0]];             // upper arm: top faces the hole, bottom the lap
  var out2 = [u2[1], -u2[0]], in2 = [-u2[1], u2[0]];               // forearm: outer side left, inner side faces the hole
  if (top1[1] > 0) { top1 = [-top1[0], -top1[1]]; bot1 = [-bot1[0], -bot1[1]]; }
  if (out2[0] > 0) { out2 = [-out2[0], -out2[1]]; in2 = [-in2[0], -in2[1]]; }
  var hs = 0.675, he = 0.475, fe = 0.625, fw = 0.35;
  // inner crease: where the top edge of the upper arm meets the inner edge of the forearm
  var a0 = bpAdd(S, top1, hs), a1 = bpAdd(E, top1, he), b0 = bpAdd(E, in2, fe), b1 = bpAdd(W, in2, fw);
  var cr = bpIsect(a0, a1, b0, b1), lim = dist(E, W) * 0.8;
  if (!(dist(E, cr) < lim) || (cr[0] - E[0]) * u2[0] + (cr[1] - E[1]) * u2[1] < 0) cr = bpAdd(bpAdd(E, in2, fe), u2, 0.6);
  var bis = bpUnit([0, 0], [-u1[0] * -1 - u2[0], -u1[1] * -1 - u2[1]]);
  bis = bpUnit([0, 0], [-(-u1[0]) - u2[0], -(-u1[1]) - u2[1]]);
  var tip = bpAdd(E, bis, 0.72);
  var pts = [
    [bpAdd(S, bot1, hs)[0], bpAdd(S, bot1, hs)[1], 1],
    bpAdd(bpAdd(E, bot1, he), u1, -0.35),
    bpAdd(tip, [-bis[1], bis[0]], 0.0),
    bpAdd(bpAdd(E, out2, fe), u2, 0.35),
    [bpAdd(W, out2, fw)[0], bpAdd(W, out2, fw)[1], 1],
    [bpAdd(W, in2, fw)[0], bpAdd(W, in2, fw)[1], 1],
    [cr[0], cr[1], 1],
    [a0[0], a0[1], 1]
  ];
  return bpCrv(pts, true);
}
function bpIsect(p, p2, q, q2) {
  var r = [p2[0] - p[0], p2[1] - p[1]], s = [q2[0] - q[0], q2[1] - q[1]], den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-6) return p2;
  var tt = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / den;
  return [p[0] + r[0] * tt, p[1] + r[1] * tt];
}

function bpScene(fr) {
  var k = bpTrk(fr, BP_K), ka = bpTrk(fr, BP_KA), kh = bpTrk(fr, BP_KH), br = bpTrk(fr, BP_BREATH);
  var lean = lerp(-3, 2, k), lift = -1.0 * k - 0.25 * br;
  var UBr = chain(rot(BP_HIP[0], BP_HIP[1], lean), move(0, lift));
  // skin: the lap stays put, the chest follows fully
  var UB = function (x, y) { var q = UBr(x, y), w = smooth((11.2 - y) / 2.4); return [lerp(x, q[0], w), lerp(y, q[1], w)]; };
  var nk = UB(BP_NECK[0], BP_NECK[1]);
  var tilt = lerp(-18, -5, kh);
  var HD = chain(scaleAt(0, 0, BP_HS), rot(0, 0, tilt), move(nk[0] - 0.45 * (1 - kh), nk[1] + BP_NL * kh - 0.05 * br));
  var s = '';

  // robe with its folds, footrest; the pendant leg in front of the robe
  s += ink(BP_ROBE);
  BP_FOLDS.forEach(function (sp) { s += cut(ribbon(sp, bpFoldW)); });
  s += cutAround(BP_LEG, 0.6) + front(BP_LEG) + front(BP_REST);

  // upper body and head
  s += ink(bpCrv(bpMap(BP_TORSO, UB), true));
  s += ink(BP_FACE, HD) + ink(BP_CROWN, HD);
  // the crossed shin lies in front of the lap: a clean gap from torso and robe
  s += cut(ribbon(BP_LAPGAP, 0.6)) + front(BP_SHIN);

  // right arm: the fingertips track the cheek; when the hand eases off, the forearm swings down and out about the elbow
  var shr = UB(BP_SHR[0], BP_SHR[1]);
  var cheek = HD(BP_CHEEK[0], BP_CHEEK[1]);
  var E = BP_ELBOW;
  var away = [cheek[0] - 1.35, cheek[1] + 1.55];
  var tipP = [lerp(cheek[0], away[0], ka), lerp(cheek[1], away[1], ka)];
  var u = bpUnit(E, tipP), handDeg = Math.atan2(u[1], u[0]) * 180 / Math.PI - 12 * ka;
  var hr = handDeg * Math.PI / 180;
  var wrist = [tipP[0] - Math.cos(hr) * BP_HAND, tipP[1] - Math.sin(hr) * BP_HAND];
  var arm = bpArm(shr, E, wrist);
  var hand = petal(wrist[0] - Math.cos(hr) * 0.15, wrist[1] - Math.sin(hr) * 0.15, BP_HAND + 0.15, 0.9, handDeg,
    { tip: 'point', base: 0.85, peak: 0.4, bend: -0.15 });
  s += front(arm) + cutAround(hand, 0.6) + front(hand);
  return xf(chain(move(BP_DX, 0), scaleAt(9, 16, BP_SC)), s);
}
