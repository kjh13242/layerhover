// 서핑 (Surfing) — variant A: recognizability first.
// The three things that make surfing read as a silhouette: a curling lip pitching over a hollow barrel, a wide sideways
// crouch with the arms out for balance, and a pointed board with rocker sitting in the water. A lower front swell in the
// corner is the next wave rolling in.
// Loop (6 s): glide → the wave surges and lifts him toward the pocket → a beat of anticipation → drop → bottom turn
// (compress, back hand reaching for the water, spray off the tail) → glide. Legs use IK with fixed bone lengths, arms
// trail the body, the head leads, the hair follows through; the swell travels one wavelength per loop.
var FIG_K = 1.03;    // surfer scale relative to the board
var ICON = {
  id: "surf",
  frames: 48,
  at: function (t) { return surfScene(t); }
};

// ── small vector helpers ───────────────────────────────────────────────────────────────────────
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function vnrm(a) { var l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }
function vang(a) { return Math.atan2(a[1], a[0]) * 180 / Math.PI; }
function dir(deg, len) { var r = deg * Math.PI / 180; return [Math.cos(r) * len, Math.sin(r) * len]; }
function bez(p0, p1, p2, p3, u) {
  var v = 1 - u;
  return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
          v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
}
function P(p) { return f(p[0]) + ' ' + f(p[1]); }
// periodic key interpolation: keys [[t, v], ...] sorted, wraps at 1; eased in and out at every key
function keyed(t, keys) {
  var n = keys.length;
  for (var i = 0; i < n; i++) {
    var a = keys[i], b = keys[(i + 1) % n], tb = b[0] + (i === n - 1 ? 1 : 0), ta = a[0], tt = t;
    if (i === n - 1 && tt < ta) tt += 1;
    if (tt >= ta && tt <= tb) return lerp(a[1], b[1], smooth((tt - ta) / (tb - ta)));
  }
  return keys[0][1];
}

// spine through joints with a soft fillet at each joint (a ribbon then gets a round outer knee/elbow and a crisp crease)
function jointSpine(pts, d) {
  var out = [pts[0]];
  for (var i = 1; i < pts.length; i++) {
    var a = pts[i - 1], b = pts[i];
    var isCorner = i < pts.length - 1;
    var la = dist(a, b);
    var startCut = i > 1 ? Math.min(d, la * 0.4) : 0;
    var endCut = isCorner ? Math.min(d, la * 0.4) : 0;
    var s0 = startCut / la, s1 = 1 - endCut / la;
    for (var k = 1; k <= 3; k++) out.push(mix(a, b, s0 + (s1 - s0) * k / 3));
    if (isCorner) {
      var c = pts[i + 1], lc = dist(b, c), dc = Math.min(d, lc * 0.4);
      var t1 = mix(b, a, endCut / la), t2 = mix(b, c, dc / lc);
      for (var q = 1; q <= 4; q++) {
        var u = q / 5, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u;
        out.push([w0 * t1[0] + w1 * b[0] + w2 * t2[0], w0 * t1[1] + w1 * b[1] + w2 * t2[1]]);
      }
    }
  }
  return out;
}
// a limb whose width is given at key fractions of each joint-to-joint segment: keys = [[segIndex + frac, width], ...].
// tipAt (segIndex + frac), if given, starts an elliptical closure: the limb ends in a soft, convex fingertip (no cap, no knob).
function limb(joints, keys, fillet, caps, tipAt) {
  var L = [0];
  for (var i = 1; i < joints.length; i++) L.push(L[i - 1] + dist(joints[i - 1], joints[i]));
  var total = L[L.length - 1];
  var frac = function (k) {
    var si = Math.min(Math.floor(k), joints.length - 2), fr = k - si;
    return (L[si] + fr * (L[si + 1] - L[si])) / total;
  };
  var ks = keys.map(function (k) { return [frac(k[0]), k[1]]; });
  var sTip = tipAt === undefined ? 2 : frac(tipAt);
  var base = function (s) {
    if (s <= ks[0][0]) return ks[0][1];
    for (var j = 1; j < ks.length; j++) if (s <= ks[j][0]) return lerp(ks[j - 1][1], ks[j][1], smooth((s - ks[j - 1][0]) / (ks[j][0] - ks[j - 1][0])));
    return ks[ks.length - 1][1];
  };
  var wfn = function (s) {
    if (s <= sTip) return base(s);
    var x = (s - sTip) / (1 - sTip);
    return base(sTip) * Math.sqrt(Math.max(0, 1 - x * x));
  };
  return ribbon(jointSpine(joints, fillet), wfn, { caps: caps || ['flat', 'flat'], samples: 6 });
}
// two-bone IK: knee from hip, ankle and bone lengths; side picks the bend direction
function ik(hip, ank, L1, L2, side) {
  var d = vsub(ank, hip), D = Math.min(Math.hypot(d[0], d[1]), L1 + L2 - 0.01), u = vnrm(d);
  var a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  return [hip[0] + u[0] * a - side * u[1] * h, hip[1] + u[1] * a + side * u[0] * h];
}

