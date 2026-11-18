// Example only (not shipped): shows how the drawing kit fits together.
// A twig with one leaf; the leaf swings in gusts. Every part is a filled shape — no round-capped sticks.
var ICON = {
  id: "_example",
  frames: 40,
  at: function (t) {
    // gusts: calm most of the time, two stronger pushes per loop (seamless because the cycles are whole numbers)
    var gust = 0.35 + 0.65 * Math.pow(Math.max(0, loop(t, 2, 0.1)), 2);
    var sway = 14 * gust * loop(t, 4) + 3 * noise(t, 7);

    // twig: tapered ribbon, thicker where it grows out of the frame edge
    var twig = ribbon([[1.4, 4.2], [6, 3.1], [11.5, 3.4], [16.4, 2.4]], function (s) { return lerp(1.5, 0.5, s); }, { caps: ['flat', 'round'] });
    // a small bud on the twig
    var bud = petal(12.6, 3.3, 2.3, 1.2, -60, { tip: 'point', base: 0.5 });

    // leaf hangs from the twig at (8.6, 3.3) and swings around that point
    var pivot = rot(8.6, 3.3, sway);
    var stem = ribbon([[8.6, 3.3], [8.9, 4.6], [9.2, 5.6]], [0.75, 0.6, 0.55]);
    var blade = petal(9.2, 5.4, 10.4, 6.2, 82, { peak: 0.42, bend: -0.8, fat: 1.1 });
    var vein = 'M9.3 6.6C9.5 9 9.7 11.3 9.8 13.6';
    var sideVeins = 'M9.45 8.7L7.6 7.5M9.6 10.8L11.6 9.4M9.7 12.6L8.1 11.6';

    return ink(twig) + ink(bud)
      + ink(stem, pivot) + ink(blade, pivot)
      + cutLine(vein, 0.6, pivot) + cutLine(sideVeins, 0.5, pivot);
  }
};
