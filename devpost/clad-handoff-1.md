# CLAD handoff 1: the basic flow (free mode)

This is the build spec the coding agent gave CLAD's `specs-experience-builder` for the first build pass. It turns `devpost/design-brief.md` (Sarthak's approved brief) into scene contracts. The physics and game logic already exist and are unit-tested; this pass builds the room around them.

Stage 1 (this handoff): free mode end to end, covering done criteria 1, 2, 3 and the free-mode half of 5.
Stage 2 (a later handoff): mission mode, predictor, verdicts, guide arrow, edge chevron, intro and celebration.

## What already exists (do not rewrite)

- `Assets/Scripts/BraggPhysics.ts`: pure diffraction geometry (vector Laue/Ewald form).
- `Assets/Scripts/BraggSim.ts`: the whole experiment as a state machine. `new BraggSim()`, then each frame `sim.step()` returns a `SimFrame`. Input: `applyDrag(dPhiDeg, dChiDeg)`, `setOrientation`, `resetOrientation`, `setWavelength`, `setFreeLattice`, `startMission`, `endMission`, `setPredictor`, `submitVerdict`.
- `Assets/Scripts/BraggText.ts`: label strings and the `SOURCES` list (Mo 0.71, Cu 1.54, Co 1.79, Cr 2.29 Å).
- `tests/`: 44 command-line unit tests. Run them with `npm test` in `tests/`.

The Lens scripts must not compute any physics. They feed input into the sim and draw the `SimFrame`. Read `BraggSim.ts` for the frame fields: `lit[]` (`wall.x/y` in cm from the beam stop, `title`, `detail`), `ghosts[]`, `newlyLit[]` (chime triggers, with `firstTime`), `offWallHint`, `board` (`title`, `status`, `lines`), `readoutPhi`, `readoutChi`, `lambdaLabel`, `sampleTag`, `drawnLattice`, `guide`, `slowFactor`.

## Coordinate frame

One root SceneObject, `BraggsRoom`, at the world origin with identity rotation. Its local frame is the lab frame of the physics: +x is the user's right, +y up, +z toward the user. The user's eyes start at (0, 0, 0) looking down −z. All units are cm.

Spot placement: a frame spot at wall offset (x, y) is drawn at local position `(B.x + x, B.y + y, B.z + 0.6)`, where B is the beam stop.

## Layout (from the brief)

| Object | Local position (cm) | Size | Notes |
|---|---|---|---|
| Crystal centre C | (−20, −25, −55) | ~8 cm cube cell | 55 cm forward, 20 cm left, 25 cm below eye level (≈24° below the eye line) |
| Goniometer base | (−20, −45, −55) | Ø 10 cm, 2 cm tall disc on the desk top | post from y = −45 up to y ≈ −30 |
| Virtual desk top | centre (0, −46.5, −50) | 120 × 3 × 60 cm | top surface at y = −45; legs down to y ≈ −150 |
| X-ray tube | axis on the beam line x = −20, y = −25, from z = −20 to z = −35 | ~15 cm long, Ø ~4 cm, collimator snout at the −z end | on a small stand down to the desk top |
| Beam | from (−20, −25, −35) to the beam stop | thin line | travels along −z, straight away from the user |
| Beam stop B | (−20, −25, −205) | Ø 4 cm disc facing the user | 150 cm beyond the crystal (≈7° below the eye line) |
| Virtual wall / detector | plane z = −205 | 4 m × 2.6 m: x from B.x − 200 to B.x + 200, y from B.y − 100 to B.y + 160 | faint light grid, not a solid panel |
| Evidence board | centre (B.x + 62, B.y + 40, −203) | 60 × 40 cm | 2 cm in front of the wall so spots never draw over it |
| Console | centre (+24, −41, −40), tilted ~45° to face the user | ~36 × 26 cm | on the desk to the right of the crystal, within reach |
| φ/χ readouts | front of the goniometer base, (−20, −40, −49) | text ≥ 1.2 cm tall | facing the user |

Keep the stand-ins obvious: name them `VirtualDesk (preview stand-in)` and `VirtualWall (preview stand-in)`. World Query wall snapping is not part of this stage.

## Display rules (Specs is additive: black renders as transparent)