// ── the surfer (board frame: deck centre at 0,0, nose to +x, y down) ───────────────────────────────
// Poses are additive: GLIDE plus weighted differences. Arms are joint angles (deg, absolute in the board frame).
var GLIDE = { px: -0.35, py: -3.65, lean: 27, head: -16, bArm: [148, 138, 124], fArm: [8, 24, 40], hair: 0 };
var TOP = { px: -0.25, py: -3.95, lean: 21, head: -12, bArm: [122, 114, 102], fArm: [-4, 6, 22], hair: 0 };      // lifted high on the face, tall and poised
var COIL = { px: -0.4, py: -3.3, lean: 33, head: -20, bArm: [126, 118, 104], fArm: [30, 44, 62], hair: 0 };     // anticipation before the drop
var CARVE = { px: -0.65, py: -3.05, lean: 13, head: -6, bArm: [136, 128, 116], fArm: [-22, -32, -14], hair: 0 }; // bottom turn: deep, leaning into the wave, back hand reaching for the water
// ws: body weights; wa: arm weights (arms trail the body); wh: head weights (the head leads)
function blendPose(ws, wa, wh) {
  var p = JSON.parse(JSON.stringify(GLIDE));
  ws.forEach(function (w) {
    var K = w[0], k = w[1];
    ['px', 'py', 'lean', 'hair'].forEach(function (n) { p[n] += (K[n] - GLIDE[n]) * k; });
  });
  (wh || ws).forEach(function (w) { p.head += (w[0].head - GLIDE.head) * w[1]; });
  (wa || ws).forEach(function (w) {
    var K = w[0], k = w[1];
    for (var i = 0; i < 3; i++) { p.bArm[i] += (K.bArm[i] - GLIDE.bArm[i]) * k; p.fArm[i] += (K.fArm[i] - GLIDE.fArm[i]) * k; }
  });
  return p;
}
var B_ANK = [-2.0, -0.72], F_ANK = [2.0, -0.72];
var B_LEG = [2.38, 2.3], F_LEG = [2.86, 1.85];
var B_ARM = [1.82, 1.37, 0.76], F_ARM = [1.385, 1.185, 0.716];

