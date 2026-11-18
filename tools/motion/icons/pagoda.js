// 석탑 (Stone pagoda) — final, built from variant B.
// Bulguksa Seokgatap (불국사 삼층석탑) drawn as ONE perfectly symmetric outline (the right half, mirrored):
//   · base (이층기단): a lower plinth with a chamfered top, an upper die carved with corner pillars (우주), and a cover
//     slab (갑석) with a 0.9 pt lip and a top that falls gently outward;
//   · three body stones (탑신) that shrink 5 → 4 → 3 pt; body 1 carries corner pillars like the die below it;
//   · three wide, thin roof stones (옥개석): a flat soffit with one corbel step (층급받침), a concave falling top
//     (낙수면) that lifts softly into the corner (전각 반전), a slanted cut eave end, and an underside that runs flat
//     and then sweeps up into the tip in one concave curve;
//   · a 상륜부: a block with a rounded bowl shoulder (노반 · 복발), two rings (보륜) on a mast, a pointed jewel (보주).
// Snow (탑 위에 눈이 조금씩): six-arm crystals drift down from open sky. Some land on open surfaces — the top roof
// beside the finial and roof 1's lifted corner tips — touching at one arm tip; they rest, then melt by shrinking into
// the point they touched. The pagoda itself is still.
var ICON = {
  id: "pagoda",
  frames: 64,
  at: function (t) { return PAGODA.draw(t); }
};

