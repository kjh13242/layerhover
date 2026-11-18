// 고양이와 나비 (cat and butterfly) — round 4, redrawn from scratch.
// A cat flopped on its back on the floor. Its head rests on the floor at the left, tilted, eyes closed;
// both forepaws are up; a hind leg is cocked; the tail curls on the floor. A small butterfly drifts above.
// Silhouette left → right: head with two pointed ears (set apart by a clean gap), two raised forepaws,
// the soft belly dome, a cocked hind leg, the tail curl.
// Motion (6 s, 48 frames): the butterfly dips to tease → the near paw cocks, then swipes up lazily → the
// butterfly darts off, the hind leg kicks, the tail flicks → the butterfly loops left and dips again → the far
// paw bats → it drifts home. The belly breathes and the tail sways the whole time.

var NF = 48;

// ── pen: cubic contours from anchors with tangent directions ──────────────────────────────────────────
function P2(p) { return f(p[0]) + ' ' + f(p[1]); }

// ── head (local: centre of face at 0,0, upright) ──────────────────────────────────────────────────────
function headPath(earL, earR) {
  // earL / earR: extra rotation (deg) of each ear tip about its base, for a twitch
  var tr = rot(1.6, -1.8, earR || 0), tl = rot(-1.6, -1.8, earL || 0);
  var rT = tr(2.25, -3.45), rI = tr(1.75, -2.75), lT = tl(-2.25, -3.45), lI = tl(-1.75, -2.75);
  return 'M0 2.05' +
    'C1.55 2.05 2.85 1.55 2.9 0.4' +
    'C2.93 -0.45 2.7 -1.1 2.52 -1.6' +
    'C2.42 -2.2 ' + P2([lerp(2.45, rT[0], 0.5), -2.75]) + ' ' + P2(rT) +
    'C' + P2(rI) + ' 1.25 -2.15 0.95 -1.98' +
    'C0.55 -2.08 -0.55 -2.08 -0.95 -1.98' +
    'C-1.25 -2.15 ' + P2(lI) + ' ' + P2(lT) +
    'C' + P2([lerp(-2.45, lT[0], 0.5), -2.75]) + ' -2.42 -2.2 -2.52 -1.6' +
    'C-2.7 -1.1 -2.93 -0.45 -2.9 0.4' +
    'C-2.85 1.55 -1.55 2.05 0 2.05Z';
}
// closed eye: a crescent sagging downward (content, asleep). Wound opposite to the head so it is a hole.
function eyeHole(cx, cy, len) {   // a lid line ‿ : tips up, sagging belly — asleep, content
  var h = len / 2;
  return 'M' + P2([cx - h, cy]) + 'C' + P2([cx - h * 0.5, cy + 0.42]) + ' ' + P2([cx + h * 0.5, cy + 0.42]) + ' ' + P2([cx + h, cy]) +
    'C' + P2([cx + h * 0.55, cy + 1.2]) + ' ' + P2([cx - h * 0.55, cy + 1.2]) + ' ' + P2([cx - h, cy]) + 'Z';
}
var HEAD_C = [4.3, 13.86], HEAD_TILT = -22, HEAD_S = 0.93;
function headXf(lift) {
  return chain(scaleAt(0, 0, HEAD_S), rot(0, 0, HEAD_TILT), move(HEAD_C[0], HEAD_C[1]), rot(3.2, 16, lift || 0));
}

// ── body: belly-up dome lying on the floor ───────────────────────────────────────────────────────────
function bodyPath(br) {
  var b = br || 0;
  return 'M5.4 16L14.4 16' +
    'C15.35 16 15.75 15.2 15.55 14.25' +
    'C15.3 13.0 14.2 ' + f(11.7 - b * 0.6) + ' 12.6 ' + f(11.05 - b) +
    'C11.0 ' + f(10.45 - b) + ' 8.9 ' + f(10.7 - b) + ' 7.4 ' + f(11.75 - b * 0.6) +
    'C6.2 12.6 5.4 14.2 5.4 16Z';
}