// torso in its own frame: pelvis at 0,0, spine up (−y), chest to +x (3/4 view). Neck included; head is separate.
function torsoShape() {
  return 'M0.8 0.12' +
    'C0.7 -0.28 0.56 -0.58 0.58 -0.98' +     // front hip → belly
    'C0.6 -1.4 0.95 -1.62 0.98 -2.05' +      // belly → chest
    'C1.02 -2.45 0.88 -2.78 0.5 -2.98' +     // chest → base of the neck (front)
    'L0.44 -3.7L-0.44 -3.7L-0.5 -3.12' +     // neck (top hidden under the head)
    'C-0.88 -2.98 -1.05 -2.62 -1.0 -2.15' +  // trapezius → shoulder blade
    'C-0.95 -1.5 -0.84 -0.8 -0.8 -0.1' +     // rounded crouching back
    'C-0.72 0.36 0.45 0.56 0.8 0.12Z';       // seat → front hip
}
// head in its own frame: centre 0,0, facing +x — jaw, chin, lip, nose, brow, crown, back of the skull
function skullShape() {
  return 'M0.42 0.8' +
    'C0.62 0.74 0.76 0.6 0.79 0.42' +
    'C0.81 0.3 0.8 0.2 0.84 0.08' +
    'C0.88 -0.02 1.02 -0.1 1.0 -0.22' +
    'C0.98 -0.34 0.86 -0.38 0.86 -0.52' +
    'C0.84 -0.84 0.48 -1.03 0.04 -1.03' +
    'C-0.48 -1.03 -0.88 -0.78 -1.0 -0.32' +
    'C-1.08 0.0 -1.0 0.3 -0.84 0.52' +
    'C-0.5 0.74 0.08 0.86 0.42 0.8Z';
}
// a lock of hair streaming from the back of the head, root at (-0.8, 0) in the head frame, pointing back and a little down
function lockShape() {
  return 'M-0.55 -0.48' +
    'C-0.95 -0.42 -1.45 -0.1 -1.95 0.42' +
    'C-1.5 0.42 -1.05 0.52 -0.62 0.62Z';
}

function surfer(pose) {
  var T = chain(rot(0, 0, pose.lean), move(pose.px, pose.py));     // torso frame → board frame
  var at = function (p) { return T(p[0], p[1]); };
  var bHip = at([-0.1, -0.62]), fHip = at([0.25, -0.5]);
  var bSh = at([-0.55, -2.62]), fSh = at([0.55, -2.58]);
  var headC = at([0.32, -4.15]);
  var headT = chain(scaleAt(0, 0, 0.92), rot(0, 0, pose.lean + pose.head), move(headC[0], headC[1]));
  var parts = [];
  parts.push(tp(torsoShape(), T));
  parts.push(tp(lockShape(), chain(rot(-0.8, 0, pose.hair), headT)));
  parts.push(tp(skullShape(), headT));
  // legs (IK): thigh tapers to the knee, calf swells, ankle slims, foot flares onto the deck
  var legKeys = [[0, 1.55], [0.45, 1.42], [1, 1.1], [1.3, 1.15], [1.85, 0.94], [2.0, 0.95], [2.55, 1.15], [3, 1.62]];
  var bKnee = ik(bHip, B_ANK, B_LEG[0], B_LEG[1], -1), fKnee = ik(fHip, F_ANK, F_LEG[0], F_LEG[1], -1);
  parts.push(limb([bHip, bKnee, B_ANK, [B_ANK[0] - 0.05, 0.3]], legKeys, 0.5, ['flat', 'flat']));
  parts.push(limb([fHip, fKnee, F_ANK, [F_ANK[0] + 0.05, 0.3]], legKeys, 0.5, ['flat', 'flat']));
  // arms: one tapering stroke shoulder → elbow → wrist → fingertips (an open hand seen edge-on)
  var armKeys = [[0, 1.2], [0.5, 1.1], [1, 1.0], [2, 0.9], [2.3, 0.92]];
  [[bSh, pose.bArm, B_ARM], [fSh, pose.fArm, F_ARM]].forEach(function (a) {
    var e = vadd(a[0], dir(a[1][0], a[2][0])), w = vadd(e, dir(a[1][1], a[2][1])), tip = vadd(w, dir(a[1][2], a[2][2]));
    parts.push(limb([a[0], e, w, tip], armKeys, 0.34, ['round', 'flat'], 2.3));
  });
  return parts;
}
function boardShape() {
  // squash tail, belly, rocker, sharp up-kicked nose
  return 'M-4.05 -0.25' +
    'C-2.0 0.0 0.9 0.05 2.7 -0.25' +
    'C3.5 -0.4 4.0 -0.7 4.4 -1.1' +
    'C4.05 -0.38 3.25 0.45 1.85 0.75' +
    'C0.0 1.05 -2.45 0.98 -3.8 0.74' +
    'C-4.05 0.68 -4.2 0.48 -4.22 0.22' +
    'L-4.22 -0.05' +
    'C-4.22 -0.18 -4.15 -0.25 -4.05 -0.25Z';
}
// spray thrown off the tail in the bottom turn: a fan of three pointed streaks bursts from the rail, swept back by the
// board's speed, detaches into drops that fall back toward the wave, and evaporates. Drawn without a halo: it is water
// leaving water, so it may merge with the wave behind it.
function spray(k, B) {
  var out = { ink: [], fade: [] };
  if (k <= 0 || k >= 1) return out;
  var root = [-3.9, 0.3];
  var burst = easeOut(clamp(k / 0.3));             // streaks shoot out
  var fly = smooth(clamp((k - 0.22) / 0.6));        // they detach and fly
  var gone = smooth(clamp((k - 0.6) / 0.4));        // and evaporate
  [[-140, 1.3, 0.84, 0.0, 0.25], [-113, 2.25, 1.0, 0.06, 0.4], [-88, 1.6, 0.84, 0.12, 0.3]].forEach(function (st) {
    var a = st[0] - 10 * fly, off = 0.2 + 1.9 * fly + 0.5 * st[3];
    var len = st[1] * burst * (1 - 0.55 * fly) * (1 - 0.6 * gone);
    var wid = st[2] * (1 - 0.15 * fly) * (1 - 0.5 * gone);
    if (len < 0.25 || wid < 0.2) return;
    var b = vadd(root, dir(a, off));
    b[1] += 1.2 * fly * fly;                         // gravity pulls the flying drops down
    var d = petal(b[0], b[1], len, wid, a + 12 * fly, { peak: 0.32, tip: 'point', base: 0.42, fat: 1.15, bend: st[4] * (1 - fly) });
    (gone > 0.2 ? out.fade : out.ink).push(tp(d, B));
  });
  return out;
}