var PAGODA = (function () {
  var CX = 9, N = 64;
  function mx(x) { return 2 * CX - x; }

  // Closed path symmetric about x = CX. `start` lies on the axis (top); segs run down the right half to a point on the
  // axis (bottom): [x, y] is a line, [x1, y1, x2, y2, x, y] a cubic. The left half is the mirror image, run back up.
  function symPath(start, segs) {
    var Q = [start], d = 'M' + f(start[0]) + ' ' + f(start[1]);
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      d += (s.length === 2 ? 'L' : 'C') + s.map(f).join(' ');
      Q.push([s[s.length - 2], s[s.length - 1]]);
    }
    for (var j = segs.length - 1; j >= 0; j--) {
      var g = segs[j], to = Q[j];
      if (g.length === 2) d += 'L' + f(mx(to[0])) + ' ' + f(to[1]);
      else d += 'C' + f(mx(g[2])) + ' ' + f(g[3]) + ' ' + f(mx(g[0])) + ' ' + f(g[1]) + ' ' + f(mx(to[0])) + ' ' + f(to[1]);
    }
    return d + 'Z';
  }
  // cubic from P to Q that leaves P along u0 and arrives at Q along u1; handle lengths k0, k1 × chord
  function cub(P, u0, Q, u1, k0, k1) {
    var L = dist(P, Q), n0 = Math.hypot(u0[0], u0[1]), n1 = Math.hypot(u1[0], u1[1]);
    return [P[0] + u0[0] / n0 * k0 * L, P[1] + u0[1] / n0 * k0 * L, Q[0] - u1[0] / n1 * k1 * L, Q[1] - u1[1] / n1 * k1 * L, Q[0], Q[1]];
  }

  // ── stone metrics (pt). Ground, soffits, body sides, corbels, die, lip and plinth sit on the 0.5 grid. ──
  var S = {
    plinth: { hw: 5.25, top: 14.75, cap: 4.75, capY: 14.5 },  // lower base (하층기단): face, then a cap falling outward
    die: { hw: 4.25, top: 12.5, bot: 14.5 },              // upper base die (상층기단 면석)
    cap: { hw: 4.75, edge: 12.0, top: 11.75, flat: 2.75 }, // cover slab (갑석): 0.5 lip; the top falls 0.25 outward
    stories: [
      { body: 2.0, yU: 9.25, step: 0.25, thick: 1.3, R: 4.5, face: 0.6, lift: 0.2 },
      { body: 1.55, yU: 6.5, step: 0.25, thick: 1.15, R: 3.75, face: 0.56, lift: 0.18 },
      { body: 1.2, yU: 4.25, step: 0.2, thick: 1.0, R: 3.0, face: 0.52, lift: 0.16 }
    ],
    eave: { lean: 0.08, s0: 0.3, k0: 0.85, h1: 0.45, rise: 0.04, s1: 0.16, hM: [0.45, 0.35], flat: 0.6, tip: 0.45, hC: [0.32, 0.2] },
    fin: { tip: 1.0, bud: { w: 0.36, belly: 0.45, neck: 0.75 }, rings: [[2.1, 2.5, 0.5]],
      ringTop: 0.08, ringBot: 0.06, block: 0.62, blockTop: 2.85, shoulder: 0.15, mast: 0.25 }
  };
  if (typeof PAGODA_CFG === 'function') PAGODA_CFG(S);   // @exp hook (removed before shipping)
  function topOf(s) { return s.yU - s.thick; }

  // one roof stone, right half: from the foot of what stands on it, down the 낙수면 into the lifted corner, the slanted
  // cut end, the underside sweeping down into the flat soffit, one corbel step, the body below
  function roofGeo(s, above) {
    var E = S.eave, cx = s.body + 0.5;
    var A = [CX + above, topOf(s)];
    var Tb = [CX + s.R - E.lean, s.yU - s.lift], Tt = [CX + s.R, Tb[1] - s.face];
    var F = [CX + cx + E.flat * (s.R - E.lean - cx), s.yU];
    var M = [F[0], Tt[1] + E.rise], fall = M[1] - A[1], d0 = E.k0 * fall, w = Tt[0] - M[0];
    return {
      A: A, Tt: Tt, Tb: Tb, F: F, M: M, cx: CX + cx,
      top: [A[0] + d0 / E.s0, A[1] + d0, M[0] - E.h1 * (M[0] - A[0]), M[1], M[0], M[1]],
      lift: [M[0] + E.hM[0] * w, M[1], Tt[0] - E.hM[1] * w, Tt[1] + E.hM[1] * w * E.s1, Tt[0], Tt[1]],
      under: cub(Tb, [-1, E.tip], F, [-1, 0], E.hC[0], E.hC[1])
    };
  }
  function roofSegs(s, above) {
    var E = S.eave, cx = CX + s.body + 0.5;
    var A = [CX + above, topOf(s)];
    var Tb = [CX + s.R - E.lean, s.yU - s.lift], Tt = [CX + s.R, Tb[1] - s.face];
    var run = Tt[0] - A[0], fall = Tt[1] - A[1];
    var F = [cx + E.flat * (Tb[0] - cx), s.yU];
    return [
      // 낙수면: one gentle concave fall from the body above; it dips just under the tip line and lifts into the
      // corner (전각 반전) — a subtle lift, not a horn
      [A[0] + 0.3 * run, A[1] + 0.45 * fall, Tt[0] - 0.35 * run, Tt[1] - 0.12 * fall, Tt[0], Tt[1]],
      Tb,                                                  // slanted cut eave end
      [Tb[0] - 0.4 * (Tb[0] - F[0]), Tb[1] + 0.02, F[0] + 0.35 * (Tb[0] - F[0]), F[1], F[0], F[1]],   // soffit: flat, rising slightly at the tip
      [cx, s.yU],
      [cx, s.yU + s.step],                                 // one corbel step (층급받침)
      [CX + s.body, s.yU + s.step]
    ];
  }

  // 상륜부, right half from the jewel's tip down to the block's foot on the top roof
  function finialSegs(yFoot) {
    var F = S.fin, t = F.tip, m = F.mast, b = F.block, B = F.bud, yb = t + B.belly, yn = t + B.neck;
    // a turned ring (보륜): a disc whose faces slope gently from the mast to a crisp rim
    function ring(top, bot, hw) {
      var a = F.ringTop, c = F.ringBot, w = hw - m;
      return [[CX + m + 0.35 * w, top + a * 0.55, CX + hw - 0.2 * w, top + a, CX + hw, top + a],
        [CX + hw, bot - c], [CX + hw - 0.2 * w, bot - c, CX + m + 0.35 * w, bot - c * 0.55, CX + m, bot]];
    }
    var s = [
      // 보주: a flame-pointed jewel — a straight-ish shoulder off the sharp tip, a full belly, then a tuck into the neck
      [CX + 0.12, t + 0.12, CX + B.w, yb - 0.3, CX + B.w, yb],
      [CX + B.w, yb + 0.2, CX + m + 0.12, yn - 0.06, CX + m, yn],
      [CX + m, F.rings[0][0]]
    ];
    F.rings.forEach(function (R, i) {
      if (i) s.push([CX + m, R[0]]);
      s = s.concat(ring(R[0], R[1], R[2]));
    });
    var r = F.shoulder, k = 0.55;                                          // 노반 + 복발: the block's top corners round
    s.push([CX + m, F.blockTop]);                                          //   off into a low bowl shoulder
    s.push([CX + b - r, F.blockTop]);
    s.push([CX + b - r * (1 - k), F.blockTop, CX + b, F.blockTop + r * (1 - k), CX + b, F.blockTop + r]);
    s.push([CX + b, yFoot]);
    return s;
  }

  function stonePath() {
    var st = S.stories, s = finialSegs(topOf(st[2]));
    s = s.concat(roofSegs(st[2], S.fin.block));
    s.push([CX + st[2].body, topOf(st[1])]);                               // body 3
    s = s.concat(roofSegs(st[1], st[2].body));
    s.push([CX + st[1].body, topOf(st[0])]);                               // body 2
    s = s.concat(roofSegs(st[0], st[1].body));
    s.push([CX + st[0].body, S.cap.top]);                                  // body 1
    s.push([CX + S.cap.flat, S.cap.top]);                                  // 갑석: top, falling to the lip
    s.push([CX + S.cap.hw, S.cap.edge]);
    s.push([CX + S.cap.hw, S.die.top]);
    s.push([CX + S.die.hw, S.die.top]);                                    // die
    s.push([CX + S.die.hw, S.die.bot]);
    s.push([CX + S.plinth.cap, S.plinth.capY]);                            // lower base cap, falling outward
    s.push([CX + S.plinth.hw, S.plinth.top]);
    s.push([CX + S.plinth.hw, 16]);
    s.push([CX, 16]);
    return symPath([CX, S.fin.tip], s);
  }

  // carved corner pillars (우주): one 0.6 slot inside each corner of body 1 and of the die, one edge on the 2x grid
  function pillarCuts() {
    var c = '', w = 0.5, b1 = S.stories[0];
    function pair(x0, y0, y1) {
      c += cut(rectPath(x0, y0, w, y1 - y0, 0.05)) + cut(rectPath(mx(x0) - w, y0, w, y1 - y0, 0.05));
    }
    pair(7.5, 10.0, 11.5);                                                 // body 1: corner pillars (우주)
    // die: two recessed panels leave the corner pillars (우주) and a middle pillar (탱주) standing
    c += cut(rectPath(5.5, 12.85, 3.0, 0.75, 0.05)) + cut(rectPath(9.5, 12.85, 3.0, 0.75, 0.05));
    return c;
  }

  var STONE = stonePath(), CUTS = pillarCuts();

  // ── the outline, sampled once: it tells a flake exactly where the stone's top surface is ──
  function samplePath(d, step) {
    var segs = parsePath(d), pts = [], cur = [0, 0], start = [0, 0];
    segs.forEach(function (g) {
      var p = g.p;
      if (g.c === 'M') { cur = [p[0], p[1]]; start = cur; pts.push(cur); return; }
      if (g.c === 'Z') { pts.push(start); cur = start; return; }
      var end = [p[p.length - 2], p[p.length - 1]], n = Math.max(2, Math.ceil(dist(cur, end) * 1.6 / step));
      for (var k = 1; k <= n; k++) {
        var u = k / n, v = 1 - u;
        pts.push(g.c === 'L' ? mix(cur, end, u) : [v * v * v * cur[0] + 3 * v * v * u * p[0] + 3 * v * u * u * p[2] + u * u * u * p[4],
          v * v * v * cur[1] + 3 * v * v * u * p[1] + 3 * v * u * u * p[3] + u * u * u * p[5]]);
      }
      cur = end;
    });
    return pts;
  }
  var OUTLINE = samplePath(STONE, 0.03);
  function surfaceBelow(x, y) {                            // first stone surface under the point (x, y); else the ground
    var best = 16;
    for (var i = 1; i < OUTLINE.length; i++) {
      var a = OUTLINE[i - 1], b = OUTLINE[i];
      if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) {
        var yy = lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0]));
        if (yy >= y - 1e-6) best = Math.min(best, yy);
      }
    }
    return best;
  }
  function topY(x) { return surfaceBelow(x, -99); }
  function clearance(P) {                                  // distance from a polygon to the stone (0 when touching)
    var best = 99;
    for (var i = 0; i < OUTLINE.length; i += 2) for (var j = 0; j < P.length; j++) best = Math.min(best, dist(OUTLINE[i], P[j]));
    return best;
  }

  // ── snow crystals, as corner lists around their centre (rot in degrees; one arm points up at rot = 0) ──
  function armFrame(rot, k) {
    var a = (rot - 90 + 60 * k) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return function (u, v) { return [u * c - v * s, u * s + v * c]; };
  }
  function root(fn, a, b) {                                // bisection: fn(a) and fn(b) have opposite signs
    for (var i = 0; i < 40; i++) { var m = (a + b) / 2; if ((fn(a) < 0) === (fn(m) < 0)) a = m; else b = m; }
    return (a + b) / 2;
  }
  // six arms around a solid hexagonal core; `side(r)` draws one side (v < 0) of an arm from the valley out toward the
  // tip; the arm is mirrored onto its other side and repeated every 60°
  function sixArms(side, r, rot) {
    var s = side(r), out = [];
    for (var k = 0; k < 6; k++) {
      var P = armFrame(rot, k);
      s.forEach(function (p) { out.push(P(p[0], p[1])); });
      out.push(P(r, 0));
      for (var j = s.length - 1; j >= 1; j--) out.push(P(s[j][0], -s[j][1]));
    }
    return out;
  }
  // near crystal ❄ (stellar dendrite): arms taper from DEN.w at the core to a sharp tip along a slightly concave edge;
  // at DEN.at · r each carries a pair of thorn-shaped barbs, DEN.bw wide at the root and DEN.len long, that leave the
  // arm at DEN.ang toward the tip. The arm runs on well past the barbs, so the crystal reads as ❄, not as a burr.
  var DEN = { w: 0.62, taper: 1.0, at: 0.56, ang: 50, len: 0.4, bw: 0.26 };
  function dendriteSide(r) {
    var o = DEN, hw = function (u) { return o.w / 2 * Math.pow(Math.max(0, 1 - u / r), o.taper); };
    var rho = root(function (q) { return q / 2 - hw(q * 0.866); }, 0, r);           // valley on the bisector
    var q = Math.min(1, r / 1.3), th = o.ang * Math.PI / 180, ub = o.at * r, half = o.bw * q / 2 / Math.sin(th);
    var B = [ub, -hw(ub)], T = [B[0] + o.len * q * Math.cos(th), B[1] - o.len * q * Math.sin(th)];
    var pts = [[rho * 0.866, -rho * 0.5]], i;
    for (i = 1; i <= 2; i++) { var u1 = lerp(rho * 0.866, ub - half, i / 3); pts.push([u1, -hw(u1)]); }
    pts.push([ub - half, -hw(ub - half)], T, [ub + half, -hw(ub + half)]);
    for (i = 1; i <= 3; i++) { var u2 = lerp(ub + half, r, i / 4); pts.push([u2, -hw(u2)]); }
    return pts;
  }
  // small crystal: six slender lozenge arms, widest (SML.w) at SML.at · r, sharp tips, deep V valleys between them
  var SML = { w: 0.4, at: 0.36 };
  function smallSide(r) {
    var vr = SML.w / 2 / Math.tan(Math.PI / 6) * 0.5;                              // valley just inside the arms' shoulders
    return [[vr * 0.866, -vr * 0.5], [SML.at * r, -SML.w / 2]];
  }
  function dendrite(r, rot) { return sixArms(dendriteSide, r, rot); }
  function diamond(r, rot) { return sixArms(smallSide, r, rot); }
  // small crystal ✳: six plain arms, PLN.w wide at the core, tapering along a slightly full edge to a sharp tip
  var PLN = { w: 0.68, taper: 0.45 };
  function plainSide(r) {
    var hw = function (u) { return PLN.w / 2 * Math.pow(Math.max(0, 1 - u / r), PLN.taper); };
    var rho = root(function (q) { return q / 2 - hw(q * 0.866); }, 0, r), pts = [[rho * 0.866, -rho * 0.5]];
    for (var i = 1; i <= 4; i++) { var u = lerp(rho * 0.866, r, i / 5); pts.push([u, -hw(u)]); }
    return pts;
  }
  function crystal(F, rot) { return F.kind === 'near' ? dendrite(F.r, rot) : sixArms(plainSide, F.r, rot); }
  function place(pts, c, k) { return pts.map(function (p) { return [c[0] + p[0] * k, c[1] + p[1] * k]; }); }

  // ── flakes ──
  // s: birth frame; fall / rest / melt: frames; x0: lane while falling; x1: where it lands; dy: [height where it starts
  // to curve in from its lane, margin above its resting height where it has arrived over x1] (perchers); from: height of
  // its final approach (it is dropped from there onto the stone); rot / spin: turn at birth and over the fall (deg);
  // sw: flutter (pt); end: 'air' = it does not land but dissolves in the air at yEnd
  var FLAKES = [
    { id: 'TL', kind: 'small', r: 1.0, s: 47, fall: 23, melt: 5, end: 'air', yEnd: 4.9, x0: 4.3, x1: 4.1, rot: 18, spin: 40, sw: 0.12, seed: 3 },
    { id: 'TR', kind: 'small', r: 1.0, s: 30, fall: 22, melt: 5, end: 'air', yEnd: 4.9, x0: 13.7, x1: 13.9, rot: 42, spin: -40, sw: 0.12, seed: 5 },
    { id: 'PL', kind: 'small', r: 1.0, s: 6, fall: 23, rest: 5, melt: 9, x0: 3.0, x1: 4.15, dy: [6.6, 0.4], from: 7.3, rot: -20, spin: 50, sw: 0.14, seed: 7 },
    { id: 'PR', kind: 'small', r: 1.0, s: 59, fall: 23, rest: 5, melt: 9, x0: 15.0, x1: 13.85, dy: [6.6, 0.4], from: 7.3, rot: 80, spin: -50, sw: 0.14, seed: 11 },
    { id: 'NL', kind: 'near', r: 1.3, s: 33, fall: 46, melt: 4, end: 'air', yEnd: 13.0, x0: 2.4, x1: 2.2, rot: 0, spin: 90, sw: 0.16, seed: 13 },
    { id: 'NR', kind: 'near', r: 1.3, s: 15, fall: 46, melt: 4, end: 'air', yEnd: 13.0, x0: 15.6, x1: 15.8, rot: 30, spin: -90, sw: 0.16, seed: 17 }
  ];
  if (typeof SNOW_CFG === 'function') SNOW_CFG(FLAKES);   // @exp hook (removed before shipping)
  FLAKES.forEach(function (F) {
    var up = 0; crystal(F, F.rot).forEach(function (p) { up = Math.max(up, -p[1]); });
    F.y0 = 1.0 + up;                                       // born with its top arm on the live area's edge
    F.rest = F.rest || 0;
    if (F.end === 'air') { F.y1 = F.yEnd; F.cp = null; return; }
    // drop the crystal (turned as it lands) straight down at x1 from the height of its final approach: it rests where
    // its first corner touches the stone (or the ground)
    var shape = crystal(F, F.rot + F.spin), from = F.from || F.y0, y1 = 99, cp = null;
    shape.forEach(function (p) {
      var y = surfaceBelow(F.x1 + p[0], from + p[1]) - p[1];
      if (y < y1) { y1 = y; cp = [F.x1 + p[0], y + p[1]]; }
    });
    F.y1 = y1; F.cp = cp;
  });

  // where a flake is on frame tau (fractional frames allowed): null when it is not there
  function stateOf(F, tau) {
    var l = ((tau - F.s) % N + N) % N, n = F.fall, air = F.end === 'air';
    if (l >= n + (air ? 0 : F.rest + F.melt)) return null;
    if (l < n) {
      var u = l / n, y, k = 1, fadeOut = false;
      if (air) {                                             // falls evenly and dissolves in the air at the end
        y = lerp(F.y0, F.y1, u);
        var md = (l - (n - F.melt) + 1) / (F.melt + 1);
        if (md > 0) { k = 1 - smooth(md); fadeOut = l >= n - 2; }
      } else {                                               // even fall; only the last 3 frames ease, from v to 0.4 v
        var v = (F.y1 - F.y0) / (n - 0.9), tq = l - (n - 3);
        y = tq <= 0 ? F.y0 + v * l : F.y0 + v * (n - 3) + v * (tq - 0.1 * tq * tq);
      }
      var uq = air ? 1 : (n - 3) / n;                        // a lander's last 3 frames are a straight drop
      // a percher keeps to its lane until it is level with the eave above, then curves in around that corner as it
      // sinks (the drift follows its height, not the clock) and has arrived over its landing spot before the last 3 frames
      var lane = F.dy ? lerp(F.x0, F.x1, smooth((y - F.dy[0]) / (F.y1 - F.dy[1] - F.dy[0]))) : lerp(F.x0, F.x1, Math.min(1, u / uq));
      var x = lane + F.sw * noise(u * n / 32 + F.seed * 0.137, F.seed, 2) * Math.sin(Math.PI * Math.min(1, u / uq));
      return { mode: 'air', l: l, c: [x, y], k: k, rot: F.rot + F.spin * (1 - Math.pow(1 - u, 1.6)), fadeIn: l < 2, fadeOut: fadeOut };
    }
    var m = l < n + F.rest ? 0 : (l - n - F.rest + 1) / (F.melt + 1);   // rests intact, then melts into what it touched
    var c = mix([F.x1, F.y1], F.cp, smooth(m));
    return { mode: m > 0 ? 'melt' : 'rest', l: l, c: c, k: 1 - smooth(m), rot: F.rot + F.spin, fadeOut: l >= n + F.rest + F.melt - 2 };
  }
  function flakePoly(F, st) {
    var pts = crystal(F, st.rot);
    if (st.mode !== 'air') {                                 // shrink toward the contact point
      return pts.map(function (p) { return [F.x1 + p[0] + (F.cp[0] - F.x1 - p[0]) * (1 - st.k), F.y1 + p[1] + (F.cp[1] - F.y1 - p[1]) * (1 - st.k)]; });
    }
    return place(pts, st.c, st.k);
  }
  function drawFlake(F, tau) {
    var st = stateOf(F, tau);
    if (!st || st.k < 0.04) return '';
    var d = polyPath(flakePoly(F, st), true);
    return st.fadeIn || st.fadeOut || F.far ? fade(d) : front(d);
  }

  return {
    S: S, STONE: STONE, FLAKES: FLAKES, _roofGeo: roofGeo, _topOf: topOf, _topY: topY, _state: stateOf,
    _poly: flakePoly, _clear: clearance, _crystal: crystal, _DEN: DEN, _SML: SML,
    draw: function (t) {
      var tau = t * N, s = ink(STONE) + CUTS;
      FLAKES.forEach(function (F) { s += drawFlake(F, tau); });
      return s;
    }
  };
})();
