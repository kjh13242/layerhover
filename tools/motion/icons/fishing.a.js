// 앉아서 낚시 (Fishing) — variant A: recognizability first.
// An old angler (강태공) under a conical straw hat sits on a river rock, knees up, both fists on the rod; the line drops
// to a two-tone bobber on a calm pond. Subject (angler, rod, line, float, fish) is solid; the setting (rock, water) is
// the single 50 % fade level, so the figure sits right on the rock and pops at menu-bar size.
// Story (user): sits still → two nibbles (short quick bobs) → strike, fish yanked out → recast → repeat.

// ── local helpers ────────────────────────────────────────────────────────────────────────────────
// smooth closed/open curve through points; a point [x, y, 1] is a corner
function crv(pts, closed) {
  var n = pts.length;
  function P(i) { return closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; }
  function isCorner(i) { return P(i)[2] || (!closed && (i === 0 || i === n - 1)); }
  function tOut(i) {
    var p = P(i), a = P(i - 1), b = P(i + 1);
    if (isCorner(i)) return [(b[0] - p[0]), (b[1] - p[1])];
    return [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2];
  }
  function tIn(i) {
    var p = P(i), a = P(i - 1), b = P(i + 1);
    if (isCorner(i)) return [(p[0] - a[0]), (p[1] - a[1])];
    return [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2];
  }
  var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]), last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p1 = P(i), p2 = P(i + 1), to = tOut(i), ti = tIn(i + 1);
    d += 'C' + f(p1[0] + to[0] / 3) + ' ' + f(p1[1] + to[1] / 3) + ' ' + f(p2[0] - ti[0] / 3) + ' ' + f(p2[1] - ti[1] / 3) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
  }
  return d + (closed ? 'Z' : '');
}
// sample points along segments [i0, i1) of a path (crv: segment j runs from point j to point j+1)
function pathPts(d, i0, i1, per) {
  var segs = parsePath(d), out = [], cx = 0, cy = 0, j, q;
  per = per || 6;
  for (j = 0; j < segs.length; j++) {
    var g = segs[j];
    if (g.c === 'M') { cx = g.p[0]; cy = g.p[1]; continue; }
    if (g.c === 'Z') continue;
    var k = j - 1;
    if (k >= i0 && k < i1) {
      for (q = out.length ? 1 : 0; q <= per; q++) {
        var u = q / per, v = 1 - u, x, y;
        if (g.c === 'C') {
          x = v * v * v * cx + 3 * v * v * u * g.p[0] + 3 * v * u * u * g.p[2] + u * u * u * g.p[4];
          y = v * v * v * cy + 3 * v * v * u * g.p[1] + 3 * v * u * u * g.p[3] + u * u * u * g.p[5];
        } else if (g.c === 'Q') {
          x = v * v * cx + 2 * v * u * g.p[0] + u * u * g.p[2]; y = v * v * cy + 2 * v * u * g.p[1] + u * u * g.p[3];
        } else { x = lerp(cx, g.p[0], u); y = lerp(cy, g.p[1], u); }
        out.push([x, y]);
      }
    }
    cx = g.p[g.p.length - 2]; cy = g.p[g.p.length - 1];
  }
  return out;
}
// a cut riding on an edge, opening from nothing: the visible gap is half its width (the rest hides under a front part)
function edgeCut(pts, gap, open, close) {
  return ribbon(pts, function (u) { return 2 * gap * smooth(u / (open || 0.3)) * (close ? 1 - smooth((u - 1 + close) / close) : 1); });
}
// points in a local frame (origin o, unit direction dir): [u along, v to the left of dir]
function frame(o, dir) {
  var nx = dir[1], ny = -dir[0];
  return function (u, v) { return [o[0] + dir[0] * u + nx * v, o[1] + dir[1] * u + ny * v]; };
}
function mapPts(pts, fn) { return pts.map(function (p) { var q = fn(p[0], p[1]); return p[2] ? [q[0], q[1], 1] : q; }); }

