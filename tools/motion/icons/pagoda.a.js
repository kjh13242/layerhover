// 석탑 (Stone pagoda) — variant A · recognizability first
// Reference: Bulguksa Seokgatap (불국사 삼층석탑), with its width ratios kept (lower/upper base ≈ 1.2–1.4,
// upper base/body 1 ≈ 1.8, roof 1 ≈ 0.9 × upper base, bodies ≈ 0.5–0.6 × their roofs) and exaggerated as a whole
// for the 18 pt grid. One symmetric hand-drawn outline carries the silhouette: two-tier base with 0.9 pt cover
// slabs (갑석), three body stones that diminish fast, roof stones (옥개석) with a concave 낙수면, a tapering eave
// that sweeps up into the corner (전각 반전) and a stepped soffit (층급받침), a 노반 with bowl, rings and jewel.
// Carved lines: 우주 corner pillars on body 1 and the upper die, the 탱주 middle pillar on the upper die.
// Dominant horizontals and verticals sit on the 0.5 pt grid; the carved lines are centred on 2x pixel centres.
// Snow: six-armed crystals with barbs. Two settle on the top roof beside the finial, two drift onto roof 1's
// lifted corners, two near ones pass the eaves to the ground; each rests, then melts into what it touched.

var CX = 9;

// <P>
var P = {
  tip: 1.05, nbTop: 3.45, nbHw: 0.85,
  roofs: [   // top roof first. ridge = top of the stone (foot of the body above), yu = eave soffit at the stepped
             // underside, bandBot = foot of that step (= top of the body below), hw = corner tip,
             // fall = drop of the 낙수면 from the ridge to the eave, lift = rise of the corner (전각 반전)
    { ridge: 3.9, yu: 5.0, bandBot: 5.4, hw: 3.4, fall: 0.25, lift: 0.24 },
    { ridge: 5.92, yu: 7.08, bandBot: 7.5, hw: 3.8, fall: 0.28, lift: 0.26 },
    { ridge: 8.35, yu: 9.55, bandBot: 10.0, hw: 4.2, fall: 0.3, lift: 0.28 }
  ],
  bodies: [1.75, 2.0, 2.5],              // body half-widths, top body first
  bands: [2.25, 2.5, 3.0],               // stepped-underside half-widths
  uc: { slope: 11.5, edge: 11.65, under: 12.55, hw: 5.0 }, // upper cover (상층 갑석), 0.9 pt edge
  ud: { hw: 4.5 },                                         // upper die (상층기단 면석), uc.under → lc.slope
  lc: { slope: 13.95, edge: 14.1, under: 15.0, hw: 6.0 },  // lower cover (하층 갑석), 0.9 pt edge
  ld: { hw: 5.5 },                                         // lower die (하층기단 면석), lc.under → 16
  cutW: 0.6,
  pil: { b1: [1.25], ud: [3.25, 0], ld: [] },             // carved pillar lines (± from the axis): 우주 corner pillars, 탱주 middle pillar
  phase: 18                                                // poster phase of the snow schedule (frames)
};
// </P>

// Closed symmetric path. `start` lies on the axis (top), segs describe the right half down to a point on
// the axis (bottom). Segment = [x, y] (line) or [x1, y1, x2, y2, x, y] (cubic).
function symPath(start, segs) {
  var Q = [start], d = 'M' + f(start[0]) + ' ' + f(start[1]);
  for (var i = 0; i < segs.length; i++) {
    var s = segs[i];
    d += (s.length === 2 ? 'L' : 'C') + s.map(f).join(' ');
    Q.push([s[s.length - 2], s[s.length - 1]]);
  }
  for (var j = segs.length - 1; j >= 0; j--) {
    var g = segs[j], to = Q[j];
    if (g.length === 2) d += 'L' + f(2 * CX - to[0]) + ' ' + f(to[1]);
    else d += 'C' + f(2 * CX - g[2]) + ' ' + f(g[3]) + ' ' + f(2 * CX - g[0]) + ' ' + f(g[1]) + ' ' + f(2 * CX - to[0]) + ' ' + f(to[1]);
  }
  return d + 'Z';
}

