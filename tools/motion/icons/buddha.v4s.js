// Layerhover — 반가사유상 (Pensive Bodhisattva), variant v4s "sculpture".
// Frontal, as the statue is seen: a slender bare torso on a round stool, the right leg crossed so its shin is a
// horizontal bar across the lap with the upturned foot at the side, the right elbow on that knee and the forearm
// rising to the cheek (an open triangle of air between arm, torso and lap), the head bowed toward the fingertips
// under a tall crown. The left hand rests on the crossed ankle; the left leg hangs to a small lotus footrest; the
// robe cascades over the stool in layered swags.
// Motion — 고쳐 앉기: the hand eases off the cheek, the back straightens and the head lifts (~2 pt), a breath,
// then the head bows first, the back sinks and the fingertips return to the cheek. Stool, robe, legs and footrest
// never move.

var ICON = {
  id: "buddha",
  frames: 48,
  at: function (t) { return pensive(t); }
};

// smooth closed/open curve through points; a point [x, y, 1] is a corner
function bcrv(pts, closed) {
  var n = pts.length;
  function P(i) { return closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; }
  function corner(i) { return P(i)[2] || (!closed && (i <= 0 || i >= n - 1)); }
  function tOut(i) { var p = P(i), a = P(i - 1), b = P(i + 1); return corner(i) ? [(b[0] - p[0]) * 0.6, (b[1] - p[1]) * 0.6] : [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]; }
  function tIn(i) { var p = P(i), a = P(i - 1), b = P(i + 1); return corner(i) ? [(p[0] - a[0]) * 0.6, (p[1] - a[1]) * 0.6] : [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]; }
  var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p1 = P(i), p2 = P(i + 1), to = tOut(i), ti = tIn(i + 1);
    d += 'C' + f(p1[0] + to[0] / 3) + ' ' + f(p1[1] + to[1] / 3) + ' ' + f(p2[0] - ti[0] / 3) + ' ' + f(p2[1] - ti[1] / 3) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
  }
  return d + (closed ? 'Z' : '');
}
// a ribbon polygon re-drawn as one smooth closed curve (no faceted caps)
function soft(d) {
  var pts = parsePath(d).filter(function (g) { return g.c !== 'Z'; }).map(function (g) { return [g.p[g.p.length - 2], g.p[g.p.length - 1]]; });
  return smoothPath(pts, true);
}
function L2(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
// a tapered cut: 0 at both ends, w in the middle
function taperCut(spine, w) { return cut(ribbon(spine, function (s) { return w * Math.pow(Math.sin(Math.PI * s), 0.7); })); }

// ── fixed parts: stool robe, pendant leg, footrest, crossed leg ─────────────────────────────────────
var BAR = bcrv([
  [3.2, 9.95], [5.5, 9.9], [8.0, 9.75], [10.0, 9.65], [11.0, 9.2], [12.1, 8.45], [12.85, 8.15],
  [13.25, 8.45], [12.9, 9.25], [12.0, 10.2], [11.1, 10.6], [10.2, 10.65], [8.0, 11.05], [5.5, 11.5],
  [3.4, 11.75], [2.6, 11.4], [2.45, 10.8], [2.65, 10.25]
], true);
var ROBE = bcrv([
  [4.0, 11.9, 1], [9.7, 11.9, 1], [9.5, 12.9], [9.45, 13.85], [9.9, 15.05], [10.75, 16, 1],
  [2.8, 16, 1], [3.7, 15.05], [4.15, 13.85], [4.15, 12.9]
], true);
var LEG = bcrv([
  [10.75, 11.35, 1], [12.3, 11.35, 1], [12.35, 12.45], [12.05, 13.55], [12.35, 13.95], [13.55, 14.15],
  [13.95, 14.6, 1], [11.3, 14.6, 1], [11.35, 13.85], [11.25, 12.6]
], true);
var REST = bcrv([[10.85, 16, 1], [11.25, 15.45], [11.3, 15.05, 1], [14.0, 15.05, 1], [14.05, 15.45], [14.45, 16, 1]], true);

function pensive(t) {
  // pose channels: hand leaves first and returns last; back then head rise; head bows first on the way down
  var kk = seg(t, 0.10, 0.34, easeInOut) * (1 - seg(t, 0.70, 0.97, easeInOut));
  var kb = seg(t, 0.14, 0.40, easeInOut) * (1 - seg(t, 0.66, 0.92, easeInOut));
  var kh = seg(t, 0.17, 0.44, easeInOut) * (1 - seg(t, 0.62, 0.89, easeInOut));
  var br = pulse(t, 0.44, 0.64) * 0.3;            // a breath while upright
  var s = '';

  // upper body: one hand-drawn contour — torso, the shoulder flowing into the forearm that rises from the knee to
  // the cheek, leaving an open triangle of air between forearm, torso and lap. Two key poses, same structure.
  var TORSO = [
    [8.25, 6.9], [9.25, 7.15], [9.75, 7.7], [9.25, 8.35], [8.85, 9.3], [9.3, 10.25, 1],
    [6.6, 10.25, 1], [6.8, 9.3], [6.35, 8.35], [5.95, 7.6], [5.5, 7.25], [6.2, 6.95], [7.1, 6.9]
  ];
  // upright: the torso straightens — points rise in proportion to their height above the hips
  function T(x, y) {
    var h = clamp((10.25 - y) / 3.35, 0, 1.2);
    return [x + 0.35 * h * kb, y - h * (1.1 * kb + br)];
  }
  s += ink(bcrv(TORSO.map(function (p) { var q = T(p[0], p[1]); if (p[2]) q.push(1); return q; }), true));
  // right forearm: one tapered limb from the elbow on the knee to the fingertips at the cheek
  var off = [-0.35 * kk, 0.5 * kk];
  function A(x, y, w) { return [x + off[0] * w, y + off[1] * w]; }
  var arm = ribbon([[3.55, 9.05], A(4.65, 7.8, 0.5), A(5.4, 7.1, 1), A(5.68, 6.4, 1), A(5.85, 5.75, 1)], function (q) {
    if (q < 0.55) return lerp(1.45, 0.85, smooth(q / 0.55));
    if (q < 0.78) return lerp(0.85, 1.05, smooth((q - 0.55) / 0.23));
    return lerp(1.05, 0.7, smooth((q - 0.78) / 0.22));
  }, { caps: ['round', 'round'] });
  s += ink(soft(arm));

  // left arm (viewer's right): hangs to rest the hand on the crossed ankle
  var shR = L2([9.5, 7.6], [9.8, 6.55], kb), elR = L2([10.05, 8.4], [10.2, 8.0], kb);
  s += ink(soft(ribbon([shR, elR, [10.45, 8.75]], [1.1, 0.9, 0.85], { caps: ['round', 'round'] })));

  // head: oval with a tall crown, bowed toward the hand
  var hc = L2([7.6, 5.8], [8.1, 4.3], kh); hc[1] -= br * 0.8;
  var tilt = lerp(-19, -1, kh);
  var H = chain(scaleAt(0, 0, 1, 1), rot(0, 0, tilt, hc[0], hc[1]));
  var head = tp(bcrv([[0, -1.5], [1.15, -0.75], [1.05, 0.55], [0.35, 1.45], [0, 1.55], [-0.35, 1.45], [-1.05, 0.55], [-1.15, -0.75]], true), H);
  var crown = tp(bcrv([
    [1.3, -1.25, 1], [0.75, -1.85], [0, -2.05], [-0.75, -1.85], [-1.3, -1.25, 1],
    [-1.35, -2.0], [-1.05, -2.75], [-0.55, -2.55], [0, -3.25], [0.55, -2.55], [1.05, -2.75], [1.35, -2.0]
  ], true), H);

  // robe over the stool: layered swags carved as tapered cuts
  s += ink(ROBE);
  // the drape hangs from the lap in a deep swag, its tails pointing down at both sides
  
  s += ink(REST);

  // head and crown in front, separated from shoulders and hand
  s += cutAround(head, 0.5) + front(head) + front(crown);
  // crossed leg in front of everything below it; pendant leg in front of the robe
  s += cutAround(BAR, 0.7) + front(BAR);
  s += cutAround(LEG, 0.7) + front(LEG);
  return s;
}
