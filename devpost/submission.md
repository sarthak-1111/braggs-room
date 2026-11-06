# Devpost submission text: Bragg's Room

I paste the sections below into the Devpost form. Lines marked **✏️ PERSONALISE** are drafts written by the coding agent, and I rewrite them in my own words before submitting: the judges are reading for my voice and my experience. Everything else describes what the Lens actually does in the preview, and only changes if the Lens changes.

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

✏️ **PERSONALISE.** One or two sentences in my own words on why this matters to me as a diffraction researcher, for example a moment when I saw students struggle with the textbook picture, or what I wish I'd had when I learned it.

For teachers, there's a 30-minute class activity with learning goals, a before-and-after prediction question, discussion questions and an answer key: [`devpost/lesson-plan.md`](https://github.com/sarthak-1111/braggs-room/blob/main/devpost/lesson-plan.md).

## Why it matters

✏️ **REVIEW.** The coding agent drafted this section and the next from sources a research agent opened and checked (listed under References). I read the sources and confirm the wording before submitting.

Bragg's law is easy to learn as a formula without the geometry behind it. Teaching papers report this:
- Students who can recite 2d sin θ = nλ "find it more difficult to sketch the corresponding geometry" of a real experiment [1].
- Students who solve Bragg's-law problems correctly still picture diffraction orders wrongly in real space [2].

Physics-education research on diffraction of particles found similar difficulties at every level: after standard teaching, first- to third-year students couldn't predict how a pattern changes when the setup changes [3].

Crystallography as a whole depends on picturing structures in 3D. A review of virtual- and augmented-reality environments for learning crystallography found that they help with exactly these spatial problems, and that AR was the least used of the technologies reviewed [4]. A small classroom study of VR and AR for crystal structures reported better test results and 3D drawing skills [5].

Bragg's Room aims at the step that the flat figure leaves out: where the spot goes. You turn the crystal with your hand, and the spot appears on your wall at its real angle.

## What's new

There are good teaching tools for single-crystal diffraction:
- XRayView [6], which covers the reciprocal lattice, the Ewald sphere and systematic absences;
- EwaldSphere [7], a virtual diffractometer with an area detector;
- EPFL's DiffractOgram;
- York's interactive Ewald-sphere tutorial;
- CrystalMaker's SingleCrystal.

All of them draw the pattern on a screen. In Bragg's Room the pattern is in your room: you find the spot on your wall at its true 2θ, 61 cm from the beam stop, by turning the crystal with your hand while you watch the wall. A search for this submission found no other tool that puts a single-crystal X-ray pattern at its true angles in the learner's own space. Classroom laser demonstrations do throw diffraction patterns onto real walls, but those patterns come from gratings, not from crystal planes at X-ray angles.

The mission is about reasoning, not only seeing:
- the evidence board logs what lit and what didn't;
- an absence counts only once a positive control proves the setup could see spots;
- a wrong verdict is answered with the evidence against it.

That's how a crystallographer argues for a structure.

## How accurate it is

Every angle and direction is computed with the vector (Laue/Ewald) form and then checked in three ways:
- **Unit tests.** The physics is checked against hand-computed Bragg angles; there are 124 unit tests in all.
- **Measured data.** The physics is also checked against a measured powder pattern of real aluminium [8]. The FCC rule allows exactly the nine lines that were measured up to (422), every d-spacing agrees within 0.001 Å, and every 2θ agrees within 0.05°. The table is in the README (`npm run reference`).
- **Labels for what isn't real.** What's deliberately exaggerated, the atom size and the 1.0° mosaic window, is labelled in the Lens.

## Testing so far

Before testing with real students, I ran **simulated** first-time-user walkthroughs. Three AI agents each played one persona and drove the Lens in Lens Studio's preview, using only what's on screen and the README's controls:
- a first-year chemistry student;
- a PhD student who runs a diffractometer;
- a lecturer following the lesson plan.

They aren't real users, and they can't show that anyone learns from it. But they found real problems, and the most useful finding was positive: the PhD persona checked every number on screen by hand, and all of them were right to 0.1°.

