# Layerhover menu bar icons — design language

## What these icons are

Layerhover is a macOS menu bar app for Figma designers. Its menu bar icon is chosen from 13 calm,
"peace of mind" motifs — a small place to rest the eyes during stressful design work. The icon is an
18 × 18 pt monochrome template image (36 px on Retina), drawn black and recoloured by macOS to dark
or white, sitting right next to system icons (Wi-Fi, battery). It loops a slow animation at 8 fps.

The user is a senior product designer and has rejected two rounds:

1. "모션이라고 하면 그게 느껴질 수준은 되어야" — motion that moves 1–2 pt is invisible. Motion must be felt.
2. **"둥글고 막대로만 가능해 디자인 완성도가 너무 떨어진다"** — the current set is assembled from circles
   and round-capped sticks: ball heads on stick limbs, sausage-shaped strokes, plain ellipses for wings,
   stacked rectangles for buildings. It reads as a programmer's placeholder, not a designed icon.

The bar for this round: **icons a top product designer would be proud to ship** — the craft level of SF
Symbols' filled glyphs, the best museum/wayfinding pictograms, Japanese kamon. Calm, precise, beautiful.

## Non-negotiables

1. **No circle-and-stick construction.** No ball head floating on a neck line. No limbs, rods, stems,
   tails or wisps drawn as constant-width round-capped strokes. No plain ellipses standing in for
   wings, petals or leaves. No stacks of plain rectangles standing in for architecture.
2. **Filled silhouettes with designed contours.** Every major form is a deliberate shape: smooth Bézier
   outlines with intentional curvature, tension and corners. Draw paths by hand (C/Q curves) and/or use
   `ribbon()` / `petal()` for tapering forms. Curves are smooth (no kinks, lumps or wobble at 8×).
3. **Taper and modulation.** Organic parts thicken and thin along their length (a forearm is wider at
   the elbow than at the wrist; a stem is thicker at the base; smoke thins to nothing; a rod is thick at
   the grip and fine at the tip). Contrast of thick and thin is what makes a silhouette feel drawn.
4. **Negative space is the detailing tool.** Inner details (folds, veins, overlaps, separations,
   windows, eyes) are carved with cuts. Overlapping parts are separated with a clean gap
   (`cutAround(part, gap)` + `front(part)`), not merged into a blob.
5. **Recognisable at actual size, beautiful at 8×.** The subject must read instantly in the menu bar
   (check the bars image, light AND dark). Then it must hold up enlarged.
6. **Calm.** Gentle, balanced compositions. No visual noise.

## Grid and metrics (pt)

| | |
|---|---|
| Canvas | 18 × 18. Everything stays inside the live area x, y ∈ [1, 17]. |
| Ground line | y = 16 for anything that stands, sits or floats on something (base, floor, water). |
| Optical size | Upright subjects about 13–15 tall; wide subjects about 14–16 wide. Compare with the SF Symbols in the bars image: comfortably the same family size — not tiny, not bulky. |
| Weight (frame 0 coverage of the live area) | about 24–40 %. Light subjects (constellation, smoke) may go to ~15 % but must still read. |
| Cut (negative-space) width | standard 0.8; minimum 0.6. Separation gap between overlapping parts 0.7–0.9. |
| Smallest positive feature | 1.0 (0.9 tolerated at tips). Hairlines 0.6–0.7 only for things that are literally lines (fishing line, star links). |
| Terminals | organic: tapered to a point or softly rounded (0.3–0.5 radius). Architectural: crisp, 0.2–0.3 radius. Full round caps only where the real object is round (a paw). |
| Pixel fit | Put dominant horizontals and verticals (ground, water line, roof edges, edges of panels) on a 0.5 pt grid so they render crisp at 2×. |
| Detail budget | 2–5 inner details (cuts). Each must stay open at 2× (check the pixel zoom). |

## Figures (people and animals)

- One continuous silhouette. Head, neck and shoulders flow into each other, or the head is separated by
  a deliberate thin cut — never a ball floating above a stick neck.
