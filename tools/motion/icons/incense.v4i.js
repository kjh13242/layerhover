// 향 (Incense) — variant i, "INK".
// Smoke as one brush stroke: it leaves the burning tip as a hair, swells into a confident belly,
// thins, and breaks into a drifting wisp that dissolves near the top. A long low slim tray and a
// nearly horizontal stick across the bottom anchor it. Usually one plume; now and then a second
// stroke peels off the first, drifts apart and merges back.

var INC = (function () {
  var TIP = [12.6, 12.3];     // burning end of the stick (no round tip)
  var TOP = 1.4;                // smoke reaches up to here

  // centre line of a plume at height s (0 = tip, 1 = top), time t
  function spine(t, s, side) {
    var y = lerp(TIP[1] - 0.15, TOP, s);
    // lean: the column drifts left as it rises; the drift breathes with layered noise
    var lean = -(1.6 + 0.9 * noise(t, 3, 2)) * Math.pow(s, 1.2);
    // travelling S-wave (whole cycles per loop => seamless); starts almost straight at the tip
    var ramp = smooth(s / 0.22);
    var amp = (1.3 + 1.4 * s) * (0.85 + 0.3 * noise(t, 7, 2)) * ramp;
    var ph = TAU * (s * 1.35 - 2 * t) + 0.8 * noise(t, 11, 2) + 2.2;
    var wave = amp * Math.sin(ph) + 0.4 * Math.pow(s, 2) * Math.sin(TAU * (s * 1.9 - 3 * t) + 1.3);
    var x = TIP[0] + 0.05 + lean + wave;
    if (side) x += side * smooth((s - 0.15) / 0.55);
    // the wisp drifts off sideways as it dissolves
    x -= 1.4 * Math.pow(clamp((s - 0.7) / 0.3), 1.6) * (1 + 0.5 * noise(t, 17, 2));
    return [x, y];
  }

  function pts(t, a, b, n, side) {
    var p = [];
    for (var i = 0; i <= n; i++) p.push(spine(t, lerp(a, b, i / n), side));
    return p;
  }

  // a puff of extra width that rides up the stroke twice per loop (zero at both ends => seamless)
  function swell(t, s) {
    var c = wrap01(2 * t + 0.15);
    var g = Math.exp(-Math.pow((s - c) / 0.13, 2)) * Math.sin(Math.PI * c);
    return 0.3 * g;
  }

  function plume(t, side, scale) {
    scale = scale || 1;
    var out = '';
    // ink body: hair at the tip, belly around 0.35, thins to a point at ~0.68 (break)
    var brk = 0.7 + 0.05 * noise(t, 5, 2);
    var body = ribbon(pts(t, 0, brk, 18, side), function (u) {
      var s = u * brk;
      var w = 0.5 + 1.25 * smooth(u / 0.3) + 0.5 * Math.sin(Math.PI * Math.pow(u, 1.3)) + swell(t, s);
      w *= smooth((1 - u) / 0.3);
      return w * scale;
    }, { caps: ['round', 'flat'] });
    // drifting wisp after the break: tapered on both ends, a little offset
    var w0 = brk + 0.03, w1 = Math.min(0.98, w0 + 0.25);
    var wisp = ribbon(pts(t, w0, w1, 10, side), function (u) {
      return (1.1 * Math.sin(Math.PI * Math.pow(u, 0.75))) * scale;
    });
    // dissolving tail in fade
    var tail = ribbon(pts(t, w1 - 0.04, 1.0, 6, side), function (u) {
      return 0.7 * Math.sin(Math.PI * Math.pow(u, 0.5)) * scale;
    });
    return { body: body, wisp: wisp, tail: tail };
  }

  function holder() {
    // long low slim tray: flat underside on y = 16, gently rising pointed ends
    return 'M1.3 13.9 C2.2 14.4 3.2 14.55 4.2 14.55 L13.8 14.55 C14.8 14.55 15.8 14.4 16.7 13.9 ' +
      'C16.4 15.3 15.6 16 14.4 16 L3.6 16 C2.4 16 1.6 15.3 1.3 13.9 Z';
  }

  function stick() {
    // plain slim stick from the tray's hole to the burning end; slightly finer at the end
    var a = [3.0, 14.1], b = TIP;
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    var w0 = 0.6, w1 = 0.5;
    var P = function (p, w) { return [p[0] + nx * w, p[1] + ny * w]; };
    var p1 = P(a, w0), p2 = P(b, w1), p3 = P(b, -w1), p4 = P(a, -w0);
    return polyPath([p1, p2, p3, p4], true);
  }

  function ash() {
    // tiny gap before the burning end: the glowing segment
    var k = 0.9, a = [3.0, 14.1], b = TIP;
    var c = mix(a, b, k);
    return tp(rectPath(c[0] - 0.3, c[1] - 0.8, 0.6, 1.6, 0), rot(c[0], c[1], Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI));
  }

  return { plume: plume, holder: holder, stick: stick, ash: ash, TIP: TIP };
})();

var ICON = {
  id: "incense",
  frames: 64,
  at: function (t) {
    var s = '';
    // second plume: occasionally, peels off and merges back
    var two = bump(t, 0.5, 0.64, 0.79, 0.96, smooth);
    var a = INC.plume(t, 0, 1);
    s += ink(a.body) + ink(a.wisp) + fade(a.tail);
    if (two > 0.02) {
      var b = INC.plume(t, 3.0 * two, 0.72 * (0.6 + 0.4 * smooth(two / 0.5)));
      var g = 0.7 * smooth((two - 0.5) / 0.2);
      s += (g > 0.05 ? cutAround(b.body, g) + front(b.body) + cutAround(b.wisp, g) + front(b.wisp) : ink(b.body) + ink(b.wisp)) + fade(b.tail);
    }
    s += ink(INC.holder());
    s += ink(INC.stick());
    s += cut(INC.ash());
    return s;
  }
};