// ── the water ────────────────────────────────────────────────────────────────────────────────────
// lip at rest (A) and thrown (B): same structure, morphed by the lip throw
var LIP_A = [[6.2, 2.75], [8.2, 2.15], [9.85, 3.1], [10.05, 4.7], [10.2, 5.65], [9.55, 6.3], [8.6, 6.55], [9.05, 5.95], [8.95, 5.1], [8.1, 4.85]];
var LIP_B = [[6.35, 2.55], [8.45, 1.95], [10.2, 2.95], [10.42, 4.62], [10.58, 5.72], [9.95, 6.55], [8.98, 6.9], [9.42, 6.2], [9.25, 5.22], [8.3, 4.92]];
function face(surge) { return [[8.6, 12.6], [10.6, 13.35 - 1.3 * surge], [13.4, 14.15 - 0.65 * surge], [17, 14.85]]; }
function waveShape(lip, surge) {
  var L = LIP_A.map(function (a, i) { return mix(a, LIP_B[i], lip); }), F = face(surge);
  return 'M1.9 16L1.9 13.6' +
    'C1.95 10.2 2.75 ' + f(4.6 - 0.15 * lip) + ' ' + P(L[0]) +       // back of the wave up to the crest
    'C' + P(L[1]) + ' ' + P(L[2]) + ' ' + P(L[3]) +                  // crest rolling over: outer lip
    'C' + P(L[4]) + ' ' + P(L[5]) + ' ' + P(L[6]) +                  // lip falling to its tip
    'C' + P(L[7]) + ' ' + P(L[8]) + ' ' + P(L[9]) +                  // tip curls back: underside of the lip
    'C6.7 4.38 4.85 5.55 4.7 7.5' +                                  // barrel ceiling → back wall
    'C4.55 9.8 6.0 11.75 8.6 12.6' +                                 // back wall sweeping into the face
    'C' + P(F[1]) + ' ' + P(F[2]) + ' ' + P(F[3]) +                  // the face running out into the trough
    'L17 16Z';
}
function faceAt(x, surge) {
  var F = face(surge), prev = F[0];
  for (var i = 1; i <= 80; i++) {
    var p = bez(F[0], F[1], F[2], F[3], i / 80);
    if (p[0] >= x) { var k = (x - prev[0]) / (p[0] - prev[0]); return { y: lerp(prev[1], p[1], k), ang: vang(vsub(p, prev)) }; }
    prev = p;
  }
  return { y: F[3][1], ang: 0 };
}
// the next swell rolling in, in front of the main wave: a travelling crest (one wavelength per loop)
function swellLine(ph) {
  var pts = [];
  for (var i = 0; i <= 14; i++) {
    var x = 0.4 + 5.3 * i / 14;
    var base = x < 3.2 ? 12.55 : 12.55 + 1.75 * Math.pow((x - 3.2) / 2.5, 1.6);
    var env = x < 3.6 ? 1 : Math.max(0, 1 - (x - 3.6) / 2.1);
    pts.push([x, base - 0.42 * env * Math.cos(TAU * ((x - 2.1) / 4.4 - ph)) + 0.12]);
  }
  return pts;
}

