// 향 (Incense) — v6, "plank + rising column".
// The universal incense holder: a 1.5 pt plank on the ground, a 1.0 pt stick inserted diagonally near its
// left end at 38°. The far end burns (a small cut and a finer ash segment). From it a column of smoke
// rises: a fine root at the ember, then a calligraphic column that swells and thins as puffs travel up it,
// wavering with layered noise and leaning left into the empty upper-left. A side wisp peels off the column,
// drifts left and dissolves; the top of everything dissolves in fade.

var INC = (function () {
  var PLANK_Y = 14.5;            // plank top (1.5 thick, bottom on the ground line y = 16)
  var BASE = [3.1, 15.3];        // where the stick enters the plank
  var ANG = -38;
  var LEN = 8.7;
  var ca = Math.cos(ANG * Math.PI / 180), sa = Math.sin(ANG * Math.PI / 180);
  var TIP = [BASE[0] + ca * LEN, BASE[1] + sa * LEN];
  var TOP = 1.5;

  // centre of the column at height s (0 = ember, 1 = top): rises almost straight, wavers, then is carried left
  function spine(t, s) {
    var y = lerp(TIP[1] - 0.15, TOP, s);
    var lean = -(3.0 + 0.5 * noise(t, 3, 2)) * Math.pow(s, 1.4);
    var ramp = smooth((s - 0.04) / 0.32);
    var amp = (0.75 + 0.75 * s) * (0.9 + 0.2 * noise(t, 7, 2)) * ramp;
    var ph = TAU * (s * 1.05 - 2 * t) + 0.8 * noise(t, 11, 2) + 2.0;
    var wave = amp * Math.sin(ph) + 0.3 * s * s * Math.sin(TAU * (s * 1.9 - 3 * t) + 1.1)
      + 0.2 * s * noise(t + 0.37 * s, 19, 2);
    return [TIP[0] + lean + wave, y];
  }

  // puffs that ride up the column (3 per loop, each swelling and thinning over its trip => seamless)
  function puffs(t, s) {
    var w = 0;
    for (var k = 0; k < 3; k++) {
      var c = wrap01(3 * t + k / 3) * 1.1 - 0.05;
      var a = 0.8 * smooth((c - 0.08) / 0.4) * Math.sin(Math.PI * clamp((c + 0.05) / 1.1)) * (0.8 + 0.25 * Math.sin(TAU * (t + k * 0.29)));
      w += a * Math.exp(-Math.pow((s - c) / 0.1, 2));
    }
    return w;
  }

  function column(t) {
    var end = 0.9;
    var p = [];
    for (var i = 0; i <= 34; i++) p.push(spine(t, end * i / 34));
    var body = ribbon(p, function (u) {
      var s = u * end;
      var w = 0.55 + 0.5 * smooth(s / 0.2) + 0.95 * smooth((s - 0.25) / 0.35) + puffs(t, s);
      w *= Math.pow(smooth((1 - u) / 0.28), 0.8);
      return w;
    });
    var q = [];
    var s0 = 0.74;
    for (var j = 0; j <= 12; j++) q.push(spine(t, lerp(s0, 1.0, j / 12)));
    var tail = ribbon(q, function (u) { return (1.5 + 0.5 * u) * Math.pow(Math.sin(Math.PI * (0.3 + 0.58 * u)), 0.6) * smooth(u / 0.25 + 0.3); }, { caps: ['flat', 'round'] });
    return { body: body, tail: tail };
  }

  // strands that peel off the column's left side and drift up and away (2 per loop, staggered)
  function strands(t) {
    var out = [];
    for (var k = 0; k < 2; k++) {
      var c = wrap01(2 * t + k / 2 + 0.2);
      var env = smooth(c / 0.3) * Math.pow(1 - c, 1.6);
      if (env < 0.04) continue;
      env = env / 0.62;
      var s0 = 0.2 + 0.34 * c, len = k ? 0.34 : 0.42;
      var off = (k ? 2.0 + 0.4 * easeOut(c) : -(2.2 + 0.6 * easeOut(c)));
      var p = [];
      for (var i = 0; i <= 10; i++) {
        var u = i / 10, q = spine(t - 0.03, s0 + len * u);
        p.push([q[0] + off * (0.6 + 0.4 * u), q[1]]);
      }
      out.push(ribbon(p, (function (k) { return function (u) { return (k ? 1.05 : 1.2) * env * Math.pow(Math.sin(Math.PI * u), 0.7); }; })(k)));
    }
    return out;
  }

  function bar(d0, d1, h0, h1) {
    var nx = -sa, ny = ca;
    var a = [BASE[0] + ca * d0, BASE[1] + sa * d0], b = [BASE[0] + ca * d1, BASE[1] + sa * d1];
    return polyPath([[a[0] + nx * h0, a[1] + ny * h0], [b[0] + nx * h1, b[1] + ny * h1],
      [b[0] - nx * h1, b[1] - ny * h1], [a[0] - nx * h0, a[1] - ny * h0]], true);
  }

  function plank() { return rectPath(1.5, PLANK_Y, 15, 16 - PLANK_Y, 0.3); }
  function stick() { return bar(0, LEN - 1.35, 0.5, 0.5); }
  function ash() { return bar(LEN - 0.75, LEN, 0.4, 0.38); }

  return { column: column, strands: strands, plank: plank, stick: stick, ash: ash };
})();

var ICON = {
  id: "incense",
  frames: 64,
  at: function (t) {
    var s = '';
    var c = INC.column(t), st = INC.strands(t);
    s += ink(c.body) + fade(c.tail);
    for (var i = 0; i < st.length; i++) s += ink(st[i]);
    s += ink(INC.plank()) + ink(INC.stick()) + ink(INC.ash());
    return s;
  }
};
