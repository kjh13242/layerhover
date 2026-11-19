// 학 (crane) — id: crane. Direction S3: a red-crowned crane standing in shallow water, facing right.
// One compact, tapering body with the drooping tertial plume at the back (a long wing-line cut and a plume cut), long thin
// legs with the backward "knee", a long tapered S-neck, and a small head with a long straight bill.
// The water is one calligraphic stroke on the ground line, broken softly where the legs enter it.
// Motion (64 f, 8 s): stand tall → a small lift of the head (anticipation) → the neck lowers in a long forward
// arc while the body tips forward on the hips → the bill dips into the water → the crane rises back tall, the
// head lagging the neck (overlap). Ripples run out from the dip point.

var ICON = (function () {
  var NF = 64;
  var HIP = [7.0, 9.6];
  var BSCALE = scaleAt(8.4, 8.4, 0.93, 0.98);

  function P(q) { return f(q[0]) + ' ' + f(q[1]); }

  // ── body: level back, full chest at the right, the bustle (tertial plumes) draping over the tail at the left
  var BODY = 'M10.4 8.1' +
    'C10.45 9.6 9.3 10.6 7.7 10.65' +           // chest → belly
    'C6.4 10.7 5.5 10.75 4.8 11.15' +           // belly → under the bustle
    'C4.1 11.55 3.5 12.2 2.7 12.85' +           // bustle underside → plume tip
    'C2.05 12.0 1.55 10.9 1.75 9.8' +           // rounded drape at the rear
    'C2.1 8.2 4.1 6.85 6.8 6.8' +               // back
    'C8.6 6.75 10.3 7.0 10.4 8.1Z';
  // feather separations at the ends of the plumes: short tapered cuts
  function plumeCuts() {
    return cut(ribbon([[9.3, 9.25], [7.2, 9.7], [5.0, 10.2], [3.4, 11.85]], [0.0, 0.7, 0.75, 0.0])) +
           cut(ribbon([[4.6, 8.6], [3.2, 9.5], [2.45, 10.9]], [0.0, 0.7, 0.0]));
  }

  // ── legs: feathered thigh into the body, tibia down to the backward ankle, tarsus into the water
  function legs() {
    var near = ribbon([[7.5, 9.9], [7.6, 12.9], [7.3, 16.1]], [1.4, 1.05, 1.0]);
    var far = ribbon([[6.6, 9.9], [6.2, 12.8], [5.1, 16.1]], [1.35, 1.05, 1.0]);
    return ink(far) + ink(near);
  }

  // ── neck spines (same structure) and head angles
  var UP = [[9.3, 8.3], [10.6, 6.8], [10.3, 4.95], [10.75, 3.45], [11.4, 2.75]];
  var MID = [[9.4, 8.4], [10.9, 7.4], [12.0, 6.9], [12.9, 7.4], [13.4, 8.5]];
  var DIP = [[9.5, 8.5], [11.0, 8.45], [12.15, 9.3], [12.85, 10.35], [13.15, 11.2]];
  var NW = [2.5, 1.7, 1.35, 1.15, 1.1];

  // head in local coordinates: centre at 0,0, bill along +x
  var HEAD = 'M-0.85 0.05C-0.85 -0.5 -0.4 -0.78 0.05 -0.78C0.5 -0.78 0.75 -0.58 0.95 -0.4' +
    'L3.75 0.15L0.85 0.45C0.45 0.66 0.1 0.72 -0.25 0.66C-0.6 0.56 -0.85 0.4 -0.85 0.05Z';

  function spineAt(k) {
    // through MID at k = 0.5
    var a = k < 0.5 ? UP : MID, b = k < 0.5 ? MID : DIP, u = k < 0.5 ? k * 2 : (k - 0.5) * 2;
    return a.map(function (p, i) { return mix(p, b[i], u); });
  }

  // ── water: one stroke with tapered ends; breaks of half-width g at x = b
  function water(x0, x1, y, th, breaks) {
    var n = 120, prof = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n, x = lerp(x0, x1, u), e = Math.min(u, 1 - u) / 0.22, h = th / 2 * (e >= 1 ? 1 : Math.sin(Math.PI / 2 * e));
      for (var q = 0; q < breaks.length; q++) {
        var B = breaks[q], dd = (Math.abs(x - B.b) - B.g) / B.tau;
        h *= 1 - B.k * (1 - (dd <= 0 ? 0 : dd >= 1 ? 1 : Math.sin(Math.PI / 2 * dd)));
      }
      prof.push([x, h]);
    }
    var d = '', run = [];
    function flush() {
      if (run.length >= 3) {
        var up = run.map(function (p) { return [p[0], y - p[1]]; }), dn = run.map(function (p) { return [p[0], y + p[1]]; }).reverse();
        d += polyPath(up.concat(dn), true);
      }
      run = [];
    }
    for (i = 0; i <= n; i++) {
      if (prof[i][1] > 0.02) run.push(prof[i]); else if (run.length) { run.push([prof[i][0], 0]); flush(); }
      if (prof[i][1] > 0.02 && run.length === 1 && i > 0) run.unshift([prof[i - 1][0], 0]);
    }
    flush();
    return d;
  }

  return {
    id: 'crane',
    frames: NF,
    at: function (t) {
      // anticipation: the head lifts a little before it goes down
      var ant = pulse(t, 0.02, 0.2);
      // the neck: down (0.18 → 0.46), hold the dip, up (0.56 → 0.84)
      var k = seg(t, 0.09, 0.47, smooth) - seg(t, 0.56, 0.95, smooth);
      // the head lags: it tips down later and comes level later, with a small overshoot
      var kh = seg(t, 0.12, 0.49, smooth) - seg(t, 0.59, 0.985, smooth);
      var dipBob = 0.2 * pulse(t, 0.45, 0.58);    // the bill presses into the water
      var tilt = 11 * smooth(k) ;                   // body tips forward on the hips
      var B = rot(HIP[0], HIP[1], tilt), BS = chain(BSCALE, B);

      var sp = spineAt(k).map(function (p, i) {
        var q = B(p[0], p[1]);
        var w = i / 4;
        return [q[0], q[1] - 0.45 * ant * w + dipBob * w];
      });
      var s = '';
      s += legs();
      s += ink(BODY, BS) + xf(BS, plumeCuts());
      s += ink(ribbon(sp, NW));
      var end = sp[sp.length - 1];
      var ang = -8 * ant + lerp(4, 64, kh);
      var R = rot(0, 0, ang), o = R(0.3, -0.3);
      var H = chain(scaleAt(0, 0, 1.06), R, move(end[0] + o[0], end[1] + o[1]));
      s += ink(HEAD, H) + cut(circlePath(0.05, -0.12, 0.3), H);

      // ripples: the feet (soft, always), then two rings from the dip point
      var br = [
        { b: 5.1 - 1.0, g: 0.12 + 0.05 * loop(t, 2), tau: 0.45, k: 0.6 },
        { b: 7.3 + 1.0, g: 0.12 + 0.05 * loop(t, 2, 0.3), tau: 0.45, k: 0.6 }
      ];
      var dipX = 14.2;
      [0.47, 0.60].forEach(function (t0, j) {
        var ph = (t - t0) / 0.32;
        if (ph > 0 && ph < 1) {
          var r = lerp(1.35, 3.3 - j * 0.5, easeOut(ph)), g = 0.35 * smooth(ph / 0.1) * Math.pow(1 - ph, 1.4);
          var kk = smooth(g / 0.08);
          br.push({ b: dipX - r, g: g, tau: 0.6, k: kk }, { b: dipX + r, g: g, tau: 0.6, k: kk });
        }
      });
      s += ink(water(1.3, 16.7, 16.0, 1.2, br));
      return s;
    }
  };
})();
