// Layerhover — 반가사유상 (Pensive Bodhisattva), variant v4p: PICTOGRAM.
// A wayfinding-style glyph, frontal. Only two features are exaggerated: the right hand's fingertips at the cheek
// (forearm rising steeply from the knee, an open triangle between forearm, upper arm and the bowed head) and the right
// shin crossed as a near-horizontal bar over the lap. Everything else is reduced: crown, oval head, slender torso,
// the left hand on the ankle, the pendant left leg to a footrest, the robe falling over a round stool.
// Motion (고쳐 앉기): the back straightens and the head lifts as the cheek leaves the fingertips, a breath, then it
// sinks back. Stool, robe, legs and footrest stay planted.

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

// ── fixed parts (world, pt) ──────────────────────────────────────────────────────────────────────
var BP_HIP = [7.7, 11.4];          // the upper body pivots and straightens above this point

// the robe falls over the round stool to the ground: one bell of cloth under the lap; the hem dips in two swags
// between three blunt points standing on the ground
var BP_ROBE = bpCrv([[3.75, 12.15, 1], [9.95, 12.15, 1], [10.2, 13.3], [10.45, 15.2], [10.6, 16, 1], [9.5, 16, 1], [8.3, 15.5],
  [7.25, 16, 1], [6.15, 16, 1], [5.1, 15.5], [3.9, 16, 1], [2.85, 16, 1], [3.1, 14.9], [3.4, 12.6]], true);
// pendant left leg: the shin hangs from under the crossed foot to the ankle, a small foot pointing out to the right
var BP_LEG = bpCrv([[10.45, 12.1], [11.9, 12.1], [12.0, 13.1], [11.85, 14.0], [12.05, 14.2], [13.2, 14.3], [13.5, 14.55, 1],
  [13.05, 14.7], [11.1, 14.7, 1], [10.9, 14.1], [10.8, 13.1]], true);
// lotus footrest: a low pod on the ground
var BP_REST = bpCrv([[10.6, 16, 1], [10.75, 15.55], [11.3, 15.25], [13.4, 15.25], [13.95, 15.55], [14.1, 16, 1]], true);
// crossed right shin: a long bar across the lap, round knee at the left, the ankle at the right; the foot turns up
// at the end, sole out
var BP_SHIN = bpCrv([[1.4, 10.75], [1.75, 9.85], [2.65, 9.55], [4.2, 9.7], [8.0, 10.05], [11.1, 10.3],
  [12.15, 9.6], [13.3, 8.75], [13.85, 8.8], [13.85, 9.35], [13.3, 10.55], [12.6, 11.35], [11.2, 11.45],
  [8.0, 11.45], [4.2, 11.75], [2.4, 11.75], [1.7, 11.45]], true);

// ── upper body (upright pose, world) ─────────────────────────────────────────────────────────────
// slender bare torso: neck, sloping shoulders, narrow waist, into the lap (hidden behind the shin)
var BP_TORSO = [[7.1, 6.45], [6.35, 6.8], [6.1, 7.5], [6.3, 8.7], [6.55, 9.9], [6.25, 11.2, 1], [11.0, 11.2, 1],
  [11.0, 10.1], [10.75, 8.7], [10.35, 7.4], [9.6, 6.8], [8.36, 6.45]];
// the left arm hangs along the torso to rest its hand on the crossed shin: a tapered slit between arm and waist
var BP_SLIT = [[9.95, 10.0], [9.7, 9.1], [9.6, 8.1]];
var BP_NECK = [7.73, 6.45];         // the head and neck bow about the base of the neck
// head and neck (local: neck base at 0,0, up = -y): an oval face, the jaw tucking into a short neck
var BP_FACE = bpCrv([[0, -3.7], [1.2, -3.3], [1.3, -2.4], [1.02, -1.3], [0.58, -0.8, 1], [0.66, 0.6, 1], [-0.66, 0.6, 1],
  [-0.58, -0.8, 1], [-1.02, -1.3], [-1.3, -2.4], [-1.2, -3.3]], true);
// the crown: a low band that follows the top of the head (a clean gap below it) with three peaks, the middle one tallest
var BP_CROWN = bpCrv([[-1.42, -3.55, 1], [-1.6, -5.2, 1], [-0.8, -4.95], [0, -5.6, 1], [0.8, -4.95], [1.6, -5.2, 1], [1.42, -3.55, 1],
  [0.75, -4.0], [0, -4.15], [-0.75, -4.0]], true);
