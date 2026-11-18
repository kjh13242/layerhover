// 연꽃 (Lotus) — variant B: elegance first. A lotus afloat on still water that slowly turns.
// The flower is a small 3D model seen at water level in perspective: a tall bud inside a ring of eight
// cupped, pointed petals in two alternating whorls (like a real imbricate lotus), so the arrangement of
// petals genuinely shifts as it turns. Every petal is a filled contour with an ogee tip; overlaps are
// separated by clean 0.8 pt gaps computed with a local polygon clipper (the kit's ink/cut/front only
// gives two depth levels, a turning flower needs many).
// Motion (7 s): rest in the crown pose → a dip into the water → one slow quarter turn with a slight lean,
// while a ripple opens under the surface line and spreads away → rise, settle, rest. The ring repeats every
// 90°, so the loop closes exactly on the poster.
var ICON = (function () {
  var D = Math.PI / 180;
  var P = {
    frames: 56, cx: 9, wy: 14.3, dist: 40, gap: 0.8, n: 4, minW: 0.5, fullW: 1.45,
    bud: { r0: 0.4, h0: 0.8, L: 11.2, a0: 22, a1: -4, ap: 1.1, W: 2.2, cup: 0.5,
      prof: [[0, 0.3], [0.1, 0.58], [0.24, 0.86], [0.42, 1], [0.58, 0.95], [0.72, 0.77], [0.84, 0.5], [0.93, 0.22], [1, 0]] },
    A: { r0: 1.7, h0: 0.25, L: 9.0, a0: 66, a1: 8, ap: 1.0, W: 1.9, cup: 0.8,
      prof: [[0, 0.25], [0.12, 0.56], [0.28, 0.87], [0.46, 1], [0.62, 0.93], [0.74, 0.74], [0.84, 0.5], [0.92, 0.22], [1, 0]] },
    B: { r0: 1.1, h0: 0.5, L: 10.2, a0: 36, a1: 6, ap: 1.0, W: 1.75, cup: 0.95,
      prof: [[0, 0.15], [0.12, 0.48], [0.28, 0.84], [0.46, 1], [0.62, 0.93], [0.74, 0.74], [0.84, 0.5], [0.92, 0.22], [1, 0]] },
    water: { y: 15.0, hw: 7.6, T: 1.0, ease: 0.34 },
    ripple: { y: 16.4, h0: 1.2, h1: 7.2, T: 0.6, born: 0.1, life: 0.72 },
    motion: { bob: 0.7, rock: 2.0, t0: 0.05, t1: 0.86 }
  };
  var CX = P.cx, WY = P.wy, GAP = P.gap;

  // ── helpers ───────────────────────────────────────────────────────────────────────────────────
  // perspective camera with the eye at water level, looking at the flower axis
  function proj(Q) { var s = P.dist / (P.dist - Q[2]); return [CX + Q[0] * s, WY - Q[1] * s, Q[2]]; }
  function pchip(xs, ys) {
    var n = xs.length, h = [], d = [], m = [], i;
    for (i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { var w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    return function (x) {
      var k = 0; while (k < n - 2 && x > xs[k + 1]) k++;
      var s = (x - xs[k]) / h[k], s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * ys[k] + (s3 - 2 * s2 + s) * h[k] * m[k] + (-2 * s3 + 3 * s2) * ys[k + 1] + (s3 - s2) * h[k] * m[k + 1];
    };
  }

  // ── polygon clipping: S − C for simple polygons (Greiner–Hormann walk) ─────────────────────────
  function area(Q) { var a = 0; for (var i = 0, n = Q.length; i < n; i++) { var p = Q[i], q = Q[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
  function inside(pt, Q) {
    var x = pt[0], y = pt[1], c = false;
    for (var i = 0, n = Q.length, j = n - 1; i < n; j = i++) {
      var xi = Q[i][0], yi = Q[i][1], xj = Q[j][0], yj = Q[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function bbox(Q) {
    var b = [1e9, 1e9, -1e9, -1e9];
    for (var i = 0; i < Q.length; i++) { var p = Q[i]; if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }
    return b;
  }
  function diff(S, C) {
    var bs = bbox(S), bc = bbox(C);
    if (bs[0] > bc[2] || bc[0] > bs[2] || bs[1] > bc[3] || bc[1] > bs[3]) return [S];
    if ((area(S) > 0) !== (area(C) > 0)) C = C.slice().reverse();
    // a tiny deterministic jitter keeps vertices from landing exactly on each other
    C = C.map(function (q, k) { return [q[0] + 1e-5 * Math.sin(k * 12.9898 + 1.3), q[1] + 1e-5 * Math.cos(k * 78.233 + 0.7)]; });
    var ns = S.length, nc = C.length, sIns = [], cIns = [], any = false, i, j;
    for (i = 0; i < ns; i++) sIns.push([]);
    for (j = 0; j < nc; j++) cIns.push([]);
    for (i = 0; i < ns; i++) {
      var p1 = S[i], p2 = S[(i + 1) % ns], d1x = p2[0] - p1[0], d1y = p2[1] - p1[1];
      for (j = 0; j < nc; j++) {
        var q1 = C[j], q2 = C[(j + 1) % nc], d2x = q2[0] - q1[0], d2y = q2[1] - q1[1];
        var den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-12) continue;
        var ex = q1[0] - p1[0], ey = q1[1] - p1[1], a = (ex * d2y - ey * d2x) / den, b = (ex * d1y - ey * d1x) / den;
        if (a <= 0 || a >= 1 || b <= 0 || b >= 1) continue;
        var x = p1[0] + d1x * a, y = p1[1] + d1y * a;
        var A = { x: x, y: y, is: true, al: a }, B = { x: x, y: y, is: true, al: b };
        A.nb = B; B.nb = A; sIns[i].push(A); cIns[j].push(B); any = true;
      }
    }
    if (!any) return inside(S[0], C) ? [] : [S];   // (C wholly inside S would need a hole: avoided by design)
    function link(Q, ins) {
      var L = [];
      for (var i = 0; i < Q.length; i++) {
        L.push({ x: Q[i][0], y: Q[i][1], is: false });
        ins[i].sort(function (u, v) { return u.al - v.al; });
        for (var k = 0; k < ins[i].length; k++) L.push(ins[i][k]);
      }
      for (i = 0; i < L.length; i++) { L[i].nx = L[(i + 1) % L.length]; L[i].pv = L[(i - 1 + L.length) % L.length]; }
      return L;
    }
    var sl = link(S, sIns); link(C, cIns);
    for (i = 0; i < sl.length; i++) {
      var nd = sl[i]; if (!nd.is) continue;
      nd.out = !inside([(nd.x + nd.nx.x) / 2, (nd.y + nd.nx.y) / 2], C);
    }
    var res = [];
    for (i = 0; i < sl.length; i++) {
      var st = sl[i]; if (!st.is || st.vis || !st.out) continue;
      var poly = [], cur = st, onS = true, guard = 0;
      do {
        cur.vis = true; cur.nb.vis = true;
        poly.push([cur.x, cur.y]);
        cur = onS ? cur.nx : cur.pv;
        while (!cur.is) { poly.push([cur.x, cur.y]); cur = onS ? cur.nx : cur.pv; }
        cur.vis = true; cur = cur.nb; onS = !onS;
      } while (!(onS && cur === st) && ++guard < 400);
      if (poly.length > 2 && Math.abs(area(poly)) > 0.02) res.push(poly);
    }
    for (i = 0; i < res.length; i++) {           // safety net: a difference can never grow beyond S
      var bq = bbox(res[i]); if (bq[0] < bs[0] - 0.05 || bq[1] < bs[1] - 0.05 || bq[2] > bs[2] + 0.05 || bq[3] > bs[3] + 0.05) return [S];
    }
    return res;
  }
  // outward offset by g, round joins at sharp corners
  function dilate(Q, g) {
    var n = Q.length, s = area(Q) > 0 ? 1 : -1, out = [];
    for (var i = 0; i < n; i++) {
      var a = Q[(i - 1 + n) % n], b = Q[i], c = Q[(i + 1) % n];
      var e1x = b[0] - a[0], e1y = b[1] - a[1], l1 = Math.hypot(e1x, e1y) || 1, e2x = c[0] - b[0], e2y = c[1] - b[1], l2 = Math.hypot(e2x, e2y) || 1;
      e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
      var n1 = [s * e1y, -s * e1x], n2 = [s * e2y, -s * e2x];
      var cr = (e1x * e2y - e1y * e2x) * s, dot = n1[0] * n2[0] + n1[1] * n2[1];
      if (cr > 0 && dot < 0.94) {
        var a1 = Math.atan2(n1[1], n1[0]), a2 = Math.atan2(n2[1], n2[0]), da = a2 - a1;
        while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        var k = Math.max(2, Math.ceil(Math.abs(da) / 0.3));
        for (var j = 0; j <= k; j++) { var an = a1 + da * j / k; out.push([b[0] + g * Math.cos(an), b[1] + g * Math.sin(an)]); }
      } else {
        var mx = n1[0] + n2[0], my = n1[1] + n2[1], ml = Math.hypot(mx, my) || 1, cosh = Math.max(0.5, ml / 2);
        out.push([b[0] + mx / ml * g / cosh, b[1] + my / ml * g / cosh]);
      }
    }
    return unloop(out);
  }
  // cut the small swallowtail loops an offset makes at tight concave turns
  function segX(a, b, c, d) {
    var d1x = b[0] - a[0], d1y = b[1] - a[1], d2x = d[0] - c[0], d2y = d[1] - c[1], den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-12) return null;
    var ex = c[0] - a[0], ey = c[1] - a[1], u = (ex * d2y - ey * d2x) / den, v = (ex * d1y - ey * d1x) / den;
    return (u > 0 && u < 1 && v > 0 && v < 1) ? [a[0] + d1x * u, a[1] + d1y * u] : null;
  }
  function unloop(Q) {
    for (var pass = 0; pass < 30; pass++) {
      var n = Q.length, hit = null;
      for (var i = 0; i < n && !hit; i++) {
        for (var m = 2; m <= Math.min(n - 2, Math.floor(n / 3)); m++) {
          var j = (i + m) % n, X = segX(Q[i], Q[(i + 1) % n], Q[j], Q[(j + 1) % n]);
          if (X) { hit = [i, j, X]; break; }
        }
      }
      if (!hit) return Q;
      var a = hit[0], b = hit[1], R = [];
      if (b > a) { R = Q.slice(0, a + 1); R.push(hit[2]); R = R.concat(Q.slice(b + 1)); }
      else { R = [hit[2]].concat(Q.slice(b + 1, a + 1)); }
      Q = R;
    }
    return Q;
  }
  function segDist(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, u = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L);
    return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
  }
  // the thickest point of a piece: [inscribed radius (capped at rmax), x, y]
  function core(Q, rmax) {
    var b = bbox(Q), st = 0.08, best = [0, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    for (var y = b[1] + st / 2; y < b[3]; y += st) for (var x = b[0] + st / 2; x < b[2]; x += st) {
      if (!inside([x, y], Q)) continue;
      var d = 1e9; for (var i = 0; i < Q.length && d > best[0]; i++) d = Math.min(d, segDist([x, y], Q[i], Q[(i + 1) % Q.length]));
      if (d > best[0]) { best = [d, x, y]; if (d >= rmax) return best; }
    }
    return best;
  }
  // a piece of a petal that is sliding behind (or out from behind) another one: below minW it is gone;
  // up to fullW it is drawn scaled about its thickest point, so it shrinks away (or grows in) smoothly
  // instead of popping
  function settle(Q) {
    var lo = P.minW / 2, hi = P.fullW / 2, c = core(Q, hi);
    var s = (c[0] - lo) / (hi - lo);
    if (s >= 1) return Q;
    if (s < 0.2) return null;
    return Q.map(function (p) { return [c[1] + (p[0] - c[1]) * s, c[2] + (p[1] - c[2]) * s]; });
  }
  function polyD(Q) { var s = ''; for (var i = 0; i < Q.length; i++) s += (i ? 'L' : 'M') + f(Q[i][0]) + ' ' + f(Q[i][1]); return s + 'Z'; }

  // ── the petal: a cupped, pointed sheet standing on a ring → projected outline ──────────────────
  [P.bud, P.A, P.B].forEach(function (S) { S.PF = pchip(S.prof.map(function (p) { return p[0]; }), S.prof.map(function (p) { return p[1]; })); });
  function alpha(S, u) { return S.a0 + (S.a1 - S.a0) * Math.pow(u, S.ap); }
  function petal(S, r0, th, X) {
    var N = 48, sub = 4, st = Math.sin(th), ct = Math.cos(th), rho = r0, y = S.h0;
    var Q0 = [], Bv = [], Cv = [];
    for (var k = 0; k <= N; k++) {
      var u = k / N;
      if (k > 0) for (var j = 0; j < sub; j++) {
        var am = alpha(S, (k - 1 + (j + 0.5) / sub) / N) * D;
        rho += Math.sin(am) * S.L / N / sub; y += Math.cos(am) * S.L / N / sub;
      }
      var a = alpha(S, u) * D, hw = S.W * S.PF(u), c = S.cup * hw;
      var P0 = [rho * st, y, rho * ct];
      var nI = [-Math.cos(a) * st, Math.sin(a), -Math.cos(a) * ct];
      var Pp = [P0[0] + hw * ct + c * nI[0], P0[1] + c * nI[1], P0[2] - hw * st + c * nI[2]];
      var Pm = [P0[0] - hw * ct + c * nI[0], P0[1] + c * nI[1], P0[2] + hw * st + c * nI[2]];
      var q0 = proj(X(P0)), q1 = proj(X(Pp)), qm = proj(X(Pm));
      Q0.push(q0);
      Bv.push([(q1[0] - qm[0]) / 2, (q1[1] - qm[1]) / 2]);
      Cv.push([(q1[0] + qm[0]) / 2 - q0[0], (q1[1] + qm[1]) / 2 - q0[1]]);
    }
    // the silhouette at each station is the cross-section point that reaches furthest to either side of
    // the spine; a soft maximum over a dense set of section points keeps the hand-over from the petal's
    // rim to its cupped back perfectly smooth
    var left = [], right = [], NV = 24, TAUo = 0.05;
    for (k = 0; k <= N; k++) {
      var pa = Q0[Math.max(0, k - 1)], pb = Q0[Math.min(N, k + 1)], tx = pb[0] - pa[0], ty = pb[1] - pa[1], tl = Math.hypot(tx, ty) || 1;
      var nx = -ty / tl, ny = tx / tl, B = Bv[k], C = Cv[k], q = Q0[k], pts = [], os = [], hi = -1e9, lo = 1e9;
      for (var iv = 0; iv <= NV; iv++) {
        var v = -1 + 2 * iv / NV, px = q[0] + B[0] * v + C[0] * v * v, py = q[1] + B[1] * v + C[1] * v * v, o = (px - q[0]) * nx + (py - q[1]) * ny;
        pts.push([px, py]); os.push(o); if (o > hi) hi = o; if (o < lo) lo = o;
      }
      var sl = [0, 0, 0], sr = [0, 0, 0];
      for (iv = 0; iv <= NV; iv++) {
        var wl = Math.exp((os[iv] - hi) / TAUo), wr = Math.exp((lo - os[iv]) / TAUo);
        sl[0] += wl * pts[iv][0]; sl[1] += wl * pts[iv][1]; sl[2] += wl;
        sr[0] += wr * pts[iv][0]; sr[1] += wr * pts[iv][1]; sr[2] += wr;
      }
      left.push([sl[0] / sl[2], sl[1] / sl[2]]);
      if (k < N) right.push([sr[0] / sr[2], sr[1] / sr[2]]);
    }
    return smoothRun(left, 2).concat(smoothRun(right.concat([left[N]]), 2).slice(0, N).reverse());
  }
  // light moving-average along an outline run (both ends held)
  function smoothRun(R, w) {
    var out = [], n = R.length;
    for (var i = 0; i < n; i++) {
      var k = Math.min(w, i, n - 1 - i), sx = 0, sy = 0, c = 0;
      for (var j = -k; j <= k; j++) { var wt = k + 1 - Math.abs(j); sx += R[i + j][0] * wt; sy += R[i + j][1] * wt; c += wt; }
      out.push([sx / c, sy / c]);
    }
    return out;
  }

  // ── water ────────────────────────────────────────────────────────────────────────────────────
  // a calligraphic stroke along y: full weight T through the middle, easing to fine points at both ends
  function stroke(x0, x1, y, T, ease) {
    var n = 48, top = [], bot = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n, x = lerp(x0, x1, u), e = Math.min(u, 1 - u) / ease, h = T / 2 * (e >= 1 ? 1 : Math.sin(Math.PI / 2 * e));
      top.push([x, y - h]); if (i > 0 && i < n) bot.push([x, y + h]);
    }
    return { line: top.concat(bot.reverse()), top: top };
  }
  // ── who lies over whom ─────────────────────────────────────────────────────────────────────────
  // The invisible water body hides the flower below the waterline (the water parts carve nothing else).
  // Ring petals sit in two whorls: where an outer-whorl petal (A) overlaps its inner-whorl neighbour (B)
  // the outer one shows on top while that seam faces us, and the inner one once the seam turns away.
  // Ring petals lie over the bud on the near half, under it on the far half.
  function ang(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function over(a, b) {
    if (a.kind === 'body') return b.kind === 'A' || b.kind === 'B' || b.kind === 'bud';
    if (a.kind === 'line') return false;
    var pa = a.kind === 'A' || a.kind === 'B', pb = b.kind === 'A' || b.kind === 'B';
    if (pa && b.kind === 'bud') return Math.cos(a.th) > 0;
    if (a.kind === 'bud' && pb) return Math.cos(b.th) <= 0;
    if (!pa || !pb) return false;
    var dth = ang(b.th - a.th);
    if (a.kind !== b.kind && Math.abs(dth) < 60 * D) {
      var seam = Math.cos(a.th + dth / 2) > 0;
      return a.kind === 'A' ? seam : !seam;
    }
    return Math.cos(a.th) > Math.cos(b.th) + 1e-6;
  }

  function frame(t) {
    var M = P.motion;
    // one slow quarter turn per loop (the ring repeats every 90°), then a rest in the poster pose
    var turn = 90 * smooth(seg(t, M.t0, M.t1, function (x) { return x; }));
    // the turn starts with a little dip into the water, a rise, and a settle
    var s2 = function (a, b) { var u = (t - a) / (b - a); return u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 2) : 0; };
    var bob = M.bob * (-0.75 * s2(0, 0.3) + 0.5 * s2(0.2, 0.62) - 0.16 * s2(0.52, 0.92));
    var rk = M.rock * s2(M.t0, M.t1 + 0.04) * D, cr = Math.cos(rk), sr = Math.sin(rk);
    var X = function (Q) { return [Q[0] * cr - Q[1] * sr, Q[0] * sr + Q[1] * cr + bob, Q[2]]; };
    var items = [], i;
    items.push({ poly: petal(P.bud, P.bud.r0, 0, X), kind: 'bud', th: 0, draw: true });
    for (i = 0; i < 2 * P.n; i++) {          // poster: an outer-whorl petal faces us, inner ones flank the bud
      var th = (turn + 180 * i / P.n) * D, S = i % 2 === 0 ? P.A : P.B;
      items.push({ poly: petal(S, S.r0, th, X), kind: i % 2 === 0 ? 'A' : 'B', th: th, draw: true });
    }
    var W = P.water, RP = P.ripple;
    // the water: a long still surface line; at each dip a ripple stroke opens beneath it, spreads to
    // both sides and thins away before the next one
    var wl = stroke(CX - W.hw, CX + W.hw, W.y, W.T, W.ease);
    items.push({ poly: wl.line, kind: 'line', draw: true });
    items.push({ poly: wl.top.concat([[18 + 4, W.y], [18 + 4, 20], [-4, 20], [-4, W.y]]), kind: 'body', draw: false });
    var ph = (t - RP.born) / RP.life;
    if (ph > 0 && ph < 1) {
      var rt = RP.T * Math.sin(Math.PI * Math.pow(ph, 0.6)), rh = lerp(RP.h0, RP.h1, easeOut(ph));
      if (rt > 0.12) items.push({ poly: stroke(CX - rh, CX + rh, RP.y, rt, 0.45).line, kind: 'ripple', draw: true });
    }
    // each part is carved by a 0.8 pt gap around everything that lies over it; petal pieces that are
    // sliding out of (or into) hiding settle smoothly instead of popping
    var out = '';
    items.forEach(function (it, ii) {
      if (!it.draw) return;
      var pieces = [it.poly];
      for (var j = 0; j < items.length; j++) {
        if (j === ii || !over(items[j], it)) continue;
        var Dp = dilate(items[j].poly, GAP), next = [];
        for (var q = 0; q < pieces.length; q++) next = next.concat(diff(pieces[q], Dp));
        pieces = next;
      }
      if (it.kind !== 'line' && it.kind !== 'ripple') pieces = pieces.map(settle).filter(Boolean);
      pieces.forEach(function (Q) { out += ink(polyD(Q)); });
    });
    return out;
  }

  return { id: "lotus", frames: P.frames, at: frame };
})();
