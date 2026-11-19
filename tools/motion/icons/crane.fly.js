// 학 (crane) — id: crane. Final, developed from concept B (crane.b.js): 비학, a red-crowned crane in flight.
// Side view facing right. The cues that say "crane" (not heron or goose): the neck stretched straight forward
// (herons fold theirs), the long legs trailing far behind the tail, and broad wings with splayed primary
// "fingers". A small cut under the crown sets off the cap and the eye.
// Motion (8 s, 64 frames): two slow, deep wingbeats (22 frames each), then a long glide with the wings swept
// back and level, then the wings rise again into the poster pose (wings up, frame 0). The body rises a little on
// each downstroke (lagging the wing); the head stays steadier than the body, as a crane's does; the far wing
// follows the near one, slightly behind and smaller; the legs trail with a small delayed sway.

var NF = 64;
function crCrv(pts, closed) {
  var n = pts.length;
  function P(i) { return closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; }
  function isC(i) { return P(i)[2] || (!closed && (i <= 0 || i >= n - 1)); }
  function tg(i) { var a = P(i - 1), b = P(i + 1); return isC(i) ? null : [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]; }
  var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p1 = P(i), p2 = P(i + 1), dd = [(p2[0] - p1[0]) * 0.7, (p2[1] - p1[1]) * 0.7], t1 = tg(i) || dd, t2 = tg(i + 1) || dd;
    d += 'C' + f(p1[0] + t1[0] / 3) + ' ' + f(p1[1] + t1[1] / 3) + ' ' + f(p2[0] - t2[0] / 3) + ' ' + f(p2[1] - t2[1] / 3) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
  }
  return d + (closed ? 'Z' : '');
}
function crMorph(A, B, k) { return A.map(function (p, i) { var q = [lerp(p[0], B[i][0], k), lerp(p[1], B[i][1], k)]; if (p[2]) q.push(1); return q; }); }

// body: full chest at the right, tapering to a short tail at the left
var CB_BODY = [[11.0, 8.75], [10.5, 9.8], [8.9, 10.75], [6.6, 10.7], [4.8, 10.1], [3.6, 9.5, 1], [4.7, 8.9], [6.5, 8.1], [8.7, 7.75], [10.5, 7.85]];
// near wing keys (same structure): root along the back, leading edge in front, three splayed primaries at the tip
var CB_UP = [[9.75, 8.3, 1], [9.75, 5.6], [8.9, 2.9], [7.4, 0.9, 1], [6.85, 2.35], [5.7, 1.6, 1], [5.45, 3.05], [4.15, 2.75, 1], [4.3, 4.6], [4.75, 6.6], [5.7, 8.55, 1]];
var CB_MID = [[9.75, 8.3, 1], [8.5, 7.4], [6.0, 7.0], [2.9, 6.9, 1], [3.8, 7.4], [2.7, 7.75, 1], [3.9, 8.0], [3.1, 8.45, 1], [4.4, 8.55], [5.3, 8.7], [5.7, 8.65, 1]];
var CB_DN = [[9.75, 8.5, 1], [9.75, 11.0], [8.9, 13.3], [7.5, 15.0, 1], [6.95, 13.85], [5.85, 14.4, 1], [5.6, 13.05], [4.45, 13.15, 1], [4.75, 11.6], [5.2, 10.2], [5.7, 8.75, 1]];
// head: rounded crown, slim dagger bill
var CB_HEAD = 'M13.7 6.85C13.75 6.15 14.25 5.75 14.85 5.75C15.3 5.75 15.55 5.98 15.7 6.25L17.0 6.95L15.55 7.05C15.05 7.25 14.45 7.5 13.95 7.55Z';

function crBeat(fr) {             // wing position: -1 up, +1 down
  fr = ((fr % NF) + NF) % NF;
  if (fr < 44) return -Math.cos(TAU * fr / 22);
  return -1 + 0.6 * seg(fr, 44, 51) - 0.6 * seg(fr, 57, 64);
}
function crWing(b) { return b < 0 ? crMorph(CB_MID, CB_UP, -b) : crMorph(CB_MID, CB_DN, b); }

var ICON = {
  id: 'crane', frames: NF,
  at: function (t) {
    var fr = t * NF, b = crBeat(fr), glide = bump(fr, 45, 51, 56, 62);
    var bob = -0.45 * crBeat(fr - 3) + 0.2 * glide * loop(t, 1, 0.2);   // body rises after each downstroke
    var MB = move(0, -bob * 0.55 - 0.35 * glide), MH = move(0, -bob * 0.25 - 0.3 * glide);
    var s = '';
    // far wing: behind body, a beat late and smaller
    s += ink(crCrv(crWing(crBeat(fr - 1.2)), true), chain(scaleAt(9.75, 8.3, 0.78, 0.92), move(1.9, -0.55), MB));
    // legs: trail behind the tail, sway a little after the body
    var sway = 0.35 * crBeat(fr - 6);
    s += ink(ribbon([[5.8, 9.95], [3.4, 10.3], [1.4, 10.55 + sway]], [1.05, 0.78, 0.62], { caps: ['flat', 'round'] }), MB);
    s += ink(crCrv(CB_BODY, true), MB);
    // neck: base follows the body, the head stays steadier
    var n0 = MB(10.2, 8.6), n2 = MH(14.1, 7.1), n1 = mix(n0, n2, 0.5); n1[1] -= 0.15;
    s += ink(ribbon([n0, n1, n2], [1.45, 0.95, 0.9]));
    s += ink(CB_HEAD, MH) + cut(circlePath(14.75, 6.45, 0.27), MH);
    // near wing in front with a clean gap
    var wing = tp(crCrv(crWing(b), true), MB);
    s += cutAround(wing, 0.65) + front(wing);
    return xf(chain(move(0, 1.0), scaleAt(9, 8.6, 1, 1.09)), s);
  }
};