// ── timeline ─────────────────────────────────────────────────────────────────────────────────────
function heights(t) {
  // height on the face: 0 glide, +1 lifted toward the pocket, −1 bottom of the drop
  var h = keyed(wrap01(t), [[0, 0], [0.16, 0], [0.42, 1], [0.5, 0.92], [0.715, -1], [0.785, -0.95], [0.935, 0]]);
  return { lift: Math.max(0, h), carve: Math.max(0, -h), coil: pulse(wrap01(t), 0.4, 0.58) };
}
function motion(t) {
  var H = heights(t), Ha = heights(t - 0.035), Hh = heights(t + 0.025);   // arms trail, head leads
  var lift = H.lift, carve = H.carve, coil = H.coil;
  var x = 11.45 - 0.45 * lift + 0.85 * carve;
  var surge = lift * 0.9 + 0.1 * (0.5 - 0.5 * Math.cos(TAU * t));
  var fc = faceAt(x, surge);
  var pitch = -6 + 5 * lift + 3 * coil - 7 * pulse(t, 0.62, 0.86);  // nose a little up when planing; down when poised; up in the turn
  var spr = (t - 0.665) / 0.27;
  return {
    x: x, y: fc.y - 0.45 + 0.09 * loop(t, 4, 0.1) * (1 - lift), ang: fc.ang + pitch + 1.2 * loop(t, 4, 0.35) * (1 - lift), surge: surge,
    pose: blendPose([[TOP, lift], [COIL, coil * 0.8], [CARVE, carve]],
                    [[TOP, Ha.lift], [COIL, Ha.coil * 0.8], [CARVE, Ha.carve]],
                    [[TOP, Hh.lift], [COIL, Hh.coil * 0.8], [CARVE, Hh.carve]]),
    spray: spr > 0 && spr < 1 ? spr : 0,
    lip: (1 - Math.cos(TAU * (t + 0.05))) / 2,
    swell: t
  };
}

function surfScene(t) {
  var s = '', step = 1 / ICON.frames;
  var m = motion(t);
  // hair follows through: it lifts as the head drops and trails as it rises
  var m1 = motion(wrap01(t + step)), m0 = motion(wrap01(t - step));
  m.pose.hair = clamp(-((m1.y - m0.y) * 48), -22, 26);
  s += ink(waveShape(m.lip, m.surge));
  var sw = swellLine(m.swell);
  s += ink('M1 16L' + P([1, sw[1][1]]) + smoothPath(sw.slice(1), false).replace(/^M[^C]*/, '') + 'L6.6 16Z');
  s += cut(ribbon(sw, function (u) { return u < 0.6 ? 0.82 : 0.82 * Math.pow(Math.max(0, 1 - (u - 0.6) / 0.4), 0.8); }));
  var B = chain(rot(0, 0, m.ang), move(m.x, m.y));
  var F = chain(scaleAt(0, 0, FIG_K), B);
  var board = tp(boardShape(), B);
  var parts = surfer(m.pose).map(function (d) { return tp(d, F); });
  var sp = spray(m.spray, B);
  s += cutAround(board, 0.75);
  parts.forEach(function (d) { s += cutAround(d, 0.75); });
  sp.ink.forEach(function (d) { s += front(d); });
  s += front(board);
  parts.forEach(function (d) { s += front(d); });
  sp.fade.forEach(function (d) { s += fade(d); });
  return s;
}
