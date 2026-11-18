// 연꽃 (Lotus) — a lotus floating on still water.
// A tall centre petal with an ogee point, two side petals that hug it one clean seam away, and two outer
// crescent petals that cup the bloom: each crescent's inner edge runs one gap off its side petal and
// leaves it tangentially in one concave sweep up to the horn tip, so every overlap is a tangent
// hand-over, never a corner. The water is a single calligraphic stroke on the ground line.
// Motion (option A): the bloom breathes out, gathers into a pointed bud (the seams close below its tip,
// the crescents cup its base) and unfurls again; the outer petals wrap last and open first, everything
// overshoots a little, the flower bobs on the water and a ripple runs out along the surface.
// Every frame is built by the same construction from a blend of two key poses (BLOOM, BUD).
var ICON = (function () {
  var FRAMES = 56, GAP = 0.8, GAP_O = 0.9, LIFT = 0.35;

  function P(q) { return f(q[0]) + ' ' + f(q[1]); }
  function M(q) { return 'M' + P(q); }
  function Lto(q) { return 'L' + P(q); }
  function C3(a, b, c) { return 'C' + P(a) + ' ' + P(b) + ' ' + P(c); }
  function add(p, v) { return [p[0] + v[0], p[1] + v[1]]; }
  function sub(p, q) { return [p[0] - q[0], p[1] - q[1]]; }
  function scl(v, k) { return [v[0] * k, v[1] * k]; }
  function unit(v) { var l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
  function turn(v, deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; }
  function MX(x, y) { return [18 - x, y]; }
  // Catmull-Rom through pts as cubic segments, starting from the current point pts[0]
  function crv(pts) {
    var d = '', n = pts.length;
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      d += C3([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2);
    }
    return d;
  }
  // cubic Hermite run through pts with unit tangents tans (in the direction of travel)
  function herm(pts, tans) {
    var d = '';
    for (var i = 0; i < pts.length - 1; i++) {
      var h = dist(pts[i], pts[i + 1]) / 3;
      d += C3(add(pts[i], scl(tans[i], h)), sub(pts[i + 1], scl(tans[i + 1], h)), pts[i + 1]);
    }
    return d;
  }
  function bez(p0, p1, p2, p3, n) {
    var out = [];
    for (var i = 1; i <= n; i++) {
      var u = i / n, v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
      out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
    }
    return out;
  }
  // unit tangents of a run by central differences
  function tangents(R) {
    var n = R.length - 1, out = [];
    for (var i = 0; i <= n; i++) out.push(unit(sub(R[Math.min(n, i + 1)], R[Math.max(0, i - 1)])));
    return out;
  }

  // ── the centre petal ─────────────────────────────────────────────────────────────────────────
  // Grown up a vertical spine from the claw (x, y): a claw b wide flares into a full belly W at p, then
  // an ogee run draws it out to a crisp point (m: slope at the tip; smaller = finer). Flanks base → tip.
  function centre(o) {
    var N = 24, L = [], R = [], W = o.W, p = o.p, b = o.b, m = o.m * W;
    for (var j = 0; j <= N; j++) {
      var s = j / N, w;
      if (s <= p) { var u = s / p; w = (2 * u * u * u - 3 * u * u + 1) * b + (u * u * u - 2 * u * u + u) * o.fl * W + (3 * u * u - 2 * u * u * u) * W; }
      else { var v = (s - p) / (1 - p); w = W * (2 * v * v * v - 3 * v * v + 1) - m * (v * v * v - v * v); }
      L.push([o.x - w / 2, o.y - o.L * s]); R.push([o.x + w / 2, o.y - o.L * s]);
    }
    return { L: L, R: R, d: M(L[0]) + crv(L) + Lto(R[N]) + crv(R.slice().reverse()) + 'Z' };
  }
  // a point on a flank (base → tip) at fraction s, pushed out by d (out = +1: to the left of travel)
  function along(S, s, out, d) {
    var n = S.length - 1, x = clamp(s) * n, i = Math.min(n - 1, Math.floor(x)), p = mix(S[i], S[i + 1], x - i);
    var tx = S[i + 1][0] - S[i][0], ty = S[i + 1][1] - S[i][1], tl = Math.hypot(tx, ty) || 1;
    return [p[0] + out * ty / tl * d, p[1] - out * tx / tl * d];
  }
  // the far side of a clean gap along a flank S (base → tip): the flank pushed out by the gap width
  // wf(s) at the fraction s of its length
  function offRun(S, out, wf) {
    var n = S.length - 1, T = tangents(S), pts = [];
    for (var i = 0; i <= n; i++) {
      var w = wf(i / n);
      pts.push([S[i][0] + out * T[i][1] * w, S[i][1] - out * T[i][0] * w]);
    }
    return pts;
  }
  // the gap itself, carved out of whatever lies behind the flank
  function band(S, out, wf) {
    var T = tangents(S), inner = S.map(function (q, i) { return [q[0] - out * T[i][1] * 0.03, q[1] + out * T[i][0] * 0.03]; });
    var ro = offRun(S, out, wf).reverse();
    return M(inner[0]) + crv(inner) + Lto(ro[0]) + crv(ro) + 'Z';
  }
  // the seam between the centre and a side petal (0..1 of a full gap along the centre flank): it opens
  // from nothing at the claw, so the petals grow out of one cup; as the bloom closes (kc → 1) it also
  // closes again below the tips, so the bud is one silhouette with two seams in it
  function seam(o) {
    return function (s) { return smooth(s / 0.25) * (1 - o.kc * (1 - smooth((o.st - o.sc - s) / o.zc))); };
  }
  // where a gap has closed, the petal behind tucks (by up to 0.15) under the one in front, so no two
  // edges ever just touch
  function tuck(w, full, deep) { return w * full - 0.15 * deep * (1 - w); }
  function outGap(s) { return tuck(smooth(s / 0.3), GAP_O, 1); }

  // ── the side petal hugs the centre petal: its inner edge runs exactly one seam off the centre
  // petal's flank and ends on it in a clean point at st; its outer edge swells out to the belly Bp and
  // sweeps back into the cup at Pb. Returns the path and the outer edge (base → tip), finely sampled.
  function side(Cl, o) {
    var inner = [], sw = seam(o);
    for (var i = 0; i <= 14; i++) { var s = o.st * i / 14; inner.push(along(Cl, s, 1, tuck(sw(s), GAP - 0.04, clamp((o.st - s) / 0.12)))); }
    var T = inner[14], c1 = add(T, o.t1), c2 = [o.Bp[0], o.Bp[1] - o.b1], c3 = [o.Bp[0], o.Bp[1] + o.b2], c4 = add(o.Pb, o.p1);
    var edge = [T].concat(bez(T, c1, c2, o.Bp, 28), bez(o.Bp, c3, c4, o.Pb, 28)).reverse();
    return { d: M(inner[0]) + crv(inner) + C3(c1, c2, o.Bp) + C3(c3, c4, o.Pb) + 'Z', edge: edge };
  }

  // ── the outer petal: a crescent that cups the bloom. Its lower edge leaves the bottom centre B0 level,
  // so the two mirrored halves always meet in one smooth bowl, and sweeps out and up to the horn tip.
  // Its inner edge is rebuilt from the side petal in every frame: from the cup it runs exactly one gap
  // off the side petal's outer edge, and at the release point R it leaves that gap tangentially in one
  // concave sweep up to the tip. The tip is the free point Tf blended (by w) toward the point sT on the
  // gap, so in the bud the cup ends on the gap in a clean point, and no tip ever slides behind a petal.
  var B0 = [9.05, 14.85];
  function outer(o, Sedge) {
    var Off = offRun(Sedge, 1, outGap), Tn = tangents(Off), Ls = [0];
    for (var i = 1; i < Off.length; i++) Ls.push(Ls[i - 1] + dist(Off[i - 1], Off[i]));
    function at(s) {
      var x = clamp(s) * Ls[Ls.length - 1], j = 0;
      while (j < Off.length - 2 && Ls[j + 1] < x) j++;
      var u = (x - Ls[j]) / ((Ls[j + 1] - Ls[j]) || 1);
      return { p: mix(Off[j], Off[j + 1], u), t: unit(mix(Tn[j], Tn[j + 1], u)), j: j };
    }
    var T = mix(o.Tf, at(o.sT).p, o.w), sR = o.sT;
    // R: the point of the gap that a line from the tip just touches on its way down to the cup (the
    // first sign change of the cross product, searched up from the cup), then a touch further down so
    // the sweep lands on the gap from a concave curve
    if (o.w < 0.999) {
      var prev = null, n = 90;
      for (var q = 0; q <= n; q++) {
        var s = 0.75 * q / n, A = at(s), v = sub(A.p, T), c = v[0] * A.t[1] - v[1] * A.t[0];
        if (prev !== null && prev > 0 && c <= 0) { sR = s + 0.75 / n * c / (prev - c); break; }
        prev = c;
      }
      sR = Math.max(0.02, sR - o.dR);
    }
    var R = at(sR), cl = dist(T, R.p);
    // one concave sweep: it leaves the tip a little steeper than the chord and lands on the gap along it
    // (none at all once the tip sits on the gap)
    var up1 = add(T, scl(turn(unit(sub(R.p, T)), o.a1), o.h1 * cl)), up2 = add(R.p, scl(R.t, o.h2 * cl));
    var sweep = cl > 0.01 ? C3(up1, up2, R.p) : '';
    // from R back down the gap to the cup
    var pts = [R.p], tans = [scl(R.t, -1)];
    for (var j = R.j; j >= 0; j--) {
      if (dist(Off[j], pts[pts.length - 1]) < 0.12) continue;
      pts.push(Off[j]); tans.push(scl(Tn[j], -1));
    }
    var base = pts[pts.length - 1];
    return {
      d: M(B0) + C3(o.lo1, o.lo2, T) + sweep + herm(pts, tans) + Lto([B0[0], base[1]]) + 'Z',
      T: T, R: R.p
    };
  }

  // ── the water: one calligraphic stroke on the ground line — full weight through the middle under the
  // bloom, easing (sine) to needle points at both ends. A ripple opens breaks in it: each break is a
  // gap of half-width g at x = b whose ends taper like brush-stroke ends (depth k: 0 = no break).
  function water(x0, x1, y, th, breaks) {
    var n = 96, prof = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n, x = lerp(x0, x1, u), e = Math.min(u, 1 - u) / 0.3, h = th / 2 * (e >= 1 ? 1 : Math.sin(Math.PI / 2 * e));
      for (var q = 0; q < breaks.length; q++) {
        var B = breaks[q], dd = (Math.abs(x - B.b) - B.g) / B.tau;
        h *= 1 - B.k * (1 - (dd <= 0 ? 0 : dd >= 1 ? 1 : Math.sin(Math.PI / 2 * dd)));
      }
      prof.push([x, h]);
    }
    // split into pieces where the stroke has thickness, each closed through its pointed ends
    var d = '', run = [];
    function flush() {
      if (run.length >= 3) {
        var up = run.map(function (p) { return [p[0], y - p[1]]; }), dn = run.map(function (p) { return [p[0], y + p[1]]; }).reverse();
        d += M(up[0]) + crv(up) + crv(dn) + 'Z';
      }
      run = [];
    }
    for (i = 0; i <= n; i++) {
      var hh = prof[i][1];
      if (hh > 0.004) {
        if (!run.length && i > 0) run.push(exactEnd(prof[i - 1], prof[i]));
        run.push(prof[i]);
      } else if (run.length) { run.push(exactEnd(prof[i], prof[i - 1])); flush(); }
    }
    flush();
    return d;
  }
  // where the thickness reaches zero between a station with none (a) and one with some (b)
  function exactEnd(a, b) { var k = clamp((0.004 - a[1]) / ((b[1] - a[1]) || 1)); return [lerp(a[0], b[0], k), 0]; }

  function pose(A, B, k) { var o = {}; for (var q in A) o[q] = typeof A[q] === 'number' ? lerp(A[q], B[q], k) : mix(A[q], B[q], k); return o; }

  // ── key poses (left half; the right half is its mirror) ───────────────────────────────────────
  var BLOOM = {
    C: { x: 9, y: 14.2, L: 11.7, W: 4.3, p: 0.44, b: 1.3, fl: 0.9, m: 0.9 },
    S: { st: 0.72, t1: [-0.5, 1.8], Bp: [3.9, 10.4], b1: 2.4, b2: 1.6, Pb: [8.3, 13.1], p1: [-2.6, 0], sc: 0.1, zc: 0.35 },
    O: { lo1: [5.4, 14.85], lo2: [1.9, 14.75], Tf: [1.5, 10.4], w: 0, sT: 0.27, dR: 0.06, a1: 14, h1: 0.4, h2: 0.18 }
  };
  var BUD = {
    C: { x: 9, y: 14.2, L: 11.8, W: 3.2, p: 0.40, b: 1.3, fl: 0.9, m: 1.1 },
    S: { st: 1.0, t1: [-1.1, 1.75], Bp: [5.15, 9.45], b1: 2.6, b2: 1.9, Pb: [8.3, 13.3], p1: [-1.5, 0], sc: 0.18, zc: 0.32 },
    O: { lo1: [6.6, 14.85], lo2: [4.6, 14.3], Tf: [1.5, 10.4], w: 1, sT: 0.27, dR: 0, a1: 0, h1: 0.4, h2: 0.18 }
  };

  function scene(kC, kS, kO, bob, breaks) {
    // the seams close (kc) a little ahead of the side petals, so their tips fold into the bud instead
    // of standing beside it as claws
    var oS = pose(BLOOM.S, BUD.S, kS); oS.kc = smooth((kS - 0.1) / 0.65);
    var C = centre(pose(BLOOM.C, BUD.C, kC)), S = side(C.L, oS), O = outer(pose(BLOOM.O, BUD.O, kO), S.edge);
    var sw = seam(oS), wf = function (q) { return GAP * sw(q); };
    var s = ink(O.d) + ink(O.d, MX) + ink(S.d) + ink(S.d, MX);
    s += cut(band(C.L, 1, wf)) + cut(band(C.R, -1, wf));    // the centre petal in front of all
    s += front(C.d);
    return xf(move(0, -LIFT + bob), s) + ink(water(1.2, 16.8, 16.0, 1.0, breaks));
  }

  return {
    id: "lotus",
    frames: FRAMES,
    at: function (t) {
      // breath out: the side petals spread a little, right before they gather
      var pre = Math.pow(pulse(t, 0.13, 0.35), 2);
      var back = function (s) { return function (x) { return easeOutBack(smoother(x), s); }; };
      // close: the side petals lead, the centre narrows with them, the outer petals wrap a beat later;
      // hold the bud; open the other way round, each with a little overshoot
      var kS = -0.35 * pre + seg(t, 0.26, 0.48, smoother) - seg(t, 0.68, 0.92, back(1.6));
      var kC = seg(t, 0.27, 0.49, smoother) - seg(t, 0.67, 0.91, smoother);
      var kO = -0.08 * pre + seg(t, 0.30, 0.52, smoother) - seg(t, 0.65, 0.88, back(1.9));
      // the bloom settles into the water and floats back up: a dip, a rise past rest, rest
      var s2 = function (a, b) { var u = (t - a) / (b - a); return u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 2) : 0; };
      var bob = 0.4 * s2(0.77, 0.92) - 0.15 * s2(0.88, 0.995);
      // one ripple: two breaks open just outside the bowl and run outward while they close
      // (born as the bloom presses down; each break is a clean gap between two brush ends, and heals
      // as it slows down)
      var breaks = [], ph = (t - 0.82) / 0.15;
      if (ph > 0 && ph < 1) {
        var bx = lerp(6.3, 4.8, easeOut(ph));
        var g = 0.45 * smooth(ph / 0.12) * Math.pow(1 - ph, 1.6);
        var k = smooth(g / 0.1);
        breaks.push({ b: bx, g: g, tau: 1.1, k: k }, { b: 18 - bx, g: g, tau: 1.1, k: k });
      }
      return scene(kC, kS, kO, bob, breaks);
    }
  };
})();
