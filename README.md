# Bragg's Room

**X-ray diffraction at room scale, for SPECS.** A crystal sits on your desk in the path of an X-ray beam. Turn it with your hand, and when a set of lattice planes meets the Bragg condition, a diffraction spot lights up on your wall at its true scattering angle, with a chime that comes from the spot. Then take on the mission: identify a mystery crystal as simple cubic or face-centred cubic from which reflections appear and which stay dark.

Built for [Learn AR with SPECS](https://learn-specs.devpost.com/). It runs in Lens Studio's Interactive Preview; no SPECS device is needed.

> **Who it's for:** undergraduate physics, chemistry and materials students, and their teachers. Flat textbook diagrams of diffraction don't convey the 3D geometry: how the crystal's orientation, the beam and the spot on the detector are linked.

## What you can do

**Free mode** (simple cubic, a = 4.0 Å, Cu Kα λ = 1.54 Å)
- **Turn the crystal** by pinch-dragging it. Left/right spins it about the vertical axis (φ); up/down tilts it about the horizontal axis across the beam (χ, ±45°), like a real two-circle goniometer. It never rolls about the beam. The φ and χ readouts sit on the goniometer base.
- **Find a reflection.** Turn about 11° from the start and the (0 1 0) spot lights up 61 cm to the side of the beam stop: θ = 11.1°, 2θ = 22.2°. A faint ray joins the crystal to the spot. Turn about 1° further and it goes dark again.
- **Change the wavelength** with the slider (0.70 to 2.30 Å, marked at Mo Kα 0.71, Cu Kα 1.54, Co Kα 1.79 and Cr Kα 2.29 Å). A lit spot moves out as λ goes up and in as λ goes down. Once a reflection has been found, a faint *ghost* keeps showing where it would land at the current wavelength.
- **Switch to FCC** with the lattice toggle and watch the mixed-parity reflections vanish.
- The **evidence board** on the wall lists what you've found, with 2θ and the sin²θ ratio to the lowest-angle reflection (1 : 2 : 3 : 4 : 5 : 6 : 8 for simple cubic).

**Mission: identify the crystal**
- **Start mission** loads a mystery sample. It is randomly SC or FCC, with a ∈ [3.3, 5.7] Å shown on its tag, and the round starts at Mo Kα (0.71 Å). The crystal is drawn as a frosted cube, and spot labels show 2θ only.
- The board logs each distinct reflection you observe (a different d-spacing), and also logs "(100) condition passed: no spot" or "(110) condition passed: no spot" when the crystal passes through those conditions and nothing lights.
- **Predict (hkl)**: pick any h, k, l with the steppers to see a ring where that reflection would land. It depends only on a and λ, so it never gives the answer away.
- After three distinct reflections, the **Simple cubic** and **Face-centred cubic** buttons unlock together.
  - SC is supported by any spot that FCC forbids, such as a (100)- or (110)-type spot.
  - FCC is supported when the (100) and (110) conditions have passed with no spot **and** a (111) or (200) spot has been seen. That spot is the positive control: it proves the setup could see spots, so the absences mean something.
- A correct verdict reveals every spot's indices and names a real material with the closest lattice parameter (copper, aluminium, rock salt; α-polonium, caesium chloride's primitive cubic lattice). A wrong verdict shows the evidence against it.

## The physics (all angles and directions are real)

The Lens uses the vector (Laue/Ewald) form. The incident wavevector is **k** with |**k**| = 1/λ along the beam. Reciprocal lattice vectors **G** = (h, k, l)/a rotate with the crystal through R = R_χ · R_φ. A reflection lights when |**k** + **G**| ≈ |**k**|, implemented as the glancing angle between the beam and the planes lying within 1.0° of θ_B, where sin θ_B = λ/2d. The diffracted direction is **k**′ = **k** + **G**. The spot is drawn where that ray meets the wall plane 150 cm beyond the crystal, at exactly 2θ_B from the beam and at the azimuth of **k** + **G**. FCC uses the selection rule "h, k, l all even or all odd".

What is deliberately not to scale, and labelled as such in the Lens:
- **Atoms not to scale.** The unit cell is drawn about 8 cm across so you can see it.
- **Mosaic spread exaggerated (1.0°).** A real crystal's rocking width is far narrower; 1.0° makes spots findable by hand.
- **Reflections modelled:** every (hkl) with h² + k² + l² ≤ 12, up to (222). Real crystals also diffract at higher orders; those aren't drawn.
- **All allowed spots are equally bright.** Structure-factor intensities are out of scope.
- **The wall is a stand-in.** On SPECS the detector would sit on your real wall. The preview has no real room, so the Lens draws a virtual wall (a faint grid, 4 m × 2.6 m) and a virtual desk at real size.

The physics lives in [`Assets/Scripts/BraggPhysics.ts`](Assets/Scripts/BraggPhysics.ts), the experiment logic in [`Assets/Scripts/BraggSim.ts`](Assets/Scripts/BraggSim.ts). Both are plain TypeScript with no Lens Studio dependencies, and both are unit-tested against hand-computed values:

| (hkl) | a (Å) | λ (Å) | d (Å) | θ (°) | 2θ (°) | spot distance from beam stop (cm) |
|---|---|---|---|---|---|---|
| (100) | 4.00 | 1.54 | 4.0000 | 11.0987 | 22.1974 | 61.21 |
| (110) | 4.00 | 1.54 | 2.8284 | 15.7974 | 31.5947 | 92.26 |
| (111) | 4.00 | 1.54 | 2.3094 | 19.4765 | 38.9529 | 121.26 |
| (010) | 4.00 | 0.71 | 4.0000 | 5.0917 | 10.1834 | 26.94 |

