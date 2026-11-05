# Lesson plan: Bragg's Room in a 25-minute class

✏️ **REVIEW.** The coding agent drafted this from the Lens's behaviour and its unit-tested numbers. I check it against how I'd actually teach it before submitting.

**Level:** first undergraduate course that meets X-ray diffraction (solid-state physics, materials science, physical or inorganic chemistry).
**Students should already know:** Miller indices, d-spacings in a cubic lattice (d = a / √(h² + k² + l²)), and Bragg's law (nλ = 2d sin θ).
**Setup:** Lens Studio 5.24.1 or later with this repo open, Preview set to SPECS and Interactive Preview (see the README for the controls), one laptop per pair. On a SPECS device the same activity runs with your hands and your real wall. Students work in pairs: one drives, one records.

## Learning goals

By the end, a student can:
1. explain why a reflection lights only at particular crystal orientations, and why the spot sits at **2θ** from the beam, not θ;
2. predict where a spot lands on a flat detector from θ and the crystal-to-wall distance (x = L tan 2θ);
3. predict which way a spot moves when the wavelength changes (sin θ = λ / 2d);
4. use systematic absences, backed by a positive control, to tell simple cubic from face-centred cubic.

## Before (3 min): predict on paper

Show the textbook figure (two planes, two arrows, the equation). Ask each student to answer alone, in writing:

> A crystal with a = 4.00 Å sits in a Cu Kα beam (λ = 1.54 Å), with a wall 150 cm beyond it. You turn the crystal slowly. **At what angle of turn does the (0 1 0) spot first appear, and where on the wall does it land?**

Collect the answers; don't discuss them yet. Ask the same question again at the end (see "After").

## Part A (5 min): find the first spot (free mode)

1. Turn the crystal left or right (φ) until a spot lights on the wall. Record φ, θ, 2θ and the spot's distance from the beam stop.
2. Check the distance: x = 150 cm × tan 2θ.
3. Turn about 1° further. Why does the spot go dark?

## Part B (5 min): change the wavelength

1. With the (0 1 0) spot lit, slide λ from Cu Kα up towards Co Kα (1.79 Å) and back down towards Mo Kα (0.71 Å). Which way does the spot move, and why does it eventually go dark at a fixed crystal angle?
2. The faint *ghost* shows where the found reflection would land at the current λ. Predict 2θ at Mo Kα before you look, then check against the ghost.

## Part C (10 min): Mission, identify the crystal

Press **Start mission**. The sample is randomly SC or FCC with its lattice parameter a on its tag; the round runs at Mo Kα (0.71 Å), and spot labels show 2θ only.
1. Find spots by turning the crystal. For each, record 2θ, compute d = λ / (2 sin θ), then N = (a / d)² and round to an integer: N = h² + k² + l².
2. Watch the evidence board: it also logs when the crystal passes the (100) and (110) conditions **with no spot**.
3. Before pressing a verdict, write down your evidence: which N values you saw, which absences you logged, and your positive control.
4. Press **Simple cubic** or **Face-centred cubic**. If the Lens says you're wrong, read why, find the evidence it asks for, and try again.

## After (2 min): the same question again

Repeat the "Before" question, alone and in writing. Compare the two answers.

## Discussion questions

1. Why is the spot at 2θ from the beam and not θ? (The planes reflect like a mirror: the ray turns by θ coming in and θ going out.)
2. A real crystal's rocking width is far narrower than the Lens's 1.0°. What would finding spots by hand be like with a real crystal, and why do real instruments scan instead?
3. Why does "no spot at the (100) condition" only count as evidence once you've seen a (111) or (200) spot?
4. FCC allows (h k l) only when all three are even or all odd. Which of N = 1, 2, 3, 4, 8, 11, 12 survive? What is physically cancelling the others?
5. The Lens draws every allowed spot equally bright. What would real intensities add, and what extra could they tell you?
6. What in the Lens is deliberately not to scale, and why is that acceptable here? (The atoms, and the 1.0° mosaic spread; every angle and direction is real.)

## Answer key

**Free mode, a = 4.00 Å** (the same values as the unit-tested table in the README):

| Reflection | λ (Å) | θ (°) | 2θ (°) | distance from beam stop, L = 150 cm |
|---|---|---|---|---|
| (0 1 0) | 1.54 (Cu Kα) | 11.10 | 22.20 | 61.2 cm |
| (0 1 0) | 1.79 (Co Kα) | 12.93 | 25.86 | 72.7 cm |
| (0 1 0) | 0.71 (Mo Kα) | 5.09 | 10.18 | 26.9 cm |
| (1 1 0) | 1.54 | 15.80 | 31.59 | 92.3 cm |
| (1 1 1) | 1.54 | 19.48 | 38.95 | 121.3 cm |

- **Before/after question:** the spot first lights when the crystal has turned about 11° (the Bragg angle θ = 11.1°), and it lands at 2θ = 22.2°, about 61 cm to the side of the beam stop. Answers to look out for: a spot placed at θ instead of 2θ (11°, about 29 cm from the beam stop), or no position given at all because the flat figure doesn't say where the wall is.
- **Part A, step 3:** the Bragg condition is sharp; the Lens lights a spot only within its 1.0° mosaic window.
- **Part B:** a longer λ means a larger θ for the same d, so the spot moves out; a shorter λ pulls it in. At a fixed crystal angle the planes leave the 1.0° window, so the spot goes dark; the ghost shows where it would be.

**Mission (example: FCC, a = 4.05 Å, Mo Kα 0.71 Å, the round shown in the demo video):**

| N = h² + k² + l² | family | d (Å) | 2θ (°) | FCC |
|---|---|---|---|---|
| 1 | (100) | 4.050 | 10.06 | absent |
| 2 | (110) | 2.864 | 14.24 | absent |
| 3 | (111) | 2.338 | 17.47 | allowed |
| 4 | (200) | 2.025 | 20.19 | allowed |
| 8 | (220) | 1.432 | 28.71 | allowed |
| 11 | (311) | 1.221 | 33.80 | allowed |
| 12 | (222) | 1.169 | 35.35 | allowed |

- **Simple cubic** is shown by any spot FCC forbids (mixed parity): N = 1, 2, 5, 6, 9 or 10, such as a (100)- or (110)-type spot.
- **FCC** needs the (100) and (110) conditions passed with no spot **and** a (111) or (200) spot seen: the positive control proves the setup could see spots, so the absences mean something.
- A correct verdict names the real material with the closest lattice parameter: copper (FCC, 3.61 Å), aluminium (FCC, 4.05 Å), rock salt (FCC lattice, 5.64 Å), α-polonium (SC, 3.35 Å) or caesium chloride (primitive cubic lattice, 4.12 Å).
