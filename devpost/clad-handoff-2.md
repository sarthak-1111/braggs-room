# CLAD handoff 2: the mission and the detail

This is the second build spec the coding agent gave CLAD's `specs-experience-builder`, after the stage-1 basic flow was built, reviewed and committed. It adds everything in `devpost/design-brief.md` that stage 1 left out. Stage 1's scene, scripts and names stay as they are; extend them.

The physics and game logic already handle all of this. `BraggSim` exposes mission mode, the predictor, verdicts, the guide arrow and the off-wall hint in every `SimFrame`. This stage only draws them and wires the controls. Do not reimplement any rule in the Lens scripts.

## 1. Console additions (UIKit, extend the console module through `/specs-build-ui`)

- **Mode button**: one button whose label is `"Start mission"` in free mode and `"Back to free mode"` in a mission. It calls `sim.startMission()` or `sim.endMission()`. Name: `ModeButton`.
- **SC / FCC toggle**: visible in free mode only.
- **Wavelength slider**: must follow the sim when the sim changes λ itself. `startMission()` sets 0.71 Å and `endMission()` sets 1.54 Å; move the slider knob to match without feeding the change back as user input.
- **Predict (hkl)** (mission only): a button `PredictButton` that unfolds a row of three big steppers, each a "−" button, a value and a "+" button, for h, k and l (range −4 … 4, starting at (1 1 1)). Show the current `"(h k l)"`. While unfolded, call `sim.setPredictor({h, k, l})`; when folded, call `sim.setPredictor(null)`. Names: `PredictButton`, `HMinus`, `HPlus`, `KMinus`, `KPlus`, `LMinus`, `LPlus`.
- **Verdict buttons** (mission only): `"Simple cubic"` (`VerdictSCButton`) and `"Face-centred cubic"` (`VerdictFCCButton`). Hidden until `frame.verdictUnlocked`; both appear together. They call `sim.submitVerdict("SC" | "FCC")`. Hide them once `frame.solved`.
- **Feedback line**: shows `frame.feedback.message` (mission only), wrapped to the console width. Use near-white for correct, warm amber for wrong, and pale blue for "not enough evidence".
- Buttons stay ≥ 4 cm across. With the predictor folded, the console should not grow beyond about 36 × 30 cm. If it gets crowded, place the predictor steppers on a small sub-panel just above the console, still on the desk to the right of the crystal.

## 2. Wall additions (passive views fed by the frame)

- **Prediction ring** (`frame.ring`): a thin, faint violet circle of radius `ring.radiusCm` around the beam stop, with a label `ring.label` at the top of the ring. When `ring.reachable` is false, show only the label, under the beam stop.
- **Off-wall hint** (`frame.offWallHint`): `"Spot is off the wall. Try a shorter wavelength."` just below the beam stop, ≥ 4 cm text.
- **Banner** (`frame.banner`): above the beam stop, larger text (≥ 6 cm), shown after a correct verdict.
- **Celebration**: on `frame.justSolved`, play the flourish once. While `frame.solved`, pulse the lit spots and found ghosts gently (scale 1.0 ↔ 1.25, ~1.2 s period).
- **Board highlight**: when `frame.board.highlightIndex ≥ 0`, mark that line (prefix `"» "` and the amber colour) so a wrong verdict points at its evidence.
- Mission spot labels use `spot.detail` only when `spot.title` is empty, so they show 2θ only.

## 3. Crystal and goniometer

- When `frame.drawnLattice` is `null`, show the frosted "mystery" cube instead of atoms. Keep "atoms not to scale" visible in both cases.
- **Sample tag** (`frame.sampleTag`): a small tag hanging on the goniometer post, facing the user, ≥ 1.2 cm text.
- **Guide arrow** (`frame.guide`): a small curved arrow on the goniometer, subtle (soft green, ~50% alpha), visible only while `guide.visible`.
  - `axis === "phi"`: an arc around the vertical axis just below the crystal (radius ~7 cm, ~70° of arc on the near side) with an arrowhead pointing to the user's right for `sign = +1` and left for `sign = −1`.
  - `axis === "chi"`: an arc in the vertical plane through the crystal (around the x axis), on the near side, with the arrowhead pointing up for `sign = +1` and down for `sign = −1`.
  - Name: `GuideArrow`, with children `GuideArrowPhi` and `GuideArrowChi`.

## 4. Attention and onboarding

- **Edge chevron**: when a spot is lit but outside the camera's view, show a small chevron near the edge of the view pointing toward it, and fade it out once the spot is in view. Use the main camera's `worldSpaceToScreenSpace`. Place the chevron about 60 cm in front of the camera, at the clamped edge position (screen 0.1 … 0.9), rotated to point at the spot. Name: `EdgeChevron`. It should be small (~3 cm) and subtle; it is the only thing that follows the head.
- **Intro (10 s)**: on Lens start, a bright head travels from the X-ray tube through the crystal to the beam stop (about 2 s), and the line `"Drag the crystal. Watch the wall."` fades in above the beam stop (≥ 6 cm text). After 10 s it fades out and the normal beam pulse continues. Name: `IntroText`.

## 5. Audio

- A short **flourish** (a rising three-note chime phrase, ~1.5 s) for a correct verdict, through `/build-music`. Play it once, from the beam stop.
- A soft low **"not yet"** tone for wrong or insufficient verdicts, through `/build-sfx`, kept gentle.

## 6. Test hooks (extend `BraggsRoomMain`)

`testStartMission(lattice, a)`, `testEndMission()`, `testSubmitVerdict(v)` and `testSetPredictor(h, k, l)` must drive the same code paths as the buttons. Add the counter `flourishCount`, and `getGuideState()` returning `{visible, axis, sign}` as drawn. Keep the stage-1 hooks unchanged.

## Out of scope for stage 2

- Real-wall snapping (World Query) and the Ewald sphere view. The brief lists both as optional.

## Where stage 1 left things (extend these, don't duplicate them)

- `BraggsRoomMain.ts` owns the sim, steps once per frame in `stepAndRender()`, and renders in `render(frame)`. Add the stage-2 views to `render`.
- `BraggsRoomConsoleUI.ts` has an empty `Stage2Slot` at the bottom of the console for the mode button, predictor, verdict buttons and feedback line.
- `BraggsRoomWallLabelsUI.ts` already has the off-wall hint and pooled spot/ghost labels. Add the ring label, banner and intro text there.
- `BraggsRoomSpotPool.ts` pools spots and ghosts. Add the pulse and the prediction ring there or in a sibling view.
- `BraggsRoomGoniometerUI.ts` has the φ/χ readouts and "atoms not to scale". Add the sample tag there.
- `CrystalCellMesh.ts` already builds the SC, FCC and mystery cells.

## Tool notes from stage 1 (learned the hard way)

- Do **not** use `QueryRuntimeSceneTool`, `PreviewInteractTool` or `CaptureRuntimeViewTool`. They auto-install `AiPreviewAgentInspect`, `Icons` and `Motion`, whose examples import `UIKit.lspkg`/`InteractionKit.lspkg`, and that breaks this project's compile (SIK/UIKit 2.0). If they get installed, remove them from `Packages/`.
- Verify with `RecompileTypeScriptTool`, `RunAndCollectLogsTool` (and grep the log file for `Exception|Error`), `MovePreviewCamera` + `CapturePanelScreenshotTool`, and `InjectPreviewGesture` (touch start → several slow moves → end acts as a pinch-drag; buttons respond to a touch start/end on them).
- Lens Studio's Agents-Docs plugin deletes the `.agents/` folder on every project save. That's expected; the parent agent restores it from git.