// ── limbs: tapered ribbon through joints, widths given per joint ──────────────────────────────────────
function limb(pts, ws, capEnd) {
  var L = [0];
  for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i]));
  var T = L[L.length - 1];
  return ribbon(pts, function (s) {
    var x = s * T;
    for (var k = 1; k < L.length; k++) if (x <= L[k]) return lerp(ws[k - 1], ws[k], smooth((x - L[k - 1]) / (L[k] - L[k - 1])));
    return ws[ws.length - 1];
  }, { caps: ['flat', capEnd === false ? 'flat' : 'round'], samples: 12 });
}
function polar(p, deg, len) { var a = deg * Math.PI / 180; return [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len]; }
// mitten paw (local: wrist at 0,0, pointing +x; knuckles on −y, the pad on +y)
var PAW = 'M-0.4 -0.5C0.15 -0.58 0.8 -0.8 1.28 -0.64C1.7 -0.48 1.8 -0.02 1.62 0.32' +
  'C1.44 0.62 0.98 0.68 0.56 0.56C0.24 0.48 0 0.5 -0.4 0.5Z';
function pawPath(W, deg, flip, sc) { return tp(PAW, chain(scaleAt(0, 0, sc, flip ? -sc : sc), rot(0, 0, deg), move(W[0], W[1]))); }
// arm from shoulder S: upper arm angle a1, forearm angle a2, paw angle a3; flip = paw bends counter-clockwise
function armJoints(S, A, L1, L2) {
  var root = polar(S, A[0] + 180, 1.2), E = polar(S, A[0], L1), W = polar(E, A[1], L2);
  return { root: root, S: S, E: E, W: W, a3: A[2] };
}
function armPath(J) { return limb([J.root, J.S, J.E, J.W], [2.2, 2.0, 1.5, 1.14]); }
function forearmPath(J) { return limb([mix(J.E, J.S, 0.55), J.E, J.W], [1.8, 1.5, 1.14]); }

// ── butterfly (local: body at 0,0, wings open) ───────────────────────────────────────────────────────
var FW = 'M0.15 -0.05C0.5 -1.1 1.3 -2.05 2.35 -2.25C2.85 -2.33 3.05 -1.95 2.9 -1.45C2.65 -0.6 1.6 0.05 0.25 0.2Z';
var HW = 'M0.2 0.3C1.0 0.15 1.95 0.4 2.05 1.0C2.15 1.6 1.5 1.95 0.95 1.75C0.5 1.55 0.25 1.0 0.15 0.5Z';
var BODY = 'M0 -0.95C0.3 -0.95 0.36 -0.6 0.24 -0.4C0.36 -0.15 0.36 0.25 0.28 0.5C0.2 0.95 0.08 1.4 0 1.65' +
  'C-0.08 1.4 -0.2 0.95 -0.28 0.5C-0.36 0.25 -0.36 -0.15 -0.24 -0.4C-0.36 -0.6 -0.3 -0.95 0 -0.95Z';
function butterfly(bx, by, deg, sc, flap) {
  // flap 0 = open, 1 = wings up (seen edge-on, narrow)
  var kx = lerp(1, 0.58, flap), kyF = lerp(1, 0.88, flap), kxH = lerp(1, 0.62, flap);
  var place = chain(rot(0, 0, deg), scaleAt(0, 0, sc), move(bx, by));
  var s = '';
  [1, -1].forEach(function (side) {
    s += ink(FW, chain(scaleAt(0, 0, side * kx, kyF), place));
    s += ink(HW, chain(scaleAt(0, 0, side * kxH, 1), place));
  });
  return s + ink(BODY, chain(scaleAt(0, 0, 1.35, 1), place));
}

// ── keyframes ────────────────────────────────────────────────────────────────────────────────────────
function kf(fr, K) {
  if (fr <= K[0][0]) return K[0][1].slice();
  for (var i = 1; i < K.length; i++) {
    if (fr <= K[i][0]) {
      var a = K[i - 1], b = K[i], u = (b[2] || smooth)((fr - a[0]) / (b[0] - a[0]));
      return a[1].map(function (v, j) { return lerp(v, b[1][j], u); });
    }
  }
  return K[K.length - 1][1].slice();
}
// near (hero) arm: [upper, fore, paw] angles
var N_REST = [-64, -96, -26], N_COCK = [-76, -114, -10], N_HIT = [-54, -64, -60], N_OVER = [-51, -58, -66];
var NEAR_K = [[0, N_REST], [5, N_REST], [10, N_COCK, easeInOut], [12, N_HIT, easeOut], [13, N_OVER, smooth],
  [16, N_HIT, smooth], [25, N_REST, smoother], [48, N_REST]];
