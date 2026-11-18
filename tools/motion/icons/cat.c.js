// 고양이와 나비 (Cat and butterfly) — variant C: gesture first.
// A cat flopped on its back, head resting tilted on the floor with sleepy closed eyes, one forepaw
// lazily raised and curled like a beckoning hook, a chubby hind foot up: a cradle around a butterfly.
// Motion: a long still beat, the paw folds lazily, coils, swats — the butterfly darts off (near miss) —
// a smaller second bat, stillness again. The ear twitches when the butterfly comes close.
// Every part is a hand-drawn Bézier contour. Body, foreleg and hind leg are ONE contour skinned to
// bones (posed in world space), so armpits and joints stay smooth in every frame.
var ICON = (function () {
  // ── pen: smooth contours from anchors with tangent directions (like a vector pen tool) ──────────
  // node: [x, y, dir, lenIn, lenOut]  or  [x, y, dirIn, lenIn, dirOut, lenOut]  (deg, 0 = right, 90 = down)
  function D(deg) { var r = deg * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
  function P(p) { return f(p[0]) + ' ' + f(p[1]); }
  function node(a) {
    var di = a[2], li = a[3], dO = a.length > 5 ? a[4] : a[2], lo = a.length > 5 ? a[5] : a[4], u = D(di), v = D(dO);
    return { p: [a[0], a[1]], i: [a[0] - u[0] * li, a[1] - u[1] * li], o: [a[0] + v[0] * lo, a[1] + v[1] * lo] };
  }
  function nodes(A) {
    var out = [];
    A.forEach(function (a) { if (a.fillet) out = out.concat(a.fillet.map(node)); else out.push(node(a)); });
    return out;
  }
  function build(N, closed) {
    var d = 'M' + P(N[0].p), n = N.length, last = closed === false ? n - 1 : n;
    for (var k = 0; k < last; k++) { var a = N[k], b = N[(k + 1) % n]; d += 'C' + P(a.o) + ' ' + P(b.i) + ' ' + P(b.p); }
    return d + (closed === false ? '' : 'Z');
  }
  function pen(A, closed) { return build(nodes(A), closed); }
  // rounded corner at T between travel directions aIn → aOut with radius r
  function fillet(T, aIn, aOut, r, lin, lout) {
    var phi = Math.abs(((aOut - aIn + 540) % 360) - 180), dd = r * Math.tan(phi * Math.PI / 360), h = 4 / 3 * Math.tan(phi * Math.PI / 720) * r;
    var u = D(aIn), v = D(aOut);
    return { fillet: [[T[0] - u[0] * dd, T[1] - u[1] * dd, aIn, lin, h], [T[0] + v[0] * dd, T[1] + v[1] * dd, aOut, h, lout]] };
  }
  // mirror a right half (crown → chin, clockwise) into a full symmetric contour
  function mirN(a) { return a.length > 5 ? [-a[0], a[1], -a[4], a[5], -a[2], a[3]] : [-a[0], a[1], -a[2], a[4], a[3]]; }
  function mirror(R) {
    var out = R.slice();
    for (var k = R.length - 2; k >= 1; k--) out.push(R[k].fillet ? { fillet: R[k].fillet.map(mirN).reverse() } : mirN(R[k]));
    return out;
  }
  // ── rigid bones about rest-pose joints; nodes are drawn in world space in the poster pose ───────
  // chain: joints [j0, j1, ...] rest positions; rel angle deltas → transforms per bone (parent first).
  // lift slides the whole chain out along `axis` (deg) — a shoulder that rises out of the chest.
  function chainBones(J, rel, lift, axis) {
    var X = [], acc = 0, parent = null, L = lift || 0, ax = (axis || 0) * Math.PI / 180, tx = Math.cos(ax) * L, ty = Math.sin(ax) * L;
    for (var k = 0; k < rel.length; k++) {
      acc += rel[k];
      (function (j, accDeg, par) {
        var a = accDeg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), pj = par ? par(j[0], j[1]) : [j[0] + tx, j[1] + ty];
        X.push(function (x, y) { var dx = x - j[0], dy = y - j[1]; return [pj[0] + dx * cs - dy * sn, pj[1] + dx * sn + dy * cs]; });
      })(J[k], acc, parent);
      parent = X[k];
    }
    return X;
  }
  function skin(A, W, bones) {   // W[i]: bone name or [boneA, boneB, u]
    var N = nodes(A);
    function T(q, w) {
      if (typeof w === 'string') return bones[w](q[0], q[1]);
      var p0 = bones[w[0]](q[0], q[1]), p1 = bones[w[1]](q[0], q[1]);
      return mix(p0, p1, w[2]);
    }
    N.forEach(function (n, i) { n.p = T(n.p, W[i]); n.i = T(n.i, W[i]); n.o = T(n.o, W[i]); });
    return build(N);
  }

  // ── the cat: body + raised forepaw + raised hind foot, one contour (poster pose, world space) ──
  // few nodes, placed at the extremes; concave corners are filleted
  var CAT = [
    [5.9, 13.1, -30, 0.4, 0.55],                  // neck, behind the head
    [7.3, 12.1, -78, 0.35, 0.9],                  // armpit (front): concave junction with the chest
    [8.1, 8.95, -64, 0.95, 0.45],                 // back of the wrist
    [9.45, 7.45, -2, 0.75, 0.5],                  // top of the curled paw (knuckles)
    [10.42, 8.2, 86, 0.45, 0.42],                 // front of the paw
    [9.88, 9.08, 168, 0.42, 0.3],                 // toe pads (bean underside)
    [9.2, 8.98, 200, 0.2, 92, 0.45],              // wrist crease
    [9.28, 10.8, 86, 0.6, 0.3],                   // forearm, inner edge
    [9.75, 11.65, 40, 0.35, 0.45],                // elbow into the belly
    [11.0, 12.0, 3, 0.55, 0.55],                  // belly (soft dome)
    fillet([12.45, 12.35], 22, -62, 0.32, 0.5, 0.3), // groin
    [14.25, 9.5, -20, 1.05, 0.45],                // top of the raised hind foot (one convex sweep up the shin)
    [15.0, 10.06, 74, 0.4, 0.4],                  // toes
    [14.6, 10.96, 122, 0.35, 0.42],               // under the foot
    [14.38, 12.1, 97, 0.42, 0.38],                // back of the shin
    [14.75, 13.62, 66, 0.42, 0.4],                // haunch
    [14.78, 14.75, 100, 0.3, 0.55],               // rump
    [13.2, 16.0, 180, 0.9, 2.0],                  // floor (rump end)
    [7.4, 16.0, 180, 2.0, 1.0],                   // floor (shoulder end)
    [5.7, 14.8, -110, 0.6, 0.6]                   // back of the neck
  ];
  // one weight per expanded node (a fillet counts as two)
  var CAT_W = ['B', ['B', 'U', 0.5], ['F', 'PAW', 0.5], 'PAW', 'PAW', 'PAW', ['F', 'PAW', 0.5], 'F', ['U', 'B', 0.5], 'B',
    ['B', 'SHIN', 0.4], ['B', 'SHIN', 0.7],          // groin
    'FOOT', 'FOOT', 'FOOT', 'SHIN', ['SHIN', 'B', 0.5], // foot top, toes, under the foot, shin, haunch
    'B', 'B', 'B', 'B'];
  var J_ARM = [[8.2, 12.9], [8.3, 11.2], [8.7, 8.95]];     // shoulder, elbow, wrist (rest)
  var J_LEG = [[13.4, 12.8], [13.95, 11.05]];                // knee, hock (rest)

  // ── head (local: upright, origin at the eye line) ──────────────────────────────────────────────
  // one continuous convex side from ear tip to cheek; full cheeks, soft narrow chin
  var HEAD = mirror([
    [0, -1.75, 0, 0.45, 0.45],
    [0.68, -1.7, 4, 0.25, -54, 0.5],
    fillet([1.88, -3.35], -54, 74, 0.24, 0.55, 1.2),
    [2.72, 0.35, 92, 1.1, 0.6],
    [1.62, 1.86, 150, 0.6, 0.48],
    [0, 2.18, 180, 0.68, 0.68]
  ]);
  // node order after mirroring: crown, inner base, tip (2), outer edge→cheek, jaw, chin, then the left side
  var HEAD_W = ['H', ['H', 'E', 0.35], 'E', 'E', ['H', 'E', 0.12], 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'];
  function head(ear) { return skin(HEAD, HEAD_W, { H: function (x, y) { return [x, y]; }, E: rot(1.45, -1.62, ear) }); }
  // closed, content eye: a sleepy lid line — an even arc, a touch fuller in the middle
  function eye(cx) {
    return ribbon(arcPts(cx, -0.3, 0.6, 150, 30, 16), function (s) { return 0.46 + 0.14 * Math.sin(Math.PI * s); }, { caps: ['round', 'round'] });
  }

  // ── tail: an FK chain lying along the floor, curling up at the end ─────────────────────────────
  var TAIL_L = [1.5, 0.8, 0.8, 0.75, 0.62], TAIL_A = [0, -14, -44, -84, -126];
  function tail(curl, flick) {
    var p = [13.3, 15.25], pts = [p], a = 0;
    for (var k = 0; k < TAIL_L.length; k++) {
      a = TAIL_A[k] * (1 + 0.22 * curl) + flick * [0, 0.25, 0.55, 0.9, 1.25][k];
      p = [p[0] + Math.cos(a * Math.PI / 180) * TAIL_L[k], p[1] + Math.sin(a * Math.PI / 180) * TAIL_L[k]];
      pts.push(p);
    }
    return ribbon(pts, function (s) { return lerp(1.46, 0.86, Math.pow(s, 0.95)); }, { caps: ['flat', 'round'] });
  }

  // ── butterfly (local: thorax at 0,0; body vertical): D-shaped forewings, fan hindwings ────────
  var FORE = pen([
    [0.2, -0.5, -70, 0.2, 1.05],                    // root; leading edge sweeps up and out
    fillet([2.72, -2.62], -22, 92, 0.42, 1.1, 0.7), // apex
    fillet([2.38, -0.3], 110, 178, 0.3, 0.7, 0.8),  // tornus
    [0.2, 0.12, 160, 0.85, 0.15]
  ]);
  var HIND = pen([
    [0.2, 0.2, 6, 0.15, 0.9],
    [2.1, 0.62, 58, 0.55, 0.45],
    fillet([1.62, 2.3], 112, 205, 0.28, 0.6, 0.45),
    [0.25, 1.25, 236, 0.5, 0.15]
  ]);
  var BODY_B = ribbon([[0, -1.2], [0, -0.3], [0, 0.6], [0, 2.05]], function (u) { return u < 0.25 ? lerp(0.86, 0.95, u / 0.25) : lerp(0.95, 0.62, Math.pow((u - 0.25) / 0.75, 1.2)); }, { caps: ['round', 'round'] });
  // lift: 0 = wings spread flat, 1 = raised (seen from above they foreshorten toward the body and
  // their tips rise a little); hindwings travel less than forewings
  function butterfly(bx, by, lift, sc, tilt) {
    function wing(side, amt) {
      var w = 1 - 0.34 * amt * lift, up = 0.25 * amt * lift;
      return chain(function (x, y) { return [side * x * w, y - x * up]; }, scaleAt(0, 0, sc), rot(0, 0, tilt), move(bx, by));
    }
    var B = chain(scaleAt(0, 0, sc), rot(0, 0, tilt), move(bx, by));
    return ink(FORE, wing(1, 1)) + ink(HIND, wing(1, 0.8)) + ink(FORE, wing(-1, 1)) + ink(HIND, wing(-1, 0.8))
      + ink(BODY_B, B);
  }

  // ── timing helpers ─────────────────────────────────────────────────────────────────────────────
  // keys: [[frame, [values...], ease], ...] — ease shapes the segment that ENDS at that key
  function keyed(keys, fr) {
    for (var k = 1; k < keys.length; k++) {
      if (fr <= keys[k][0]) {
        var a = keys[k - 1], b = keys[k], u = (b[0] === a[0]) ? 1 : (fr - a[0]) / (b[0] - a[0]), e = (b[2] || smooth)(u);
        return a[1].map(function (v, i) { return lerp(v, b[1][i], e); });
      }
    }
    return keys[keys.length - 1][1].slice();
  }
  var N = 56;   // 7 s: a long still beat, a lazy swat that misses, a smaller second bat, stillness again
  // arm: [shoulder, elbow, wrist] angle deltas from the poster pose + shoulder lift out of the chest
  var REST = [0, 0, 0, 0], LOW = [-6, 32, 18, -0.2], COIL = [-9, 40, 30, -0.3], REACH = [5, 6, -24, 0.9], OVER = [7, 3, -32, 1.05], LOW2 = [-4, 24, 22, -0.2], BAT2 = [5, 4, -18, 0.7];
  var ARM_KEYS = [[0, REST], [8, REST], [18, LOW, easeInOut], [22, COIL, smooth], [25, REACH, easeOut], [27, OVER, smooth],
    [30, REACH, smooth], [38, REST, easeInOut], [41, LOW2, smooth], [43, BAT2, easeOut], [48, REST, easeInOut], [56, REST]];
  // butterfly path [x, y, tilt]: drifts, teases the coiled paw, darts away at the swat, circles back
  var FLY_KEYS = [[0, [12.35, 4.6, 0]], [9, [12.8, 4.05, 6]], [17, [12.25, 4.9, -6]], [22, [12.0, 5.3, -10]],
    [24, [13.05, 4.15, 14], easeOut], [28, [13.85, 3.7, 16], easeOut], [34, [14.05, 4.3, 4], smooth], [41, [13.2, 3.75, -10], smooth],
    [48, [12.65, 4.15, -4], smooth], [56, [12.35, 4.6, 0], easeInOut]];
  var LEG_KEYS = [[0, [0, 0]], [24, [0, 0]], [27, [-9, -16], easeOut], [33, [2, 4], smooth], [39, [0, 0], smooth], [56, [0, 0]]];
  var HEAD_KEYS = [[0, [0]], [21, [0]], [26, [-4], easeOut], [37, [0], easeInOut], [56, [0]]];
  // ear twitch (deg, local): a quick double flick while the butterfly hovers closest
  var EAR_KEYS = [[0, [0]], [17, [0]], [18, [16], easeOut], [19, [3], smooth], [20, [12], easeOut], [22, [0], smooth], [56, [0]]];
  var TAIL_KEYS = [[0, [0, 0]], [23, [0, 0]], [27, [0.3, -10], easeOut], [31, [-0.2, 14], smooth], [36, [0.1, -5], smooth], [41, [0, 0], smooth], [56, [0, 0]]];

  return {
    id: "cat",
    frames: N,
    at: function (t) {
      var fr = t * N;
      var ap = keyed(ARM_KEYS, fr), lp = keyed(LEG_KEYS, fr), hp = keyed(HEAD_KEYS, fr), tp_ = keyed(TAIL_KEYS, fr), fp = keyed(FLY_KEYS, fr);
      var arm = chainBones(J_ARM, ap.slice(0, 3), ap[3], -80), leg = chainBones(J_LEG, lp);
      var bones = { B: function (x, y) { return [x, y]; }, U: arm[0], F: arm[1], PAW: arm[2], SHIN: leg[0], FOOT: leg[1] };
      var headT = chain(scaleAt(0, 0, 0.92), rot(0, 0, -30), move(4.25, 13.62), rot(4.1, 15.9, hp[0]));
      // lazy tail sway on top of the flick; whole-number cycles keep the loop seamless
      var curl = 0.45 * loop(t, 2) + 0.2 * (noise(t, 4) - noise(0, 4)) + tp_[0], flick = tp_[1] + 5 * loop(t, 3);
      // flaps: 13 per loop plus one extra during the escape (14 in total, seamless); wings held open in two glides
      var glide = 1 - bump(fr, 1, 2.5, 5, 6.5) - bump(fr, 49, 50.5, 53, 54.5);
      var phase = 13 * t + smoother((fr - 22) / 6), lift = (0.5 - 0.5 * Math.cos(TAU * phase)) * glide;
      var drift = [0.18 * noise(t, 11), 0.15 * noise(t, 12)];
      var s = '';
      s += ink(skin(CAT, CAT_W, bones)) + ink(tail(curl, flick));
      s += ink(head(keyed(EAR_KEYS, fr)[0]), headT);
      s += cut(eye(-1.02), headT) + cut(eye(1.02), headT);
      s += butterfly(fp[0] + drift[0], fp[1] + drift[1], lift, 0.8, fp[2]);
      return s;
    }
  };
})();
