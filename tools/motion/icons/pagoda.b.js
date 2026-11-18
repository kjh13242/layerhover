// 석탑 (Stone pagoda) — variant B: elegance first.
// Bulguksa Seokgatap (불국사 삼층석탑): a two-tier base with carved pillars, three body stones, wide roof stones with a
// concave falling top, a stepped corbel and lifted corners, and a slender finial. Snow crystals drift down, settle on
// the pagoda as small lumps of snow, and melt into the stone. The pagoda itself is still.
var ICON = {
  id: "pagoda",
  frames: 64,
  at: function (t) { return PAGODA_B.draw(t); }
};

var PAGODA_B = (function () {
  var CX = 9;                                         // axis of symmetry
  function mx(x) { return 2 * CX - x; }

  // closed path symmetric about x = CX: starts on the axis at `start`, follows the right half (segments are [x, y]
  // lines or [x1, y1, x2, y2, x, y] cubics), ends on the axis, then runs the mirror image back.
  function sym(start, segs) {
    var d = 'M' + f(start[0]) + ' ' + f(start[1]), froms = [], cur = start, i;
    for (i = 0; i < segs.length; i++) {
      var s = segs[i];
      d += (s.length === 2 ? 'L' : 'C') + s.map(f).join(' ');
      froms.push(cur); cur = [s[s.length - 2], s[s.length - 1]];
    }
    for (i = segs.length - 1; i >= 0; i--) {
      var g = segs[i], fr = froms[i];
      if (g.length === 2) d += 'L' + f(mx(fr[0])) + ' ' + f(fr[1]);
      else d += 'C' + f(mx(g[2])) + ' ' + f(g[3]) + ' ' + f(mx(g[0])) + ' ' + f(g[1]) + ' ' + f(mx(fr[0])) + ' ' + f(fr[1]);
    }
    return d + 'Z';
  }
  // cubic from P to Q that leaves P along u0 and arrives at Q along u1; handle lengths k0, k1 × chord
  function cub(P, u0, Q, u1, k0, k1) {
    var L = dist(P, Q), n0 = Math.hypot(u0[0], u0[1]), n1 = Math.hypot(u1[0], u1[1]);
    return [P[0] + u0[0] / n0 * k0 * L, P[1] + u0[1] / n0 * k0 * L, Q[0] - u1[0] / n1 * k1 * L, Q[1] - u1[1] / n1 * k1 * L, Q[0], Q[1]];
  }

  // ── proportions (pt). Dominant horizontals and the verticals of the base and body 1 sit on the 0.5 grid. ──
  var G = {
    ground: 16,
    low: { hw: 5.5, top: 15.0 },                     // lower base (하층기단): face; its cap is a chamfer up to the upper face
    up: { hw: 4.5, bot: 14.5, top: 12.5 },            // upper base face (상층기단 면석)
    cap: { hw: 5.0, edge: 12.0, top: 11.8 },          // upper base cap (갑석): 0.5 overhang, gently sloped top
    // per story — yU: flat underside of the roof; body / R: half-widths of body and roof; slab: roof thickness at the
    // body above; step: corbel (층급받침) height; D: fall of the top towards the corner; flick: corner lift (전각 반전);
    // tip: thickness of the cut eave end; u: length of the underside's upward sweep into the corner
    stories: [
      { yU: 9.5, body: 2.5, R: 4.75, slab: 1.3, step: 0.4, D: 0.34, flick: 0.04, tip: 0.72, u: 1.5 },
      { yU: 7.0, body: 2.0, R: 4.15, slab: 1.2, step: 0.35, D: 0.31, flick: 0.04, tip: 0.68, u: 1.35 },
      { yU: 4.75, body: 1.5, R: 3.55, slab: 1.1, step: 0.3, D: 0.28, flick: 0.035, tip: 0.64, u: 1.2 }
    ],
    plinth: 0.28, cornerLen: 0.75, concave: 0.6,
    pillars: { cut: 0.6, corner: 1.0, mid: 1.0, body: 1.0, top: 0.3, bot: 0.15 },
    finialBlock: 0.85,
    flake: { w: 0.36, m: 0.5, vr: 0.17, dw: 0.115, db: 0.095 }
  };

  function layout() {
    var y = G.cap.top, out = [];
    for (var i = 0; i < 3; i++) {
      var s = G.stories[i], st = {};
      for (var k in s) st[k] = s[k];
      st.yB = y; st.yBT = s.yU + s.step;            // body bottom / top
      st.yT = s.yU - s.slab;                         // roof top where the next body stands
      y = st.yT; out.push(st);
    }
    for (var j = 0; j < 3; j++) out[j].bodyAbove = j < 2 ? out[j + 1].body : G.finialBlock;
    return out;
  }

  // ── base: lower plinth with chamfered shoulders, upper face, cap stone with a small overhang ──
  function basePath() {
    return sym([CX, G.cap.top], [
      [CX + 2.8, G.cap.top],
      [CX + G.cap.hw, G.cap.edge],
      [CX + G.cap.hw, G.up.top],
      [CX + G.up.hw, G.up.top],
      [CX + G.up.hw, G.up.bot],
      [CX + G.low.hw, G.low.top],
      [CX + G.low.hw, G.ground],
      [CX, G.ground]
    ]);
  }

  // ── roof stone (옥개석): from the small plinth under the next body, a concave falling top (낙수면) that sweeps out and
  // lifts into the corner (전각 반전); a slanted cut eave end; a flat underside that curves up into the corner; and a
  // two-step corbel (층급받침) down to the body. ──
  function roofGeo(st) {
    var R = CX + st.R;
    var A = [CX + st.bodyAbove + G.plinth, st.yT];          // where the top starts to fall
    var E = [R - G.cornerLen, st.yT + st.D];                 // reference for the mean slope of the fall
    var Tt = [R, E[1] - st.flick];                           // corner, top
    var Tb = [R - 0.1, Tt[1] + st.tip];                      // corner, bottom (the eave end leans out a touch)
    var F = [R - st.u, st.yU];                               // the underside is flat inward from here
    var top = cub(A, [1, (E[1] - A[1]) / (E[0] - A[0]) * (1 + G.concave)], Tt, [1, -0.14], 0.42, 0.3);
    return { A: A, Tt: Tt, Tb: Tb, F: F, top: top };
  }
  function roofPath(st) {
    var g = roofGeo(st), xs = CX + st.body + 0.5;
    return sym([CX, st.yT], [
      g.A,
      g.top,
      g.Tb,
      cub(g.Tb, [-1, 0.25], g.F, [-1, 0], 0.4, 0.45),
      [xs, st.yU],
      [xs, st.yU + st.step * 0.5],
      [xs - 0.25, st.yU + st.step * 0.5],
      [xs - 0.25, st.yBT + 0.02],
      [CX, st.yBT + 0.02]
    ]);
  }
  // height of a roof's top surface at x (either wing), read off the drawn curve
  function roofTop(st, x) {
    var g = roofGeo(st), dx = CX + Math.abs(x - CX), c = g.top, prev = g.A;
    if (dx <= g.A[0]) return st.yT;
    for (var i = 1; i <= 48; i++) {
      var u = i / 48, v = 1 - u;
      var q = [v * v * v * g.A[0] + 3 * v * v * u * c[0] + 3 * v * u * u * c[2] + u * u * u * c[4],
        v * v * v * g.A[1] + 3 * v * v * u * c[1] + 3 * v * u * u * c[3] + u * u * u * c[5]];
      if (q[0] >= dx) return lerp(prev[1], q[1], (dx - prev[0]) / ((q[0] - prev[0]) || 1));
      prev = q;
    }
    return g.Tt[1];
  }

  // ── 상륜부, one turned profile from the top down: 보주 (jewel bud), two 보륜 rings on a slender mast, 복발 (low
  // bowl), 노반 (block). ──
  function finialPath(y0) {
    function P(x, dy) { return [CX + x, y0 - dy]; }
    var b = G.finialBlock, m = 0.27;
    return sym(P(0, 2.5), [
      P(0.1, 2.36).concat(P(0.33, 2.2), P(0.33, 2.04)),          // jewel bud: a flame point that swells to a belly
      P(0.33, 1.95).concat(P(0.29, 1.89), P(m, 1.87)),            //   and tucks into the mast
      P(m, 1.76),
      P(0.36, 1.72).concat(P(0.6, 1.7), P(0.62, 1.64)),           // ring 1: soft top, crisp rim
      P(0.62, 1.58),
      P(0.58, 1.54).concat(P(0.36, 1.54), P(m, 1.5)),
      P(m, 1.38),
      P(0.36, 1.34).concat(P(0.7, 1.32), P(0.72, 1.25)),          // ring 2
      P(0.72, 1.19),
      P(0.68, 1.15).concat(P(0.4, 1.15), P(0.3, 1.1)),
      P(0.3, 1.0),
      P(0.5, 0.98).concat(P(0.66, 0.86), P(0.66, 0.6)),           // low bowl
      P(0.66, 0.45),
      P(b, 0.45),                                                  // block
      P(b, -0.05),
      P(0, -0.05)
    ]);
  }

  function pagoda(L) {
    var s = ink(basePath()), c = '';
    L.forEach(function (st) {
      s += ink(rectPath(CX - st.body, st.yBT, 2 * st.body, st.yB - st.yBT + 0.05, 0));
      s += ink(roofPath(st));
    });
    s += ink(finialPath(L[2].yT));
    // carved pillars (우주 · 탱주) as thin cuts, mirrored: the upper base face shows its corner pillars and a middle
    // pillar, body 1 its corner pillars. (Bodies 2 and 3 are under 1 pt tall — cuts there read as holes, so they stay
    // plain.)
    function slot(x0, x1, y0, y1) {
      c += cut(rectPath(x0, y0, x1 - x0, y1 - y0, 0)) + cut(rectPath(mx(x1), y0, x1 - x0, y1 - y0, 0));
    }
    var P = G.pillars, cw = P.cut, y0 = G.up.top + P.top, y1 = G.up.bot - P.bot, b1 = L[0];
    slot(CX - G.up.hw + P.corner, CX - G.up.hw + P.corner + cw, y0, y1);
    slot(CX - P.mid / 2 - cw, CX - P.mid / 2, y0, y1);
    slot(CX - b1.body + P.body, CX - b1.body + P.body + cw, b1.yBT + 0.2, b1.yB - 0.2);
    return s + c;
  }

  // ── snow ──
  // Crystals are corner lists in angular order, so a crystal can sink into a lump of snow corner by corner.
  // 'dendrite': six slim arms, each with a pair of short side branches and a sharp tip — the classic snow star (near).
  // otherwise: six diamond arms (widest a little inside the middle, sharp tips) meeting in narrow V valleys (small).
  function flakeVerts(x, y, r, rot, kind) {
    var out = [];
    function P(a, u, v) { var c = Math.cos(a), s = Math.sin(a); return [x + c * u - s * v, y + s * u + c * v]; }
    for (var k = 0; k < 6; k++) {
      var a = (rot - 90 + 60 * k) * Math.PI / 180;
      if (kind === 'dendrite') {
        var hw = G.flake.dw * r, bp = 0.5 * r, bl = 0.3 * r, bw = G.flake.db * r, cb = 0.5, sb = 0.866;
        out.push(P(a - Math.PI / 6, 0.18 * r, 0), P(a, bp - bw, -hw), P(a, bp - bw + bl * cb, -hw - bl * sb), P(a, bp + bw, -hw),
          P(a, r * 0.86, -hw * 0.9), P(a, r, 0), P(a, r * 0.86, hw * 0.9),
          P(a, bp + bw, hw), P(a, bp - bw + bl * cb, hw + bl * sb), P(a, bp - bw, hw));
      } else {
        var w = G.flake.w * r, m = G.flake.m * r;
        out.push(P(a - Math.PI / 6, G.flake.vr * r, 0), P(a, m, -w / 2), P(a, r, 0), P(a, m, w / 2));
      }
    }
    return out;
  }
  // the same corners laid onto a low lump of snow (a half lens with a full crown) that sits on a surface at foot F,
  // tilted to the surface by ang
  function lumpVerts(vs, c, F, w, h, ang) {
    var ca = Math.cos(ang), sa = Math.sin(ang);
    return vs.map(function (v) {
      var phi = Math.atan2(v[1] - c[1], v[0] - c[0]), ex = Math.cos(phi), ey = Math.sin(phi);
      var px = ex * w / 2, py = ey < 0 ? ey * h * Math.pow(Math.abs(ey), -0.15) : 0.1 * ey;
      return [F[0] + px * ca - py * sa, F[1] + px * sa + py * ca];
    });
  }
  // even-speed position along a smooth (Catmull-Rom) curve through the way points; s from 0 to 1
  function track(pts) {
    var P = [], Ls = [0], i, j;
    for (i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (j = 0; j < 14; j++) {
        var u = j / 14, u2 = u * u, u3 = u2 * u;
        P.push([0, 1].map(function (q) {
          return 0.5 * (2 * p1[q] + (p2[q] - p0[q]) * u + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * u2 + (3 * p1[q] - p0[q] - 3 * p2[q] + p3[q]) * u3);
        }));
      }
    }
    P.push(pts[pts.length - 1].slice());
    for (i = 1; i < P.length; i++) Ls.push(Ls[i - 1] + dist(P[i - 1], P[i]));
    var T = Ls[Ls.length - 1];
    return function (s) {
      var want = clamp(s) * T, k = 1;
      while (k < Ls.length - 1 && Ls[k] < want) k++;
      return mix(P[k - 1], P[k], clamp((want - Ls[k - 1]) / ((Ls[k] - Ls[k - 1]) || 1)));
    };
  }
  // lowest arm tip below the centre, for a crystal of radius r turned by rot
  function footOf(r, rot) {
    var m = -1;
    for (var k = 0; k < 6; k++) m = Math.max(m, Math.sin((rot - 90 + 60 * k) * Math.PI / 180));
    return r * m;
  }
  // a surface a crystal can settle on: [x, y of the surface at x]
  function ledge(kind, x, L) {
    if (kind === 'cap') return [x, lerp(G.cap.top, G.cap.edge, clamp((Math.abs(x - CX) - 2.8) / (G.cap.hw - 2.8)))];
    return [x, roofTop(L[{ r1: 0, r2: 1, r3: 2 }[kind]], x)];
  }

  // Each crystal runs on its own clock u = (t + ph) mod 1. It grows in near the top, drifts down its track at an even
  // pace with a soft flutter and a slow turn, and eases onto its ledge at u = land. There it settles — the arms draw in
  // and the snow spreads into a low lump that sits on the stone — rests, and melts (it shrinks and flattens into the
  // stone; the last frames are translucent). The far crystal is translucent, smaller and slower and dissolves in the
  // air. Phases are chosen so the four touch-downs are spread through the loop, crystals never crowd each other, three
  // to five are visible at a time, and frame 0 shows four of them in the air.
  var FLAKES = [
    // near: down the left side, tucks under the first roof's eave and settles on the base cap
    { r: 1.0, kind: 'dendrite', pts: [[2.7, 2.3], [2.45, 5.6], [2.6, 8.9], [3.75, 10.62]], to: ['cap', 5.1], rest: 5, ph: 0.425, land: 0.7, rot: 8, spin: 62, fl: [0.26, 1.3, 0.1] },
    // near: down the right side, ducks under the first roof's eave corner and settles on the base cap
    { r: 0.9, kind: 'dendrite', pts: [[15.3, 2.1], [15.55, 5.0], [15.45, 8.6], [14.6, 10.55]], to: ['cap', 13.0], rest: 5, ph: 0.075, land: 0.7, rot: -12, spin: -50, fl: [0.22, 1.1, 0.6] },
    // small: long wind-blown drifts across the top onto the top roof's wings
    { r: 0.78, pts: [[16.0, 1.85], [14.6, 2.15], [13.0, 2.6]], to: ['r3', 11.7], rest: 4, ph: 0.5, land: 0.55, rot: 18, spin: 70, fl: [0.12, 0.9, 0.3] },
    { r: 0.72, pts: [[3.4, 1.8], [4.6, 2.05], [5.6, 2.55]], to: ['r3', 6.35], rest: 4, ph: 0.125, land: 0.55, rot: -20, spin: -60, fl: [0.1, 0.8, 0.8] },
    // far: translucent, drifts down the right edge and dissolves low
    { r: 0.66, pts: [[16.2, 5.2], [16.0, 9.6], [16.2, 14.0]], ph: 0.725, land: 0.6, rot: 0, spin: -40, far: true, fl: [0.16, 1.2, 0.2] }
  ];
  function crystal(F, t, L) {
    if (!F.at) {                                              // complete the track with the resting point on the ledge
      var pts = F.pts.slice();
      if (F.to) {
        var E = ledge(F.to[0], F.to[1], L), E0 = ledge(F.to[0], F.to[1] - 0.3, L), E1 = ledge(F.to[0], F.to[1] + 0.3, L);
        F.foot = [E[0], E[1] + 0.06]; F.ang = Math.atan2(E1[1] - E0[1], E1[0] - E0[0]);
        pts.push([E[0], E[1] - footOf(F.r, F.rot + F.spin)]);
      }
      F.at = track(pts);
    }
    var born = 4 / 64, u = wrap01(t + F.ph), grow = smooth(clamp(u / born));
    var slump = F.to ? (F.kind ? 5 : 4) / 64 : 0, melt = (F.to ? 6 : 5) / 64;
    var tM = F.land + slump + (F.to ? F.rest / 64 : 0);
    if (u >= tM + melt || grow <= 0) return '';
    var v = clamp(u / F.land), e = clamp((v - 0.88) / 0.12);  // even fall; the last stretch eases out, speed-matched
    var s = v < 0.88 ? v / 0.88 * 0.935 : 0.935 + 0.065 * e * (2 - e);
    var p = F.at(s), rot = F.rot + F.spin * s;
    var c = [p[0] + F.fl[0] * Math.sin(TAU * (F.fl[1] * s + F.fl[2])) * (1 - smooth(clamp((s - 0.7) / 0.3))), p[1]];
    var vs = flakeVerts(c[0], c[1], F.r * (0.3 + 0.7 * grow), rot, F.kind), faint = u < born / 2;
    if (u >= F.land) {
      var m = smooth(clamp((u - tM) / melt));
      if (F.to) {                                             // settle: the arms draw in, then the snow spreads
        var k = smooth(clamp((u - F.land) / slump)), k1 = smooth(clamp(k * 2)), k2 = smooth(clamp(k * 2 - 1));
        var lump = lumpVerts(vs, c, F.foot, 1.75 * F.r, 0.3 * F.r, F.ang);
        var low = vs.reduce(function (a, q) { return q[1] > a[1] ? q : a; }, vs[0]);
        vs = vs.map(function (q, i) {
          var small = mix(F.foot, lump[i], 0.38 + 0.62 * k2);
          return k2 > 0 ? small : mix(mix(low, q, 1 - 0.62 * k1), small, k1);
        });
        vs = vs.map(function (q) {                            // melt: the lump shrinks and flattens into the stone
          return [F.foot[0] + (q[0] - F.foot[0]) * (1 - 0.8 * m), F.foot[1] + (q[1] - F.foot[1]) * (1 - 0.9 * m)];
        });
        faint = clamp((u - tM) / melt) > 0.65;
      } else {                                                // dissolve in the air
        var md = smooth(clamp((u - F.land) / melt));
        vs = vs.map(function (q) { return mix(c, q, 1 - 0.8 * md); });
      }
    }
    var d = polyPath(vs, true);
    return F.far || faint ? fade(d) : front(d);
  }

  return {
    draw: function (t) {
      var L = layout();
      return pagoda(L) + FLAKES.map(function (F) { return crystal(F, t, L); }).join('');
    }
  };
})();
