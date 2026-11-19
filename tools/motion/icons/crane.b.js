// 학 (crane) — concept B: 비학. In flight, facing right: neck stretched forward, legs trailing, slow deep wingbeats.
var NF = 48;
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
function crMorph(A, B, k) { return A.map(function (p, i) { var q = [lerp(p[0], B[i][0], k), lerp(p[1], B[i][1], k)]; if (p[2]) q.push(1); return q; }); }
// body spindle: chest at right, tail at left
var CB_BODY = [[11.6, 8.3], [11.0, 9.6], [8.6, 10.1], [6.0, 9.8], [4.6, 9.45, 1], [5.2, 8.7], [7.4, 8.1], [9.8, 7.9]];
// near wing, root along the back (6.4..9.6, 8.4): up pose and down pose, same structure; feathered tip
var CB_UP = [[9.7, 8.3, 1], [9.2, 5.6], [8.2, 3.2], [6.9, 1.4, 1], [6.6, 2.6], [5.85, 2.3, 1], [6.0, 3.6], [5.15, 3.5, 1], [5.6, 5.6], [6.3, 8.4, 1]];
var CB_MID = [[9.7, 8.3, 1], [8.4, 7.3], [5.6, 6.6], [2.6, 6.9, 1], [3.5, 7.6], [2.9, 8.1, 1], [4.1, 8.3], [3.6, 8.9, 1], [5.2, 8.9], [6.3, 8.6, 1]];
var CB_DN = [[9.7, 8.3, 1], [9.0, 10.6], [7.8, 13.0], [6.5, 15.2, 1], [6.25, 14.0], [5.55, 14.35, 1], [5.6, 13.0], [4.8, 13.15, 1], [5.4, 11.2], [6.3, 8.6, 1]];
var CB_HEAD = 'M13.9 6.55C14.1 5.95 14.75 5.65 15.3 5.75C15.65 5.82 15.85 6.0 16.0 6.2L17.0 6.75L15.85 6.95C15.4 7.2 14.7 7.4 14.2 7.35Z';

var ICON = {
  id: 'crane', frames: NF,
  at: function (t) {
    // two slow beats and a glide: wing phase p (0 = mid/up-going, ...), position from up(-1) to down(+1)
    var fr = t * NF;
    var ph = fr < 32 ? fr / 16 : 2 + 0 * fr;           // two beats in 0–32, glide 32–48
    var beat = fr < 32 ? -Math.cos(TAU * ph) : -1 + 1 * seg(fr, 32, 40) - 0 ;
    // beat: -1 = up, +1 = down. Glide: from up ease to mid and hold, back to up at loop
    if (fr >= 32) beat = -1 + seg(fr, 32, 38) - seg(fr, 42, 48);
    var bob = 0.45 * beat;
    var W = beat < 0 ? crMorph(CB_MID, CB_UP, smooth(-beat)) : crMorph(CB_MID, CB_DN, smooth(beat));
    var M = move(0, -bob * 0.6);
    var s = '';
    // far wing peeks above the back on the upstroke
    var far = crMorph(CB_MID, CB_UP, clamp(-beat));
    if (beat < -0.2) s += ink(crCrv(far, true), chain(scaleAt(9.7, 8.3, 0.75, 0.9), move(1.1, -0.2), M));
    s += ink(crCrv(CB_BODY, true), M);
    // neck and head
    s += ink(ribbon([[10.6, 8.6], [12.5, 7.6], [14.4, 6.8]], [1.8, 1.0, 0.9]), M) + ink(CB_HEAD, M) + cut(circlePath(15.0, 6.3, 0.27), M);
    // trailing legs
    s += ink(ribbon([[6.6, 9.6], [3.5, 10.2], [1.3, 10.55]], [0.9, 0.75, 0.6], { caps: ['flat', 'round'] }), M);
    // tail
    var wing = tp(crCrv(W, true), M);
    s += cutAround(wing, 0.6) + front(wing);
    return s;
  }
};
