// 학 (crane) — concept C: the bow (절). Standing on one leg; the neck sweeps forward and down, wings half lift, then it rises.
var NF = 64;
var CR_BOW = 1;   // concept C sets this to 1 (a deep bow instead of the wing dance)

function crTrk(fr, keys) {
  if (fr <= keys[0][0]) return keys[0][1];
  for (var i = 1; i < keys.length; i++) if (fr <= keys[i][0]) { var a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], (b[2] || smooth)((fr - a[0]) / (b[0] - a[0]))); }
  return keys[keys.length - 1][1];
}
// smooth closed/open curve through points; [x, y, 1] marks a corner
function crCrv(pts, closed) {
  var n = pts.length;
  function P(i) { return closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; }
  function isC(i) { return P(i)[2] || (!closed && (i <= 0 || i >= n - 1)); }
  function tg(i) { var p = P(i), a = P(i - 1), b = P(i + 1); return isC(i) ? null : [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]; }
  var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p1 = P(i), p2 = P(i + 1), t1 = tg(i) || [(p2[0] - p1[0]) * 0.7, (p2[1] - p1[1]) * 0.7], t2 = tg(i + 1) || [(p2[0] - p1[0]) * 0.7, (p2[1] - p1[1]) * 0.7];
    d += 'C' + f(p1[0] + t1[0] / 3) + ' ' + f(p1[1] + t1[1] / 3) + ' ' + f(p2[0] - t2[0] / 3) + ' ' + f(p2[1] - t2[1] / 3) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
  }
  return d + (closed ? 'Z' : '');
}
function crMap(pts, fn) { return pts.map(function (p) { var q = fn(p[0], p[1]); return p[2] ? [q[0], q[1], 1] : q; }); }

// body with the drooping tertial bustle at the rear (left)
var CR_BODY = [[11.9, 8.4], [11.4, 10.0], [9.6, 11.05], [7.4, 11.1], [5.9, 10.9], [4.6, 11.7], [3.3, 12.3, 1], [3.6, 11.0], [3.7, 9.6],
  [4.6, 8.3], [6.6, 7.55], [9.2, 7.45], [10.9, 7.4]];
// wing in local coords: root at 0,0, pointing +x, leading edge on -y, feathered trailing edge on +y
var CR_WING = [[-0.3, -0.9], [2.0, -1.55], [4.6, -1.55], [6.9, -0.8, 1], [6.1, 0.15], [6.35, 0.75, 1], [5.1, 0.65], [5.0, 1.35, 1],
  [3.7, 1.1], [3.4, 1.75, 1], [1.8, 1.45], [0.2, 1.0, 1]];
var CR_HEAD = 'M11.05 3.55C10.85 2.55 11.45 1.75 12.3 1.72C13.0 1.7 13.5 2.15 13.75 2.6L16.4 3.75L13.6 3.75C13.0 3.85 12.45 4.25 12.05 4.65Z';

function crScene(fr) {
  var bowK = CR_BOW;
  // wing dance: 0–10 rest · 10–24 wings rise and spread (neck lifts) · 24–34 held, one soft lift · 34–50 fold · 50–64 rest
  var w = bowK ? 0.35 * crTrk(fr, [[0, 0], [12, 0], [26, 1, easeInOut], [36, 1], [52, 0, easeInOut], [64, 0]])
               : crTrk(fr, [[0, 0], [10, 0], [24, 1, easeInOut], [28, 1.06], [33, 0.97], [50, 0, easeInOut], [64, 0]]);
  var bow = bowK ? crTrk(fr, [[0, 0], [10, 0], [24, 1, easeInOut], [34, 1], [50, 0, easeInOut], [64, 0]]) : 0;
  var br = 0.5 - 0.5 * Math.cos(TAU * fr / 32);
  var s = '';
  // standing leg + folded leg ("4")
  var leg = ribbon([[8.5, 10.6], [8.55, 13.2], [8.6, 15.6]], [1.35, 0.85, 0.75]);
  var foot = 'M7.5 16L10.9 16C10.6 15.55 9.6 15.35 8.95 15.3L8.2 15.3C7.75 15.4 7.5 15.65 7.5 16Z';
  s += ink(leg) + ink(foot);
  var fold = ribbon([[7.3, 10.7], [9.9, 12.7], [9.15, 13.5]], [1.0, 0.8, 0.65], { caps: ['flat', 'round'] });
  s += cutAround(fold, 0.6) + front(fold);
  // body pitches forward with the bow; neck follows
  var B = rot(8.5, 10.6, 18 * bow);
  var body = crCrv(crMap(CR_BODY, B), true);
  // far wing (raised, behind)
  var shoulder = B(10.0, 8.0);
  function wing(deg, sc, sy) { return tp(crCrv(CR_WING, true), chain(scaleAt(0, 0, sc, sy), rot(0, 0, deg), move(shoulder[0], shoulder[1]))); }
  var farW = wing(lerp(185, 252, w), lerp(0.9, 1.0, w), -1);
  if (w > 0.05) s += ink(farW);
  s += ink(body);
  // neck: S-curve out of the chest to the head; bows forward and down
  var lift = -0.6 * w - 0.15 * br;
  var H = chain(rot(11.4, 8.0, lerp(0, 62, bow)), move(0.2 * w, lift));
  var nk = [[11.2, 8.6], [11.95, 6.5], [11.35, 4.8], H(11.75, 3.3)];
  nk[1] = H(nk[1][0], nk[1][1]); nk[2] = H(nk[2][0], nk[2][1]);
  s += ink(ribbon(nk, [2.0, 1.15, 0.95, 1.0]));
  var head = tp(CR_HEAD, H);
  s += ink(head) + cut(circlePath(12.55, 2.75, 0.32), H);
  // near wing: folded along the back, rising up and back in the dance
  var nearW = wing(lerp(172, 232, w), lerp(1.0, 1.12, w), -1);
  s += cutAround(nearW, 0.65) + front(nearW);
  return s;
}

var ICON = { id: 'crane', frames: NF, at: function (t) { return crScene(t * NF); } };