// ── poster pose ──────────────────────────────────────────────────────────────────────────────────
// seat boulder (setting, 50 %): a flat seat plane, a sloped front plane down to a ledge for the feet, soft corners.
// The angler sits right on it; its foot dissolves into the water.
var STONE = crv([
  [1.3, 16.2, 1], [1.5, 14.75], [1.95, 13.4], [2.7, 12.56], [3.4, 12.43], [4.4, 12.43], [5.7, 12.46], [6.3, 12.72],
  [7.25, 13.63], [7.85, 13.87], [9.15, 13.93], [9.85, 14.2], [10.25, 15.0], [10.4, 16.2, 1]
], true);

var TORSO = crv([
  [2.9, 12.45, 1], [2.6, 11.35], [2.62, 10.05], [3.0, 8.85], [3.6, 7.95], [4.15, 7.4], [4.45, 6.95],
  [4.5, 6.45], [4.55, 6.08, 1], [5.3, 5.85], [6.05, 6.08, 1], [6.22, 6.38], [6.47, 6.66, 1], [6.25, 6.8], [6.3, 7.0],
  [6.18, 7.26], [5.82, 7.42], [5.66, 7.68], [5.98, 8.4], [6.15, 9.4], [6.0, 10.4], [5.45, 11.3], [4.65, 12.45, 1]
], true);

var LEG = crv([
  [4.3, 10.75], [5.6, 10.25], [6.55, 9.82], [7.15, 9.72], [7.55, 10.15], [7.85, 11.5], [8.15, 12.85],
  [7.42, 13.12], [7.06, 12.0], [6.8, 11.45], [6.66, 11.26, 1], [5.6, 11.9], [4.75, 12.45, 1], [4.2, 12.45, 1]
], true);
var FOOT = crv([[7.36, 12.9], [8.15, 12.95], [8.85, 13.25], [9.4, 13.5], [9.55, 13.75], [9.35, 13.85, 1], [7.55, 13.85, 1], [7.33, 13.5]], true);

var HAT = crv([
  [2.7, 5.95, 1], [3.85, 5.15], [4.62, 4.38], [5.0, 3.86], [5.2, 3.7], [5.42, 3.86], [6.1, 4.75], [7.0, 5.6], [8.0, 6.15, 1],
  [6.7, 6.12], [5.2, 6.12], [3.9, 6.05]
], true);

var ARM_PTS = [
  [4.6, 7.5], [5.3, 7.45], [5.72, 7.98], [5.95, 8.84, 1], [6.9, 8.4], [7.75, 7.95], [8.02, 8.6],
  [7.0, 9.4], [5.85, 10.06], [5.3, 10.05], [5.05, 9.6], [4.6, 8.75], [4.2, 7.92], [4.3, 7.62]
];
var ARM = crv(ARM_PTS, true);
var ARM_GAP = edgeCut(pathPts(ARM, 6, 12).reverse(), 0.62, 0.3, 0);

var WRIST = [8.0, 8.3], TIP = [13.95, 2.45];
var ROD_LEN = Math.hypot(TIP[0] - WRIST[0], TIP[1] - WRIST[1]);
var ROD_ANG = Math.atan2(TIP[1] - WRIST[1], TIP[0] - WRIST[0]) * 180 / Math.PI;
var SEAT = [3.95, 12.35], SHOULDER = [4.85, 7.65], HEAD = [5.4, 6.3];
var WATER_Y = 16.0, FLOAT_Y = 15.08;
var REST_X = 0;   // set below from the rest pose

