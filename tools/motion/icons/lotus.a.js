// 연꽃 (Lotus) — variant A: recognisability first.
// A lotus floating on still water: a tall centre petal with an ogee point, two side petals that hug it
// one clean gap away, two outer petals sweeping out into a boat-shaped bowl, and a calm water line.
// Motion (option A): the bloom gathers into a slender bud and unfurls again. Every frame is drawn by the
// same crafted construction, blended between two key poses (full bloom, closed bud).
var ICON = (function () {
  var FRAMES = 56, GAP = 0.8;

  function P(q) { return f(q[0]) + ' ' + f(q[1]); }
  function M(q) { return 'M' + P(q); }
  function Lto(q) { return 'L' + P(q); }
  function C3(a, b, c) { return 'C' + P(a) + ' ' + P(b) + ' ' + P(c); }
  // Catmull-Rom through pts as cubic segments, starting from the current point pts[0]
  function crv(pts) {
    var d = '', n = pts.length;
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      d += C3([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2);
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
  function add(p, v) { return [p[0] + v[0], p[1] + v[1]]; }
  function MX(x, y) { return [18 - x, y]; }

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
  // the clean gap that sets a petal in front of the ones behind it: a band hugging the outside of a
  // flank (base → tip), opening from nothing at the base to GAP by the fraction `open` of its length,
  // so the petals still grow out of one cup
  function band(S, out, open) {
    var n = S.length - 1, inner = [], outer = [];
    for (var i = 0; i <= n; i++) {
      var a = S[Math.max(0, i - 1)], b = S[Math.min(n, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      var nx = out * ty / tl, ny = -out * tx / tl, w = GAP * smooth(i / n / open);
      inner.push([S[i][0] - nx * 0.03, S[i][1] - ny * 0.03]);
      outer.push([S[i][0] + nx * w, S[i][1] + ny * w]);
    }
    var ro = outer.reverse();
    return M(inner[0]) + crv(inner) + Lto(ro[0]) + crv(ro) + 'Z';
  }

  // ── the side petal hugs the centre petal: its inner edge runs exactly one gap off the centre
  // petal's flank (closing toward the claw like the band) and ends on it in a clean point at st; its
  // outer edge swells out to the belly Bp and sweeps back into the cup at Pb.
  // Returns the path and the outer edge (base → tip) for the gap in front of the outer petal.
  function side(Cl, o) {
    var inner = [];
    for (var i = 0; i <= 14; i++) { var s = o.st * i / 14; inner.push(along(Cl, s, 1, (GAP - 0.04) * smooth(s / 0.25))); }
    var T = inner[14], c1 = add(T, o.t1), c2 = [o.Bp[0], o.Bp[1] - o.b1], c3 = [o.Bp[0], o.Bp[1] + o.b2], c4 = add(o.Pb, o.p1);
    var edge = [T].concat(bez(T, c1, c2, o.Bp, 10), bez(o.Bp, c3, c4, o.Pb, 10)).reverse();
    return { d: M(inner[0]) + crv(inner) + C3(c1, c2, o.Bp) + C3(c3, c4, o.Pb) + 'Z', edge: edge };
  }

  // ── the outer petal: a crescent that cups the bloom. Its lower edge leaves the bottom centre B0
  // level, so the two mirrored halves always meet in one smooth bowl; it sweeps out and turns up to the
  // tip T, and its upper edge slips under the side petal's gap.
  var B0 = [9.05, 15.05];
  function outer(o) {
    return M(B0) + C3(o.lo1, o.lo2, o.T) + C3(o.up1, o.up2, o.U) + Lto([B0[0], o.U[1]]) + 'Z';
  }

  // the still water: a long stroke that swells gently in the middle and draws out to fine points
  function water(x0, x1, y, th) {
    var up = [], dn = [], n = 24;
    for (var i = 0; i <= n; i++) {
      var u = -1 + 2 * i / n, x = lerp(x0, x1, i / n), h = th / 2 * Math.pow(1 - Math.pow(Math.abs(u), 5), 0.8);
      up.push([x, y - h]); dn.push([x, y + h]);
    }
    return M(up[0]) + crv(up) + crv(dn.reverse()) + 'Z';
  }

  function pose(A, B, k) { var o = {}; for (var q in A) o[q] = typeof A[q] === 'number' ? lerp(A[q], B[q], k) : mix(A[q], B[q], k); return o; }

  // ── key poses (left half; the right half is its mirror) ───────────────────────────────────────
  var BLOOM = {
    C: { x: 9, y: 14.2, L: 11.7, W: 4.3, p: 0.44, b: 1.3, fl: 0.9, m: 0.9 },
    S: { st: 0.72, t1: [-0.5, 1.8], Bp: [3.9, 10.4], b1: 2.4, b2: 1.6, Pb: [8.3, 13.1], p1: [-2.6, 0] },
    O: { lo1: [5.4, 15.05], lo2: [1.9, 14.95], T: [1.5, 10.4], up1: [2.0, 10.9], up2: [3.0, 12.3], U: [8.6, 12.8] }
  };
  var BUD = {
    C: { x: 9, y: 14.2, L: 12.3, W: 3.3, p: 0.40, b: 1.3, fl: 0.9, m: 1.1 },
    S: { st: 0.79, t1: [-1.4, 1.1], Bp: [5.1, 9.65], b1: 2.5, b2: 1.8, Pb: [8.3, 13.3], p1: [-1.5, 0] },
    O: { lo1: [6.6, 15.05], lo2: [4.0, 14.7], T: [5.25, 11.1], up1: [5.6, 11.6], up2: [6.7, 12.2], U: [8.6, 12.4] }
  };

  function scene(kC, kS, kO, dip) {
    var C = centre(pose(BLOOM.C, BUD.C, kC)), S = side(C.L, pose(BLOOM.S, BUD.S, kS)), O = outer(pose(BLOOM.O, BUD.O, kO));
    var s = ink(O) + ink(O, MX) + ink(S.d) + ink(S.d, MX);
    s += cut(band(S.edge, 1, 0.3)) + cut(band(S.edge, 1, 0.3), MX);      // side petals in front of the outer ones
    s += cut(band(C.L, 1, 0.25)) + cut(band(C.R, -1, 0.25));             // the centre petal in front of all
    s += front(C.d);
    return xf(move(0, -0.35 + dip), s) + ink(water(1.2, 16.8, 16.0, 1.0));
  }

  return {
    id: "lotus",
    frames: FRAMES,
    at: function (t) {
      // A slow breath out (the bloom spreads a touch), then it closes: the side petals lead, the centre
      // narrows with them, the outer petals follow a beat later and wrap the bud. It opens the other way
      // round — the outer petals unwrap first, the side petals follow — both overshoot a little and
      // settle, and the bloom dips into the water and floats back up.
      var pre = 0.07 * Math.pow(pulse(t, 0.12, 0.36), 2);
      var back = function (x) { return easeOutBack(smoother(x), 1.4); };
      var kO = -pre + seg(t, 0.34, 0.57, smoother) - seg(t, 0.66, 0.88, back);
      var kS = -0.6 * pre + seg(t, 0.30, 0.52, smoother) - seg(t, 0.70, 0.93, back);
      var kC = seg(t, 0.31, 0.53, smoother) - seg(t, 0.69, 0.92, smoother);
      var dip = 0.2 * Math.pow(pulse(t, 0.78, 1.0), 2);
      return scene(kC, kS, kO, dip);
    }
  };
})();
