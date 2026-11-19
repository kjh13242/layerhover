// 학 (crane) — s1: 두루미 standing on one leg, at rest. Side view facing right.
// One slim body, the bushy tertial plumes drooping over the tail (set off by a clean gap), a long S-curved neck,
// a small head with a long straight bill, one long thin leg to the ground (y 16), the other tucked under the belly.
// Motion (64 f, 8 s): rest → the neck curls back and the head turns to preen the plumes (two small nibbles) →
// the neck rises back into the S with a soft overshoot → the plumes ruffle and settle, the tucked leg resettles.
// The plume tips stir in a breeze throughout. Frame 0 is the poster.

var ICON = (function () {
  var NF = 64;

  function crv(pts, closed) {
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
  function trk(fr, keys) {
    if (fr <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (fr <= keys[i][0]) { var a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], (b[2] || smooth)((fr - a[0]) / (b[0] - a[0]))); }
    }
    return keys[keys.length - 1][1];
  }
  function linear(x) { return clamp(x); }
  function mixPts(A, B, k) { return A.map(function (p, i) { return [lerp(p[0], B[i][0], k), lerp(p[1], B[i][1], k)]; }); }
  function keysPts(list, k) {          // k 0..1 through several point lists
    var n = list.length - 1, x = clamp(k) * n, i = Math.min(n - 1, Math.floor(x));
    return mixPts(list[i], list[i + 1], x - i);
  }

  // ── fixed parts ─────────────────────────────────────────────────────────────────────────────────
  // body: chest at the right, a slim taper to the tail at the left
  var BODY = [[12.3, 8.7], [11.8, 10.0], [10.0, 11.15], [7.5, 11.3], [5.2, 10.8], [3.5, 9.6, 1], [5.2, 8.4], [7.6, 7.5], [10.0, 7.35], [11.6, 7.75]];
  // standing leg: a thin shin with a slight heel joint, the foot along the ground
  var LEG = ribbon([[8.6, 10.3], [8.45, 13.1], [8.55, 15.6]], [1.4, 1.1, 1.0]);
  var FOOT = crv([[7.25, 16, 1], [7.55, 15.6], [8.55, 15.15], [9.4, 15.4], [10.25, 15.8], [10.4, 16, 1]], true);

  // ── neck key poses (spine from the chest to the back of the skull) ────────────────────────────
  var N_REST = [[10.7, 9.0], [12.15, 7.0], [11.7, 5.0], [10.55, 3.75], [10.95, 2.8]];
  var N_MID = [[10.7, 9.0], [12.1, 7.5], [12.4, 6.3], [12.0, 5.6], [11.3, 5.75]];
  var N_PREEN = [[10.7, 9.0], [11.9, 7.4], [11.5, 5.8], [10.4, 5.0], [9.4, 5.5]];
  function neckW(s) { return lerp(2.7, 1.1, Math.pow(s, 0.42)); }

  // head (local: back of skull at 0,0, facing +x): domed crown, long straight bill
  var HEAD = [[-0.55, 0.45], [-0.6, -0.15], [-0.15, -0.65], [0.6, -0.7], [1.15, -0.4], [1.45, -0.28, 1], [4.05, 0.12, 1],
    [1.45, 0.42, 1], [0.9, 0.65], [0.0, 0.7]];
  var BILLFAR = crv([[2.1, -0.15, 1], [4.05, 0.12, 1], [2.1, 0.35, 1]], true);

  // plumes: drooping from the back over the tail, three pointed tips
  function plumes(fr) {
    var t = fr / NF, g = trk(fr, [[0, 0], [46, 0], [49, 1, easeOut], [52, -0.6], [55, 0.3], [59, 0], [64, 0]]);
    function tip(x, y, sd, amt) {
      var nx = 0.35 * noise(t, sd) + 0.25 * loop(t, 2, sd * 0.13) + amt * g;
      return [x + nx * 0.6, y + nx, 1];
    }
    return crv([[9.0, 7.5], [6.9, 7.4], [4.6, 8.3], [2.9, 10.1], tip(1.6, 13.1, 3, 0.9), [2.95, 12.1], tip(3.0, 14.0, 7, 0.7),
      [4.2, 12.55], tip(5.1, 13.8, 11, 0.5), [6.2, 11.8], [7.9, 10.45], [9.3, 9.2]], true);
  }

  function at(t) {
    var fr = t * NF, s = '';
    // curl 0 → 1 (rest → preen), turn: head facing +1 → -1
    var curl = trk(fr, [[0, 0], [8, 0], [16, 0.5, smooth], [22, 0.65, linear], [29, 1, easeOut], [35, 1], [40, 0.75, easeIn], [46, 0.5, linear], [52, -0.06, easeOut], [56, 0], [64, 0]]);
    // bill direction (deg, y down): 10 = forward, -90 = straight up, -210 = back and down to the plumes
    var phi = trk(fr, [[0, 10], [10, 10], [29, -208, smooth], [35, -208], [52, 14, smooth], [56, 10], [64, 10]]);
    var nib = fr > 27 && fr < 37 ? 10 * Math.sin(Math.PI * (fr - 27) / 5) * Math.sin(Math.PI * (fr - 27) / 10) : 0;
    var spine = curl < 0 ? keysPts([N_REST, N_MID], -curl * 0.5).map(function (p, i) { return [p[0], p[1] + curl * 0.6 * i / 4]; })
      : keysPts([N_REST, N_MID, N_PREEN], curl);
    var hp = spine[spine.length - 1];
    phi -= nib;
    // the head turns about the vertical: past straight up, it is drawn mirrored (crown stays on top)
    var H = phi >= -90 ? chain(rot(0, 0, phi), move(hp[0], hp[1]))
      : chain(rot(0, 0, -180 - phi), scaleAt(0, 0, -1, 1), move(hp[0], hp[1]));
    // tucked leg: a short shin under the belly folded back; resettles after the ruffle
    var lift = trk(fr, [[0, 0], [51, 0], [54, 1], [58, 0, easeInOut], [64, 0]]);
    var TUCK = ribbon([[10.3, 10.5], [11.0, 11.55 - 0.45 * lift], [10.15, 11.9 - 0.55 * lift]], [1.15, 1.0, 0.0]);

    s += ink(crv(BODY, true));
    s += ink(ribbon(spine, neckW));
    s += ink(LEG) + ink(FOOT) + ink(TUCK);
    var pl = plumes(fr);
    s += cutAround(pl, 0.75) + front(pl);
    s += cutAround(BILLFAR, 0.65, H) + front(crv(HEAD, true), H);
    return xf(scaleAt(8.8, 16, 1.06), s);
  }
  return { id: "crane", frames: NF, at: at };
})();