// one roof stone, right half: from the foot of the body above, down the 낙수면 to the lifted corner,
// back under the eave lip to the stepped underside, down to the body below
function roofSegs(i, aboveHw) {
  var r = P.roofs[i], band = P.bands[i], body = P.bodies[i];
  var W = r.hw - aboveHw, eave = r.ridge + r.fall, ov = r.hw - band;
  var tt = eave - r.lift * 0.8, tb = r.yu - r.lift * 1.6;     // the soffit lifts more than the top: the eave thins into the corner
  return [
    // 낙수면: a slightly concave slope that settles at the eave and turns up into the corner (전각 반전)
    [CX + aboveHw + 0.3 * W, r.ridge + 0.6 * r.fall, CX + r.hw - 0.42 * W, eave + 0.02, CX + r.hw, tt],
    // corner end face, cut slightly back
    [CX + r.hw - 0.08, tb],
    // eave soffit sweeping up toward the corner
    [CX + r.hw - 0.08 - 0.38 * ov, tb + 0.75 * (r.yu - tb), CX + band + 0.3 * ov, r.yu, CX + band, r.yu],
    // 층급받침 (stepped underside)
    [CX + band, r.bandBot],
    [CX + body, r.bandBot]
  ];
}

function finialSegs() {
  var t = P.tip, nb = P.nbTop, k = (nb - t) / 2.55;
  function Y(v) { return t + v * k; }
  return [
    // 보주 (jewel): pointed bud
    [CX + 0.15, Y(0.28), CX + 0.47, Y(0.46), CX + 0.47, Y(0.7)],
    [CX + 0.47, Y(0.85), CX + 0.41, Y(0.93), CX + 0.4, Y(0.98)],
    // 보륜 (rings): three discs stepping out toward the base
    [CX + 0.5, Y(1.02), CX + 0.56, Y(1.08), CX + 0.56, Y(1.16)],
    [CX + 0.56, Y(1.25), CX + 0.47, Y(1.3), CX + 0.44, Y(1.34)],
    [CX + 0.56, Y(1.38), CX + 0.62, Y(1.44), CX + 0.62, Y(1.52)],
    [CX + 0.62, Y(1.61), CX + 0.51, Y(1.66), CX + 0.48, Y(1.7)],
    [CX + 0.61, Y(1.74), CX + 0.68, Y(1.8), CX + 0.68, Y(1.88)],
    [CX + 0.68, Y(1.97), CX + 0.55, Y(2.02), CX + 0.52, Y(2.06)],
    // 복발 (bowl) swelling onto the 노반
    [CX + 0.7, Y(2.1), CX + 0.78, Y(2.25), CX + 0.78, nb],
    [CX + P.nbHw, nb],
    [CX + P.nbHw, P.roofs[0].ridge]
  ];
}

function pagodaPath() {
  var s = finialSegs(), R = P.roofs, B = P.bodies;
  s = s.concat(roofSegs(0, P.nbHw));
  s.push([CX + B[0], R[1].ridge]);
  s = s.concat(roofSegs(1, B[0]));
  s.push([CX + B[1], R[2].ridge]);
  s = s.concat(roofSegs(2, B[1]));
  s.push([CX + B[2], P.uc.slope]);
  s.push([CX + P.uc.hw, P.uc.edge]);
  s.push([CX + P.uc.hw, P.uc.under]);
  s.push([CX + P.ud.hw, P.uc.under]);
  s.push([CX + P.ud.hw, P.lc.slope]);
  s.push([CX + P.lc.hw, P.lc.edge]);
  s.push([CX + P.lc.hw, P.lc.under]);
  s.push([CX + P.ld.hw, P.lc.under]);
  s.push([CX + P.ld.hw, 16]);
  s.push([CX, 16]);
  return symPath([CX, P.tip], s);
}

