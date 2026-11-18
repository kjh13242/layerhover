// 향 (Incense) — variant P (presence).
// A slim boat-shaped holder on the ground line, one plain stick laid in it on a clear diagonal, and a tall column of
// smoke rising from the burnt end into the upper two-thirds of the canvas: born broad and dark, swelling and thinning
// as it climbs in a soft S, handing over to a grey wisp that dissolves at the top. Its centre line is layered travelling
// waves whose strength drifts on looping noise, so the rising shape never repeats. Usually one plume; once a loop a
// breath of air parts it into two threads that later zip back together from the bottom up.

var ICON = (function () {
  var FRAMES = 64;

  // ── holder: a slim asymmetric boat. Flat keel on y = 16, a long concave sheer; the stern (left) short and low,
  //    the prow (right) long and lifted to a fine point ──
  var BOAT = 'M1.3 14.05' +
    'C2.9 14.35 5 14.45 8 14.45' +
    'C11.2 14.45 14.2 14.2 16.75 13.4' +
    'C16.1 15.3 14.6 16 12.2 16' +
    'L4.6 16' +
    'C2.9 16 1.75 15.3 1.3 14.05Z';

  // ── stick: plain, no tip ornament. Foot inside the boat near the stern, rising to the right at 34° ──
  var ANG = 30 * Math.PI / 180, DIR = [Math.cos(ANG), -Math.sin(ANG)];
  var FOOT = [2.9, 15.3], LEN = 9.6;
  var TIP = [FOOT[0] + DIR[0] * LEN, FOOT[1] + DIR[1] * LEN];
  var STICK = (function () {
    var nx = DIR[1], ny = -DIR[0], w0 = 1.55, w1 = 1.35, r = 0.12;
    function P(d, side) { var w = lerp(w0, w1, d / LEN) / 2; return [FOOT[0] + DIR[0] * d + nx * w * side, FOOT[1] + DIR[1] * d + ny * w * side]; }
    var a = P(0, 1), b = P(LEN, 1), c = P(LEN, -1), dd = P(0, -1);
    var b1 = P(LEN - r, 1), bc = [b[0] - nx * r, b[1] - ny * r], c1 = [c[0] + nx * r, c[1] + ny * r], c2 = P(LEN - r, -1);
    return 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b1[0]) + ' ' + f(b1[1]) +
      'Q' + f(b[0]) + ' ' + f(b[1]) + ' ' + f(bc[0]) + ' ' + f(bc[1]) +
      'L' + f(c1[0]) + ' ' + f(c1[1]) +
      'Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c2[0]) + ' ' + f(c2[1]) +
      'L' + f(dd[0]) + ' ' + f(dd[1]) + 'Z';
  })();

  // ── smoke ──
  var SRC = [TIP[0] + 0.15, TIP[1] - 0.55];   // just above the burnt end
  var TOPY = 1.1, H = SRC[1] - TOPY, N = 60;

  function dn(t, seed, amp) { return amp * noise(t, seed, 2); }
  // centre line x at height h above the source (h = 0..H)
  function centre(h, t, lag) {
    var u = h / H, grow = smooth((h - 0.3) / 2.6);
    var a1 = 1.45 + dn(t, 3, 0.4), a2 = 0.38 + dn(t, 5, 0.18);
    var w1 = Math.sin(TAU * (h / 8.4 - 2 * t - lag) + 1.2);
    var w2 = Math.sin(TAU * (h / 5.2 - 3 * t - 1.3 * lag) + 2.4);
    var lean = -(4.6 + dn(t, 8, 0.6)) * Math.pow(u, 1.25);
    return SRC[0] + lean + grow * (a1 * (0.15 + 0.85 * smooth(u / 0.6)) * (1 - 0.6 * smooth((u - 0.5) / 0.5)) * w1 + a2 * u * w2);
  }
  // width profile: broad at the base, a travelling swell, thinning to nothing at the top
  function width(h, t, k) {
    var u = h / H;
    var base = lerp(1.1, 2.55, smooth(u / 0.36));
    var swell = 1 + 0.14 * Math.sin(TAU * (h / 4.2 - 2 * t) + 0.5) * smooth((u - 0.12) / 0.25);
    var end = Math.pow(1 - smooth((u - 0.52) / 0.48), 0.75);
    return base * swell * end * k;
  }
  function spine(t, lag, off) {
    var pts = [];
    for (var i = 0; i <= N; i++) {
      var h = H * i / N;
      pts.push([centre(h, t, lag) + (off ? off(h) : 0), SRC[1] - h]);
    }
    return pts;
  }
  var NIB = -40 * Math.PI / 180;   // broad nib: strokes along it thin, across it full
  // radius of curvature at each sample, smoothed
  function radii(P) {
    var r = [];
    for (var j = 0; j < P.length; j++) {
      var a = P[Math.max(0, j - 3)], b = P[j], c = P[Math.min(P.length - 1, j + 3)];
      var ab = dist(a, b), bc = dist(b, c), ac = dist(a, c);
      var cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      r.push(Math.abs(cr) < 1e-6 ? 99 : ab * bc * ac / (2 * Math.abs(cr)));
    }
    return r;
  }
  // ribbon from explicit points with width per sample (no resampling)
  function strip(P, W) {
    var L = [], Rt = [], Rr = radii(P), HW = [], NN = [];
    for (var j = 0; j < P.length; j++) {
      var a = P[Math.max(0, j - 1)], b = P[Math.min(P.length - 1, j + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      var nx = -ty / tl, ny = tx / tl, th = Math.atan2(ty, tx), u = j / (P.length - 1);
      var hw = W[j] / 2 * lerp(1, 0.5 + 0.6 * Math.abs(Math.sin(th - NIB)), smooth(u / 0.2));
      HW.push(hw); NN.push([nx, ny]);
    }
    // never wider than the bend can hold (no folds on the inner side); the limit is eased along the ribbon
    var lim = HW.map(function (h, j) { return Math.min(1, 0.9 * Rr[j] / Math.max(h, 1e-6)); });
    for (var pass = 0; pass < 6; pass++) {
      var nl = lim.slice();
      for (j = 1; j < lim.length - 1; j++) nl[j] = Math.min(lim[j], (lim[j - 1] + 2 * lim[j] + lim[j + 1]) / 4 + 0.0) ;
      for (j = 1; j < lim.length - 1; j++) nl[j] = (nl[j - 1] + 2 * nl[j] + nl[j + 1]) / 4;
      lim = nl;
    }
    for (j = 0; j < P.length; j++) {
      var nx = NN[j][0], ny = NN[j][1], hw = HW[j] * lim[j];
      L.push([P[j][0] + nx * hw, P[j][1] + ny * hw]); Rt.push([P[j][0] - nx * hw, P[j][1] - ny * hw]);
    }
    return polyPath(L.concat(Rt.reverse()), true);
  }
  // one plume: grey whole length, ink core tapering to a point inside the grey
  function plume(P, wf, inkTo) {
    var Wg = [], Wi = [];
    for (var j = 0; j < P.length; j++) {
      var u = j / (P.length - 1), w = wf(u * H);
      Wg.push(w);
      Wi.push(w * Math.pow(1 - smooth((u - (inkTo - 0.16)) / 0.16), 1.1));
    }
    return { grey: strip(P, Wg), core: strip(P, Wi) };
  }

  // the two-plume event: parts at t 0.5..0.62, zips back up 0.74..0.92
  function split(t) {
    var D = 2.4 * seg(t, 0.48, 0.62) * (1 - seg(t, 0.9, 0.96));
    var hs = lerp(3.2, H + 3, seg(t, 0.72, 0.92, easeIn));
    return { D: D, hs: hs };
  }

  return {
    id: 'incense',
    frames: FRAMES,
    at: function (t0) {
      var t = wrap01(t0 + 0.42);   // poster = the most balanced S of the loop
      var s = ink(BOAT) + ink(STICK);
      var sp = split(t), out = '';
      if (sp.D < 0.05) {
        var p = plume(spine(t, 0), function (h) { return width(h, t, 1); }, 0.84 + 0.06 * noise(t, 11, 2));
        s += ink(p.core); out += fade(p.grey);
      } else {
        var open = function (h) { return sp.D * smooth((h - sp.hs) / 2.6); };
        var kk = function (h) { return lerp(1, 0.62, smooth((h - sp.hs) / 1.5) * Math.min(1, sp.D / 1.2)); };
        var A = spine(t, 0, function (h) { return -0.5 * open(h); });
        var B = spine(t, 0.06, function (h) { return 0.5 * open(h); });
        var pa = plume(A, function (h) { return width(h, t, kk(h)); }, 0.8);
        var pb = plume(B, function (h) { return width(h, t, kk(h)) * 0.92; }, 0.72);
        s += ink(pa.core) + ink(pb.core); out += fade(pa.grey) + fade(pb.grey);
      }
      s += cutAround(BOAT, 0.7) + front(BOAT);
      return s + out;
    }
  };
})();
