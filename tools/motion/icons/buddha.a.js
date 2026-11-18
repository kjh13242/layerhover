// 반가사유상 (Pensive Bodhisattva, National Treasure 83) — variant A: recognizability first.
// Frontal view as the statue is seen: low three-mound crown (삼산관), round face bowed toward the right hand,
// fingertips on the cheek, elbow on the big rounded knee of the crossed leg, left hand on the crossed ankle,
// robe cascading over the round stool, pendant left leg to a lotus footrest.
// Proportions taken from the statue (tall and slender, width ≈ 0.7 × height here); head enlarged slightly
// for the menu bar.
//
// Motion — 고쳐 앉기 (re-settling), 6 s: a moment of stillness, a small sink (anticipation), then the back
// straightens and the head lifts off the fingertips (the hand eases away first), the shoulders settle,
// one slow breath, and the figure sinks back: the hand returns to the cheek a moment before the head
// comes to rest on it. Stool, robe, legs and footrest never move.
var ICON = {
  id: "buddha",
  frames: 48,
  at: function (t) {
    return figure(timeline(t));
  }
};

// ── timing: layered, eased, seamless (everything is back at rest before t = 1) ──
function timeline(t) {
  var antic = pulse(t, 0.04, 0.17);                                   // sink a little deeper first
  var torso = seg(t, 0.12, 0.37, smoother) - seg(t, 0.62, 0.86, smoother);
  var head = seg(t, 0.15, 0.41, smoother) - seg(t, 0.65, 0.92, smoother);   // head lags the back
  var hand = seg(t, 0.12, 0.28, smooth) - seg(t, 0.63, 0.83, smooth);       // hand leaves first, returns first
  var over = pulse(t, 0.34, 0.5);                                     // shoulders overshoot, then settle
  var breath = pulse(t, 0.48, 0.66);                                  // one slow breath at the top
  var nestle = pulse(t, 0.86, 1.0);                                   // head settles onto the hand
  return {
    lean: lerp(-5, 0.6, torso) - 1.2 * antic,
    stretch: lerp(0.95, 1.02, torso) - 0.012 * antic + 0.012 * over + 0.016 * breath,
    widen: 1 + 0.025 * breath,
    tilt: lerp(-14, 2, head) - 2.5 * antic - 2 * nestle,
    drop: lerp(0.18, -0.38, head) + 0.12 * antic + 0.08 * over - 0.05 * breath + 0.08 * nestle,
    hand: hand
  };
}

var HIP = [9.0, 10.2];

// ── upright torso (neck to hips), absolute coords; posed by lean, stretch and breath about the hip ──
// slender and bare, narrow sloping shoulders, slim waist
var TORSO =
  'M8.5 4.3L9.5 4.3' +
  'C9.5 4.75 9.53 5.02 9.66 5.24' +
  'C9.98 5.52 10.45 5.66 10.78 5.86' +
  'C11.1 6.04 11.2 6.38 11.15 6.7' +
  'C11.1 6.94 10.88 7.04 10.64 7.1' +
  'C10.25 7.36 10.05 7.72 10.05 8.1' +
  'C10.05 8.55 10.3 8.9 10.42 9.3' +
  'L10.42 10.2L7.58 10.2L7.58 9.3' +
  'C7.7 8.9 7.95 8.55 7.95 8.1' +
  'C7.95 7.72 7.75 7.36 7.36 7.1' +
  'C7.12 7.04 6.9 6.94 6.85 6.7' +
  'C6.8 6.38 6.9 6.04 7.22 5.86' +
  'C7.55 5.66 8.02 5.52 8.34 5.24' +
  'C8.47 5.02 8.5 4.75 8.5 4.3Z';

// ── head in local coords: pivot at origin (top of neck), chin at (0, 0.4) ──
var FACE =
  'M0 0.4C0.8 0.4 1.26 -0.08 1.28 -0.8' +
  'C1.3 -1.32 1.16 -1.72 0.95 -2L-0.95 -2' +
  'C-1.16 -1.72 -1.3 -1.32 -1.28 -0.8' +
  'C-1.26 -0.08 -0.8 0.4 0 0.4Z';
// 삼산관: a low band flaring slightly upward, two soft corner mounds and a taller middle mound (a soft 山)
var CROWN =
  'M-1.18 -1.72C-0.8 -1.86 0.8 -1.86 1.18 -1.72' +
  'C1.3 -2.0 1.4 -2.36 1.46 -2.7' +
  'C1.5 -2.97 1.34 -3.14 1.12 -3.14' +
  'C0.9 -3.13 0.72 -3.08 0.58 -3.02' +
  'C0.46 -3.3 0.26 -3.55 0 -3.56' +
  'C-0.26 -3.55 -0.46 -3.3 -0.58 -3.02' +
  'C-0.72 -3.08 -0.9 -3.13 -1.12 -3.14' +
  'C-1.34 -3.14 -1.5 -2.97 -1.46 -2.7' +
  'C-1.4 -2.36 -1.3 -2.0 -1.18 -1.72Z';
// the crown sits on the domed forehead
var BAND_CUT = 'M-1.6 -1.68C-0.8 -1.86 0.8 -1.86 1.6 -1.68';

// ── fixed parts (absolute coords) ──
// crossed right leg: big rounded knee on the left, tapering to the ankle, the sole turned up at the right
var CROSSED =
  'M5.65 9.25C7.4 9.25 9.6 9.55 11.2 9.8' +
  'C11.65 9.86 12.1 9.75 12.55 9.6' +
  'C12.95 9.47 13.3 9.5 13.38 9.8' +
  'C13.45 10.15 13.15 10.45 12.75 10.6' +
  'C12.4 10.75 12 11.02 11.5 11.1' +
  'C9.8 11.25 7.5 11.28 5.75 11.27' +
  'C5.15 11.26 4.65 10.85 4.62 10.28' +
  'C4.6 9.7 5.05 9.25 5.65 9.25Z';