// carved pillars (우주 corner pillars, 탱주 middle pillar): one crisp line per pillar, running stone to stone
function vline(x, y0, y1) { var w = P.cutW; return rectPath(x - w / 2, y0, w, y1 - y0, 0.04); }
function pillarCuts() {
  var c = '';
  function lines(list, y0, y1) { list.forEach(function (dx) { c += cut(vline(CX - dx, y0, y1)) + (dx ? cut(vline(CX + dx, y0, y1)) : ''); }); }
  lines(P.pil.b1, P.roofs[2].bandBot, P.uc.slope);
  lines(P.pil.ud, P.uc.under, P.lc.slope);
  lines(P.pil.ld, P.lc.under, 15.55);
  return c;
}

var PAGODA = pagodaPath();

// snowflake: solid hexagonal core, six arms with a pair of barbs and a sharp tip
function polar(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
function crystal(cx, cy, r, rot) {
  var p = [];
  for (var i = 0; i < 6; i++) {
    var a = -90 + (rot || 0) + i * 60;
    p.push(polar(cx, cy, r * 0.52, a - 30), polar(cx, cy, r * 0.6, a - 15), polar(cx, cy, r * 0.84, a - 20),
      polar(cx, cy, r * 0.76, a - 8), polar(cx, cy, r, a), polar(cx, cy, r * 0.76, a + 8),
      polar(cx, cy, r * 0.84, a + 20), polar(cx, cy, r * 0.6, a + 15));
  }
  return polyPath(p, true);
}

// ── snow ──────────────────────────────────────────────────────────────────────────────────────────
// The outline, sampled once, tells each flake where the stone's top surface is, so it lands exactly on it.
function samplePath(d, step) {
  var segs = parsePath(d), pts = [], cur = [0, 0], start = [0, 0];
  segs.forEach(function (g) {
    var p = g.p;
    if (g.c === 'M') { cur = [p[0], p[1]]; start = cur; pts.push(cur); return; }
    if (g.c === 'Z') { pts.push(start); cur = start; return; }
    var n = Math.max(2, Math.ceil((g.c === 'L' ? dist(cur, [p[0], p[1]]) : dist(cur, [p[p.length - 2], p[p.length - 1]]) * 1.4) / step));
    for (var k = 1; k <= n; k++) {
      var u = k / n, v = 1 - u, q;
      if (g.c === 'L') q = [lerp(cur[0], p[0], u), lerp(cur[1], p[1], u)];
      else if (g.c === 'C') q = [v * v * v * cur[0] + 3 * v * v * u * p[0] + 3 * v * u * u * p[2] + u * u * u * p[4],
        v * v * v * cur[1] + 3 * v * v * u * p[1] + 3 * v * u * u * p[3] + u * u * u * p[5]];
      else q = [v * v * cur[0] + 2 * v * u * p[0] + u * u * p[2], v * v * cur[1] + 2 * v * u * p[1] + u * u * p[3]];
      pts.push(q);
    }
    cur = [p[p.length - 2], p[p.length - 1]];
  });
  return pts;
}
var OUTLINE = samplePath(PAGODA, 0.05);
function topY(x) {   // highest point of the stone above x (16 = bare ground)
  var best = 16;
  for (var i = 1; i < OUTLINE.length; i++) {
    var a = OUTLINE[i - 1], b = OUTLINE[i];
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) best = Math.min(best, lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])));
  }
  return best;
}
function restY(x, r) {   // centre height of a flake of radius r resting on the stone (or ground) at x
  var re = r * 0.8, best = 99;
  for (var k = -8; k <= 8; k++) { var dx = re * k / 8; best = Math.min(best, topY(x + dx) - Math.sqrt(re * re - dx * dx)); }
  return best;
}

