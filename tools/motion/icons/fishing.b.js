// Layerhover — 앉아서 낚시 (Fishing) · variant B: elegance first.
// 강태공: an angler in a conical straw hat (삿갓) sits hunched on a river boulder; one long tapered cane rod
// bows out over the water to a slim two-tone float. Two nibbles, then the strike: he rocks back, the rod
// bows hard, a fish flies out with a splash, swings and flaps, twists free and dives back, and he casts again.

var ICON = {
  id: "fishing",
  frames: 64,
  at: function (t) { return fishScene(t * 64); }
};

// ── fixed geometry (pt), idle pose ───────────────────────────────────────────────────────────────
var WY = 16;                       // water line
var HIP = [4.0, 11.6];             // the upper body rocks about this point (on the boulder)
var ELBOW = [5.0, 9.45];           // the upper arm is part of the body silhouette; the forearm starts here
var FORE_L = 2.66;
var HAT_AT = [4.75, 5.72];         // centre of the hat's underside
var HAT_TILT = 8;                  // front brim lower: he looks down at his float
var FLOAT_X = 14.9;
var ROD_L = 8.4, GRIP_AT = 0.22;   // rod length from the butt; the fist sits this far up the rod

// conical straw hat — local: underside centre at 0,0, apex up; flared, concave sides
var HAT = 'M0 -2.45Q0.13 -2.45 0.26 -2.3C0.9 -1.38 1.78 -0.62 2.95 -0.12C3.08 -0.06 3.06 0.14 2.9 0.14' +
  'C2.05 0.12 1.1 -0.04 0 -0.04C-1.1 -0.04 -2.05 0.12 -2.9 0.14C-3.06 0.14 -3.08 -0.06 -2.95 -0.12' +
  'C-1.78 -0.62 -0.9 -1.38 -0.26 -2.3Q-0.13 -2.45 0 -2.45Z';

// upper body: the head shows only below the hat's shadow line (a 0.6 gap), then nape, hunched back,
// chest and chin. Rotates about HIP.
var TORSO = 'M4.12 6.22C3.98 6.25 3.9 6.36 3.9 6.5C3.88 6.68 3.76 6.86 3.5 7.0C2.95 7.3 2.62 7.95 2.52 8.65' +
  'C2.4 9.55 2.42 10.45 2.62 11.15C2.85 11.85 3.4 12.2 4.0 12.2C4.6 12.2 5.15 11.8 5.4 11.2C5.55 10.8 5.6 10.4 5.6 10.0' +
  'C5.62 9.5 5.66 9.0 5.6 8.55C5.55 8.22 5.45 8.02 5.33 7.92C5.56 7.84 5.76 7.66 5.88 7.44' +
  'C5.98 7.25 6.0 7.08 6.02 6.98C6.18 6.92 6.3 6.82 6.3 6.7C6.3 6.6 6.12 6.52 5.94 6.49C5.3 6.4 4.62 6.28 4.12 6.22Z';
// the back edge of the near sleeve, carved as one stroke that starts sharp at the shoulder
var SLEEVE = [[4.35, 7.75], [4.08, 8.55], [4.22, 9.45], [4.75, 10.05], [5.7, 10.12]];
// seat, thigh rising to the knee, shin, heel and toe resting on the boulder's slope (static)
var LEGS = 'M3.0 11.0C3.0 11.75 3.4 12.2 4.0 12.2C4.9 12.2 5.85 11.55 6.55 11.1' +
  'C6.6 11.6 6.68 12.3 6.8 12.7C6.68 12.92 6.72 13.2 6.98 13.3C7.45 13.48 7.95 13.7 8.35 13.83' +
  'C8.6 13.9 8.74 13.66 8.55 13.52C8.22 13.28 7.9 13.04 7.7 12.74C7.56 12.1 7.6 11.25 7.62 10.7' +
  'C7.64 10.2 7.32 9.95 6.92 9.97C6.35 9.99 5.7 10.25 5.15 10.5C4.4 10.85 3.6 10.6 3.0 11.0Z';

// river boulder: he sits on its crown, feet on its long slope down to the water
var STONE = 'M1.25 16.4C1.15 15.0 1.55 13.7 2.4 13.15C3.1 12.75 4.05 12.75 4.95 12.98' +
  'C5.95 13.25 6.75 13.75 7.65 14.2C8.5 14.62 9.15 15.2 9.5 16.4Z';