var F_REST = [-92, -112, -175], F_COCK = [-98, -125, -190], F_BAT = [-88, -94, -150];
var FAR_K = [[0, F_REST], [26, F_REST], [30, F_COCK, easeInOut], [32, F_BAT, easeOut], [34, F_BAT], [42, F_REST, smoother], [48, F_REST]];
// butterfly: x, y, tilt
var FLY_K = [[0, [13.0, 4.4, 4]], [6, [12.3, 5.0, 10]], [10, [11.9, 5.4, 4]], [11, [12.3, 4.8, 14]], [14, [13.9, 3.9, 16]],
  [20, [14.1, 4.0, 6]], [26, [10.7, 3.95, -12]], [30, [9.9, 4.9, -6]], [31, [9.9, 4.7, -8]], [34, [8.9, 3.9, -16]],
  [41, [10.8, 3.95, -4]], [48, [13.0, 4.4, 4]]];

var ICON = {
  id: 'cat',
  frames: NF,
  at: function (t) {
    var fr = t * NF;
    var br = 0.22 * (0.5 - 0.5 * Math.cos(TAU * 2 * t));              // breath: 2 per loop
    var s = '';

    // body + far arm + hind leg + tail (ink, one mass)
    s += ink(bodyPath(br));
    var FA = kf(fr, FAR_K);
    var JF = armJoints([7.75, 12.1 - br * 0.6], FA, 1.7, 1.45);
    s += ink(armPath(JF)) + ink(pawPath(JF.W, JF.a3, true, 0.9));

    var flick = 0.25 + 0.45 * loop(t, 2, 0.1) + 1.1 * bump(fr, 14, 18, 22, 30);
    var tail = limb([[13.5, 15.3], [14.85, 15.3], [15.85, 14.7], [16.2, 13.5], [15.85, 12.4], [15.2, 12.05]], [1.55, 1.42, 1.26, 1.1, 0.95, 0.78]);
    s += ink(tail, bend(15.0, 15.35, 16.2, 12.2, flick));

    // haunch: a tapered crease carves the folded thigh out of the belly
    s += cut(limb([[11.55, 10.55 - br], [12.05, 12.0], [12.95, 13.45], [13.9, 14.3]], [0.78, 0.7, 0.5, 0.0001]));

    // head in front, set apart by a clean gap; eyes carved as holes
    var lift = 0;
    var hx = headXf(lift);
    var twitch = 14 * bump(fr, 6, 7, 8, 9.5);
    var head = tp(headPath(0, twitch), hx);
    var eyes = tp(eyeHole(-1.3, -0.2, 1.6) + eyeHole(1.3, -0.2, 1.6), hx);
    s += cutAround(head, 0.75) + front(head + eyes);

    // near arm in front of the far arm
    var NA = kf(fr, NEAR_K), sway = 3.5 * loop(t, 2, 0.3) * (1 - bump(fr, 4, 8, 20, 26));
    NA = [NA[0] + sway * 0.5, NA[1] + sway, NA[2] + sway * 1.6];
    var JN = armJoints([9.7, 11.5 - br * 0.8], NA, 2.1, 1.85);
    var nPaw = pawPath(JN.W, JN.a3, false, 0.9);
    s += cutAround(forearmPath(JN), 0.7) + cutAround(nPaw, 0.7) + front(armPath(JN)) + front(nPaw);

    // butterfly
    var B = kf(fr, FLY_K);
    var glide = 1 - bump(fr, 0, 1, 4, 5.5) - bump(fr, 20, 21.5, 24, 25.5) - bump(fr, 42, 43, 47, 48);
    var dart = bump(fr, 10, 11, 14, 16) + bump(fr, 30, 31, 33, 35);
    var flap = (0.5 - 0.5 * Math.cos(TAU * fr / 4)) * clamp(0.75 * glide + dart);
    s += butterfly(B[0], B[1], B[2], 0.85, flap);
    return s;
  }
};
