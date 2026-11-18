// 앉아서 낚시 (Fishing) — variant C: gesture first.
// An angler in a straw sun hat sits on a shore rock, legs dangling over its face, head bowed over his float,
// both fists on a tapered rod. The figure is ONE hand-drawn outline (back, head, face, arm, fists, thigh, shin,
// foot) posed by rotating its anchors about real joints (hip, neck, knee) and a two-bone arm that follows the
// grip; only designed cuts separate the parts (arm, seat, hat brim, knuckles).
// Story (user): sits still → two nibbles (short quick bobs of the rod tip) → strike: he throws himself back, legs
// kick, hat pops, the rod whips into a deep bend and a fish is yanked out with a splash → he holds it up while it
// swings and flaps → leans in and lowers it back (line paid out, fish slides under) → the float lands → repeat.

// ── helpers (prefixed fc so they never clash with the kit) ─────────────────────────────────────────
function fcDir(deg) { var r = deg * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
function fcP(p) { return f(p[0]) + ' ' + f(p[1]); }
function fcNorm(v) { var l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
function fcDeg(v) { return Math.atan2(v[1], v[0]) * 180 / Math.PI; }
function fcAdd(p, v, k) { return [p[0] + v[0] * k, p[1] + v[1] * k]; }
// anchors: [x, y, deg, inLen, outLen] (smooth) or [x, y, inDeg, inLen, outDeg, outLen] (corner)
function fcBez(A, closed) {
  function H(a) {
    var p = [a[0], a[1]], di = a[2], li = a[3], dout = a.length > 5 ? a[4] : a[2], lo = a.length > 5 ? a[5] : a[4];
    var u = fcDir(di), v = fcDir(dout);
    return { p: p, i: [p[0] - u[0] * li, p[1] - u[1] * li], o: [p[0] + v[0] * lo, p[1] + v[1] * lo] };
  }
  var N = A.map(H), d = 'M' + fcP(N[0].p), n = N.length, last = closed ? n : n - 1;
  for (var k = 0; k < last; k++) {
    var a = N[k], b = N[(k + 1) % n];
    d += 'C' + fcP(a.o) + ' ' + fcP(b.i) + ' ' + fcP(b.p);
  }
  return d + (closed ? 'Z' : '');
}
// move anchors with a point transform (weighted); handle directions turn with the transform
function fcXA(A, fn, w) {
  return A.map(function (a, i) {
    var k = w ? w(i) : 1; if (!k) return a;
    var p = fn(a[0], a[1]), q = fn(a[0] + 0.01, a[1]), r = fcDeg([q[0] - p[0], q[1] - p[1]]), b = a.slice();
    b[0] = lerp(a[0], p[0], k); b[1] = lerp(a[1], p[1], k); b[2] += r * k; if (b.length > 5) b[4] += r * k;
    return b;
  });
}
function fcMeet(p, u, q, v) {
  var den = u[0] * v[1] - u[1] * v[0]; if (Math.abs(den) < 1e-6) return mix(p, q, 0.5);
  var t = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / den;
  return [p[0] + u[0] * t, p[1] + u[1] * t];
}
// two-bone IK: elbow for shoulder s, wrist w, bone lengths l1, l2; side +1 bends the elbow below the s→w line
function fcIK(s, w, l1, l2, side) {
  var d = Math.max(0.01, dist(s, w)), dd = Math.min(d, l1 + l2 - 0.001);
  var a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  var u = [(w[0] - s[0]) / d, (w[1] - s[1]) / d], n = [-u[1] * side, u[0] * side];
  return [s[0] + u[0] * a + n[0] * h, s[1] + u[1] * a + n[1] * h];
}

// ── setting ─────────────────────────────────────────────────────────────────────────────────────────
var FC_WL = 14.5;                      // water line (water fills to the ground line y 16)
function fcRock() {
  return fcBez([
    [1.0, 12.75, -22, 0, 0.8],           // the shore runs in from the frame edge
    [2.6, 11.2, -20, 0.6, 0.6],
    [4.1, 10.7, -2, 0.6, 0.6],           // seat
    [5.8, 10.78, 22, 0.5, 0.3],
    [6.45, 11.4, 70, 0.32, 0.36],        // front shoulder rounds away from the legs
    [6.7, 12.4, 86, 0.36, 0.45],
    [7.0, 13.5, 64, 0.4, 0.4],
    [7.9, FC_WL + 0.1, 12, 0.45, 0]
  ], false) + 'L1 ' + f(FC_WL + 0.1) + 'Z';
}
var FC_FIG = chain(scaleAt(5.0, 11.0, 1.1), move(-0.5, -0.3));   // the angler, a touch larger, seated on the rock

// ── the angler: one outline (idle pose, world coordinates) ─────────────────────────────────────────
var FC_HIP = [4.95, 10.4], FC_NECK = [6.3, 7.12], FC_KNEE = [8.05, 10.45];
var FC_BACK = [                          // seat → back → head → face → throat → chest
  [6.5, 11.0, 180, 0.6, 1.05],           // 0 seat under the thigh
  [3.85, 10.42, -100, 0.45, 0.5],        // 1 back of the buttock
  [4.04, 9.12, -76, 0.5, 0.55],          // 2 small of the back
  [4.58, 7.75, -50, 0.5, 0.36],          // 3 rounded upper back
  [5.05, 7.18, -34, 0.3, 0.22],          // 4 top of the shoulders
  [5.52, 6.9, -80, 0.16, 0.22],          // 5 nape
  [5.44, 6.22, -96, 0.24, 0.42],         // 6 back of the head
  [6.3, 5.0, -4, 0.55, 0.5],             // 7 crown of the head (under the hat)
  [7.36, 5.5, 62, 0.3, 0.25],            // 8 forehead (under the brim)
  [7.56, 5.98, 60, 0.18, 0.16],          // 9 brow → bridge
  [7.86, 6.38, 52, 0.12, 172, 0.08],     // 10 nose tip
  [7.62, 6.5, 108, 0.06, 0.1],           // 11 under the nose
  [7.6, 6.72, 82, 0.08, 0.1],            // 12 lips
  [7.52, 6.99, 122, 0.1, 0.13],          // 13 chin
  [7.1, 7.22, 168, 0.18, 84, 0.22],      // 14 jaw → throat
  [7.22, 7.95, 84, 0.3, 0.3]             // 15 chest
];
var FC_HEAD = function (i) { return i >= 6 && i <= 13 ? 1 : i === 5 || i === 14 ? 0.5 : 0; };
var FC_LEG = [                           // knee → shin → foot → calf → back of the knee
  [8.15, 9.9, 2, 0.4, 0.3],              // 0 knee top
  [8.6, 10.45, 80, 0.3, 0.3],            // 1 knee front, the kneecap
  [8.64, 11.3, 92, 0.3, 0.7],            // 2 shin
  [8.68, 13.0, 84, 0.6, 0.22],           // 3 ankle front
  [9.52, 13.62, 34, 0.32, 0.14],         // 4 toe
  [9.27, 13.94, 200, 0.12, 0.38],        // 5 sole
  [8.04, 13.62, -112, 0.3, 0.2],         // 6 heel
  [7.82, 12.95, -92, 0.22, 0.42],        // 7 ankle, back
  [7.62, 11.8, -97, 0.4, 0.22],          // 8 calf
  [7.6, 11.15, -112, 0.2, 178, 0.5]      // 9 back of the knee
];
var FC_SH = [5.85, 7.7], FC_L1 = 1.95, FC_L2 = 2.05;
// fist in the grip frame: [along the rod, across (+ = top side), direction relative to the rod]
var FC_FIST = [
  [-0.2, 0.53, -6, 0.26, 0.22],          // knuckles
  [0.47, 0.3, 58, 0.16, 0.14],           // front of the fist, above the rod
  [0.36, -0.46, 150, 0.14, 0.16],        // curled fingers under the rod
  [-0.3, -0.5, 186, 0.18, 0.16]          // heel of the hand
];
// straw hat, one piece (origin = centre of the crown base): soft flat-topped crown, wide brim dipping at the front
var FC_HAT = 'M-1.06 -0.04C-1.08 -0.46 -0.98 -0.84 -0.72 -0.98C-0.48 -1.1 -0.2 -1.1 0.02 -1.1C0.26 -1.1 0.52 -1.1 0.76 -0.98' +
  'C1.0 -0.84 1.1 -0.46 1.1 -0.06C1.62 -0.02 2.05 0.1 2.38 0.32C2.5 0.4 2.46 0.58 2.32 0.6C1.7 0.68 0.85 0.9 0.0 0.9' +
  'C-0.85 0.9 -1.65 0.68 -2.22 0.4C-2.36 0.33 -2.35 0.12 -2.2 0.08C-1.85 0.02 -1.45 -0.02 -1.06 -0.04Z';

function fcAngler(P) {
  var hip = FC_HIP, L = rot(hip[0], hip[1], P.lean);
  var back = fcXA(FC_BACK, L, function (i) { return i === 0 ? 0.1 : i === 1 ? 0.45 : i === 2 ? 0.8 : 1; });
  var neck = L(FC_NECK[0], FC_NECK[1]), Hd = rot(neck[0], neck[1], P.nod);
  back = fcXA(back, Hd, FC_HEAD);
  // near arm: the shoulder rides on the torso; the wrist sits behind the fist on the grip
  var S = L(FC_SH[0], FC_SH[1]), G = P.grip, hd = fcDir(P.rodDeg), hn = [hd[1], -hd[0]];
  var W = [G[0] - hd[0] * 0.5, G[1] - hd[1] * 0.5];
  var E = fcIK(S, W, FC_L1, FC_L2, 1);
  var u1 = fcNorm([E[0] - S[0], E[1] - S[1]]), n1 = [u1[1], -u1[0]], a1 = fcDeg(u1);   // n1: front (crook) side
  var u2 = fcNorm([W[0] - E[0], W[1] - E[1]]), n2 = [u2[1], -u2[0]], a2 = fcDeg(u2);   // n2: top side
  var crook = fcMeet(fcAdd(S, n1, 0.68), u1, fcAdd(W, n2, 0.46), u2);
  var outer = fcNorm([-n1[0] - n2[0], -n1[1] - n2[1]]), elbow = fcAdd(E, outer, 0.56);
  var K = rot(hip[0], hip[1], -P.legLift), knee = K(FC_KNEE[0], FC_KNEE[1]);
  var lap = K(7.0, 9.95), toLap = fcDeg([lap[0] - elbow[0], lap[1] - elbow[1]]);
  var arm = [
    [].concat(crook, [a1, 0.25, a2, 0.4]),                                     // crook of the elbow
    [].concat(fcAdd(W, n2, 0.43), [a2, 0.4, 0.18])                             // wrist, top
  ];
  FC_FIST.forEach(function (h) {
    arm.push([G[0] + hd[0] * h[0] + hn[0] * h[1], G[1] + hd[1] * h[0] + hn[1] * h[1], P.rodDeg + h[2], h[3], h[4]]);
  });
  arm.push([].concat(fcAdd(W, n2, -0.43), [a2 + 180, 0.14, 0.5]));            // under the wrist
  arm.push([].concat(elbow, [a2 + 180, 0.32, toLap, 0.22]));                   // point of the elbow
  arm.push([lap[0], lap[1], toLap, 0.1, 2, 0.4]);                               // lap, where the thigh begins
  // legs: thigh turns about the hip, shin about the knee
  // knee anchors take part of the shin swing so the joint bends instead of kinking
  var share = [0.3, 0.8, 1, 1, 1, 1, 1, 1, 1, 0.5];
  var leg = FC_LEG.map(function (a, i) { return fcXA([a], chain(K, rot(knee[0], knee[1], (P.shin || 0) * share[i])))[0]; });
  var body = fcBez(back.concat(arm, leg), true);
  // one tapered gap under the upper arm draws it across the body (thin in the armpit, open at the elbow)
  var cutPts = [fcAdd(mix(S, E, 0.22), n1, -0.66 - 0.28), fcAdd(mix(S, E, 0.6), n1, -0.62 - 0.28),
    fcAdd(E, outer, 0.56 + 0.3), fcAdd(fcAdd(E, outer, 0.5 + 0.3), u2, 0.7)];
  var armCut = ribbon(cutPts, function (s) { return 0.5 * smooth(s / 0.4); }, { caps: ['flat', 'round'], samples: 12 });
  // hat
  var hatBase = chain(L, Hd)(6.42, 4.85);
  var hatF = chain(rot(0, 0, 5 + P.lean + P.nod + (P.hatSpin || 0)), move(hatBase[0], hatBase[1] - (P.hatLift || 0)));
  // the far hand grips just ahead of the near one: a second, slightly smaller fist with a knuckle notch between
  var G2 = fcAdd(G, hd, 0.86), farFist = fcBez([
    [G2[0] + hn[0] * 0.5 - hd[0] * 0.3, G2[1] + hn[1] * 0.5 - hd[1] * 0.3, P.rodDeg - 4, 0.2, 0.2],
    [G2[0] + hd[0] * 0.42 + hn[0] * 0.22, G2[1] + hd[1] * 0.42 + hn[1] * 0.22, P.rodDeg + 62, 0.14, 0.14],
    [G2[0] + hd[0] * 0.3 - hn[0] * 0.44, G2[1] + hd[1] * 0.3 - hn[1] * 0.44, P.rodDeg + 152, 0.14, 0.16],
    [G2[0] - hd[0] * 0.3 - hn[0] * 0.46, G2[1] - hd[1] * 0.3 - hn[1] * 0.46, P.rodDeg + 186, 0.16, 0.16]
  ], true);
  var notch = ribbon([fcAdd(fcAdd(G, hd, 0.42), hn, 0.75), fcAdd(fcAdd(G, hd, 0.44), hn, 0.18)], function (s) { return 0.5 * (1 - s * 0.6); }, { caps: ['flat', 'round'] });
  return ink(body) + ink(farFist) + cut(armCut) + cut(notch) + cutAround(FC_HAT, 0.38, hatF) + front(FC_HAT, hatF);
}

// rod: a short handle in the fist, then a blank tapering to a fine tip; flex = tip deflection (+ lifts the tip)
function fcRod(grip, deg, len, back, flex) {
  var u = fcDir(deg), butt = [grip[0] - u[0] * back, grip[1] - u[1] * back], tip = [grip[0] + u[0] * len, grip[1] + u[1] * len];
  var w = function (s) { return lerp(0.92, 0.68, Math.pow(s, 0.9)); };
  var spine = [butt, grip, mix(grip, tip, 0.5), tip];
  var B = bend(butt[0], butt[1], tip[0], tip[1], flex);
  return { d: tp(ribbon(spine, w, { caps: ['round', 'flat'], samples: 16 }), B), tip: B(tip[0], tip[1]) };
}

// ── props ───────────────────────────────────────────────────────────────────────────────────────────
// float, local frame: origin = waterline on the body, antenna up; cap and body split by a gap (two-tone)
var FC_CAP = 'M-0.62 -0.82C-0.6 -1.42 -0.34 -1.82 0 -1.82C0.34 -1.82 0.6 -1.42 0.62 -0.82Z';
var FC_BODY = 'M-0.62 -0.32C-0.62 0.26 -0.34 0.62 0 0.62C0.34 0.62 0.62 0.26 0.62 -0.32Z';
var FC_ANT = ribbon([[0, -1.7], [0, -2.3]], [0.64, 0.56], { caps: ['flat', 'round'] });
var FC_FLOAT_TOP = 2.5;                  // antenna tip above the water line
function fcSub(x, y) { return [x, Math.min(y, 15.9)]; }      // under the surface everything merges into the water
function fcFloat(base, deg) { var T = chain(rot(0, 0, deg), move(base[0], base[1]), fcSub); return ink(FC_CAP, T) + ink(FC_BODY, T) + ink(FC_ANT, T); }
// fish, local frame: mouth at the origin, body along +x, back toward -y; fusiform body, swept dorsal fin, forked tail
var FC_FISH = fcBez([
  [0, 0, -84, 0.12, 0.2],                // snout
  [0.58, -0.47, -16, 0.26, 0.24],        // nape
  [1.04, -0.6, -8, 0.16, -64, 0.1],      // dorsal fin, leading edge
  [1.36, -1.0, 20, 0.12, 52, 0.18],      // dorsal fin tip, swept back
  [1.8, -0.55, 24, 0.1, 0.26],           // back
  [2.42, -0.2, 12, 0.26, -36, 0.12],     // tail root, top
  [3.12, -0.74, -42, 0.12, 112, 0.16],   // upper lobe
  [2.86, 0, 120, 0.16, 60, 0.16],        // fork
  [3.12, 0.74, 70, 0.16, 216, 0.12],     // lower lobe
  [2.42, 0.22, 192, 0.12, 172, 0.3],     // tail root, below
  [1.3, 0.6, 182, 0.4, 0.3],             // belly
  [0.26, 0.36, 214, 0.18, 0.1]           // chin
], true);
function fcFish(mouth, deg, flap) {
  var T = chain(bend(0, 0, 3.1, 0, flap), rot(0, 0, deg), move(mouth[0], mouth[1]));
  var eye = T(0.42, -0.1), o = ink(FC_FISH, chain(T, fcSub));
  if (eye[1] < FC_WL - 0.8) o += cut(circlePath(0.42, -0.1, 0.2), T);
  return o;
}
// a droplet flying along v: round head, tapered tail
function fcDrop(p, v, len, wid) {
  var a = fcDeg(v), u = fcDir(a);
  return ink(petal(p[0] - u[0] * len, p[1] - u[1] * len, len, wid, a, { peak: 0.72, tip: 'round', fat: 1.3 }));
}
// a splash: a slim two-horned crown and a few small drops thrown wide from (x, water line)
function fcSplash(x, age, big) {
  if (age <= 0 || age > 4.5) return '';
  var o = '', sc = big ? 1 : 0.72, cr = Math.sin(Math.PI * Math.min(1, age / 2.0));
  if (age < 2.0) {
    o += ink(petal(x - 0.42 * sc, FC_WL + 0.2, 1.75 * sc * cr + 0.01, 0.48 * sc * cr + 0.01, -122, { tip: 'point', bend: 0.4, base: 0.4, peak: 0.3 }));
    o += ink(petal(x + 0.42 * sc, FC_WL + 0.2, 1.6 * sc * cr + 0.01, 0.46 * sc * cr + 0.01, -58, { tip: 'point', bend: -0.4, base: 0.4, peak: 0.3 }));
  }
  var vs = big ? [[-1.15, -1.3], [-0.25, -1.9], [0.5, -1.45]] : [[-0.9, -1.2], [0.7, -1.3]];
  vs.forEach(function (v, i) {
    var tt = age - 0.15 - i * 0.1; if (tt <= 0) return;
    // drops fly on a parabola and are only gone once they fall back into the water
    var q = [x + v[0] * tt * sc, FC_WL - 0.5 + v[1] * tt * sc + 0.6 * tt * tt], vel = [v[0], v[1] + 1.2 * tt];
    if (q[1] < FC_WL - 0.5) o += fcDrop(q, vel, 0.78, 0.56);
  });
  return o;
}
// ripple: the near half of a ring seen low across the water, carved into it; its ends open into the surface,
// it widens and thins as it spreads, and it only lives for a few frames
function fcRing(x, age, span, r0, r1) {
  if (age <= 0 || age >= span) return '';
  var u = age / span, r = lerp(r0 || 0.95, r1 || 2.2, easeOut(u)), w = lerp(0.56, 0.4, u);
  return cutLine(smoothPath(arcPts(x, FC_WL, r, -8, 188, 14).map(function (q) { return [q[0], FC_WL + 0.08 + (q[1] - FC_WL) * 0.26]; }), false), w);
}

// ── timeline (64 frames at 8 fps) ───────────────────────────────────────────────────────────────────
//  0– 8 still · 9, 11, 13 nibble: the rod tip and float bob on alternate frames, rings spread · 14–20 still
// 21, 23 nibble · 25–28 the bite drags the float under, he leans in (anticipation)
// 29–31 STRIKE: throws himself back, legs kick, hat pops, rod whips into a deep bend, fish out with a splash
// 31–38 he holds it up; the fish swings and flaps, the rod answers each flap, legs swing back down
// 39–46 he leans in and lowers the rod, paying out line; the fish slides back into the water (release)
// 46–50 the float lands, bobs, a ring spreads; the rod springs back once · 50–63 still
function fcBob(F, c, amp, w) { var u = (F - c) / (w || 0.9); return Math.abs(u) < 1 ? amp * Math.pow(Math.cos(u * Math.PI / 2), 2) : 0; }
function fcKick(u, period, decay) { return u <= 0 ? 0 : Math.exp(-u / decay) * Math.sin(TAU * u / period); }
var FC_G0 = [9.35, 7.8], FC_R0 = -32, FC_G1 = [8.1, 6.3], FC_R1 = -56, FC_LEN = 5.9;
var FC_FX = (function () { var r = fcRod(FC_G0, FC_R0, FC_LEN, 0.1, -0.55); return FC_FIG(r.tip[0], r.tip[1])[0]; })();   // where the float rests
var FC_REL = 46.2;                       // the fish slips off the hook

// pose, rod load and rod tip for frame F (stateless, so any frame can ask about any other)
function fcState(F) {
  // nibbles land on alternate frames so the tip reads as quick separate bobs at 8 fps
  var nib = fcBob(F, 9, 0.75, 1) + fcBob(F, 11, 1.0, 1) + fcBob(F, 13, 0.5, 1) + fcBob(F, 21, 0.85, 1) + fcBob(F, 23, 1.1, 1);
  var bite = seg(F, 24.6, 27.6, easeIn) * (1 - seg(F, 28.8, 29.6));
  var ant = bump(F, 25.0, 27.8, 28.6, 29.4);                                   // leans in, watching the float go under
  var kS = seg(F, 28.7, 30.6, function (x) { return 1 - Math.pow(1 - clamp(x), 2.6); });
  var over = bump(F, 30.0, 30.8, 31.2, 33.0);                                 // overshoot of the yank
  var kR = seg(F, 38.6, 48.8, smooth);                                     // leans in again and lowers the rod
  var k = kS * (1 - kR), uS = F - 28.9;
  var hold = F > 31 && F < 46 ? Math.sin(TAU * (F - 31) / 3.6) * (1 - kR) : 0;  // the fish flapping, felt in the rod
  var P = {
    lean: lerp(0, -20, k) + 3.5 * ant - 4 * over + 1.2 * hold * k,
    nod: lerp(9, -4, k) + 2 * ant,                                         // head bowed over the float; snaps up on the strike
    legLift: 6 * k + 8 * fcKick(uS, 7, 3.6),
    shin: -10 - 34 * fcKick(uS - 0.3, 7.5, 3.4),
    grip: [lerp(FC_G0[0], FC_G1[0], k), lerp(FC_G0[1], FC_G1[1], k) + 0.15 * ant - 0.12 * hold * k],
    rodDeg: lerp(FC_R0, FC_R1, k) + 2.5 * hold * k,
    hatLift: Math.max(0, 0.75 * fcKick(F - 29.3, 6, 2.4)),
    hatSpin: -13 * fcKick(F - 29.5, 7, 2.6)
  };
  var flex;
  if (F < 28.7) flex = -0.55 - 1.0 * nib - 1.8 * bite;
  else if (F < FC_REL) {
    flex = lerp(-2.35, -2.8 + 0.35 * hold, seg(F, 28.7, 30.2)) - 1.1 * bump(F, 28.7, 29.6, 30.0, 31.2);
    flex = lerp(flex, -1.1, seg(F, 38.6, FC_REL, easeInOut));
  } else flex = lerp(-1.1, -0.55, seg(F, FC_REL, FC_REL + 0.8)) + 0.7 * fcKick(F - FC_REL, 4.2, 1.4);
  var rod = fcRod(P.grip, P.rodDeg, FC_LEN, 0.1, flex);
  return { P: P, rod: rod, T: FC_FIG(rod.tip[0], rod.tip[1]), nib: nib, bite: bite, kR: kR };
}
// where the hooked fish is while it is out of the water
function fcHang(F, st) {
  var T = st.T, swing = Math.max(0, F - 31.6);
  var Lh = lerp(3.8, 8.6, seg(F, 38.6, FC_REL, smooth));
  var phi = 14 * Math.exp(-swing / 5) * Math.cos(TAU * swing / 7) * (1 - seg(F, 38.6, 43.0));
  var hang = [T[0] + Lh * Math.sin(phi * Math.PI / 180), T[1] + Lh * Math.cos(phi * Math.PI / 180)], mouth = hang;
  if (F < 31.6) { var e = seg(F, 29.6, 31.6, easeOut); mouth = [lerp(FC_FX, hang[0], e), lerp(FC_WL + 0.4, hang[1], e)]; }
  var dir = fcNorm([mouth[0] - T[0], mouth[1] - T[1]]);
  return { mouth: mouth, dir: dir, deg: fcDeg(dir), Lh: Lh };
}
var FC_DROP_X = (function () { var F = FC_REL - 0.01; return fcHang(F, fcState(F)).mouth[0]; })();   // where the fish goes back in

var ICON = {
  id: "fishing",
  frames: 64,
  at: function (t) {
    var F = t * 64, s = '', st = fcState(F), T = st.T, kR = st.kR;
    s += ink('M1 ' + FC_WL + 'H17V16H1Z') + ink(fcRock());
    s += cut(ribbon([[3.0, 10.68], [4.9, 10.7], [6.5, 10.78], [7.5, 10.95]], function (u) { return 0.56 * smooth(u / 0.3); }, { caps: ['flat', 'flat'] }));   // seat
    s += xf(FC_FIG, fcAngler(st.P));
    s += ink(st.rod.d, FC_FIG);

    // float, line and fish
    var line = function (a, b) { return hairline('M' + fcP(a) + 'L' + fcP(b), 0.6); };
    if (F < 29.6) {
      var dip = Math.min(1.85, 0.9 * st.nib + 1.85 * st.bite), fb = [FC_FX, FC_WL + dip];
      s += fcFloat(fb, 0) + line(T, [fb[0], fb[1] - FC_FLOAT_TOP + 0.1]);
    } else if (F < FC_REL) {
      var h = fcHang(F, st), mouth = h.mouth, dir = h.dir;
      var flap = (0.5 + 0.6 * Math.exp(-Math.max(0, F - 30) / 5)) * Math.sin(TAU * F / 3) * (1 - 0.6 * kR);
      s += fcFish(mouth, h.deg, flap);
      var fb2 = [mouth[0] - dir[0] * 0.95, mouth[1] - dir[1] * 0.95];
      s += fcFloat(fb2, h.deg - 90) + line(T, [fb2[0] - dir[0] * (FC_FLOAT_TOP - 0.1), fb2[1] - dir[1] * (FC_FLOAT_TOP - 0.1)]) + line(fb2, mouth);
    } else {
      // free: the fish slips off and slides under; the float drops the last bit onto the water and bobs
      var dv = F - FC_REL;
      if (dv < 1.0) {
        var sink = 2.4 * dv + 1.6 * dv * dv;
        s += fcFish([FC_DROP_X - 0.3 * dv, FC_WL - 1.0 + sink], 96 + 14 * dv, 0.7 * Math.sin(F * 2.6));
      }
      var land = seg(F, FC_REL, FC_REL + 1.9, easeIn);
      var Lf = lerp(8.6 - 0.95, FC_WL - T[1], land);
      var bob = F > FC_REL + 1.9 ? fcBob(F, FC_REL + 2.6, 0.7, 1.0) - fcBob(F, FC_REL + 4.2, 0.25, 1.1) : 0;
      var fb3 = [lerp(T[0], FC_FX, land), Math.min(FC_WL, T[1] + Lf) + bob];
      s += fcFloat(fb3, 0) + line(T, [fb3[0], fb3[1] - FC_FLOAT_TOP + 0.1]);
    }
    // splashes and ripples
    s += fcSplash(FC_FX, F - 29.6, true) + fcSplash(FC_DROP_X, F - FC_REL + 0.5, false);
    s += fcRing(FC_FX, F - 9, 5) + fcRing(FC_FX, F - 11, 5) + fcRing(FC_FX, F - 21, 5) + fcRing(FC_FX, F - 23, 5) + fcRing(FC_FX, F - 26.4, 5);
    s += fcRing(FC_FX, F - 30, 6, 1.1, 2.6) + fcRing(FC_DROP_X, F - FC_REL - 0.2, 5) + fcRing(FC_FX, F - FC_REL - 2.0, 6);
    return s;
  }
};