// the float: slim spindle; its cap is set off by a curved cut (two-tone). local: water line at 0
var FLOAT = 'M0 -2.6C0.12 -2.6 0.3 -2.1 0.45 -1.55C0.6 -1.05 0.66 -0.55 0.6 -0.15C0.52 0.3 0.3 0.55 0 0.62' +
  'C-0.3 0.55 -0.52 0.3 -0.6 -0.15C-0.66 -0.55 -0.6 -1.05 -0.45 -1.55C-0.3 -2.1 -0.12 -2.6 0 -2.6Z';
var FLOAT_BAND = 'M-0.75 -1.55C-0.3 -1.43 0.3 -1.43 0.75 -1.55L0.75 -0.95C0.3 -0.83 -0.3 -0.83 -0.75 -0.95Z';
var FLOAT_H = 2.6;

// the fish — local: mouth at 0,0, body hanging along +y; deep belly, slim wrist, forked tail
var FISH = 'M0 0C0.45 0.06 0.82 0.48 0.84 1.12C0.86 1.92 0.52 2.58 0.24 3.02C0.46 3.46 0.86 3.9 1.04 4.26' +
  'C0.64 4.14 0.27 3.92 0 3.77C-0.27 3.92 -0.64 4.14 -1.04 4.26C-0.86 3.9 -0.46 3.46 -0.24 3.02' +
  'C-0.5 2.58 -0.78 1.92 -0.76 1.12C-0.74 0.48 -0.42 0.06 0 0Z';
var FISH_EYE = [0.2, 0.78];
var FISH_LEN = 4.26;

// hanging assembly, measured down the line from the tip: line → float (slid down to the knot) → gap → mouth
var L1 = 0.5, KNOT = 1.45, HANG = L1 + FLOAT_H + KNOT;

// ── small helpers ────────────────────────────────────────────────────────────────────────────────
function trk(fr, keys) {          // keyframe track: [[frame, value, ease?], ...] (ease of the segment ending there)
  if (fr <= keys[0][0]) return keys[0][1];
  for (var i = 1; i < keys.length; i++) {
    if (fr <= keys[i][0]) {
      var a = keys[i - 1], b = keys[i];
      return lerp(a[1], b[1], (b[2] || smooth)((fr - a[0]) / (b[0] - a[0])));
    }
  }
  return keys[keys.length - 1][1];
}
function rad(d) { return d * Math.PI / 180; }
function lin(x) { return clamp(x); }
function deg(r) { return r * 180 / Math.PI; }
function seg2(a, b) { return 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]); }
function hangAngle(from, to) { return deg(Math.atan2(-(to[0] - from[0]), to[1] - from[1])); }  // 0 = straight down
function flatten(d, n) {          // path → polygons (for clipping at the water line)
  n = n || 8;
  var segs = parsePath(d), polys = [], cur = null, px = 0, py = 0;
  for (var i = 0; i < segs.length; i++) {
    var g = segs[i], p = g.p, k, u, v;
    if (g.c === 'M') { cur = [[p[0], p[1]]]; polys.push(cur); px = p[0]; py = p[1]; }
    else if (g.c === 'L') { cur.push([p[0], p[1]]); px = p[0]; py = p[1]; }
    else if (g.c === 'C') {
      for (k = 1; k <= n; k++) { u = k / n; v = 1 - u; cur.push([v * v * v * px + 3 * v * v * u * p[0] + 3 * v * u * u * p[2] + u * u * u * p[4], v * v * v * py + 3 * v * v * u * p[1] + 3 * v * u * u * p[3] + u * u * u * p[5]]); }
      px = p[4]; py = p[5];
    } else if (g.c === 'Q') {
      for (k = 1; k <= n; k++) { u = k / n; v = 1 - u; cur.push([v * v * px + 2 * v * u * p[0] + u * u * p[2], v * v * py + 2 * v * u * p[1] + u * u * p[3]]); }
      px = p[2]; py = p[3];
    }
  }
  return polys;
}
function aboveWater(d, ymax) {    // keep only what is above ymax (the rest would sit inside the water band)
  var polys = flatten(d, 10), s = '';
  for (var i = 0; i < polys.length; i++) {
    var P = polys[i], any = false;
    for (var j = 0; j < P.length; j++) { if (P[j][1] < ymax - 0.05) any = true; P[j] = [P[j][0], Math.min(P[j][1], ymax)]; }
    if (any) s += polyPath(P, true);
  }
  return s;
}

