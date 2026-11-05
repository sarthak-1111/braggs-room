/**
 * BraggsRoomMain: the orchestrator on "BraggsRoom" (the lab-frame root at the world origin).
 *
 * Owns: the one BraggSim (all physics and game state live there), the per-frame loop
 * (sim.step() once per frame, then draw the SimFrame), the chime rate limit, and the
 * public test hooks for LEAF.
 *
 * Inputs (References, wired by the scene bootstrap): the crystal controller, the crystal
 * cell mesh, the spot pool, the four stage-1 UI modules, and (stage 2) the predictor sub-panel,
 * prediction ring, guide arrow, edge chevron, mission audio and the beam. Settings: drag gain,
 * chime interval, intro beam travel time.
 *
 * Mission flow (stage 2): ModeButton → startMission()/endMission(); PredictButton folds the
 * predictor (sim.setPredictor(selection) while unfolded, null when folded); verdict buttons →
 * submitVerdict(); frame.justSolved → flourish. The test hooks call the same private methods
 * the buttons do, then step and render once.
 *
 * Data flow (one way): UI / crystal input → sim → SimFrame → controllers and UI setters.
 *
 * Must not: compute any physics (BraggSim / BraggPhysics do), create Text or UIKit
 * components (the *UI.ts modules do), or create semantic scene roots (the scene has them).
 */
import {BraggSim, SimFrame, SpotView, Feedback, MissionOptions} from "./BraggSim"
import {Lattice} from "./BraggPhysics"
import {CrystalCellMesh, DrawnLattice} from "./CrystalCellMesh"
import {BraggsRoomCrystalController} from "./BraggsRoomCrystalController"
import {BraggsRoomSpotPool} from "./BraggsRoomSpotPool"
import {BraggsRoomConsoleUI} from "./BraggsRoomConsoleUI"
import {BraggsRoomEvidenceBoardUI} from "./BraggsRoomEvidenceBoardUI"
import {BraggsRoomWallLabelsUI} from "./BraggsRoomWallLabelsUI"
import {BraggsRoomGoniometerUI} from "./BraggsRoomGoniometerUI"
import {BraggsRoomPredictorUI} from "./BraggsRoomPredictorUI"
import {BraggsRoomPredictionRing} from "./BraggsRoomPredictionRing"
import {BraggsRoomGuideArrow, GuideState} from "./BraggsRoomGuideArrow"
import {BraggsRoomEdgeChevron} from "./BraggsRoomEdgeChevron"
import {BraggsRoomMissionAudio} from "./BraggsRoomMissionAudio"
import {BeamMesh} from "./BeamMesh"
import {PREDICTOR_START} from "./BraggsRoomSceneContracts"