// pendant left leg: knee under the crossed foot, calf, slim ankle, foot set on the lotus (drawn in front)
var PENDANT =
  'M11.02 12.2C11.02 11.9 11.33 11.72 11.72 11.72' +
  'C12.12 11.72 12.44 11.9 12.46 12.22' +
  'C12.5 12.62 12.58 13.0 12.47 13.38' +
  'C12.38 13.68 12.24 13.92 12.19 14.12' +
  'C12.55 14.24 12.98 14.44 13.18 14.68' +
  'C13.34 14.9 13.2 15.08 12.8 15.08' +
  'L11.55 15.08' +
  'C11.2 15.08 11.08 14.88 11.2 14.6' +
  'C11.3 14.38 11.3 14.14 11.27 13.92' +
  'C11.18 13.4 11.02 12.8 11.02 12.2Z';
// lotus footrest: a small inverted bell whose rim flares into soft petal tips
var FOOTREST =
  'M11.2 16L13.66 16' +
  'C13.76 15.72 13.88 15.48 14.06 15.32' +
  'C14.3 15.12 14.26 14.9 14.02 14.92' +
  'C13.56 14.98 13.0 15.02 12.42 15.02' +
  'C11.84 15.02 11.28 14.98 10.82 14.92' +
  'C10.58 14.9 10.54 15.12 10.78 15.32' +
  'C10.96 15.48 11.1 15.72 11.2 16Z';

function pedestal() {
  // the robe cascades over the round stool: the upper tier flares out under the knee, its hem a fold that
  // fades into the cloth; the pendant leg hangs in front of the right side
  var d = 'M5.5 10.9L11.35 10.9L11.35 13.9' +
    'C11.35 14.5 10.05 14.7 9.86 15.28' +
    'C9.8 15.5 9.78 15.76 9.78 16' +
    'L5.0 16' +
    'C5.22 15.62 5.36 15.0 5.3 14.3' +
    'C5.24 13.9 5.12 13.58 5.02 13.32' +
    'C4.62 13.16 4.36 12.88 4.38 12.5' +
    'C4.4 11.92 5.08 11.46 5.5 10.9Z';
  var fold = ribbon([[4.95, 13.22], [6.15, 13.42], [7.45, 13.3]], function (u) { return lerp(0.64, 0.0, u * u); });
  // the knee rests above the cloth: a fading seam along its underside
  var knee = ribbon([[4.72, 10.86], [5.6, 11.36], [6.9, 11.42]], function (u) { return lerp(0.62, 0.0, u * u); });
  return ink(d) + cut(fold) + cut(knee);
}

function figure(p) {
  var T = chain(scaleAt(HIP[0], 7.6, p.widen, 1), scaleAt(HIP[0], HIP[1], 1, p.stretch), rot(HIP[0], HIP[1], p.lean));
  var pv = T(9.0, 4.95);
  var H = chain(scaleAt(0, 0, 0.95), rot(0, 0, p.tilt), move(pv[0], pv[1] + p.drop));

  // right arm: shoulder follows the torso, elbow rests on the knee, fingertips on the cheek → eased away
  var Sr = T(7.35, 6.5), Er = [5.75, 8.92];
  var Fc = H(-1.14, -1.22);                         // fingertips on the cheek
  var Fo = [Fc[0] - 0.95, Fc[1] + 1.15];            // eased away: the hand relaxes, lower and out
  var F = mix(Fc, Fo, p.hand);
  var a = -26 * p.hand * Math.PI / 180, hx = -0.8, hy = 1.05;
  var W = [F[0] + hx * Math.cos(a) - hy * Math.sin(a), F[1] + hx * Math.sin(a) + hy * Math.cos(a)];
  var upperR = ribbon([Sr, mix(Sr, Er, 0.5), Er], [1.3, 1.15, 1.05], { caps: ['round', 'round'] });
  // forearm thick at the elbow, slim wrist; palm wider than the wrist, fingertips curling in to the cheek
  var dx = F[0] - W[0], dy = F[1] - W[1], dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl;
  var curl = lerp(0.3, 0.12, p.hand), reach = lerp(0.08, 0.36, p.hand);
  var F2 = [F[0] + ux * reach - uy * curl, F[1] + uy * reach + ux * curl];
  var foreR = ribbon([Er, mix(Er, W, 0.5), W, mix(W, F, 0.45), F, F2], [1.24, 1.08, 0.96, 1.16, 1.02, 0.72], { caps: ['round', 'round'] });

  // left arm: shoulder follows the torso, hand rests on the crossed ankle
  var Sl = T(10.45, 6.62), Wl = [11.3, 9.25], Fl = [11.05, 9.92];
  var El = [lerp(Sl[0], Wl[0], 0.5) + 0.38, lerp(Sl[1], Wl[1], 0.5)];
  var armL = ribbon([Sl, El, Wl, Fl], [1.25, 1.1, 1.0, 0.95], { caps: ['round', 'round'] });

  var s = '';
  s += pedestal() + ink(CROSSED);
  s += ink(TORSO, T);
  s += ink(FACE, H) + ink(CROWN, H) + cutLine(BAND_CUT, 0.6, H);
  s += ink(upperR) + ink(foreR) + ink(armL);
  // the pendant leg hangs in front of the robe; its foot sits on the lotus
  s += cutAround(PENDANT, 0.6) + front(PENDANT) + front(FOOTREST);
  return s;
}