// ── rod: a cane that bends like a real one (curvature grows toward the tip, length is kept) ─────
function rodPts(grip, dg, drop) {
  var th = rad(dg), dr = rad(drop), n = 48, ds = ROD_L / n;
  var x = grip[0] - Math.cos(th) * GRIP_AT, y = grip[1] + Math.sin(th) * GRIP_AT, out = [[x, y]];
  for (var i = 1; i <= n; i++) {
    var ph = th - dr * Math.pow((i - 0.5) / n, 1.2);
    x += Math.cos(ph) * ds; y -= Math.sin(ph) * ds;
    if (i % 4 === 0) out.push([x, y]);
  }
  return out;
}
function rodW(s) { return 0.6 + 0.5 * Math.pow(1 - s, 2.0); }

// ── timeline (frame numbers, 64 per loop) ────────────────────────────────────────────────────────
// 0–7 idle · 8–13 nibble 1 · 14–21 idle · 22–26 nibble 2 · 27–28 the bite · 29–31 STRIKE · 31–41 the fish
// swings and flaps · 41–44 it twists free and dives back · 45–52 recast · 52–57 settle · idle
var SINK = [[0, 0], [8, 0], [9, 0.52, easeOut], [10, 0.1], [11, 0.44, easeOut], [12, 0.06], [13, 0],
  [22, 0], [23, 0.54, easeOut], [24, 0.12], [25, 0.5, easeOut], [26, 0.08], [27, 0.66, easeIn], [28, 1.0]];
var LEAN = [[0, 0], [26.5, 0], [28, 1.8], [29, -3.5, easeIn], [30, -8.0, easeOut], [31, -9.2], [32, -8.4], [34, -8.8],
  [41, -8.4], [43, -6.0], [45, -2.6], [47, -0.8], [48.4, -1.6], [50.2, 2.4], [51.6, 1.4], [54, -0.3], [57, 0]];
var HATLAG = [[0, 0], [29, 0], [30, 2.2], [31, 3.0], [32, 0.4], [33, -1.2], [35, 0.3], [37, 0],
  [49.6, 0], [50.6, -1.8], [52, 0.9], [54, 0]];
var FORE = [[0, 19.8], [27, 19.8], [28, 16], [29, 26, easeIn], [30, 34, easeOut], [31, 37], [33, 35],
  [41, 35], [43, 31], [45, 27], [47, 26], [48.4, 31], [50.2, 15], [51.6, 18], [54, 19.8]];
var RODDEG = [[0, 52], [26.5, 52], [27, 51], [28, 47], [29, 61, easeIn], [30, 75, easeOut], [31, 79], [32, 77], [34, 78],
  [41, 78], [42, 68, easeOut], [43, 62], [45, 59], [47, 58], [48.4, 61], [49.3, 55, easeIn], [50.2, 45, lin], [51.6, 48], [53.5, 53], [56, 52]];
var DROP = [[28.5, 62], [29, 70], [30, 94, easeOut], [31, 100], [32, 90], [33, 97], [34, 89], [35, 94], [36, 88],
  [37, 92], [38, 87], [39, 90], [40, 87], [41, 90], [42, 40, easeOut], [43, 56], [44, 44], [45, 50], [46, 46],
  [48.4, 46], [50.2, 30], [51.4, 42, easeOut], [52.6, 26], [53.6, 35], [54.6, 28], [55.8, 31], [57.4, 30]];
function rodDrop(fr, sink) { return fr >= 28.5 ? trk(fr, DROP) : 30 + 48 * Math.min(sink, 0.75); }  // every tug loads the tip

// the fish on the line: swing angle about the rod tip (deg from straight down, + = right) and flaps
var SWING = [[30, 20], [31, 15], [32, 3], [33, -11], [34, -17, easeOut], [35, -6], [36, 10], [37, 13, easeOut],
  [38, 4], [39, -9], [40, -7], [41, 3]];
