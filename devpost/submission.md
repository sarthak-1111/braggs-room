# Devpost submission text: Bragg's Room

Paste the sections below into the Devpost form. Lines marked **✏️ SARTHAK: PERSONALISE** are drafts written by the coding agent. Rewrite them in your own words before submitting; the judges are reading for *your* voice and *your* experience. Everything else describes what the Lens actually does in the preview, and should only change if the Lens changes.

---

## Tagline (one line)

Turn a crystal on your desk and watch X-ray diffraction spots light up on your wall, at their true angles.

## What it does

Bragg's Room puts an X-ray diffraction experiment in your room. A crystal sits on your desk in an X-ray beam; the beam runs to a detector on the wall 1.5 m beyond it. You pinch-drag the crystal to turn it, the way a two-circle goniometer does: left/right spins it, up/down tilts it, and it never rolls about the beam. When a set of lattice planes meets the Bragg condition, a spot lights up on the wall at its real scattering angle, labelled with its Miller indices, θ and 2θ, and a chime sounds from the spot itself. Turn the crystal about 11° and the (0 1 0) spot appears 61 cm from the beam stop at 2θ = 22.2°; turn 1° further and it goes dark again.

A wavelength slider runs from Mo Kα to Cr Kα. A longer wavelength pushes a lit spot outward and a shorter one pulls it in, and a faint ghost keeps showing where each found reflection would land. A toggle switches the crystal from simple cubic to face-centred cubic, so you can watch the mixed-parity reflections disappear.

The mission is **Identify the crystal**. You get a mystery sample with a known lattice parameter, randomly simple cubic or face-centred cubic, and labels that show only 2θ. You hunt for reflections, and an evidence board on the wall logs each distinct d-spacing you observe. It also logs when the crystal passes through the (100) and (110) conditions and *nothing* lights. An absence only counts with a positive control: a (111) or (200) spot proves the setup could see spots at all. A predictor shows where any (hkl) would land without revealing whether it exists. When you name the lattice, the Lens checks your evidence, tells you what contradicts a wrong answer, and on a right one reveals every spot's indices and names a real material with that structure ("Identified: FCC, like copper").

The physics is the vector (Laue/Ewald) form: |k| = 1/λ, reciprocal lattice vectors rotate with the crystal, a reflection lights when |k + G| ≈ |k| (within a 1.0° mosaic window, exaggerated so spots can be found by hand), and the diffracted ray k + G is intersected with the wall. The physics module is plain TypeScript, unit-tested against hand-computed Bragg angles. The atoms are drawn enlarged and labelled "atoms not to scale"; every angle and direction is real.

In Lens Studio's preview the wall and desk are virtual stand-ins drawn at real size. On SPECS, the detector would anchor to your real wall.

## Who it's for

Undergraduate physics, chemistry and materials students, and the people who teach them. Diffraction is usually taught with a flat diagram: two lines for the planes, two arrows, and nλ = 2d sin θ. The equation is right, but the diagram hides the part students find hardest: how the crystal's orientation in 3D, the beam and the spot's position on the detector are linked. In Bragg's Room that link happens at room scale with real angles. Your hands turn the crystal while your eyes stay on the wall pattern.

✏️ **SARTHAK: PERSONALISE.** One or two sentences in your own words on why this matters to you as a diffraction researcher, for example a moment when you saw students struggle with the textbook picture, or what you wish you'd had when you learned it.

## How I built it

I planned the Lens with the **plan-lens** skill from the Learn AR with SPECS skill pack. Its interview checked my idea against AR design practice and against what Lens Studio's preview can show, and produced the design brief in `devpost/design-brief.md`. The design decisions in it are mine; values marked "(default)" were filled in by plan-lens for me to review.

Coding agents then built it with **CLAD** through **Lens Studio and the Lens Studio MCP**. CLAD's `specs-experience-builder` agent built the room, the console (Spectacles UI Kit) and the sounds. CLAD's `live-lens-tester` agent wrote **LEAF** scenarios for each done criterion, and all eight pass in the preview, driving the Lens with simulated pinch-drags and button presses. The physics and game logic were written to my specification and are checked by 44 command-line unit tests, including hand-computed Bragg angles; 80 more check the room's code-built geometry. The full record, including what the agents chose during the build and what I directed, is in `devpost/build-report.md`.

Pre-existing code: none, apart from the Lens Studio Specs Base Template, Snap's packages (Spectacles Interaction Kit, Spectacles UI Kit, LEAF, Bitmoji 3D) and the vertex-colour material that ships with the CLAD plugin.

## What I learned

✏️ **SARTHAK: PERSONALISE.** This section should be yours. Some prompts, taken from what came up while building:
- *Shares your view, draws in the world, leaves your body free:* which of these turned out to matter most for diffraction, and which only a real SPECS device could prove (the brief marks the real-wall anchor as "feel unproven").
- *Physics meets usability:* with a 1° mosaic window at Mo Kα, several reflections are often lit at once. That's real rotation-photograph behaviour, and it changed how the helpers (guide arrow, slowdown) feel. What did you decide about that trade-off?
- *Positive controls:* turning "absence of a spot" into evidence needed a positive-control rule. Did writing that rule for a Lens change how you'd explain it to students?
- *Working with plan-lens and CLAD:* what the interview made you decide up front, and what you had to correct after seeing the build.

## Links

- Code: https://github.com/sarthak-1111/braggs-room
- Video: ✏️ **SARTHAK: paste the public YouTube link**

## Built with

Lens Studio 5.24.1 · Lens Studio MCP · CLAD (Claude Code plugin) · plan-lens · Spectacles Interaction Kit · Spectacles UI Kit · LEAF · TypeScript