function rotV(ang) { var a = ang * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }
// a rod that keeps its length and bends like a loaded cantilever: slope grows as (2u - u²) toward the tip
function rodSpine(w, baseDeg, len, bendDeg, n) {
  n = n || 16; var pts = [[w[0], w[1]]], x = w[0], y = w[1];
  for (var i = 0; i < n; i++) {
    var u = (i + 0.5) / n, a = (baseDeg + bendDeg * (2 * u - u * u)) * Math.PI / 180;
    x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; pts.push([x, y]);
  }
  return pts;
}
// mitten hand around the rod, in the rod's frame at the wrist
function handPath(w, d) {
  return crv(mapPts([[-0.2, -0.42], [-0.12, 0.36], [0.3, 0.58], [0.85, 0.6], [1.12, 0.48], [1.2, 0.4, 1], [1.32, 0.5], [1.62, 0.56], [2.02, 0.46],
    [2.16, 0.05], [2.0, -0.4], [1.55, -0.52], [1.25, -0.44], [1.1, -0.5], [0.62, -0.56], [0.05, -0.55]], frame(w, d)), true);
}
// egg bobber: a cap and a body; the gap between them is the two-tone band (an equator seen from just above)
function floatParts(cx, cy) {
  var rx = 0.8, ry = 1.06, dip = 0.1;
  function edgeAng(y) { return Math.asin(clamp((y - cy) / ry, -1, 1)); }
  function arc(a0, a1, n) { var out = []; for (var i = 0; i <= n; i++) { var a = lerp(a0, a1, i / n); out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return out; }
  var y1 = cy - 0.3, y2 = cy + 0.3, a1 = edgeAng(y1), a2 = edgeAng(y2);
  var cap = arc(Math.PI - a1, TAU + a1, 8); cap[0].push(1); cap[cap.length - 1].push(1); cap.push([cx, y1 + dip]);
  var body = arc(a2, Math.PI - a2, 8); body[0].push(1); body[body.length - 1].push(1); body.push([cx, y2 + dip]);
  return [crv(cap, true), crv(body.reverse(), true)];
}
// fish, drawn lying left (mouth at 0,0, tail toward +x); hung by the mouth it is rotated to hang down
var FISH = crv([
  [0, 0, 1], [0.24, -0.4], [0.68, -0.68], [1.12, -0.82, 1], [1.5, -1.16, 1], [2.08, -0.64], [2.55, -0.25],
  [3.28, -0.74, 1], [3.02, -0.18], [2.96, 0.0, 1], [3.02, 0.18], [3.28, 0.74, 1], [2.55, 0.25], [2.0, 0.56],
  [1.3, 0.72], [0.62, 0.56], [0.2, 0.28]
], true);
var FISH_EYE = circlePath(0.55, -0.18, 0.3);

// keyframes in frame units: [[frame, value, ease?], ...]
function kf(F, keys) {
  if (F <= keys[0][0]) return keys[0][1];
  for (var i = 1; i < keys.length; i++) {
    if (F <= keys[i][0]) {
      var a = keys[i - 1], b = keys[i], e = b[2] || smooth;
      return lerp(a[1], b[1], e((F - a[0]) / (b[0] - a[0])));
    }
  }
  return keys[keys.length - 1][1];
}
function lin(x) { return clamp(x); }
// linear-blend skinning along x: points left of x0 follow fn fully, right of x1 stay put (a thigh rooted in a moving pelvis)
function skin(fn, x0, x1) {
  return function (x, y) { var q = fn(x, y), k = smooth((x1 - x) / (x1 - x0)); return [lerp(x, q[0], k), lerp(y, q[1], k)]; };
}
// the same along y: points above yFull follow fn fully, below yNone stay put (a spine bending above a seated pelvis)
function skinY(fn, yFull, yNone) {
  return function (x, y) { var q = fn(x, y), k = smooth((yNone - y) / (yNone - yFull)); return [lerp(x, q[0], k), lerp(y, q[1], k)]; };
}
// water drop: round head, short pointed tail trailing opposite to its motion (ang = direction of travel, deg)
function teardrop(cx, cy, r, ang, tail) {
  var a = ang * Math.PI / 180, bx = -Math.cos(a), by = -Math.sin(a), pts = [[cx + bx * r * tail, cy + by * r * tail, 1]];
  [62, 115, 180, 245, 298].forEach(function (k) { var q = Math.atan2(by, bx) + k * Math.PI / 180; pts.push([cx + Math.cos(q) * r, cy + Math.sin(q) * r]); });
  return crv(pts, true);
}
// short quick bobs of a nibble: one frame down, one frame up
var BOBS = [[7, 0.7], [9, 1.0], [11, 0.55], [20, 0.85], [22, 1.0], [24, 0.8]];
function nib(F) { var v = 0; for (var i = 0; i < BOBS.length; i++) v += BOBS[i][1] * Math.max(0, 1 - Math.abs(F - BOBS[i][0])); return v; }

// ── story beats (frames at 8 fps, 64 frames = 8 s) ──
// 0–6 idle · 7/9/11 nibble 1 (three one-frame bobs) · 20/22/24 nibble 2 · 25.2–27.6 bite: float pulled under, rod
// tip loads, angler leans in (anticipation) · 27–28.6 STRIKE: spine bends back, fists pull up, rod arcs over
// · 28.9 fish breaks out with a splash · 29–40.5 fish swings and flaps, rod bounces · 40.5 it slips off (catch and
// release), 42.4 splash, rod springs up · 41–44 empty float swings · 44–48.6 recast: rod forward, float lowered
// · 48.6 float lands with a ripple and settles · 49.4–64 idle
var F_OFF = 40.5, F_BACK = 44.0, F_LAND = 48.6;

// the body and the rod
function rig(F) {
  var R = {};
  R.lean = kf(F, [[0, 0], [25, 0], [27, 2.5], [28.6, -11, easeOut], [30.5, -8.5], [F_OFF, -8.5], [41.6, -4.5, easeOut], [43.5, -3], [F_BACK, -3.5], [47.4, 1, easeInOut], [49.4, 0], [64, 0]]);
  R.lift = kf(F, [[0, 0], [25, 0], [27, 3], [28.6, -13, easeOut], [30.5, -9], [F_OFF, -9], [41.6, -4, easeOut], [43.5, -2], [F_BACK, -2.5], [47.4, 2, easeInOut], [49.4, 0], [64, 0]]);
  R.rodRot = kf(F, [[0, 0], [25, 0], [27, 3], [28.6, 2, easeOut], [F_OFF, 2], [41.6, 0], [43.5, 0], [F_BACK, -2], [47.4, 3, easeInOut], [49.4, 0], [64, 0]]);
  R.flap = F > 29 && F < F_OFF ? Math.sin(TAU * (F - 29.6) / 2.4) * (1 - 0.45 * clamp((F - 30) / 10)) : 0;
  var load = kf(F, [[0, 0], [25, 0], [27, 14], [28.6, 50, easeOut], [30.5, 40], [F_OFF, 38], [41.4, -4, easeOut], [42.4, 3], [43.3, 0], [F_BACK, -2], [45.9, 8], [47.6, -2], [49.4, 0], [64, 0]]);
  R.bendDeg = 10 + 12 * nib(F) + load + 5 * R.flap;
  R.hatLag = kf(F, [[0, 0], [28, 0], [29.2, 5, easeOut], [31.5, -1.5], [33.5, 0], [F_BACK, 0], [46.2, -3], [48, 2], [50, 0]]);
  R.U = rot(SEAT[0], SEAT[1], R.lean);
  R.A = chain(rot(SHOULDER[0], SHOULDER[1], R.lift), R.U);
  R.w = R.A(WRIST[0], WRIST[1]);
  R.baseDeg = ROD_ANG + R.lean + R.lift + R.rodRot;
  R.d = rotV(R.baseDeg);
  R.spine = rodSpine(R.w, R.baseDeg, ROD_LEN, R.bendDeg);
  R.tip = R.spine[R.spine.length - 1];
  return R;
}
// fish on the line: hook (= fish mouth) hangs from the tip at depth, swung by theta (deg, + toward the angler)
function hooked(F, tip) {
  var depth = kf(F, [[27.6, 16.5], [29, 10.5, lin], [31, 5.7, easeOut], [F_OFF, 5.7]]);
  var theta = kf(F, [[27.6, 0], [29.5, 10], [31.2, 20, easeOut], [33, -15], [34.8, 12], [36.6, -9], [38.4, 6], [F_OFF, 0]]);
  var th = theta * Math.PI / 180, u = [-Math.sin(th), Math.cos(th)];
  return { theta: theta, u: u, hook: [tip[0] + u[0] * depth, tip[1] + u[1] * depth] };
}
// empty float swinging on the line after the fish has gone
function swinging(F, tip) {
  var th = kf(F, [[F_OFF, 0], [41.5, -20, easeOut], [42.5, 12], [43.3, -4], [F_BACK, 16]]) * Math.PI / 180;
  return [tip[0] - Math.sin(th) * 3.5, tip[1] + Math.cos(th) * 3.5];
}
var HOOK_OFF, CAST_FROM, SPLASH_OUT_X, SPLASH_IN_X;
function fishFall(F) {   // after slipping off: falls, tumbling a little
  var a = F - F_OFF;
  return { at: [HOOK_OFF[0] - 0.2 * a, HOOK_OFF[1] + 0.4 * a + 1.15 * a * a], ang: 90 + 24 * a };
}

// ripple sources: [frame, strength, x or null for the float]
var RIPPLES = [[7, 0.5], [9, 0.7], [11, 0.45], [20, 0.6], [22, 0.7], [24, 0.6], [26.4, 0.9], [28.9, 1.0, 'out'], [42.4, 1.0, 'in'], [48.6, 0.9]];

function drops(F, F0, x0, n, power) {
  var out = '', age = F - F0;
  if (age < 0 || age > 6) return '';
  for (var i = 0; i < n; i++) {
    var side = i - (n - 1) / 2, sgn = side < 0 ? -1 : 1;
    var vx = (side * 0.34 + sgn * 0.3) * power, vy = -(1.45 + 0.3 * (1 - Math.abs(side) / n)) * power;
    var px = x0 + side * 0.55 + sgn * 0.45 + vx * age, py = WATER_Y - 0.35 + vy * age + 0.27 * age * age;
    var sz = 0.58 * (1 - age / 8), ang = Math.atan2(vy + 0.54 * age, vx) * 180 / Math.PI;
    if (py < WATER_Y - 0.25) out += ink(teardrop(px, py, sz * 0.5, ang, 2.3));
  }
  return out;
}

var ICON = {
  id: "fishing",
  frames: 64,
  at: function (t) {
    var F = t * 64, R = rig(F), tip = R.tip, restX = REST_X;
    var rod = ribbon([[R.w[0] - R.d[0] * 0.1, R.w[1] - R.d[1] * 0.1]].concat(R.spine), function (u) { return 0.64 + 0.26 * Math.pow(1 - u, 1.3); }, { caps: ['flat', 'round'] });

    // ── line, float, fish ──
    var floatC, lineEnd, fish = null;
    if (F > 27.6 && F < F_OFF) {
      var H = hooked(F, tip);
      floatC = [H.hook[0] - H.u[0] * 2.2, H.hook[1] - H.u[1] * 2.2];
      lineEnd = H.hook;
      fish = chain(bend(0, 0, 3.3, 0, 0.8 * R.flap), rot(0, 0, 90 - H.theta), move(H.hook[0], H.hook[1]));
    } else if (F >= F_OFF && F < F_LAND) {
      if (F < F_BACK) floatC = swinging(F, tip);
      else {
        var k = Math.pow((F - F_BACK) / (F_LAND - F_BACK), 1.12), c = [restX + 1.1, CAST_FROM[1] + 0.6], L = [restX, FLOAT_Y];
        floatC = [(1 - k) * (1 - k) * CAST_FROM[0] + 2 * k * (1 - k) * c[0] + k * k * L[0], (1 - k) * (1 - k) * CAST_FROM[1] + 2 * k * (1 - k) * c[1] + k * k * L[1]];
      }
      lineEnd = [floatC[0], floatC[1] - 0.9];
      if (F < 43.2) { var ff = fishFall(F); fish = chain(rot(0, 0, ff.ang), move(ff.at[0], ff.at[1])); }
    } else {
      var sink = F < 27.7 ? kf(F, [[0, 0], [25.2, 0], [26.4, 0.6, easeIn], [27.6, 2.4, easeIn]]) : 0;
      var settle = F >= F_LAND ? kf(F, [[F_LAND, 0.55], [49.8, -0.15], [51.1, 0]]) : 0;
      floatC = [restX, FLOAT_Y + 0.62 * nib(F) + sink + settle];
      lineEnd = [floatC[0], floatC[1] - 0.9];
    }
    if (lineEnd[1] > WATER_Y) { var kq = (WATER_Y - tip[1]) / (lineEnd[1] - tip[1]); lineEnd = [lerp(tip[0], lineEnd[0], kq), WATER_Y]; }

    var s = '';
    // still parts: the rock (setting, 50 %) and the legs
    var spineXf = skinY(R.U, 10.0, 12.2);
    s += fade(STONE) + ink(LEG, skin(spineXf, 4.7, 6.8)) + ink(FOOT);
    // upper body, rod, hand
    s += ink(TORSO, spineXf) + ink(HAT, chain(rot(HEAD[0], HEAD[1], R.hatLag), R.U));
    s += front(ARM, R.A) + cut(ARM_GAP, R.A);
    s += front(rod) + front(handPath(R.w, R.d));
    s += frontLine('M' + f(tip[0]) + ' ' + f(tip[1]) + 'L' + f(lineEnd[0]) + ' ' + f(lineEnd[1]), 0.6);
    // float: a cap and a body, the gap between them is the two-tone band
    var fp = floatParts(floatC[0], floatC[1]);
    s += ink(fp[0]) + ink(fp[1]);
    if (fish) s += ink(FISH, fish) + cut(FISH_EYE, fish);
    // splashes: the fish breaking out, the fish falling back
    s += drops(F, 28.9, SPLASH_OUT_X, 4, 1.0) + drops(F, 42.4, SPLASH_IN_X, 4, 0.7);
    // anything under the surface stays hidden in the water
    s += cut(rectPath(0, WATER_Y, 18, 2, 0));
    // water: a calm field whose surface lifts into ripples that run outward
    var surf = [];
    for (var i = 0; i <= 48; i++) {
      var x = 1.0 + 16 * i / 48, h = 0;
      for (var r = 0; r < RIPPLES.length; r++) {
        var age = F - RIPPLES[r][0]; if (age < 0 || age > 9) continue;
        var cx = RIPPLES[r][2] === 'out' ? SPLASH_OUT_X : RIPPLES[r][2] === 'in' ? SPLASH_IN_X : restX;
        var rad = 0.9 + age * 0.55, kk = RIPPLES[r][1] * (1 - age / 9);
        h += 0.42 * kk * (Math.exp(-Math.pow((x - cx - rad) / 0.45, 2)) + Math.exp(-Math.pow((x - cx + rad) / 0.45, 2)));
      }
      surf.push([x, WATER_Y - h]);
    }
    s += fade(smoothPath(surf, false, 1) + 'L17 16.6C17 16.8 16.75 16.9 15.8 16.93C12 16.99 6 16.99 2.2 16.93C1.25 16.9 1 16.8 1 16.6Z');
    return s;
  }
};

// event positions, measured once from the rig
(function () {
  var sp = rodSpine(WRIST, ROD_ANG, ROD_LEN, 10); REST_X = sp[sp.length - 1][0];
  SPLASH_OUT_X = hooked(28.9, rig(28.9).tip).hook[0];
  HOOK_OFF = hooked(F_OFF - 1e-6, rig(F_OFF).tip).hook;
  CAST_FROM = swinging(F_BACK, rig(F_BACK).tip);
  var a = 0; while (fishFall(F_OFF + a).at[1] < WATER_Y - 3.2 && a < 6) a += 0.05;
  SPLASH_IN_X = fishFall(F_OFF + a).at[0] - 0.3;
})();