```sh
cd tests
npm install
npm test        # 124 tests: physics against hand-computed values (18), the experiment logic
                # including every done criterion as pure logic (26), and the room's
                # code-built meshes and layout (80)
npm run table   # prints the table above
```

## Open and run it in Lens Studio

1. Install **Lens Studio 5.23.2 or later**. The project was built and tested in **Lens Studio 5.24.1**; it has not been tested in 5.23.2. Older versions may refuse a project saved by a newer one.
2. Clone this repository and open `braggs-room.esproj`. The packages it needs ship with it: Spectacles Interaction Kit 2.0, Spectacles UI Kit 2.0, and LEAF 2.0.2 with Bitmoji 3D in `Packages/`, plus a small vertex-colour material package in `Assets/SimpleVertexBaseColor.lspkg`. Lens Studio regenerates `Cache/` and `Support/` on first open.
3. In the **Preview** panel, choose the SPECS device and **Interactive Preview** (the default for this project).
4. Click inside the Preview to use the controls:

| Do this | Control |
|---|---|
| Move | **W A S D** |
| Down / up | **Q** / **E** |
| Look around | **Right-drag**, or hold **Shift** and move the mouse |
| Pinch (select, press a button) | **Click** |
| Turn the crystal | **Click and drag** on the crystal: left/right for φ, up/down for χ |
| Change the wavelength | **Drag** the slider handle on the console |

You start at the user's position: the crystal is on the desk in front of you and to the left, the console is to its right, and the wall with the beam stop is 2 m ahead. For the first 10 seconds a bright pulse runs down the beam and "Drag the crystal. Watch the wall." appears above the beam stop. Look down and slightly left to see both the crystal and the wall pattern; the evidence board is on the wall to the right of the beam stop.

In a mission, **Start mission** turns the crystal into a frosted mystery cube. **Predict (hkl)** opens three steppers above the console, and the two verdict buttons appear on the console once you've found three distinct reflections. A small green arrow on the goniometer shows which way to turn toward the nearest reflection, and a chevron at the edge of your view points to a lit spot you can't see.

To start over, press the Preview's reset button: the Lens restarts in free mode at Cu Kα with φ = χ = 0.

## Tests

- **Physics and logic:** `cd tests && npm install && npm test` (Node 20+). The output is in [`devpost/build-report.md`](devpost/build-report.md).
- **LEAF (in the running Lens):** eight scenarios in `Assets/Tests/Leaf/` cover all five done criteria. They're registered in `LeafIndex` and **all eight pass** (315 of 315 sub-checks). To run them, open Lens Studio's LEAF panel and run them in the preview; nothing runs on Lens start. The results per criterion, with the measured values and what LEAF doesn't cover, are in [`devpost/build-report.md`](devpost/build-report.md).

## How it was planned and built

- **Planned with plan-lens.** Sarthak ran the `plan-lens` skill from the Learn AR with SPECS skill pack. Its interview checked the idea against AR design practice and against what Lens Studio's preview can do, and produced the approved [`devpost/design-brief.md`](devpost/design-brief.md). The interview ran in Claude Code while Sarthak was away from the keyboard: a relay session passed plan-lens's questions to Sarthak and Sarthak's answers back verbatim. **Every design decision in the brief is Sarthak's, from that interview**, except values marked "(default)", which plan-lens filled in for Sarthak to review. Sarthak, a diffraction researcher, also specified the physics: the vector Laue/Ewald form, a = 4.0 Å and λ = 1.54 Å, the FCC selection rule, and unit tests against hand-computed values.
- **Built by coding agents through CLAD.** The Lens was built by AI coding agents (Claude Code with the CLAD plugin) working in Lens Studio through the Lens Studio MCP. CLAD's `specs-experience-builder` agent built the room, the assets and the UIKit console; CLAD's `live-lens-tester` agent wrote the LEAF scenarios, one or more per done criterion (all eight pass); the physics module and its unit tests were written by the coding agent to Sarthak's specification. [`devpost/build-report.md`](devpost/build-report.md) records the decisions, the iterations, the LEAF results, which choices were made during the build rather than by Sarthak, and what CLAD built versus what was directed.
- **Pre-existing code:** none, apart from the Lens Studio Specs Base Template, the Snap packages listed above, and the vertex-colour material that ships with the CLAD plugin.

## Repository layout

```text
Assets/Scripts/      Lens scripts. BraggPhysics.ts, BraggSim.ts, BraggText.ts are pure and unit-tested
Assets/Tests/Leaf/   LEAF scenarios (one or more per done criterion) and LeafIndex
Assets/GeneratedSFX/ chimes, flourish and "not yet" tone, synthesised locally (sources in tools/)
Packages/            SIK 2.0, UIKit 2.0, LEAF 2.0.2, Bitmoji 3D
tests/               command-line unit tests (node:test + TypeScript)
tools/               the scripts that generated the sounds
devpost/             design brief, build report, submission text, video script, CLAD handoffs
```

## Licence

MIT, © 2026 Sarthak. See [LICENSE](LICENSE). The Snap packages in `Packages/` and the CLAD vertex-colour material in `Assets/SimpleVertexBaseColor.lspkg` remain under their own terms.
