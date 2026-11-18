// 향 (Incense) — v5, "plank".
// The universal incense holder: a long thin wooden plank lying flat on the ground with a small socket
// near its left end. A long hair-thin stick rises diagonally out of the socket across the plank; its far
// end is burning (a tiny gap and a finer ash segment, no round tip). From that end a single calligraphic
// brush stroke of smoke rises — hair-thin at the tip, a modest swell, thinning, breaking into a drifting
// wisp that dissolves (fade) near the top. Usually one plume; now and then a second stroke peels off the
// first, drifts apart and merges back.

var INC = (function () {
  var PLANK_Y = 15.0;            // plank top (bottom on the ground line y = 16)
  var BASE = [3.0, 15.2];        // where the stick enters the socket (inside the plank)
  var ANG = -38;                 // stick angle (deg; negative = rising to the right)
  var LEN = 10.1;                // stick length from socket to burning end
  var ca = Math.cos(ANG * Math.PI / 180), sa = Math.sin(ANG * Math.PI / 180);
  var TIP = [BASE[0] + ca * LEN, BASE[1] + sa * LEN];
  var TOP = 1.2;                 // smoke reaches up to here

  // centre line of a plume at height s (0 = tip, 1 = top), time t
  function spine(t, s, side) {
    var y = lerp(TIP[1] - 0.1, TOP, s);
    // the column leans gently left as it rises (toward the optical centre); the lean breathes
    var lean = -(2.3 + 1.0 * noise(t, 3, 2)) * Math.pow(s, 1.4);
    // laminar at first (almost straight), then a travelling S-wave grows (whole cycles per loop => seamless)
    var ramp = smooth((s - 0.08) / 0.4);
    var amp = (0.5 + 1.3 * s) * (0.8 + 0.35 * noise(t, 7, 2)) * ramp;
    var ph = TAU * (s * 1.15 - 2 * t) + 0.9 * noise(t, 11, 2) + 2.2;
    var wave = amp * Math.sin(ph) + 0.35 * Math.pow(s, 2) * Math.sin(TAU * (s * 1.7 - 3 * t) + 1.3);
    var x = TIP[0] + lean + wave;
    if (side) x += side * smooth((s - 0.25) / 0.5);
    return [x, y];
  }

  function pts(t, a, b, n, side) {
    var p = [];
    for (var i = 0; i <= n; i++) p.push(spine(t, lerp(a, b, i / n), side));
    return p;
  }

  // a soft swell that rides up the stroke twice per loop (zero at both ends => seamless)
  function swell(t, s) {
    var c = wrap01(2 * t + 0.15);
    return 0.22 * Math.exp(-Math.pow((s - c) / 0.14, 2)) * Math.sin(Math.PI * c);
  }

  function plume(t, side, scale) {
    scale = scale || 1;
    var end = 0.8 + 0.05 * noise(t, 5, 2);           // where the solid ink thins out
    // one continuous brush stroke: a hair at the tip, a slim swell, thinning to nothing
    var body = ribbon(pts(t, 0, end, 26, side), function (u) {
      var s = u * end;
      var w = 0.42 + 0.68 * smooth(u / 0.55) + 0.12 * Math.sin(Math.PI * u) + swell(t, s);
      w *= Math.pow(smooth((1 - u) / 0.5), 0.7);
      return w * scale;
    }, { caps: ['flat', 'flat'] });
    // the stroke carries on in fade and dissolves near the top
    var t0 = end - 0.18;
    var tail = ribbon(pts(t, t0, 1.0, 12, side), function (u) {
      return 0.95 * Math.sin(Math.PI * (0.25 + 0.75 * u)) * smooth(u / 0.2 + 0.4) * scale;
    });
    return { body: body, tail: tail };
  }

  // a straight bar along the stick axis from distance d0 to d1 with half-widths h0 → h1
  function bar(d0, d1, h0, h1) {
    var nx = -sa, ny = ca;
    var a = [BASE[0] + ca * d0, BASE[1] + sa * d0], b = [BASE[0] + ca * d1, BASE[1] + sa * d1];
    return polyPath([[a[0] + nx * h0, a[1] + ny * h0], [b[0] + nx * h1, b[1] + ny * h1],
      [b[0] - nx * h1, b[1] - ny * h1], [a[0] - nx * h0, a[1] - ny * h0]], true);
  }

  function plank() {
    // long thin wooden ash catcher, crisp architectural corners
    return rectPath(1.5, PLANK_Y, 15, 16 - PLANK_Y, 0.25);
  }

  function collar() {
    // a tiny raised socket around the hole: low, flat-topped, slightly flared at the foot
    var cx = BASE[0] + 0.1;
    return 'M' + f(cx - 1.3) + ' ' + PLANK_Y + ' C' + f(cx - 0.8) + ' ' + PLANK_Y + ' ' + f(cx - 0.75) + ' ' + f(PLANK_Y - 0.15) +
      ' ' + f(cx - 0.7) + ' ' + f(PLANK_Y - 0.7) + ' L' + f(cx + 0.7) + ' ' + f(PLANK_Y - 0.7) +
      ' C' + f(cx + 0.75) + ' ' + f(PLANK_Y - 0.15) + ' ' + f(cx + 0.8) + ' ' + PLANK_Y + ' ' + f(cx + 1.3) + ' ' + PLANK_Y + ' Z';
  }

  function stick() { return bar(0, LEN - 1.25, 0.4, 0.37); }      // the unburnt stick
  function ash() { return bar(LEN - 0.8, LEN, 0.3, 0.29); }       // finer burnt segment
  function gap() { return bar(LEN - 1.25, LEN - 0.8, 0.5, 0.5); }  // the glowing seam (negative space)

  return { plume: plume, plank: plank, collar: collar, stick: stick, ash: ash, gap: gap, TIP: TIP };
})();

var ICON = {
  id: "incense",
  frames: 64,
  at: function (t) {
    var s = '';
    // second plume: occasionally peels off the first, drifts apart and merges back
    var two = bump(t, 0.5, 0.64, 0.79, 0.96, smooth);
    var a = INC.plume(t, 0, 1);
    s += ink(a.body) + fade(a.tail);
    if (two > 0.02) {
      var b = INC.plume(t + 0.05, 2.6 * two, 0.8);
      s += ink(b.body) + fade(b.tail);
    }
    s += ink(INC.plank()) + ink(INC.collar());
    s += ink(INC.stick()) + ink(INC.ash());
    return s;
  }
};