- Heads have character: hair, a hat, a crown, ears, a muzzle — and are seldom perfect circles.
- Limbs are tapered ribbons whose spine bends at the joints (elbow, knee); hands and feet are small
  designed shapes (mitten hand, heel and toe), not round blobs.
- Clothing, drapery and props carry the story and break up the silhouette.
- Pose carries emotion — calm, balance, effort, play. Weight sits convincingly on the ground or board.

## Nature

- Leaves, petals, tepals, flames: `petal()` with bend and asymmetry, or hand-drawn curves; pointed or
  softly rounded tips; veins as tapered cuts (a cut line that thins out works well).
- Water: filled masses with designed crests — a curling lip drawn as a real curve, foam as small shapes
  or cuts, depth from layers (a back swell separated by a cut).
- Smoke: calligraphic ribbons that swell and thin to nothing, with the upper part in `fade()`.
- Stars: crafted sparkles (`sparkle()`, concave sides), sized by brightness.

## Architecture

- Crisp, symmetric, proportioned like the real building. Gentle curves where the real thing curves
  (upturned eaves). Detail carved as cuts. Every tier visibly different in width.

## Motion

- **Felt at a glance at actual size.** The key change moves ≥ 1.5 pt or is a clear state change
  (open/closed, bright/dim, out/in). The lab reports the largest change; aim for 2–6 pt.
- **Natural.** Ease in and out. Anticipation before a big action, follow-through after it, overlapping
  action (secondary parts lag the primary). Continuous flows (water, smoke) still vary organically —
  use `noise()` and layered whole-number cycles, not one repeating sine.
- **Rhythm.** A calm baseline with periodic events beats constant jitter.
- **Seamless.** Frame N−1 flows into frame 0 (check the seam number and the strip).
- **Craft in every frame.** Animate the crafted parts: rotate about real pivots, `bend()` flexible
  parts, `move()`, or `morph()` between crafted key poses drawn with the same path structure. Never
  swap to cruder geometry for in-between frames.
- **Frame 0 is the poster** used when motion is off — the most characteristic, balanced pose.
- 8 fps, 32–64 frames (4–8 s). Neighbouring frames usually differ by ≤ 1.2 pt; a deliberate fast
  action (a strike, a whip) may jump up to ~3 pt for one or two frames.

## Kit patterns

```js
// tapered limb with a bent elbow: spine through shoulder → elbow → wrist, width per point
ink(ribbon([[6.2, 7.4], [4.9, 9.6], [6.4, 10.8]], [1.8, 1.35, 0.95], { caps: ['round', 'round'] }));

// a front part over another with a clean 0.8 pt gap
s += cutAround(frontPetal, 0.8) + front(frontPetal);

// bend a rod by 1.6 pt at its tip around its grip at (5, 11) → tip (15, 3)
var rod = ribbon([[5, 11], [15, 3]], function (s) { return lerp(1.1, 0.45, s); });
s += ink(rod, bend(5, 11, 15, 3, -1.6 * tug));

// pose morph: two crafted key poses with the same command structure
var torso = morph(TORSO_PENSIVE, TORSO_UPRIGHT, smooth(k));

// organic sway: gusts that build and calm, seamless over the loop
var sway = 9 * (0.3 + 0.7 * Math.max(0, loop(t, 2, 0.15))) * loop(t, 6) + 2 * noise(t, 3);
```

## Self-check — every item must pass before you finish

- [ ] No circle-and-stick construction; no constant-width round-capped strokes as body parts.
- [ ] All contours smooth and intentional at 8× (no kinks, lumps, wobble, accidental bumps).
- [ ] Reads instantly at actual size in light AND dark bars; holds up beside the SF Symbols.
- [ ] Pixel zoom: cuts stay open at 2×, no slivers, no mushy blobs; dominant edges crisp.
- [ ] Frame 0 is a beautiful, balanced poster.
- [ ] Motion visible at actual size (largest change ≥ 1.5 pt or a clear state change); natural easing;
      secondary motion; no jitter; seam smooth.
- [ ] Lab: no frames outside the live area; thin parts ≤ 3 % unless they are intended lines; base fixed
      when the subject stands on something.
- [ ] The brief is followed exactly — the user's own words come first.
