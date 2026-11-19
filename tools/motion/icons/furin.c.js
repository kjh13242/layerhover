// 풍경 (Furin, Japanese wind chime) — concept C, "from below" (variant of A: the rim seen as an ellipse with the dark opening carved in).
// A blown-glass bell shaped like a sphere with its lower third cut away (the classic Edo furin: widest at
// the equator, the rim tucked in, a tiny flared lip). Glass is suggested by one tapered highlight cut on
// the upper-left shoulder. Below the rim hangs the clapper (zetsu), then a thread and a long paper tanzaku
// with a brushed verse carved as a tapered slit.
// Motion: a three-link chain. The bell sways a little about its cord, the clapper swings a bit more inside
// it, the strip swings most, bends against its swing and twists now and then. Halfway through, a gust
// leans the strip downwind, the clapper strikes the rim and a small glint rings out beside the bell.
var ICON = (function () {
  var STYLE = 'open';                // 'solid' | 'glass' | 'open'
  var FRAMES = 56;
  var HANG = [9, 1.0];                // cord hook
  var R = 3.55, CY = 5.45, RIM_A = 40; // bell sphere, rim angle below the equator (deg)
  var CX = 9;
  var RIM_X = R * Math.cos(RIM_A * Math.PI / 180), RIM_Y = CY + R * Math.sin(RIM_A * Math.PI / 180);
  var LIP = 0.38;                     // lip depth
  var P = [9, 3.2];                   // clapper pivot inside the bell
  var CL_Y = RIM_Y + LIP + 0.75;      // clapper top
  var CL_H = 0.95, CL_W = 2.0;
  var Q = [9, CL_Y + CL_H];           // strip thread pivot (bottom of the clapper)
  var ST_TOP = Q[1] + 0.85, ST_W = 2.7, ST_BOT = 16.9;

  // cubic approximation of a circular arc, a0 → a1 in degrees (0 = right, 90 = down)
  function arcC(cx, cy, r, a0, a1) {
    var n = Math.ceil(Math.abs(a1 - a0) / 60), d = '';
    for (var i = 0; i < n; i++) {
      var b0 = (a0 + (a1 - a0) * i / n) * Math.PI / 180, b1 = (a0 + (a1 - a0) * (i + 1) / n) * Math.PI / 180;
      var k = 4 / 3 * Math.tan((b1 - b0) / 4);
      var p0 = [cx + r * Math.cos(b0), cy + r * Math.sin(b0)], p3 = [cx + r * Math.cos(b1), cy + r * Math.sin(b1)];
      var p1 = [p0[0] - k * r * Math.sin(b0), p0[1] + k * r * Math.cos(b0)], p2 = [p3[0] + k * r * Math.sin(b1), p3[1] - k * r * Math.cos(b1)];
      d += ' C' + f(p1[0]) + ' ' + f(p1[1]) + ' ' + f(p2[0]) + ' ' + f(p2[1]) + ' ' + f(p3[0]) + ' ' + f(p3[1]);
    }
    return d;
  }

  function bell() {
    // sphere from the lower-left rim over the top to the lower-right rim, then a small flared lip
    var a0 = 180 - RIM_A, a1 = 360 + RIM_A, x0 = CX - RIM_X, x1 = CX + RIM_X;
    var d = 'M' + f(x0) + ' ' + f(RIM_Y) + arcC(CX, CY, R, a0, a1);
    if (STYLE === 'open') {
      // seen a little from below: the rim is an ellipse
      d += ' C' + f(x1 + 0.25) + ' ' + f(RIM_Y + 0.3) + ' ' + f(x1 + 0.1) + ' ' + f(RIM_Y + LIP + 0.5) + ' ' + f(CX) + ' ' + f(RIM_Y + LIP + 0.55);
      d += ' C' + f(x0 - 0.1) + ' ' + f(RIM_Y + LIP + 0.5) + ' ' + f(x0 - 0.25) + ' ' + f(RIM_Y + 0.3) + ' ' + f(x0) + ' ' + f(RIM_Y) + 'Z';
    } else {
      d += ' C' + f(x1 + 0.12) + ' ' + f(RIM_Y + 0.12) + ' ' + f(x1 + 0.3) + ' ' + f(RIM_Y + LIP - 0.1) + ' ' + f(x1 + 0.32) + ' ' + f(RIM_Y + LIP);
      d += ' L' + f(x0 - 0.32) + ' ' + f(RIM_Y + LIP);
      d += ' C' + f(x0 - 0.3) + ' ' + f(RIM_Y + LIP - 0.1) + ' ' + f(x0 - 0.12) + ' ' + f(RIM_Y + 0.12) + ' ' + f(x0) + ' ' + f(RIM_Y) + 'Z';
    }
    return d;
  }
  // the knob the cord ties into
  function knob() { return rectPath(CX - 0.7, CY - R - 0.55, 1.4, 0.9, 0.3); }
  // tapered highlight: a crescent on the upper-left shoulder
  function highlight() {
    return ribbon(arcPts(CX, CY, R - 1.05, 192, 252, 10), function (s) { return 0.95 * Math.pow(Math.sin(Math.PI * s), 0.8); });
  }
  // glass shell: the inside of the bell (concept B)
  function inner() {
    var r = R - 1.0, a = RIM_A + 6, x0 = CX - r * Math.cos(a * Math.PI / 180), y0 = CY + r * Math.sin(a * Math.PI / 180);
    return 'M' + f(x0) + ' ' + f(y0) + arcC(CX, CY, r, 180 - a, 360 + a) + ' L' + f(CX + RIM_X - 0.75) + ' ' + f(RIM_Y + LIP + 0.6) + ' L' + f(CX - RIM_X + 0.75) + ' ' + f(RIM_Y + LIP + 0.6) + 'Z';
  }
  // rim opening seen from below (concept C)
  function opening() { return ellipsePath(CX, RIM_Y + 0.12, RIM_X - 0.75, 0.38, 0); }
  // clapper: a short glass rod with softened ends
  function clapper(y) {
    return 'M' + f(CX - CL_W / 2 + 0.2) + ' ' + f(y) + ' L' + f(CX + CL_W / 2 - 0.2) + ' ' + f(y) +
      ' C' + f(CX + CL_W / 2 + 0.1) + ' ' + f(y) + ' ' + f(CX + CL_W / 2 + 0.1) + ' ' + f(y + CL_H) + ' ' + f(CX + CL_W / 2 - 0.2) + ' ' + f(y + CL_H) +
      ' L' + f(CX - CL_W / 2 + 0.2) + ' ' + f(y + CL_H) +
      ' C' + f(CX - CL_W / 2 - 0.1) + ' ' + f(y + CL_H) + ' ' + f(CX - CL_W / 2 - 0.1) + ' ' + f(y) + ' ' + f(CX - CL_W / 2 + 0.2) + ' ' + f(y) + 'Z';
  }
  // tanzaku: a long paper strip, crisp corners
  function strip() { return rectPath(CX - ST_W / 2, ST_TOP, ST_W, ST_BOT - ST_TOP, 0.25); }
  // the brushed verse: a tapered slit that swells and thins like one stroke of ink
  function verse() {
    return ribbon([[CX + 0.05, ST_TOP + 1.2], [CX - 0.05, ST_TOP + 2.6], [CX + 0.05, ST_BOT - 1.3]], function (s) {
      return 0.75 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * s)), 0.6) * (1 - 0.35 * s);
    });
  }

  // ── motion ─────────────────────────────────────────────────────────────────────────────────────
  function gust(t) { return bump(t, 0.38, 0.52, 0.66, 0.9, smooth); }
  function pose(t) {
    var g = gust(t), e = 0.62 + 0.18 * noise(t, 4, 2) + 0.55 * g;
    var ph = TAU * (4 * t + 0.13) + 0.35 * noise(t, 3, 2);
    // wind blows from the left: the chain leans right (negative angles) while it gusts
    var bellA = -2.6 * e * Math.sin(ph) - 2.5 * g;
    var clapA = -4.5 * e * Math.sin(ph - 0.5) - 2.0 * g;
    var stripA = -12 * e * Math.sin(ph - 1.15) - 11 * g;
    // bend of the strip: it trails its swing (minus its angular velocity) and flutters in the gust
    var vel = -12 * e * Math.cos(ph - 1.15);
    var flutter = (0.25 + 0.6 * g) * Math.sin(TAU * 11 * t + 0.4 * noise(t, 8, 2));
    var bendv = 0.06 * vel + flutter;
    // twist: the strip turns a little edge-on now and then
    var tw = 1 - 0.22 * smooth(0.5 + 0.5 * noise(t, 9, 2)) - 0.18 * g * (0.5 + 0.5 * Math.sin(TAU * 7 * t));
    // ring: the clapper strikes the rim at the top of the gust
    var ring = pulse(t, 0.545, 0.62);
    return { bell: bellA, clap: clapA, strip: stripA, bend: bendv, tw: tw, ring: ring };
  }

  function at(t) {
    var p = pose(t), s = '';
    var B = rot(HANG[0], HANG[1], p.bell);
    var C = chain(rot(P[0], P[1], p.clap), B);
    var S = chain(scaleAt(CX, 0, p.tw, 1), bend(Q[0], ST_TOP, Q[0], ST_BOT, p.bend), rot(Q[0], Q[1], p.strip), C);
    // cord
    s += hairline('M' + HANG[0] + ' ' + HANG[1] + ' L' + CX + ' ' + f(CY - R), 0.65, B);
    s += ink(knob(), B) + ink(bell(), B);
    if (STYLE === 'solid') s += cut(highlight(), B);
    if (STYLE === 'glass') s += cut(inner(), B) + front(clapper(RIM_Y - 1.6), C) + frontLine('M' + CX + ' ' + f(P[1] + 0.2) + ' L' + CX + ' ' + f(RIM_Y - 1.6), 0.6, C);
    if (STYLE === 'open') s += cut(opening(), B) + cut(highlight(), B);
    // clapper below the rim, kept clear of the glass by a clean gap
    if (STYLE !== 'glass') {
      s += cutAround(clapper(CL_Y), 0.7, C) + front(clapper(CL_Y), C);
      s += frontLine('M' + CX + ' ' + f(RIM_Y) + ' L' + CX + ' ' + f(CL_Y), 0.6, C);
    } else {
      s += frontLine('M' + CX + ' ' + f(RIM_Y - 0.6) + ' L' + CX + ' ' + f(CL_Y + CL_H), 0.6, C);
    }
    // thread and strip
    s += hairline('M' + Q[0] + ' ' + f(Q[1] - 0.2) + ' L' + Q[0] + ' ' + f(ST_TOP + 0.3), 0.6, S);
    s += ink(strip(), S) + cut(verse(), S);
    // ring: a small glint beside the bell on the side the clapper strikes
    if (p.ring > 0.05) {
      var r = 1.25 * p.ring;
      s += ink(sparkle(15.2, 6.6, r, { inner: 0.2 }));
    }
    return s;
  }
  return { id: "furin.c", frames: FRAMES, at: at };
})();