var FLAP = [[30, 0], [31, 0.6], [32, 1], [33, -1], [34, 0.7], [35, -0.9], [36, 0.5], [37, -0.6], [38, 0.9], [39, -1],
  [40, 0.8], [41, -1], [42, 0.9], [43, -0.8], [44, 0.6]];

function pose(fr) {
  var lean = trk(fr, LEAN), ub = rot(HIP[0], HIP[1], lean), el = ub(ELBOW[0], ELBOW[1]);
  var fa = rad(trk(fr, FORE) - lean);                       // the forearm turns with the body
  var grip = [el[0] + Math.cos(fa) * FORE_L, el[1] - Math.sin(fa) * FORE_L];
  var sink = fr > 28 ? 1 : trk(fr, SINK);
  var rp = rodPts(grip, trk(fr, RODDEG), rodDrop(fr, sink));
  return { lean: lean, ub: ub, el: el, fa: fa, grip: grip, sink: sink, rp: rp, tip: rp[rp.length - 1] };
}

function fishScene(fr) {
  var P = pose(fr), ub = P.ub, tip = P.tip, s = '';

  // boulder and the angler
  s += ink(STONE);
  s += ink(LEGS) + ink(TORSO, ub);
  s += cut(ribbon(SLEEVE, function (u) { return 0.6 * Math.min(1, u * 3.2); }), ub);
  var hatFn = chain(rot(0, 0, HAT_TILT + trk(fr, HATLAG)), move(HAT_AT[0], HAT_AT[1]), ub);
  s += ink(HAT, hatFn);

  // rod in front of everything it crosses (a clean gap), held in the fist
  var rp = P.rp, mid = ribbon(rp.slice(1, 9), function (u) { return rodW(lerp(1 / 12, 8 / 12, u)); });
  s += cutAround(mid, 0.6) + front(ribbon(rp, rodW, { caps: ['round', 'round'] }));
  // forearm + fist (front, so the rod's gap never bites into them)
  var el = P.el, ca = Math.cos(P.fa), sa = -Math.sin(P.fa), grip = P.grip;
  var wrist = [grip[0] - ca * 0.55, grip[1] - sa * 0.55];
  s += front(ribbon([el, [lerp(el[0], wrist[0], 0.45) - sa * 0.08, lerp(el[1], wrist[1], 0.45) + ca * 0.08], wrist], [1.38, 1.04, 0.9]));
  s += front(petal(wrist[0] - ca * 0.2, wrist[1] - sa * 0.2, 1.3, 1.08, deg(Math.atan2(sa, ca)), { tip: 'round', base: 0.78, peak: 0.6, fat: 1.25 }));
  // far hand: grips the rod a hand-width further up, tucked behind the near fist
  var r0 = rp[0], r1 = rp[2], rd = Math.atan2(r1[1] - r0[1], r1[0] - r0[0]);
  var fh = [grip[0] + Math.cos(rd) * 1.05, grip[1] + Math.sin(rd) * 1.05];
  var farFist = petal(fh[0] - Math.cos(rd) * 0.45 + Math.sin(rd) * 0.12, fh[1] - Math.sin(rd) * 0.45 - Math.cos(rd) * 0.12, 1.0, 0.98, deg(rd), { tip: 'round', base: 0.7, peak: 0.55, fat: 1.3 });
  s += front(farFist);

  // ── what hangs on the line ──
  var floatFn = null, fishFn = null, top;
  if (fr < 28.6 || fr >= 52.5) {
    // the float rides the water and dips on every tug
    var sk = fr >= 52.5 ? trk(fr, [[52.5, 0.55], [53.5, 0.14], [54.5, 0.3], [55.5, 0.05], [56.5, 0.1], [58, 0]]) : P.sink;
    floatFn = chain(rot(0, 0, -5 + 4 * sk), move(FLOAT_X, WY + sk * 2.8));
    top = floatFn(0, -FLOAT_H);
    if (sk > 0.92) { top = [FLOAT_X - 0.2, WY + 0.25]; floatFn = null; }
    s += hairline(sagLine(tip, top, 0.35 * (1 - sk)), 0.6);
  } else if (fr < 30) {
    // the bite and the first instant of the strike: float pulled under, the line taut into the water
    s += hairline(seg2(tip, [FLOAT_X - 0.25, WY + 0.25]), 0.6);
  } else if (fr < 41) {
    // the strike: the fish flies out on a taut line, then swings and flaps under the bowed rod
    var sw = rad(trk(fr, SWING)), hangM = [tip[0] + Math.sin(sw) * HANG, tip[1] + Math.cos(sw) * HANG];
    var exitM = [FLOAT_X - 0.6, WY - 6.6], u = clamp((fr - 30) / 1.6), ue = easeOut(u);
    var mouth = [lerp(exitM[0], hangM[0], ue) + 0.7 * Math.sin(Math.PI * u), lerp(exitM[1], hangM[1], ue)];
    var a = hangAngle(tip, mouth), d = [-Math.sin(rad(a)), Math.cos(rad(a))];
    var knot = [mouth[0] - d[0] * KNOT, mouth[1] - d[1] * KNOT];
    floatFn = chain(rot(0, 0, a), move(knot[0], knot[1]));
    top = floatFn(0, -FLOAT_H);
    s += hairline(seg2(tip, top), 0.6) + hairline(seg2(knot, mouth), 0.6);
    var flap = trk(fr, FLAP);
    fishFn = chain(bend(0, 0, 0, FISH_LEN, flap * 0.85), rot(0, 0, a + flap * 7), move(mouth[0], mouth[1]));
  } else {
    // released: the fish twists free and dives back; the bare float dangles, then flies out on the cast
    var tau = fr - 41, P41 = pose(41), sw0 = rad(trk(41, SWING));
    var m0 = [P41.tip[0] + Math.sin(sw0) * HANG, P41.tip[1] + Math.cos(sw0) * HANG];
    var c0 = [m0[0], m0[1] + 2.1], cc = [c0[0] + 0.3 * tau, c0[1] + 0.5 * tau + 1.0 * tau * tau];
    if (cc[1] < WY + 1.6) {
      var spin = -deg(sw0) + 66 * tau, flap2 = trk(fr, FLAP);
      fishFn = chain(move(0, -2.1), bend(0, -2.1, 0, 2.16, flap2 * 0.85), rot(0, 0, spin), move(cc[0], cc[1]));
    }
    var swF = rad(10 * Math.sin(tau * 1.4) * Math.exp(-tau / 2.4));
    var dang = [tip[0] + Math.sin(swF) * (L1 + FLOAT_H), tip[1] + Math.cos(swF) * (L1 + FLOAT_H)];
    var fp, fa2;
    if (fr < 48.2) { fp = dang; fa2 = hangAngle(tip, fp); }
    else {
      var k = clamp((fr - 48.2) / (52.5 - 48.2)), land = [FLOAT_X, WY + 0.55 * 2.8], c = [17.4, dang[1] - 3.0];
      fp = [(1 - k) * (1 - k) * dang[0] + 2 * (1 - k) * k * c[0] + k * k * land[0], (1 - k) * (1 - k) * dang[1] + 2 * (1 - k) * k * c[1] + k * k * land[1]];
      fa2 = lerp(hangAngle(tip, fp), -5 + 4 * 0.55, smooth(clamp((k - 0.55) / 0.45)));
    }
    floatFn = chain(rot(0, 0, fa2), move(fp[0], fp[1]));
    top = floatFn(0, -FLOAT_H);
    s += hairline(seg2(tip, top), 0.6);
  }
  if (floatFn) {
    s += ink(aboveWater(tp(FLOAT, floatFn), WY + 0.6));
    s += cut(aboveWater(tp(FLOAT_BAND, floatFn), WY - 0.1));
  }
  if (fishFn) {
    s += ink(aboveWater(tp(FISH, fishFn), WY + 0.6));
    var eye = fishFn(FISH_EYE[0], FISH_EYE[1]);
    if (eye[1] < WY - 0.5) s += cut(circlePath(eye[0], eye[1], 0.31));
  }

  // ── water: band with travelling crests, and splash ──
  s += ink(waterPath(fr));
  s += splash(fr);
  return s;
}

