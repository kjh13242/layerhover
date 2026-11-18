// 서핑 (surf) — variant B: elegance first.
// The wave is one calligraphic gesture: a brush-stroke foot rising from the sea, a thick body that
// thins into a lip curling to a point, and a rolling line carved inside it that spirals up into the
// crest. A crafted surfer (profile head with wind-swept hair, tapered limbs, mitten hands, heel-and-toe
// feet) rides its face on a rockered board.
// Motion (6 s): the swell lifts the surfer up the face (board nose up, legs extend, back arm floats
// like a wing), a hang at the top, the drop (nose down, arms counter-balance), a compressed bottom
// turn that flings a drop of spray back toward the curl, and the glide home. The lip throws forward
// after the surfer has passed (overlapping action); the hair trails the motion.
var ICON = {
  id: "surf",
  frames: 48,
  at: function (t) {
    return SURF.draw(t);
  }
};

var SURF = (function () {
  // ── helpers ───────────────────────────────────────────────────────────────────────────────────
  function rad(a) { return a * Math.PI / 180; }
  // Pen-tool style path: nodes [x, y, aOut, aIn, kOut, kIn]; angles = travel direction in degrees
  // (0 right, 90 down). aIn defaults to aOut (smooth node). k = handle length as share of the chord.
  function bz(nodes, closed) {
    var n = nodes.length, d = 'M' + f(nodes[0][0]) + ' ' + f(nodes[0][1]), last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var A = nodes[i], B = nodes[(i + 1) % n], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      var ao = A[2], ai = B[3] === undefined || B[3] === null ? B[2] : B[3];
      var ko = (A[4] === undefined || A[4] === null ? 0.36 : A[4]) * L, ki = (B[5] === undefined || B[5] === null ? 0.36 : B[5]) * L;
      d += 'C' + f(A[0] + Math.cos(rad(ao)) * ko) + ' ' + f(A[1] + Math.sin(rad(ao)) * ko) + ' ' +
        f(B[0] - Math.cos(rad(ai)) * ki) + ' ' + f(B[1] - Math.sin(rad(ai)) * ki) + ' ' + f(B[0]) + ' ' + f(B[1]);
    }
    return d + (closed ? 'Z' : '');
  }
  function cont(nodes) { return bz(nodes, false).replace(/^M[^C]*/, ''); }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k]; }
  function unit(a) { var l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }
  function perp(a) { return [-a[1], a[0]]; }
  function ang(a) { return Math.atan2(a[1], a[0]) * 180 / Math.PI; }
  function dirv(deg) { return [Math.cos(rad(deg)), Math.sin(rad(deg))]; }
  function N(p, aOut, aIn, kOut, kIn) { return [p[0], p[1], aOut, aIn, kOut, kIn]; }
  // two-bone IK: joint between root R and end E with bone lengths l1, l2; side +1/-1 picks the bend
  function ik(R, E, l1, l2, side) {
    var d = sub(E, R), L = Math.min(Math.hypot(d[0], d[1]), l1 + l2 - 0.001), u = unit(d);
    var a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return add(add(R, mul(u, a)), mul(perp(u), h * side));
  }

  // ── wave ──────────────────────────────────────────────────────────────────────────────────────
  // W.lift: the face swells up under the surfer (pt); W.pitch: the lip throws forward (0..1);
  // W.roll: the spiral end advances; W.bed(x): water surface under the board (follows the board)
  function liftAt(x, L) { return L * smooth((x - 5.8) / 5.0); }
  // tangent angles through neighbours (Catmull-Rom) so a lifted face stays one smooth sweep
  function autoAng(P, first, last) {
    return P.map(function (q, i) {
      if (i === 0) return [q[0], q[1], first];
      if (i === P.length - 1) return [q[0], q[1], last];
      return [q[0], q[1], ang(sub(P[i + 1], P[i - 1]))];
    });
  }
  function wave(W) {
    var L = W.lift, p = W.pitch;
    function lp(x, y, a, ai, kx, ky, da) { return [x + kx * p, y + ky * p, a + (da || 0) * p, ai === null ? null : ai + (da || 0) * p]; }
    var y17 = W.edge;
    var face = autoAng([[17, y17], [13.2, W.bed(13.2)], [10.4, W.bed(10.4)], [8.4, 11.74 - liftAt(8.4, L)],
      [6.85, 10.3 - liftAt(6.85, L)], [6.05, 8.3]], 180 + 0.5 * (W.bdeg + 6), 266);
    return 'M9.2 15.2L17 15.2L17 ' + f(y17) + cont(face.concat([
      lp(6.35, 6.15, 305, null, 0.08, 0.04),
      lp(7.45, 5.3, 2, null, 0.32, 0.02, 4),
      lp(8.37, 5.95, 70, null, 0.6, 0.32, 8),
      lp(8.6, 7.15, 290, 98, 0.72, 1.0, 10),       // lip tip (corner): throws forward and down
      lp(9.35, 5.55, 262, null, 0.62, 0.48, 6),
      lp(9.15, 4.1, 228, null, 0.42, 0.04),
      lp(8.0, 3.1, 196, null, 0.3, -0.12),
      lp(6.45, 2.85, 178, null, 0.14, -0.12),      // crest
      [4.75, 3.35, 150],
      [3.7, 5.0, 112],
      [3.1, 7.4, 97],
      [2.95, 10.2, 95],
      [2.65, 12.6, 108],
      [2.15, 13.72, 345, 125, 0.4],                // foot (corner)
      [4.0, 13.62, 10],
      [6.4, 14.75, 35],
      [9.2, 15.2, 0]
    ])) + 'Z';
  }
  // the sea the wave rises from: a band on the ground line whose top swells gently under the wave
  function sea() {
    return 'M1 16L17 16L17 14.6' + cont([
      [17, 14.6, 180],
      [9.4, 14.75, 182],
      [5.6, 14.55, 178],
      [2.8, 14.42, 178],
      [1.0, 14.62, 168]
    ]) + 'Z';
  }
  // the rolling line: a calligraphic cut that swells under the barrel and curls up inside the wave
  function roll(W) {
    var L = W.lift, r = W.roll;
    var pts = [[17.6, Math.min(14.6, W.edge + 1.5)], [13.2, W.bed(13.2) + 1.78], [10.4, W.bed(10.4) + 1.74],
      [7.75, 13.08 - liftAt(7.75, L)], [5.65, 11.2], [4.6, 8.45], [4.72, 6.1], [5.6 + 0.25 * r, 4.6 - 0.2 * r]];
    return ribbon(pts, function (s) {
      var w = 0.82 + 0.18 * Math.max(0, 1 - Math.pow((s - 0.42) / 0.16, 2)) + 0.12 * Math.max(0, 1 - s / 0.2);
      return s < 0.82 ? w : 0.82 * Math.pow(Math.max(0, 1 - (s - 0.82) / 0.18), 0.85);
    });
  }

  // ── board: a slim lens with a pointed nose, squash tail and rocker ────────────────────────────
  var BOARD_RAW = bz([
    [3.9, -0.5, 190, 332],            // nose (corner)
    [-0.6, -0.6, 180],
    [-3.6, -0.4, 166],
    [-3.95, 0.0, 90, null, 0.5, 0.5], // squash tail
    [-3.6, 0.4, 12, null, 0.5],
    [-0.6, 0.5, 0],
    [2.3, 0.22, 343]
  ], true);
  var BOARD = tp(BOARD_RAW, scaleAt(0, 0, 0.94, 1));
  var ROCKER = bend(-3.76, 0, 3.76, 0, 0.3);

  // ── surfer parts ──────────────────────────────────────────────────────────────────────────────
  // A two-segment limb A → B → C with widths w = [wA, wB, wC]: a smooth rounded outer joint,
  // a crisp crease on the inner side, tapering edges. The root end hides inside the body.
  function limb(A, B, C, w, opts) {
    opts = opts || {};
    var d1 = unit(sub(B, A)), d2 = unit(sub(C, B)), cr = d1[0] * d2[1] - d1[1] * d2[0];
    var so = cr > 0 ? -1 : 1, n1 = mul(perp(d1), so), n2 = mul(perp(d2), so), nb = unit(add(n1, n2));
    var dm = unit(add(d1, d2)), bulge = opts.bulge === undefined ? 0.06 : opts.bulge;
    var Ao = add(A, mul(n1, w[0] / 2)), Ai = add(A, mul(n1, -w[0] / 2));
    var Bo = add(B, mul(nb, w[1] / 2 + bulge)), Co = add(C, mul(n2, w[2] / 2)), Ci = add(C, mul(n2, -w[2] / 2));
    var p1 = add(B, mul(n1, -w[1] / 2)), p2 = add(B, mul(n2, -w[1] / 2)), den = cr, Bi;
    if (Math.abs(den) < 0.15) Bi = add(B, mul(nb, -w[1] / 2));
    else Bi = add(p1, mul(d1, ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den));
    var cap = opts.cap || 0.5;
    return bz([
      N(Ao, ang(d1)),
      N(Bo, ang(dm)),
      N(Co, ang(add(d2, mul(n2, -cap))), ang(d2), 0.6),
      N(Ci, ang(mul(d2, -1)), ang(add(mul(d2, -cap), mul(n2, -1))), null, 0.6),
      N(Bi, ang(mul(d1, -1)), ang(mul(d2, -1))),
      N(Ai, ang(n1), ang(mul(d1, -1)))
    ], true);
  }
  // mitten hand from the wrist W, pointing along deg
  function hand(W, deg) {
    var d = dirv(deg), W0 = add(W, mul(d, -0.3));
    return ribbon([W0, add(W0, mul(d, 0.62)), add(W0, mul(d, 1.12))], function (s) {
      return s < 0.45 ? lerp(0.9, 1.0, smooth(s / 0.45)) : lerp(1.0, 0.66, smooth((s - 0.45) / 0.55));
    }, { caps: ['flat', 'round'] });
  }
  // foot on the deck: heel H, deck direction d (unit), up = away from the board
  function foot(H, d, up) {
    function P(u, v) { return add(add(H, mul(d, u)), mul(up, v)); }
    var a = ang(d), b = ang(up);
    return bz([
      N(P(0.08, 0), a, null, 0.4),
      N(P(1.42, 0.02), a - 155, a, 0.35, 0.2),     // toe
      N(P(0.95, 0.36), a - 165),                   // instep
      N(P(0.62, 0.95), b, a - 120),                // ankle front
      N(P(0.12, 0.95), b + 180, b + 180),          // ankle back
      N(P(-0.04, 0.32), a + 90 + 35, null, 0.5, 0.5) // heel
    ], true);
  }

  // torso (spine vertical in local coordinates: hip at 0,0, front = +x)
  var TORSO = [
    [-0.35, -3.0, 160],               // nape
    [-0.76, -2.2, 100],               // shoulder blade
    [-0.68, -1.2, 86],
    [-0.6, -0.55, 96],                // lumbar
    [-0.8, 0.1, 75],                  // seat
    [-0.05, 0.62, 0],
    [0.72, 0.12, 282],                // front of hip
    [0.62, -0.9, 270],                // belly
    [0.86, -1.95, 262],               // chest
    [0.45, -2.85, 232]                // throat
  ];
  // head in the same local frame: profile facing right, hair swept back by the wind
  var HEAD = [
    [0.45, -2.92, 340],               // under the jaw
    [0.88, -3.22, 292, 330, 0.3],     // chin (soft corner)
    [1.03, -3.53, 298],               // mouth
    [1.3, -3.86, 238, 306, 0.3, 0.3], // nose tip (corner)
    [1.07, -4.14, 280],               // bridge
    [1.12, -4.46, 258],               // brow
    [0.86, -4.86, 213],               // hairline
    [0.15, -5.04, 182],               // crown
    [-0.62, -4.84, 160],
    [-1.8, -4.12, 22, 158, 0.42],     // hair lock tip (corner)
    [-0.58, -3.78, 38],
    [-0.36, -3.05, 82],               // nape
    [-0.12, -2.65, 18]                // into the neck
  ];

  function local(nodes, H, deg) {
    var R = rot(0, 0, deg);
    return nodes.map(function (q) {
      var p = R(q[0], q[1]);
      return [H[0] + p[0], H[1] + p[1], q[2] + deg, q[3] === undefined || q[3] === null ? q[3] : q[3] + deg, q[4], q[5]];
    });
  }

  // ── the rig ───────────────────────────────────────────────────────────────────────────────────
  // Everything is placed from the board: feet planted on the deck, hip above them, knees by IK.
  // S = { bx, by, bdeg, crouch (pt the hip drops), lean (deg), reach (arm counter-balance, deg),
  //       wing (back arm lift, deg), nod (head, deg), hair (lock angle, deg) }
  var LEG_F = [1.94, 1.93], LEG_B = [1.46, 1.5];
  function surfer(S) {
    var s = '';
    var BR = chain(ROCKER, rot(0, 0, S.bdeg), move(S.bx, S.by));
    var bd = BR(0, 0), d = unit(sub(BR(1, 0), bd)), up = [d[1], -d[0]];
    function deck(u) { return BR(u, -0.56); }
    var heelF = deck(0.98), heelB = deck(-2.48);
    function ankle(H) { return add(add(H, mul(d, 0.37)), mul(up, 0.86)); }
    var ankF = ankle(heelF), ankB = ankle(heelB);
    // hip: above the stance, dropped by crouch, shifted forward by lean
    var Hp = add(add(deck(-0.88), mul(up, 2.78 - S.crouch)), [0.12 + 0.01 * S.lean, 0]);
    var lean = S.lean, R = rot(0, 0, lean);
    function at(x, y) { var p = R(x, y); return [Hp[0] + p[0], Hp[1] + p[1]]; }
    var hipF = at(0.25, -0.05), hipB = at(-0.05, -0.28);
    var kneeF = ik(hipF, ankF, LEG_F[0], LEG_F[1], -1), kneeB = ik(hipB, ankB, LEG_B[0], LEG_B[1], -1);
    var J = at(0.05, -2.32);
    // arms by angle: upper-arm direction and elbow bend
    var elbF = add(J, mul(dirv(24 + S.reach), 1.28)), wriF = add(elbF, mul(dirv(19 + S.reach * 1.3), 0.94));
    var rb = 0.45 * S.reach + S.wing;
    var elbB = add(J, mul(dirv(199 + rb), 1.3)), wriB = add(elbB, mul(dirv(206 + rb * 1.3), 1.04));

    s += front(bz(local(TORSO, Hp, lean), true));
    // the hair lock trails the motion: rotate its tip about the back of the head
    var HR = rot(-0.6, -4.35, S.hair), head = HEAD.map(function (q, i) {
      if (i !== 9) return q;
      var r = HR(q[0], q[1]); return [r[0], r[1], q[2] + S.hair, q[3] + S.hair, q[4], q[5]];
    });
    s += front(bz(local(head, Hp, lean - S.nod), true));
    s += front(limb(hipF, kneeF, ankF, [1.48, 1.12, 0.94]));
    s += front(limb(hipB, kneeB, ankB, [1.4, 1.1, 0.94]));
    s += front(foot(heelF, d, up)) + front(foot(heelB, d, up));
    s += front(limb(J, elbF, wriF, [1.14, 0.98, 0.92], { bulge: 0.02 }));
    s += front(hand(wriF, ang(sub(wriF, elbF)) + 4));
    s += front(limb(J, elbB, wriB, [1.14, 0.98, 0.92], { bulge: 0.02 }));
    s += front(hand(wriB, ang(sub(wriB, elbB)) - 4));
    return s;
  }

  // ── timing ────────────────────────────────────────────────────────────────────────────────────
  // periodic keyframes [t, value, tangent?] with Hermite easing (tangent defaults to the neighbours' slope)
  function keys(t, K) {
    var n = K.length; t = wrap01(t);
    function T(i) { return K[((i % n) + n) % n][0] + Math.floor(i / n); }
    function V(i) { return K[((i % n) + n) % n][1]; }
    function M(i) { var k = K[((i % n) + n) % n]; return k[2] !== undefined ? k[2] : (V(i + 1) - V(i - 1)) / (T(i + 1) - T(i - 1)); }
    var i = 0; for (var j = 0; j < n; j++) if (K[j][0] <= t) i = j;
    var t0 = T(i), h = T(i + 1) - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * V(i) + (u3 - 2 * u2 + u) * h * M(i) + (-2 * u3 + 3 * u2) * V(i + 1) + (u3 - u2) * h * M(i + 1);
  }
  // the swell lifts the surfer up the face, a hang at the top, the drop, the bottom turn, the glide
  var LIFT = [[0, 0], [0.3, 1.36, 0], [0.42, 1.16], [0.64, -0.12, 0], [0.8, -0.03]];
  var DRIFT = [[0, 0], [0.3, -0.62], [0.48, -0.4], [0.68, 0.16], [0.86, 0.06]];
  var PITCH = [[0, 0, 0], [0.36, 0, 0], [0.6, 1, 0], [0.92, 0, 0]];
  function lift(t) { return keys(t, LIFT); }
  function d1(fn, t) { var e = 1 / 480; return (fn(t + e) - fn(t - e)) / (2 * e); }
  function d2(fn, t) { var e = 1 / 240; return (fn(t + e) - 2 * fn(t) + fn(t - e)) / (e * e); }
  var VMAX = 0, AMAX = 0;
  for (var i = 0; i < 240; i++) { VMAX = Math.max(VMAX, Math.abs(d1(lift, i / 240))); AMAX = Math.max(AMAX, Math.abs(d2(lift, i / 240))); }
  function vel(t) { return d1(lift, t) / VMAX; }
  function acc(t) { return d2(lift, t) / AMAX; }

  // a water drop flying along v: round head, tail drawn out behind it
  function teardrop(C, v, r, tail) {
    var d = unit(v), n = perp(d), a = ang(d), T = add(C, mul(d, -(r + tail)));
    return bz([
      N(T, a + 18, a + 162, 0.45, 0.45),
      N(add(C, mul(n, r)), a, null, 0.55, 0.55),
      N(add(C, mul(d, r)), a - 90, null, 0.55, 0.55),
      N(add(C, mul(n, -r)), a + 180, null, 0.55, 0.55)
    ], true);
  }
  // spray: a drop flung off the tail at the bottom turn; it arcs back toward the curl and
  // falls into the face behind the board, where it merges with the water (no popping out)
  function spray(t, tail) {
    var tau = wrap01(t - 0.6) / 0.23;
    if (tau >= 1) return '';
    var g = 8.0, P = add(tail, [-2.2 * tau, -3.6 * tau + 0.5 * g * tau * tau]), v = [-2.2, -3.6 + g * tau];
    var r = 0.62 * (0.65 + 0.35 * easeOut(clamp(tau / 0.25))) * (1 - 0.35 * smooth((tau - 0.5) / 0.5));
    return front(teardrop(P, v, r, 0.3 + 0.3 * Math.hypot(v[0], v[1]) / 3.6));
  }

  function draw(t) {
    var L = lift(t), v = vel(t), bx = 13.2 + keys(t, DRIFT);
    var bdeg = 6 - 3.5 * v;
    var by = 11.45 + 0.105 * (bx - 13.2) - L;
    var tn = Math.tan(rad(bdeg));
    function bed(x) { return by + 1.15 + tn * (x - bx); }
    var W = { lift: L, pitch: keys(t, PITCH), bdeg: bdeg, bed: bed,
      edge: 13.0 - L + 0.5 * (tn - Math.tan(rad(6))) * (17 - bx) + 0.105 * (bx - 13.2) };
    W.roll = W.pitch;
    var crouch = 0.42 * acc(t - 0.03);
    var S = { bx: bx, by: by, bdeg: bdeg, crouch: crouch, lean: 22 + 9 * crouch,
      reach: -11 * vel(t - 0.06), wing: 8 * lift(t - 0.04) / 1.36, nod: 8 + 6 * crouch, hair: -12 * vel(t - 0.09) + 3 * noise(t, 5) };
    var BR = chain(ROCKER, rot(0, 0, bdeg), move(bx, by));
    var b = tp(BOARD, BR);
    var s = ink(sea()) + ink(wave(W)) + cut(roll(W));
    s += cutAround(b, 0.7) + front(b);
    s += surfer(S);
    s += spray(t, BR(-4.05, -0.5));
    return s;
  }

  return { draw: draw };
})();