All three were confused by the off-wall hint, the mission never states its question, and my lesson plan asked for a distance the screen doesn't show. I've fixed the lesson plan, and the Lens changes are next. Details: [`devpost/simulated-walkthrough.md`](https://github.com/sarthak-1111/braggs-room/blob/main/devpost/simulated-walkthrough.md).

## How I built it

I planned the Lens with the **plan-lens** skill from the Learn AR with SPECS skill pack. Its interview checked my idea against AR design practice and against what Lens Studio's preview can show, and produced the design brief in `devpost/design-brief.md`. The design decisions in it are mine; values marked "(default)" were filled in by plan-lens for me to review.

Coding agents then built it with **CLAD** through **Lens Studio and the Lens Studio MCP**. CLAD's `specs-experience-builder` agent built the room, the console (Spectacles UI Kit) and the sounds. CLAD's `live-lens-tester` agent wrote **LEAF** scenarios for each done criterion, and all eight pass in the preview, driving the Lens with simulated pinch-drags and button presses. The physics and game logic were written to my specification and are checked by 44 command-line unit tests, including hand-computed Bragg angles; 80 more check the room's code-built geometry. The full record, including what the agents chose during the build and what I directed, is in `devpost/build-report.md`.

Pre-existing code: none, apart from the Lens Studio Specs Base Template, Snap's packages (Spectacles Interaction Kit, Spectacles UI Kit, LEAF, Bitmoji 3D) and the vertex-colour material that ships with the CLAD plugin.

## What I learned

✏️ **PERSONALISE.** This section should be mine. Some prompts, taken from what came up while building:
- *Shares your view, draws in the world, leaves your body free:* which of these turned out to matter most for diffraction, and which only a real SPECS device could prove (the brief marks the real-wall anchor as "feel unproven").
- *Physics meets usability:* with a 1° mosaic window at Mo Kα, several reflections are often lit at once. That's real rotation-photograph behaviour, and it changed how the helpers (guide arrow, slowdown) feel. What did I decide about that trade-off?
- *Positive controls:* turning "absence of a spot" into evidence needed a positive-control rule. Did writing that rule for a Lens change how I'd explain it to students?
- *Working with plan-lens and CLAD:* what the interview made me decide up front, and what I had to correct after seeing the build.

## What's next

✏️ **PERSONALISE.** These are drafts; I keep the ones I actually plan:
- **Real SPECS.** Try it on a real SPECS against a real wall: the wall anchor, the hand-drag feel and the narrow field of view are untested.
- **More classroom testing.** Run the lesson plan with a class and compare the before and after answers.
- **More of the physics:**
  - body-centred cubic as a third answer;
  - structure-factor intensities, so spots differ in brightness;
  - a powder mode with Debye–Scherrer rings on the wall.

## Links

- Code: https://github.com/sarthak-1111/braggs-room
- Video: ✏️ **paste the public YouTube link**
- Lesson plan: https://github.com/sarthak-1111/braggs-room/blob/main/devpost/lesson-plan.md

## References

1. T. E. Weirich (2025). A new paper-based approach for teaching Bragg's law. *Acta Cryst. E* 81, 1195–1199. https://doi.org/10.1107/S2056989025010576
2. N. Stojilovic (2026). Taking Bragg's Law to a Higher Cognitive Level: Using Sketches to Assess Misconceptions of X-ray Diffraction Orders. *J. Chem. Educ.* 103(8), 4237–4242. https://doi.org/10.1021/acs.jchemed.5c01304
3. S. Vokos, P. S. Shaffer, B. S. Ambrose & L. C. McDermott (2000). Student understanding of the wave nature of matter: Diffraction and interference of particles. *Am. J. Phys.* 68(S1), S42–S51. https://doi.org/10.1119/1.19519
4. J. Extremera, D. Vergara, L. P. Dávila & M. P. Rubio (2020). Virtual and Augmented Reality Environments to Learn the Fundamentals of Crystallography. *Crystals* 10(6), 456. https://doi.org/10.3390/cryst10060456
5. M. S. Abdüsselam, S. Çıldır & S. Atasoy (2023). The effect of virtual and augmented reality on teaching crystal structure of materials and student reflections in applications. *Int. J. Technology Enhanced Learning* 15(3), 215–233. https://doi.org/10.1504/IJTEL.2023.131848
6. G. N. Phillips Jr. (1995). XRayView: a teaching aid for X-ray crystallography. *Biophys. J.* 69, 1281–1283. https://doi.org/10.1016/S0006-3495(95)80035-4
7. L. J. Barbour (2018). EwaldSphere: an interactive approach to teaching the Ewald sphere construction. *J. Appl. Cryst.* 51, 1734–1738. https://doi.org/10.1107/S1600576718012876
8. H. E. Swanson & E. Tatge (1953). Standard X-ray Diffraction Powder Patterns. *NBS Circular 539*, Vol. I, "Aluminum (Cubic)". https://doi.org/10.6028/NBS.CIRC.539v1

## Built with

Lens Studio 5.24.1 · Lens Studio MCP · CLAD (Claude Code plugin) · plan-lens · Spectacles Interaction Kit · Spectacles UI Kit · LEAF · TypeScript