// fishing line hanging from the tip with a slight sag toward the angler
function sagLine(a, b, sag) {
  var mx = lerp(a[0], b[0], 0.6) - sag, my = lerp(a[1], b[1], 0.6);
  return 'M' + f(a[0]) + ' ' + f(a[1]) + 'Q' + f(mx) + ' ' + f(my) + ' ' + f(b[0]) + ' ' + f(b[1]);
}

// water: a band with a crisp top and a rounded end; ripple rings travel out along it as small crests
var RINGS = [[9, 0.42, FLOAT_X], [11, 0.38, FLOAT_X], [23, 0.45, FLOAT_X], [25, 0.42, FLOAT_X], [27.6, 0.55, FLOAT_X],
  [29.6, 0.62, FLOAT_X - 0.6], [43.4, 0.6, 13.2], [52.5, 0.55, FLOAT_X]];
function waterPath(fr) {
  var pts = [];
  for (var x = 9.3; x <= 16.3001; x += 0.1) {
    var y = WY;
    for (var i = 0; i < RINGS.length; i++) {
      var age = fr - RINGS[i][0];
      if (age < 0 || age > 6) continue;
      var k = age / 6, h = RINGS[i][1] * Math.pow(1 - k, 1.4), r = 0.95 + 2.3 * easeOut(k), w = 0.62 + 0.35 * k;
      for (var sg = -1; sg <= 1; sg += 2) {
        var uu = (x - (RINGS[i][2] + sg * r)) / w;
        if (Math.abs(uu) < 1) y -= h * Math.pow(Math.cos(Math.PI * uu / 2), 2);
      }
    }
    pts.push([x, y]);
  }
  var d = 'M1.25 16L9.3 16' + smoothPath(pts, false).replace(/^M[^C]*/, '');
  return d + 'L15.2 16C16.0 16 16.6 16.12 16.95 16.38C16.65 16.72 16.0 16.95 15.0 16.95L1.25 16.95Z';
}