var BP_CHEEK = [-1.25, -2.45];       // where the fingertips rest (head local)

var BP_ELBOW = [2.65, 9.3];         // the right elbow rests on the right knee
var BP_SHR = [6.45, 7.95];          // right shoulder (upright frame)
// the gap that sets the torso behind the crossed shin (follows the shin's top edge)
var BP_LAPGAP = [[5.0, 9.38], [8.0, 9.7], [11.4, 9.98]];

// ── timeline: 48 frames ──────────────────────────────────────────────────────────────────────────
// 0–5 pensive · 5–17 the hand eases, back straightens, head lifts (head lags) · 17–27 upright, one breath ·
// 27–40 sinks back, the head bows to the hand last · 40–47 pensive
var BP_K = [[0, 0], [5, 0], [17, 1, easeInOut], [27, 1], [39, -0.05, easeInOut], [44, 0], [48, 0]];
var BP_KH = [[0, 0], [7, 0], [19, 1, easeInOut], [26, 1], [38, 0, easeInOut], [48, 0]];
var BP_BREATH = [[0, 0], [18, 0], [22, 1], [27, 0], [48, 0]];

function bpScene(fr) {
  var k = bpTrk(fr, BP_K), kh = bpTrk(fr, BP_KH), br = bpTrk(fr, BP_BREATH);
  var lean = lerp(-5, 1.5, k), lift = -0.35 * k - 0.12 * br;
  var UBr = chain(rot(BP_HIP[0], BP_HIP[1], lean), move(0, lift));
  // skin: the lap stays put, the chest follows fully
  var UB = function (x, y) { var q = UBr(x, y), w = smooth((10.8 - y) / 2.2); return [lerp(x, q[0], w), lerp(y, q[1], w)]; };
  var nk = UB(BP_NECK[0], BP_NECK[1]);
  var tilt = lerp(-31, -4, kh);
  var HD = chain(rot(0, 0, tilt), move(nk[0], nk[1] + 0.5 * kh));
  var s = '';

  // robe, pendant leg, footrest
  s += ink(BP_ROBE) + ink(BP_REST);
  s += cutAround(BP_LEG, 0.6) + front(BP_LEG);

  // upper body and head; the crossed shin lies in front of the lap
  s += ink(bpCrv(bpMap(BP_TORSO, UB), true)) + cut(ribbon(bpMap(BP_SLIT, UB), function (u) { return 0.85 * (1 - smooth(u)); }));
  s += ink(BP_FACE, HD) + ink(BP_CROWN, HD);
  s += ink(BP_SHIN) + cut(ribbon(BP_LAPGAP, 0.7));

  // right arm: upper arm from the shoulder down to the elbow on the knee, forearm rising to the cheek
  var shr = UB(BP_SHR[0], BP_SHR[1]);
  var cheek = HD(BP_CHEEK[0], BP_CHEEK[1]);
  var away = [cheek[0] - 0.9, cheek[1] + 1.5];
  var tipP = [lerp(cheek[0], away[0], k), lerp(cheek[1], away[1], k)];
  var E = BP_ELBOW, dx = tipP[0] - E[0], dy = tipP[1] - E[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  var wrist = [E[0] + ux * (L - 1.45), E[1] + uy * (L - 1.45)];
  var mid = [lerp(shr[0], E[0], 0.5), lerp(shr[1], E[1], 0.5) - 0.15];
  var upper = ribbon([shr, mid, E], [1.25, 0.95, 0.9], { caps: ['flat', 'round'] });
  var fore = ribbon([E, wrist], [1.0, 0.74], { caps: ['round', 'flat'] });
  var hand = petal(wrist[0] - ux * 0.15, wrist[1] - uy * 0.15, 1.62, 0.84, Math.atan2(uy, ux) * 180 / Math.PI + 32 * k, { tip: 'round', base: 0.85, peak: 0.3, bend: -0.28 });
  // the elbow sits on the knee: a clean gap around the arm where it meets the leg
  var elbowZone = ribbon([[E[0] + ux * 1.8, E[1] + uy * 1.8], E, mix(E, mid, 0.55)], 1.05, { caps: ['flat', 'flat'] });
  s += cutAround(elbowZone, 0.55) + front(upper) + front(fore) + front(hand);
  return s;
}
