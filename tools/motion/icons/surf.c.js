// 서핑 (Surfing) — variant C: gesture first.
// A surfer rides the face of a curling wave in an open crouch, arms out for balance, a high ponytail flicking
// in the wind. The whole rider is one silhouette built on the board and tilting with it; the water under the
// board is drawn from the board's pose, so the rider always sits ON the wave.
// Loop (6 s): trim (poster) → drop → bottom turn: a deep lunge, the rear hand reaches back as the lip reaches
// forward and the rail throws two drops into the pocket → climb → stall, tall and light → snap → trim.
// All along, a groove flows up the face into the curl: the wave keeps rolling in.

// ── vector helpers (prefixed so they never clash with the kit) ──────────────────────────────────────
function sfAdd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function sfSub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function sfMul(a, k) { return [a[0] * k, a[1] * k]; }
function sfDir(deg) { var r = deg * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
function sfRotV(p, deg) { var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
function sfPt(p) { return f(p[0]) + ' ' + f(p[1]); }
// two-bone IK: joint between a and b for bone lengths l1, l2; for a bone pointing down, side +1 bends to screen-right
function sfIK(a, b, l1, l2, side) {
  var d = dist(a, b), dd = Math.min(d, l1 + l2 - 0.001);
  var x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  var u = [(b[0] - a[0]) / d, (b[1] - a[1]) / d], n = [u[1] * side, -u[0] * side];
  return [a[0] + u[0] * x + n[0] * h, a[1] + u[1] * x + n[1] * h];
}
// width profile through [s, value] stops: a smooth (C1) Hermite curve, so contours never ripple or kink
function sfProfile(stops) {
  var n = stops.length, m = [];
  for (var i = 0; i < n; i++) {
    var a = stops[Math.max(0, i - 1)], b = stops[Math.min(n - 1, i + 1)];
    m.push(b[0] === a[0] ? 0 : (b[1] - a[1]) / (b[0] - a[0]));
  }
  return function (s) {
    if (s <= stops[0][0]) return stops[0][1];
    for (var i = 1; i < n; i++) {
      if (s <= stops[i][0]) {
        var h = stops[i][0] - stops[i - 1][0], u = (s - stops[i - 1][0]) / h, u2 = u * u, u3 = u2 * u;
        return (2 * u3 - 3 * u2 + 1) * stops[i - 1][1] + (u3 - 2 * u2 + u) * h * m[i - 1] + (-2 * u3 + 3 * u2) * stops[i][1] + (u3 - u2) * h * m[i];
      }
    }
    return stops[n - 1][1];
  };
}

// ── the board (board frame: origin at deck centre, x to the nose, y down) ───────────────────────────
var SF_BOARD = 'M-3.95 -0.22C-2.9 -0.04 -1.3 0 0 0C2 0 3.3 -0.2 4.2 -0.64' +        // deck with rocker to the nose
  'C4.44 -0.76 4.6 -0.6 4.42 -0.42C3.7 0.34 2.35 1.12 0.25 1.15' +                     // softly pointed nose, rocker underneath
  'C-1.6 1.18 -3.15 0.98 -4.05 0.66' +                                                  // bottom, thickest just behind centre
  'L-4.14 -0.08C-4.15 -0.16 -4.06 -0.23 -3.95 -0.22Z';                                  // crisp squash tail

// ── the rider (board frame). Limbs are brush strokes: they swell at the muscle and pinch at the joints ──
var SF_ARM_W = sfProfile([[0, 1.14], [0.2, 1.1], [0.4, 0.93], [0.52, 1.0], [0.73, 0.87], [0.86, 0.97], [1, 0.74]]);
var SF_LEG_W = sfProfile([[0, 1.22], [0.28, 1.3], [0.5, 0.98], [0.62, 1.02], [0.82, 0.94], [1, 0.9]]);
var SF_FB = -2.2, SF_FF = 1.9;                                                          // feet on the deck

function sfRider(P) {
  var out = [];
  var up = sfDir(-90 + P.lean), fw = sfDir(P.lean);
  function T(s, w) { return sfAdd(sfAdd(P.hip, sfMul(up, s)), sfMul(fw, w)); }
  // torso: hips → waist → ribcage → rounded shoulders → neck (s up the spine, w across)
  var torso = [
    [-0.16, 0.0], [0.04, 0.6], [0.62, 0.6], [1.25, 0.72], [1.78, 0.88], [2.12, 0.86], [2.34, 0.62], [2.52, 0.42], [3.05, 0.4],
    [3.05, -0.36], [2.62, -0.44], [2.34, -0.68], [2.12, -0.88], [1.78, -0.9], [1.25, -0.72], [0.62, -0.62], [0.04, -0.64]
  ];
  out.push(smoothPath(torso.map(function (p) { return T(p[0], p[1]); }), true, 1));
  // head: an egg with a soft profile, facing the nose
  var hc = T(3.36, 0.26), hr = P.head;
  var head = [[0.05, -0.9], [0.58, -0.64], [0.8, -0.14], [0.74, 0.28], [0.46, 0.66], [0.0, 0.8], [-0.46, 0.64], [-0.8, 0.12], [-0.64, -0.56]];
  function H(p) { return sfAdd(hc, sfRotV(p, hr)); }
  out.push(smoothPath(head.map(H), true, 1));
  // hair: a short ponytail tied high at the back of the crown — narrow at the tie, flaring, flicking back in the
  // wind. hairRot: + flicks it up (fast), - lets it fall (slow); it follows the motion a beat late.
  var tie = H([-0.5, -0.56]), hdir = 202 + hr + (P.hairRot || 0);
  out.push(petal(tie[0], tie[1], 1.42, 0.98, hdir, { peak: 0.52, base: 0.58, bend: -0.16, fat: 1.12 }));
  // arms: one stroke from the shoulder through the elbow and wrist to the fingertips — it swells at the upper arm
  // and forearm, pinches at elbow and wrist, opens into a mitten palm and closes on a broad, soft fingertip edge
  function arm(sh, a, droop) {
    var el = sfAdd(sh, sfMul(sfDir(a[0]), 1.3)), wr = sfAdd(el, sfMul(sfDir(a[1]), 1.12)), tp = sfAdd(wr, sfMul(sfDir(a[2] + droop), 0.86));
    out.push(ribbon([sh, el, wr, tp], SF_ARM_W, { caps: ['round', 'round'], samples: 14 }));
  }
  arm(T(2.02, -0.42), P.armB, -8);
  arm(T(2.02, 0.42), P.armF, 8);
  // legs: back knee opens toward the tail, front knee bends over the front foot; ankles sink into the feet
  var hipB = T(0.35, -0.22), hipF = T(0.35, 0.22), ankB = [SF_FB, -0.42], ankF = [SF_FF, -0.42];
  var kF = sfIK(hipF, ankF, 2.25, 2.2, 1), kB = sfIK(hipB, ankB, 2.25, 2.2, -1);
  function leg(h, k, a) {
    out.push(ribbon([h, mix(h, k, 0.5), k, mix(k, a, 0.5), a], SF_LEG_W, { caps: ['round', 'round'], samples: 12 }));
  }
  leg(hipB, kB, ankB);
  leg(hipF, kF, ankF);
  out.push(sfFoot(SF_FB), sfFoot(SF_FF));
  return out;
}

// feet: the ankle flares into a planted foot on the deck
function sfFoot(x) {
  return 'M' + f(x - 0.3) + ' -0.62C' + f(x - 0.36) + ' -0.32 ' + f(x - 0.56) + ' -0.1 ' + f(x - 0.8) + ' 0.1' +
    'L' + f(x + 0.8) + ' 0.1C' + f(x + 0.56) + ' -0.1 ' + f(x + 0.36) + ' -0.32 ' + f(x + 0.3) + ' -0.62Z';
}

// ── the wave. The upper part (back, crest, lip, barrel) is drawn once; `lip` (0..1) throws the lip forward.
//    The face sweeps from the barrel wall as a quarter-ellipse into a line set just under the board,
//    so the rider always sits ON the water with an even gap ─────────────────────────────────────────────
var SF_WK = 0.9, SF_WDX = -0.25;
function sfW(x, y) { return [1 + (x - 1) * SF_WK + SF_WDX, 16 + (y - 16) * SF_WK]; }
function sfWave(bt, lip) {
  function L(x, y, kx, ky) { var p = sfW(x, y); return sfPt([p[0] + 1.25 * kx * lip, p[1] + 1.25 * ky * lip]); }
  var top = 'M1 16L1 13.6L' + sfPt(sfW(1.5, 12.8)) +
    'C' + sfPt(sfW(2.3, 10.6)) + ' ' + sfPt(sfW(2.9, 7.2)) + ' ' + sfPt(sfW(4.2, 5.2)) +                 // back of the wave rising
    'C' + sfPt(sfW(5.2, 3.7)) + ' ' + L(6.8, 3.0, 0.1, -0.05) + ' ' + L(8.1, 3.7, 0.3, 0) +              // crest rolling over
    'C' + L(9.1, 4.3, 0.5, 0.1) + ' ' + L(9.0, 5.7, 0.6, 0.35) + ' ' + L(7.7, 6.7, 0.55, 0.6) +          // lip pitching to a sharp tip
    'C' + L(8.0, 5.7, 0.5, 0.4) + ' ' + L(7.5, 5.1, 0.3, 0.15) + ' ' + L(6.7, 5.2, 0.1, 0.05) +          // underside of the lip
    'C' + sfPt(sfW(5.6, 5.3)) + ' ' + sfPt(sfW(4.9, 6.6)) + ' ' + sfPt(sfW(5.0, 8.4));                   // barrel back wall
  var w0 = sfW(5.0, 8.4), pt = bt(-3.6, 1.76), face = [w0];
  [22, 45, 68].forEach(function (a) {
    var r = a * Math.PI / 180;
    face.push([pt[0] - (pt[0] - w0[0]) * Math.cos(r), w0[1] + (pt[1] - w0[1]) * Math.sin(r)]);
  });
  face.push(pt, bt(-1.2, 1.88), bt(1.2, 1.92), bt(3.5, 1.96));
  var e = face[face.length - 1];
  face.push([lerp(e[0], 17, 0.55), e[1] + 0.16], [17, e[1] + 0.2]);
  return top + smoothPath(face, false, 1).replace(/^M[^C]*/, '') + 'L17 16Z';
}
// inner layer: a tapered groove that echoes the face's sweep inside the body of the wave. It travels up the
// face into the curl (the water feeding the wave), so the wave keeps rolling in. u: 0 = top of the arc, 1 = bottom.
function sfEcho(bt, u0, u1, wmax) {
  var w0 = sfW(5.0, 8.4), pt = bt(-3.6, 1.76), d = 1.48, pts = [], ry = pt[1] - w0[1] + d;
  u1 = Math.min(u1, Math.asin(clamp((14.5 - w0[1]) / ry, 0, 1)) * 2 / Math.PI);   // keep clear of the bottom edge
  if (u1 - u0 < 0.1) return '';
  for (var i = 0; i <= 8; i++) {
    var r = lerp(u0, u1, i / 8) * Math.PI / 2;
    pts.push([pt[0] - (pt[0] - w0[0] + d) * Math.cos(r), w0[1] + ry * Math.sin(r)]);
  }
  return ribbon(pts, function (s) { return wmax * Math.pow(Math.sin(Math.PI * s), 0.6); });
}
function sfFlow(bt, t) {
  var out = '';
  for (var j = 0; j < 2; j++) {
    var ph = wrap01(2 * t + j * 0.5 + 0.5), c = lerp(1.0, 0.3, ph), life = Math.sin(Math.PI * ph);
    var half = 0.36 * Math.pow(life, 0.8);                // grows and shrinks in length; its width stays a clean cut
    var u0 = Math.max(0.2, c - half), u1 = Math.min(1.0, c + half);
    var e = u1 - u0 > 0.1 ? sfEcho(bt, u0, u1, 0.78) : '';
    if (e) out += cut(e);
  }
  return out;
}

// spray: during the bottom turn the rail throws two drops of different sizes out of the face. Each flies its own
// parabola up into the pocket and falls back into the face — born from the water, swallowed by it again,
// so nothing ever pops in or out. A drop points along its flight, stretches when fast, rounds up at the top.
// World coordinates; `tail` is the launch point in the water just behind the tail.
var SF_DROPS = [                                         // [start, end (of k), rise, landing x, landing y, width]
  [0.0, 0.74, 3.0, 5.95, 13.6, 1.16],
  [0.26, 0.96, 2.2, 6.95, 13.65, 0.96]
];
function sfSpray(k, tail) {
  var out = '';
  SF_DROPS.forEach(function (d) {
    var u = (k - d[0]) / (d[1] - d[0]);
    if (u <= 0 || u >= 1) return;
    var h1 = d[2], h2 = d[4] - (tail[1] - h1), ta = Math.sqrt(h1) / (Math.sqrt(h1) + Math.sqrt(Math.max(0.01, h2)));
    var ay = tail[1] - h1;
    function pos(v) {
      var x = lerp(tail[0], d[3], v);
      var y = v <= ta ? ay + (tail[1] - ay) * Math.pow((v - ta) / ta, 2) : ay + (d[4] - ay) * Math.pow((v - ta) / (1 - ta), 2);
      return [x, y];
    }
    var p = pos(u), q = pos(Math.min(1, u + 0.02)), r = pos(Math.max(0, u - 0.02));
    var vx = q[0] - r[0], vy = q[1] - r[1], sp = Math.hypot(vx, vy) / 0.04, ang = Math.atan2(vy, vx) * 180 / Math.PI;
    var w = d[5], len = w * (1.2 + 0.75 * clamp(sp / 9));
    var back = sfSub(p, sfMul(sfDir(ang), len * 0.66));
    out += front(petal(back[0], back[1], len, w, ang, { peak: 0.72, tip: 'round', base: 0.18 }));
  });
  return out;
}

// ── timing: a periodic Hermite spline through keyframes [[t, v], ...] (seamless over the loop) ─────
function sfSpline(keys, t) {
  var n = keys.length, i = -1;
  for (var j = 0; j < n; j++) if (keys[j][0] <= t) i = j;
  function K(m) { var q = ((m % n) + n) % n, off = Math.floor(m / n); return [keys[q][0] + off, keys[q][1]]; }
  var p0 = K(i - 1), p1 = K(i), p2 = K(i + 1), p3 = K(i + 2);
  var h = p2[0] - p1[0], u = (t - p1[0]) / h, u2 = u * u, u3 = u2 * u;
  var m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * h, m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * h;
  return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2;
}
// key poses. C / th: board centre and tilt (world). hip / lean / head in the board frame.
// Arms are given in WORLD angles (so they sweep in clean arcs whatever the board does).
var SF_KEYS = [
  { t: 0.00, C: [12.1, 11.85], th: 10, hip: [0.15, -3.9], lean: 5, head: -12, armB: [190, 174, 164], armF: [18, 26, 33], hair: 0 },     // trim (poster): arms out for balance
  { t: 0.30, C: [11.9, 12.42], th: 4, hip: [0.72, -3.5], lean: -7, head: -6, armB: [150, 142, 136], armF: [-24, -28, -18], hair: 8 },  // bottom turn: a deep lunge, rear hand reaches back for the wave
  { t: 0.62, C: [12.2, 11.2], th: -1, hip: [0.08, -4.15], lean: 0, head: -6, armB: [166, 130, 120], armF: [-14, -9, 0], hair: -26 },  // stall high on the face: tall and light, rear arm softens, hair falls
  { t: 0.78, C: [11.6, 11.38], th: 13, hip: [0.28, -3.8], lean: 7, head: -14, armB: [190, 194, 197], armF: [35, 28, 38], hair: 4 }     // snap: pivot down the face
];
function sfAt(name, t, idx) {
  return sfSpline(SF_KEYS.map(function (k) { return [k.t, idx === undefined ? k[name] : k[name][idx]]; }), wrap01(t));
}
function sfPose(t) {
  var lag = 0.035;                                       // forearms and hands follow a beat behind the shoulders
  return {
    C: [sfAt('C', t, 0), sfAt('C', t, 1)], th: sfAt('th', t),
    hip: [sfAt('hip', t, 0), sfAt('hip', t, 1)], lean: sfAt('lean', t), head: sfAt('head', t),
    armB: [sfAt('armB', t, 0), sfAt('armB', t - lag, 1), sfAt('armB', t - 2 * lag, 2)],
    armF: [sfAt('armF', t, 0), sfAt('armF', t - lag, 1), sfAt('armF', t - 2 * lag, 2)],
    hairRot: sfAt('hair', t - 0.05)
  };
}
function sfPoseB(t) {                                     // arms converted from world angles to the board frame
  var p = sfPose(t);
  p.armB = p.armB.map(function (a) { return a - p.th; });
  p.armF = p.armF.map(function (a) { return a - p.th; });
  return p;
}

var ICON = {
  id: "surf",
  frames: 48,
  at: function (t) {
    var P = sfPoseB(t);
    var bt = chain(rot(0, 0, P.th), move(P.C[0], P.C[1]));
    var lip = 0.5 + 0.5 * Math.cos(TAU * (t - 0.34));       // the lip reaches toward the rider's hand at the bottom turn
    var spray = seg(t, 0.2, 0.62, function (x) { return x; });
    var s = ink(sfWave(bt, lip));
    s += sfFlow(bt, t);
    s += front(SF_BOARD, bt);
    var parts = sfRider(P);
    for (var i = 0; i < parts.length; i++) s += front(parts[i], bt);
    s += sfSpray(spray, bt(-4.35, 1.55));
    return s;
  }
};
