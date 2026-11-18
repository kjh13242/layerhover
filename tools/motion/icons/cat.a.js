// 고양이와 나비 (cat) — variant A: recognizability first.
// A black cat flopped on its back, head resting on its cheek (ears up, eyes closed and content). One front paw
// and one hind foot are raised and curl toward each other, framing the butterfly above. The loop (6 s): the
// butterfly drifts down to tease → the paw cocks and lazily swipes, the butterfly lifts away just out of reach →
// the hind foot kicks as it passes over → it glides back. Tail, head and the other leg answer each action.
var ICON = {
  id: "cat",
  frames: 48,
  at: function (t) { return CAT_A.draw(t); }
};

var CAT_A = (function () {
  // ── local helpers ────────────────────────────────────────────────────────────────────────────
  function symPath(L) {
    var d = 'M' + f(L[0][0]) + ' ' + f(L[0][1]), i, c;
    for (i = 1; i < L.length; i++) { c = L[i]; d += 'C' + c.map(f).join(' '); }
    for (i = L.length - 1; i >= 1; i--) {
      c = L[i]; var pe = L[i - 1].length === 2 ? L[i - 1] : [L[i - 1][4], L[i - 1][5]];
      d += 'C' + [-c[2], c[3], -c[0], c[1], -pe[0], pe[1]].map(f).join(' ');
    }
    return d + 'Z';
  }
  function flatten(d, n) {
    n = n || 10;
    var segs = parsePath(d), pts = [], cur = [0, 0];
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i], p = g.p;
      if (g.c === 'M' || g.c === 'L') { cur = [p[0], p[1]]; pts.push(cur); }
      else if (g.c === 'C') {
        for (var k = 1; k <= n; k++) {
          var u = k / n, v = 1 - u;
          pts.push([v * v * v * cur[0] + 3 * v * v * u * p[0] + 3 * v * u * u * p[2] + u * u * u * p[4],
                    v * v * v * cur[1] + 3 * v * v * u * p[1] + 3 * v * u * u * p[3] + u * u * u * p[5]]);
        }
        cur = [p[4], p[5]];
      }
    }
    if (pts.length > 1 && dist(pts[0], pts[pts.length - 1]) < 1e-6) pts.pop();
    return pts;
  }
  function sArea(P) { var a = 0; for (var i = 0; i < P.length; i++) { var p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
  // separation cut hugging part of a closed outline from outside; keep(x, y) picks the stretch in the part's local frame
  function outlineCut(d, fn, gap, keep) {
    var P = flatten(d, 14), sg = sArea(P) > 0 ? 1 : -1, n = P.length, run = [], best = [], start = 0;
    for (var k = 0; k < n; k++) if (!keep(P[k][0], P[k][1])) { start = k; break; }
    for (var m = 1; m <= n; m++) {
      var i = (start + m) % n;
      if (keep(P[i][0], P[i][1])) {
        var a = P[(i - 1 + n) % n], b = P[(i + 1) % n], tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
        run.push([P[i][0] + sg * ty / L * gap / 2, P[i][1] - sg * tx / L * gap / 2]);
      } else { if (run.length > best.length) best = run; run = []; }
    }
    if (run.length > best.length) best = run;
    if (best.length < 3) return '';
    if (fn) best = best.map(function (p) { return fn(p[0], p[1]); });
    return cut(ribbon(best, function (s) { return gap * Math.min(1, Math.sin(Math.PI * s) * 2.4); }, { samples: 3 }));
  }
  // closed eye: a crescent whose both edges bow down; pointed corners
  function lidEye(cx, cy, w, topSag, botSag) {
    var x0 = cx - w / 2, x1 = cx + w / 2, a = topSag / 0.75, b = botSag / 0.75;
    return 'M' + f(x0) + ' ' + f(cy) +
      'C' + f(x0 + w * 0.2) + ' ' + f(cy + b) + ' ' + f(x1 - w * 0.2) + ' ' + f(cy + b) + ' ' + f(x1) + ' ' + f(cy) +
      'C' + f(x1 - w * 0.28) + ' ' + f(cy + a) + ' ' + f(x0 + w * 0.28) + ' ' + f(cy + a) + ' ' + f(x0) + ' ' + f(cy) + 'Z';
  }
  function mirror(x, y) { return [-x, y]; }

  // ── cat ──────────────────────────────────────────────────────────────────────────────────────
  // head, frontal and upright; origin at the centre of the face
  var HEAD = symPath([
    [0, 2.05],
    [-0.95, 2.05, -1.82, 1.84, -2.38, 1.32],     // chin → jowl
    [-2.86, 0.88, -3.02, 0.3, -2.98, -0.3],      // jowl → cheek
    [-2.95, -0.8, -2.85, -1.2, -2.74, -1.55],    // cheek → temple
    [-2.6, -2.2, -2.5, -2.95, -2.42, -3.42],     // ear, outer edge
    [-2.37, -3.72, -2.06, -3.84, -1.88, -3.62],  // ear tip
    [-1.52, -3.2, -1.2, -2.8, -0.92, -2.46],     // ear, inner edge
    [-0.66, -2.28, -0.34, -2.24, 0, -2.24]       // crown valley
  ]);
  // closed, content eyes: crescents bowing down. Each is turned against the head's −14° tilt so that on
  // screen both sit level with their outer corners lifted a touch (calm, not sad).
  var EYES = [tp(lidEye(-1.13, 0.02, 1.06, 0.28, 0.95), rot(-1.13, 0.25, 20)),
              tp(lidEye(1.13, 0.02, 1.06, 0.28, 0.95), rot(1.13, 0.25, 8))];

  // body on its back: neck (behind the head) → chest → belly → (under the thigh) → rump; flat on the floor.
  // The rump leaves the thigh's back edge at (15.208, 13.625) on the same tangent, so thigh and rump read as
  // one continuous contour.
  var BODY = 'M4.6 16' +
    'C5.0 15.1 7.1 13.9 8.95 12.5' +
    'C10.2 12.12 11.9 12.05 13.2 12.3' +
    'L14.3 12.6L15.208 13.625' +
    'C15.083 14.109 15.15 15.55 14.45 16Z';

  // foreleg (pt), local frame: shoulder at the origin, forearm up (−y), wrist at y ≈ −2.9,
  // mitten paw drooping toward +x. Thick at the elbow, slim at the wrist, the paw fuller again.
  var ARM = 'M-0.8 1.0' +
    'C-0.95 0.15 -0.98 -0.75 -0.78 -1.45' +       // elbow swell
    'C-0.6 -2.05 -0.42 -2.5 -0.36 -3.0' +          // back of the forearm narrowing to the wrist
    'C-0.28 -3.65 0.15 -4.1 0.72 -4.1' +           // wrist → top of the paw
    'C1.32 -4.1 1.76 -3.7 1.74 -3.18' +            // paw → toes
    'C1.72 -2.74 1.42 -2.48 1.06 -2.5' +           // toes → pads
    'C0.82 -2.52 0.6 -2.6 0.44 -2.78' +            // pads → wrist
    'C0.34 -2.3 0.32 -1.65 0.4 -1.0' +             // front of the forearm
    'C0.46 -0.45 0.6 0.4 0.75 1.0Z';
  var WRIST = [0.0, -2.95];

  // hind leg (pt), local frame: hip at the origin; heavy thigh, slim shin, long foot angled up toward −x
  var LEG = 'M1.0 1.3' +
    'C1.75 0.3 1.78 -1.2 1.12 -1.96' +            // back of the thigh → hock
    'C0.84 -2.24 0.62 -2.63 0.45 -3.14' +          // heel
    'C0.22 -3.86 -0.28 -4.42 -0.95 -4.54' +        // top of the foot
    'C-1.51 -4.61 -1.93 -4.31 -1.88 -3.86' +       // toes
    'C-1.85 -3.47 -1.51 -3.3 -1.12 -3.25' +        // sole
    'C-0.69 -3.19 -0.47 -2.91 -0.43 -2.46' +       // ankle
    'C-0.39 -1.9 -0.67 -1.34 -1.18 -0.62' +        // shin → knee
    'C-1.51 -0.11 -1.68 0.56 -1.62 1.3Z';          // front of the thigh
  var ANKLE = [0.0, -2.7];
  // the limbs bend non-rigidly, so they are sampled densely first: every sample follows the smooth deformation
  // (bending raw Bézier control points would break the tangents at the segment joins)
  var ARM_D = polyPath(flatten(ARM, 16), true), LEG_D = polyPath(flatten(LEG, 16), true);

  // ── butterfly (dorsal; right wings; body on x = 0, head up) ─────────────────────────────────
  // forewing: long gently convex leading edge, a defined apex, softly S-shaped outer margin
  var FORE = tp('M0.3 -0.62C0.7 -1.55 1.62 -2.58 2.86 -2.86C3.1 -2.91 3.22 -2.74 3.16 -2.52C3.0 -1.98 2.86 -1.5 2.6 -1.08C2.25 -0.56 1.6 -0.22 0.3 -0.3Z',
               scaleAt(0.3, -0.45, 1.05, 1.05));
  // hindwing: a smaller rounded fan that ends in a soft tail point beside the abdomen (forewings lead)
  var HIND = tp('M0.3 -0.1C1.0 -0.3 1.95 -0.12 2.32 0.42C2.62 0.88 2.46 1.4 2.02 1.72C1.64 2.0 1.26 2.08 0.98 2.34C0.82 2.5 0.58 2.52 0.46 2.3C0.3 1.95 0.26 0.9 0.3 -0.1Z',
               scaleAt(0.3, -0.1, 0.84, 0.84));
  var BBODY = ribbon([[0, -1.55], [0, -0.6], [0, 1.2], [0, 2.3]], [0.86, 0.94, 0.68, 0.4], { caps: ['round', 'round'] });
  var ANT = ribbon([[0.14, -1.7], [0.3, -2.2], [0.62, -2.6], [0.88, -2.66]], function (s) { return lerp(0.42, 0.34, s); }, { caps: ['flat', 'round'] });

  // ── timing ───────────────────────────────────────────────────────────────────────────────────
  // smooth periodic animation curve through keys [[t, value, 'h'?], ...] (t in [0, 1), wraps around).
  // Catmull-Rom tangents (motion flows through a key); 'h' = hold (eases in and out of that key).
  function curve(t, K) {
    var n = K.length;
    function q(j) { return ((j % n) + n) % n; }
    function T(j) { return K[q(j)][0] + Math.floor(j / n); }
    function V(j) { return K[q(j)][1]; }
    function M(j) { return K[q(j)][2] === 'h' ? 0 : (V(j + 1) - V(j - 1)) / (T(j + 1) - T(j - 1)); }
    t = wrap01(t);
    var i = 0;
    for (var k = 0; k < n; k++) if (K[k][0] <= t) i = k;
    var t0 = T(i), t1 = T(i + 1), h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * V(i) + (u3 - 2 * u2 + u) * h * M(i) + (-2 * u3 + 3 * u2) * V(i + 1) + (u3 - u2) * h * M(i + 1);
  }
  // limb pose in its local frame (one continuous outline, no kinks). Every weight is taken from the drawn pose:
  //  1. wrist / ankle: rotate about J, blended across the joint (the paw or foot turns as a whole)
  //  2. forearm / shin extension along the limb, and a slide of the whole limb out of the body (its root stays hidden)
  //  3. optional knee: rotate about K for points above it only (the thigh stays put)
  //  4. rotation about the root and placement
  function limbXf(o) {
    var ja = o.jdeg * Math.PI / 180, jc = Math.cos(ja), js = Math.sin(ja);
    var ka = (o.kdeg || 0) * Math.PI / 180, kc = Math.cos(ka), ks = Math.sin(ka);
    var a = o.deg * Math.PI / 180, C = Math.cos(a), S = Math.sin(a), J = o.J, K = o.K;
    return function (x, y) {
      var w = Math.max(smooth((o.jy0 - y) / (o.jy0 - o.jy1)), smooth((o.foot * x - 0.42) / 0.4) * smooth((o.jy0 + 0.2 - y) / 0.4));
      var we = smooth((o.ey0 - y) / (o.ey0 - o.ey1));
      var wk = K ? smooth((o.ky0 - y) / (o.ky0 - o.ky1)) : 0;
      var rx = J[0] + (x - J[0]) * jc - (y - J[1]) * js, ry = J[1] + (x - J[0]) * js + (y - J[1]) * jc;
      var X = x + (rx - x) * w, Y = y + (ry - y) * w;
      Y -= o.ext * we + (o.slide || 0);
      if (o.arc) { var sa = clamp(-y / 3.0, 0, 1.3); X += o.arc * sa * sa; }
      if (K) {
        var kx = K[0] + (X - K[0]) * kc - (Y - K[1]) * ks, ky = K[1] + (X - K[0]) * ks + (Y - K[1]) * kc;
        X += (kx - X) * wk; Y += (ky - Y) * wk;
      }
      return [o.bx + X * C - Y * S, o.by + X * S + Y * C];
    };
  }

  function draw(t) {
    // ── the cat: one lazy swat at the butterfly (anticipation → swipe → follow-through), a half-hearted pat
    //    later; the hind foot kicks as the butterfly passes over it; the tail answers both
    var armA = curve(t, [[0, 10], [0.1, 9], [0.19, 5, 'h'], [0.29, 11, 'h'], [0.36, 12], [0.46, 9, 'h'], [0.66, 12, 'h'], [0.76, 10, 'h']]);
    var wristA = curve(t, [[0, 0], [0.1, 4], [0.19, 12, 'h'], [0.29, -24, 'h'], [0.36, 8], [0.46, 3, 'h'], [0.66, -12, 'h'], [0.76, 1, 'h']]);
    var armX = curve(t, [[0, 0, 'h'], [0.19, -0.3, 'h'], [0.29, 0.7, 'h'], [0.36, 0.38], [0.46, 0, 'h'], [0.66, 0.25, 'h'], [0.76, 0, 'h']]);
    var armSlide = curve(t, [[0, 0, 'h'], [0.19, 0, 'h'], [0.29, 0.45, 'h'], [0.36, 0.22], [0.46, 0, 'h'], [0.66, 0.1, 'h'], [0.76, 0, 'h']]);
    var armArc = curve(t, [[0, 0, 'h'], [0.19, -0.08, 'h'], [0.29, 0.2, 'h'], [0.38, 0.05], [0.46, 0, 'h']]);
    var legA = curve(t, [[0, -4, 'h'], [0.28, 4, 'h'], [0.44, 3, 'h'], [0.51, -11, 'h'], [0.62, -6], [0.72, -4, 'h']]);
    var ankleA = curve(t, [[0, 0, 'h'], [0.28, 6, 'h'], [0.44, -12, 'h'], [0.51, 30, 'h'], [0.62, 8], [0.72, 0, 'h']]);
    var legX = curve(t, [[0, 0, 'h'], [0.44, -0.1, 'h'], [0.51, 0.3, 'h'], [0.62, 0.05], [0.72, 0, 'h']]);
    var headA = -14 + 2.5 * bump(t, 0.22, 0.31, 0.38, 0.56) - 1.5 * bump(t, 0.44, 0.5, 0.56, 0.7);
    // tail tip: a lazy sway, swishes outward after the swipe and again after the kick (+ = toward the body,
    // which is only 0.7 pt away, so the swish goes outward)
    var flick = -0.08 + 0.1 * loop(t, 2, 0.1) - 0.24 * bump(t, 0.32, 0.4, 0.44, 0.6) - 0.22 * bump(t, 0.52, 0.6, 0.66, 0.84) + 0.05 * noise(t, 5, 2);

    var headT = chain(scaleAt(0, 0, 0.9), rot(0, 0, headA), move(4.2, 14.05));
    var armT = limbXf({ J: WRIST, jdeg: wristA, jy0: -2.1, jy1: -2.75, foot: 1, ext: armX, ey0: -1.2, ey1: -2.2, slide: armSlide, arc: armArc, deg: armA, bx: 8.6, by: 13.45 });
    var legT = limbXf({ J: ANKLE, jdeg: ankleA, jy0: -2.0, jy1: -2.85, foot: -1, ext: legX, ey0: -0.9, ey1: -2.0,
                        K: [-0.9, -0.8], kdeg: legA + 4, ky0: -0.2, ky1: -1.9, deg: -4, bx: 13.75, by: 13.25 });
    var tailBend = bend(15.9, 15.3, 16.6, 12.8, flick);
    var tailSpine = [[14.1, 15.37], [15.4, 15.36], [16.2, 15.1], [16.48, 14.45], [16.5, 13.55], [16.3, 12.8]].map(function (p) { return tailBend(p[0], p[1]); });
    var tail = ribbon(tailSpine, function (s) { return lerp(1.25, 0.48, Math.pow(s, 1.25)); }, { caps: ['flat', 'round'] });

    // ── the butterfly: drifts down to tease the paw, darts up and away from the swipe, rides over the hind
    //    foot, hops off the kick, glides back. Flaps in bursts; faster while escaping.
    var bx = curve(t, [[0, 11.1], [0.1, 10.7], [0.19, 10.45], [0.25, 10.75], [0.3, 12.0], [0.36, 12.9], [0.44, 13.0], [0.5, 13.1], [0.56, 13.25], [0.66, 12.3], [0.8, 11.5]]);
    var by = curve(t, [[0, 4.7], [0.1, 5.2], [0.19, 5.6], [0.25, 5.45], [0.3, 4.75], [0.36, 4.5], [0.44, 4.95], [0.5, 5.05], [0.56, 4.4], [0.66, 4.4], [0.8, 4.5]]);
    var brot = curve(t, [[0, 10], [0.1, 4], [0.19, -2], [0.25, 2], [0.3, 16], [0.36, 12], [0.44, 4], [0.5, 2], [0.56, 12], [0.66, 0], [0.8, 4]]);
    var phase = 9 * t + 2 * seg(t, 0.24, 0.4);
    var E = 1 - 0.85 * bump(t, 0.62, 0.68, 0.76, 0.84);
    var open = 1 - E * (0.5 - 0.5 * Math.cos(TAU * phase));
    var openH = 1 - E * (0.5 - 0.5 * Math.cos(TAU * (phase - 0.07)));
    by += 0.2 * E * Math.sin(TAU * phase);
    var bf = chain(scaleAt(0, 0, 0.92), rot(0, 0, brot), move(bx, by));
    var kF = 0.54 + 0.46 * open, kH = 0.76 + 0.24 * openH;   // the smaller hindwings travel less
    function wing(d, k, side) { return ink(d, chain(scaleAt(0.28, 0, k, 1), side < 0 ? mirror : null, bf)); }

    var s = '';
    s += ink(BODY) + ink(tail) + ink(LEG_D, legT);
    s += ink(HEAD, headT) + EYES.map(function (e) { return cut(e, headT); }).join('');
    s += outlineCut(HEAD, headT, 0.8, function (x, y) { return x > 0.9 && y > -2.0 && y < 1.1; });
    // the foreleg is laid over last: the head's separation cut stops cleanly at its edge
    s += front(ARM_D, armT);
    s += wing(FORE, kF, 1) + wing(HIND, kH, 1) + wing(FORE, kF, -1) + wing(HIND, kH, -1);
    s += ink(BBODY, bf) + ink(ANT, bf) + ink(tp(ANT, mirror), bf);
    return s;
  }
  return { draw: draw };
})();