// flakes: start frame s; fall / rest / melt durations in frames; x0 = lane while falling, x1 = landing x,
// drift = fraction of the fall after which the flake eases from its lane onto the landing x.
// Near flakes (outer lanes) are larger and fall faster than the ones settling on the stone (parallax).
var N = 64;
var FLAKES = [
  { s: 0, fall: 13, rest: 5, melt: 8, x0: 6.3, x1: 6.45, drift: 0, r: 0.66, rot: 8, spin: 30, sw: 0.14, ph: 0.1 },    // top roof, left
  { s: 32, fall: 13, rest: 5, melt: 8, x0: 11.75, x1: 11.55, drift: 0, r: 0.66, rot: 30, spin: -26, sw: 0.14, ph: 0.4 },// top roof, right
  { s: 38, fall: 28, rest: 4, melt: 8, x0: 3.95, x1: 4.62, drift: 0.72, r: 0.64, rot: 22, spin: -40, sw: 0.16, ph: 0.6 }, // perches on roof 1's left corner
  { s: 6, fall: 28, rest: 4, melt: 8, x0: 14.05, x1: 13.38, drift: 0.72, r: 0.64, rot: 4, spin: 44, sw: 0.16, ph: 0.85 },// roof 1's right corner
  { s: 16, fall: 42, rest: 0, melt: 6, x0: 2.75, x1: 1.92, drift: 0, r: 0.78, rot: 16, spin: 70, sw: 0.3, ph: 0.3 },    // past the eaves to the ground, left
  { s: 48, fall: 42, rest: 0, melt: 6, x0: 15.25, x1: 16.08, drift: 0, r: 0.78, rot: 40, spin: -60, sw: 0.3, ph: 0.7 }  // ground, right
];
FLAKES.forEach(function (k) {
  k.s = (k.s + P.phase) % N; k.y0 = 1.0 + k.r * 0.95;
  var onStone = restY(k.x1, k.r);
  k.y1 = Math.min(onStone, 15.45 - k.r);
  // where it touches: the nearest point of the stone, or (beside the base) straight below on the ground
  k.cp = [k.x1, k.y1 + k.r * 0.8];
  if (onStone < 15.45 - k.r) {
    var best = 99;
    OUTLINE.forEach(function (q) { var dd = dist(q, [k.x1, k.y1]); if (dd < best) { best = dd; k.cp = q; } });
  }
});

function flakePos(k, u) {   // position while falling, u = 0..1
  var e = u * (1 + 0.35 * (1 - u));                                             // steady drift, soft landing
  var lane = k.drift ? lerp(k.x0, k.x1, smooth((u - k.drift) / (1 - k.drift))) : lerp(k.x0, k.x1, u);
  // flutter: each flake its own smooth wobble (seeded noise), fading in and out so start and landing stay exact
  var x = lane + k.sw * 0.85 * noise(u * k.fall / 24 + k.ph, 3 + k.ph * 11, 2) * Math.sin(Math.PI * Math.min(1, u / (k.drift || 1)));
  return [x, lerp(k.y0, k.y1, e)];
}
function flakeAt(k, tau) {
  var l = ((tau - k.s) % N + N) % N;
  if (l >= k.fall + k.rest + k.melt) return '';
  if (l < k.fall) {
    var u = l / k.fall, p = flakePos(k, u), sc = smooth(u / 0.22);             // forms out of the air
    return ink(crystal(p[0], p[1] + k.r * (1 - sc) * 0.5, k.r * sc, k.rot + k.spin * u));
  }
  var m = smooth((l - k.fall - k.rest) / k.melt), r = k.r * (1 - m);           // rests, then melts into the stone
  var c = mix([k.x1, k.y1], k.cp, m);                                           // shrinking toward where it touches
  return r < 0.02 ? '' : ink(crystal(c[0], c[1], r, k.rot + k.spin + 6 * m));
}

var ICON = {
  id: "pagoda",
  frames: N,
  at: function (t) {
    var tau = t * N, s = ink(PAGODA) + pillarCuts();
    FLAKES.forEach(function (k) { s += flakeAt(k, tau); });
    return s;
  }
};