@component
export class BraggsRoomMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomMain – runs the Bragg simulation and draws each frame</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Crystal (BraggsRoomCrystalController): the pinch-drag target")
  crystal: BraggsRoomCrystalController

  @input
  @hint("CrystalVisual (CrystalCellMesh): SC / FCC / mystery cell")
  crystalCell: CrystalCellMesh

  @input
  @hint("SpotPool (BraggsRoomSpotPool): lit spots, ghosts, rays, chimes")
  spotPool: BraggsRoomSpotPool

  @input
  @hint("WallLabels (BraggsRoomWallLabelsUI): spot / ghost / 2θ labels, off-wall hint")
  wallLabels: BraggsRoomWallLabelsUI

  @input
  @hint("EvidenceBoard (BraggsRoomEvidenceBoardUI)")
  evidenceBoard: BraggsRoomEvidenceBoardUI

  @input
  @hint("Console (BraggsRoomConsoleUI): wavelength slider, reset, SC/FCC")
  controlConsole: BraggsRoomConsoleUI

  @input
  @hint("GoniometerLabels (BraggsRoomGoniometerUI): φ / χ readouts and the sample tag")
  goniometerLabels: BraggsRoomGoniometerUI

  @input
  @hint("PredictorPanel (BraggsRoomPredictorUI): the (hkl) steppers above the console")
  predictor: BraggsRoomPredictorUI

  @input
  @hint("PredictionRing (BraggsRoomPredictionRing): the predicted 2θ ring on the wall")
  predictionRing: BraggsRoomPredictionRing

  @input
  @hint("GuideArrow (BraggsRoomGuideArrow): which way to drag")
  guideArrow: BraggsRoomGuideArrow

  @input
  @hint("EdgeChevron (BraggsRoomEdgeChevron): points at a lit spot outside the view")
  edgeChevron: BraggsRoomEdgeChevron

  @input
  @hint("MissionAudio (BraggsRoomMissionAudio): flourish and 'not yet' tone")
  missionAudio: BraggsRoomMissionAudio

  @input
  @hint("Beam (BeamMesh): plays the intro reveal at Lens start")
  beam: BeamMesh
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Degrees of crystal rotation per cm of hand (or mouse) drag. Left/right turns φ, up/down tilts χ.")
  @widget(new SliderWidget(0.5, 10, 0.1))
  dragGainDegPerCm: number = 3.0

  @input
  @hint("Shortest time between two spot chimes, seconds (several spots often light together at Mo Kα)")
  @widget(new SliderWidget(0.05, 1, 0.05))
  chimeMinIntervalSec: number = 0.25

  @input
  @hint("Intro: seconds for the bright head to travel from the X-ray tube to the beam stop at Lens start")
  @widget(new SliderWidget(0.5, 5, 0.1))
  introBeamSec: number = 2.0
  @ui.group_end

  /** Number of spot chimes played (LEAF). */
  chimeCount = 0
  /** World position of the last chime (LEAF), null before the first. */
  lastChimeWorldPos: vec3 | null = null
  /** Number of verdict flourishes played (LEAF). */
  flourishCount = 0
  /** Number of "not yet" tones played (LEAF). */
  notYetCount = 0

  private sim: BraggSim
  private frame: SimFrame
  private ready = false
  private lastChimeTime = -1e9
  private lastDrawnLattice: DrawnLattice | undefined = undefined

  onAwake(): void {
    this.sim = new BraggSim()
    this.frame = this.sim.step()
    this.createEvent("OnStartEvent").bind(() => this.start())
    this.createEvent("UpdateEvent").bind(() => {
      if (this.ready) this.stepAndRender()
    })
  }

  private start(): void {
    const missing: string[] = []
    if (!this.crystal) missing.push("crystal")
    if (!this.crystalCell) missing.push("crystalCell")
    if (!this.spotPool) missing.push("spotPool")
    if (!this.wallLabels) missing.push("wallLabels")
    if (!this.evidenceBoard) missing.push("evidenceBoard")
    if (!this.controlConsole) missing.push("controlConsole")
    if (!this.goniometerLabels) missing.push("goniometerLabels")
    if (!this.predictor) missing.push("predictor")
    if (!this.predictionRing) missing.push("predictionRing")
    if (!this.guideArrow) missing.push("guideArrow")
    if (!this.edgeChevron) missing.push("edgeChevron")
    if (!this.missionAudio) missing.push("missionAudio")
    if (!this.beam) missing.push("beam")
    if (missing.length) {
      print("BraggsRoomMain: missing inputs: " + missing.join(", ") + ". Re-run the scene wiring.")
      return
    }

    this.wallLabels.bindSpotLabels(this.spotPool.getSpotLabelHolders())
    this.wallLabels.bindGhostLabels(this.spotPool.getGhostLabelHolders())

    this.crystal.onDrag.add((d: vec2) => this.sim.applyDrag(d.x * this.dragGainDegPerCm, d.y * this.dragGainDegPerCm))
    this.controlConsole.onWavelengthChange.add((lambda: number) => this.sim.setWavelength(lambda))
    this.controlConsole.onResetOrientation.add(() => this.sim.resetOrientation())
    this.controlConsole.onLatticeChange.add((l: Lattice) => this.sim.setFreeLattice(l))
    this.controlConsole.onModeButton.add(() => this.toggleMode())
    this.controlConsole.onPredictButton.add(() => this.setPredictorOpen(!this.predictor.isOpen()))
    this.controlConsole.onVerdict.add((v: Lattice) => this.submitVerdict(v))
    this.predictor.onSelectionChange.add(() => this.applyPredictor())

    this.controlConsole.setWavelength(this.sim.lambda)
    this.predictor.setSelection(PREDICTOR_START.h, PREDICTOR_START.k, PREDICTOR_START.l)
    this.setPredictorOpen(false)
    this.ready = true
    this.stepAndRender()

    // Intro: the beam reveals itself from the tube to the beam stop, and the first hint fades in.
    this.beam.playIntro(this.introBeamSec)
    this.wallLabels.playIntro()
  }

  // ------------------------------------------------------------------ mission (buttons and test hooks)

  private toggleMode(): void {
    if (this.sim.mode === "free") this.startMission({})
    else this.endMission()
  }

  private startMission(opts: MissionOptions): void {
    this.sim.startMission(opts)
    this.predictor.setSelection(PREDICTOR_START.h, PREDICTOR_START.k, PREDICTOR_START.l)
    this.setPredictorOpen(false)
  }

  private endMission(): void {
    this.sim.endMission()
    this.setPredictorOpen(false)
  }

  /** PredictButton: unfold (predict the selection) or fold (no prediction). */
  private setPredictorOpen(open: boolean): void {
    this.predictor.setOpen(open)
    this.controlConsole.setPredictorOpen(open)
    this.applyPredictor()
  }

  private applyPredictor(): void {
    const on = this.predictor.isOpen() && this.sim.mode === "mission"
    this.sim.setPredictor(on ? this.predictor.getSelection() : null)
  }

  private submitVerdict(verdict: Lattice): Feedback {
    const fb = this.sim.submitVerdict(verdict)
    if (fb.kind !== "correct") {
      this.missionAudio.playNotYet()
      this.notYetCount++
    }
    return fb
  }

  // ------------------------------------------------------------------ per frame

  private stepAndRender(): void {
    this.frame = this.sim.step()
    this.render(this.frame)
  }

  private render(f: SimFrame): void {
    this.crystal.setOrientation(f.phi, f.chi)
    if (f.drawnLattice !== this.lastDrawnLattice) {
      this.lastDrawnLattice = f.drawnLattice
      this.crystalCell.setLattice(f.drawnLattice)
      if (f.drawnLattice !== null && f.mode === "free") this.controlConsole.setLattice(f.drawnLattice)
    }
    this.goniometerLabels.setReadouts(f.readoutPhi, f.readoutChi)
    this.goniometerLabels.setSampleTag(f.sampleTag)
    this.guideArrow.setGuide(f.guide.visible, f.guide.axis, f.guide.sign)

    const crystalWorld = this.crystal.getSceneObject().getTransform().getWorldPosition()
    const drawn = this.spotPool.render(f.lit, f.ghosts, crystalWorld)
    drawn.spots.forEach((s, i) => {
      if (s) this.wallLabels.setSpotLabel(i, s.title, s.detail)
    })
    drawn.ghosts.forEach((g, i) => {
      if (g) this.wallLabels.setGhostLabel(i, g.label)
    })
    this.wallLabels.setOffWallHint(f.offWallHint)
    const ringRadius = f.ring && f.ring.reachable ? f.ring.radiusCm : null
    this.predictionRing.setRing(ringRadius)
    this.wallLabels.setRingLabel(f.ring ? f.ring.label : null, ringRadius)
    this.wallLabels.setBanner(f.banner)
    this.spotPool.setCelebrating(f.solved)
    this.edgeChevron.setTargets(this.spotPool.getLitWorldPositions())

    this.evidenceBoard.setBoard(f.board.title, f.board.status, f.board.lines, f.board.highlightIndex)
    this.controlConsole.followWavelength(f.lambda)
    this.controlConsole.setLambdaLabel(f.lambdaLabel)
    this.controlConsole.setMissionState(f.mode, f.verdictUnlocked, f.solved, f.feedback)

    this.playChimes(f.newlyLit)
    if (f.justSolved) {
      this.missionAudio.playFlourish()
      this.flourishCount++
    }
  }

  /** One chime per chimeMinIntervalSec; a first sighting wins over repeats in the same frame. */
  private playChimes(newlyLit: SpotView[]): void {
    if (newlyLit.length === 0) return
    const now = getTime()
    if (now - this.lastChimeTime < this.chimeMinIntervalSec) return
    const spot = newlyLit.find((s) => s.firstTime) ?? newlyLit[0]
    const pos = this.spotPool.playChimeForSpot(spot, spot.firstTime)
    if (!pos) return
    this.lastChimeTime = now
    this.chimeCount++
    this.lastChimeWorldPos = pos
  }

  // ------------------------------------------------------------------ test hooks (LEAF)
  // Each hook changes the sim, then steps and renders once, so a test can assert in the same frame.

  getSim(): BraggSim {
    return this.sim
  }

  /** The last SimFrame drawn. */
  getFrame(): SimFrame {
    return this.frame
  }

  testSetOrientation(phiDeg: number, chiDeg: number): SimFrame {
    this.sim.setOrientation(phiDeg, chiDeg)
    return this.testStep()
  }

  testSetWavelength(lambda: number): SimFrame {
    this.sim.setWavelength(lambda)
    this.controlConsole.setWavelength(this.sim.lambda)
    return this.testStep()
  }

  /** Same path as ModeButton → "Start mission"; tests can force the lattice and a. */
  testStartMission(lattice?: Lattice, a?: number): SimFrame {
    this.startMission({lattice, a})
    return this.testStep()
  }

  /** Same path as ModeButton → "Back to free mode". */
  testEndMission(): SimFrame {
    this.endMission()
    return this.testStep()
  }

  /** Same path as the verdict buttons (including the "not yet" tone). */
  testSubmitVerdict(verdict: Lattice): Feedback {
    const fb = this.submitVerdict(verdict)
    this.testStep()
    return fb
  }

  /** Same path as the steppers + PredictButton: select (h k l) and unfold; (0, 0, 0) folds. */
  testSetPredictor(h: number, k: number, l: number): SimFrame {
    this.predictor.setSelection(h, k, l)
    this.setPredictorOpen(!(h === 0 && k === 0 && l === 0))
    return this.testStep()
  }

  /** The guide arrow as drawn: {visible, axis, sign}. */
  getGuideState(): GuideState {
    return this.guideArrow.getState()
  }

  private testStep(): SimFrame {
    this.stepAndRender()
    return this.frame
  }
}