// splash: teardrop droplets thrown up where the fish breaks out (30) and where it dives back (44)
function droplet(x, y, r, dg) {   // round head at x,y, tail pointing back along dg
  var d = 'M' + (-2.3 * r) + ' 0C' + (-1.3 * r) + ' ' + (-0.3 * r) + ' ' + (-0.8 * r) + ' ' + (-r) + ' 0 ' + (-r) +
    'C' + (0.56 * r) + ' ' + (-r) + ' ' + r + ' ' + (-0.56 * r) + ' ' + r + ' 0C' + r + ' ' + (0.56 * r) + ' ' + (0.56 * r) + ' ' + r + ' 0 ' + r +
    'C' + (-0.8 * r) + ' ' + r + ' ' + (-1.3 * r) + ' ' + (0.3 * r) + ' ' + (-2.3 * r) + ' 0Z';
  return tp(d, chain(rot(0, 0, dg), move(x, y)));
}
function splash(fr) {
  // [start frame, x, scale, [[vx, vy, size], ...]] — uneven sizes and angles so no two drops mirror each other
  var s = '', bursts = [[29.2, FLOAT_X - 0.6, 1.0, [[-1.05, -1.55, 0.85], [0.12, -2.7, 1.0], [0.78, -1.95, 0.72]]],
    [43.2, 13.2, 0.8, [[-1.2, -1.35, 0.72], [0.1, -2.6, 1.0], [0.95, -1.9, 0.62]]]];
  for (var b = 0; b < bursts.length; b++) {
    var age = fr - bursts[b][0], dirs = bursts[b][3];
    if (age <= 0 || age > 3.4) continue;
    for (var i = 0; i < dirs.length; i++) {
      var v = dirs[i], sc = bursts[b][2];
      var x = bursts[b][1] + ((Math.abs(v[0]) < 0.3 ? 0 : 0.5 * Math.sign(v[0])) + v[0] * age * 1.1) * sc, y = WY - 0.6 + (v[1] * age + 0.66 * age * age) * sc;
      if (y > WY - 0.75 || x > 16.3) continue;          // drops fall back into the water or leave the frame
      var vy = v[1] + 1.32 * age, a = deg(Math.atan2(vy, v[0]));
      s += ink(droplet(x, y, (0.44 - 0.07 * age) * Math.sqrt(sc) * v[2], a));
    }
  }
  return s;
}