- Nothing may rely on black or very dark colours. Use light, unlit or emissive materials.
- Wall: a faint light grid (lines every 20 cm, alpha ~0.15) plus slightly brighter axis lines through the beam stop. Add small, faint 2θ tick labels along the horizontal axis at 10°, 20°, 30°, 40° and 50° each side (x = ±150·tan 2θ).
- Spot: a bright warm-white disc of Ø ~5 cm with a soft halo, drawn just in front of the wall.
- Ray: a faint line from C to each lit spot.
- Found ghost: the same disc at ~25% brightness with a small faint label (`ghost.label`).
- Beam: a faint cyan line, plus a short (~10 cm) bright pulse that travels from the tube to the beam stop and repeats every ~1.5 s.
- Text: near-white. Wall labels must be at least 4 cm tall, readable from (0, 0, 0). Desk-level labels must be at least 1.2 cm tall.

## Interaction (SIK + UIKit only, so the mouse in Interactive Preview and LEAF both work)

- `Crystal`: a SceneObject at C carrying a SIK `Interactable` and a box collider of ~14 cm (a big target). It does **not** rotate. Its child `CrystalVisual` is what rotates.
- Drag: subscribe to `onDragUpdate`. Take `event.planecastDragVector ?? event.dragVector` (a world-space per-event delta), project it onto the room's right (+x) and up (+y) axes, and call `sim.applyDrag(dx * gain, dy * gain)` with `gain = 3.0` degrees per cm (an `@input`). Left/right turns φ; up/down tilts χ. The sim applies the half-speed slowdown and the ±45° clamp.
- Orientation of `CrystalVisual` from the sim's φ, χ (degrees): `R = R_χ · R_φ` with R_φ = rotation by φ about +y and R_χ = rotation by **−χ** about +x. In Lens terms: `rot = quat.angleAxis(-chi*DEG, vec3.right()).multiply(quat.angleAxis(phi*DEG, vec3.up()))`. The crystal's model axes are [100] → −z, [010] → −x, [001] → +y at φ = χ = 0, matching `BraggPhysics.CRYSTAL_AXES_AT_ZERO`. Build the cell so that its axes follow this convention.
- Crystal drawing: one conventional unit cell, 8 cm on a side. Atoms are spheres of Ø ~1.4 cm at the corners (SC), plus the face centres (FCC) in a second colour; cell edges are thin light lines. Rebuild or toggle when `frame.drawnLattice` changes. When it is `null` (mission, stage 2), show a frosted "mystery" cube instead. Add a small label near the base: "atoms not to scale".
- Console (UIKit, through `/specs-build-ui`):
  - a wavelength **Slider**, 0.70 to 2.30 Å, starting at 1.54, with a readout showing `frame.lambdaLabel`, and tick labels "Mo 0.71", "Cu 1.54", "Co 1.79", "Cr 2.29" at their proportional positions
  - a **Reset orientation** button
  - an **SC / FCC** toggle (free mode)
  - a "mosaic spread exaggerated (1.0°)" footnote
  - Stage 2 will add: Start mission / Back to free mode, Predict (hkl) with h/k/l steppers, the two verdict buttons, and feedback text. Leave room for them below.
  - Buttons ≥ 4 cm across; they highlight on hover.
- Evidence board: a passive view on the wall showing `frame.board.title`, `status`, and up to 8 `lines`.

## Audio

- A pitched, bell-like chime (≈0.6 s) for a newly lit spot. Play it as **spatial audio from the spot's position** on the wall. Use a brighter or louder variant when `firstTime` is true and a softer one for repeat sightings. Rate-limit to one chime every 0.25 s; at Mo Kα several reflections often light together.
- A soft UI click for buttons (if UIKit doesn't already provide one).
- Stage 2 will add the "identified" flourish. No background music: this is a lab instrument and the chimes carry the meaning.

## Names and test hooks (for LEAF)

Keep these SceneObject names stable: `BraggsRoom`, `Crystal`, `CrystalVisual`, `BeamStop`, `PhiReadout`, `ChiReadout`, `EvidenceBoard`, `WavelengthSlider`, `ResetButton`, `LatticeToggle`, `SpotPool`, and `Spot_0`…`Spot_11`, each with children `SpotLabel` and `SpotAudio`.

`BraggsRoomMain` (the script on `BraggsRoom`) exposes public methods for tests:
`getSim()`, `getFrame()` (the last `SimFrame`), `testSetOrientation(phi, chi)`, `testSetWavelength(l)`, `testStartMission(lattice, a)`, `testEndMission()`, `testSubmitVerdict(v)`, `testSetPredictor(h, k, l)`, and the counters `chimeCount` and `lastChimeWorldPos`.
After a test hook changes state, run one `step()` and render immediately so tests can assert in the same frame.

## Performance

`sim.step()` and `applyDrag` evaluate ~180 reflections; call `step()` once per frame. Pool all spot, label, ray and ghost objects; never create them per frame.
