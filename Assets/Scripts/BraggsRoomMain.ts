/**
 * BraggsRoomMain: the orchestrator on "BraggsRoom" (the lab-frame root at the world origin).
 *
 * Owns: the one BraggSim (all physics and game state live there), the per-frame loop
 * (sim.step() once per frame, then draw the SimFrame), the chime rate limit, and the
 * public test hooks for LEAF.
 *
 * Inputs (References, wired by the scene bootstrap): the crystal controller, the crystal
 * cell mesh, the spot pool, and the four UI modules. Settings: drag gain, chime interval.
 *
 * Data flow (one way): UI / crystal input → sim → SimFrame → controllers and UI setters.
 *
 * Must not: compute any physics (BraggSim / BraggPhysics do), create Text or UIKit
 * components (the *UI.ts modules do), or create semantic scene roots (the scene has them).
 */
import {BraggSim, SimFrame, SpotView, Feedback} from "./BraggSim"
import {Lattice} from "./BraggPhysics"
import {CrystalCellMesh, DrawnLattice} from "./CrystalCellMesh"
import {BraggsRoomCrystalController} from "./BraggsRoomCrystalController"
import {BraggsRoomSpotPool} from "./BraggsRoomSpotPool"
import {BraggsRoomConsoleUI} from "./BraggsRoomConsoleUI"
import {BraggsRoomEvidenceBoardUI} from "./BraggsRoomEvidenceBoardUI"
import {BraggsRoomWallLabelsUI} from "./BraggsRoomWallLabelsUI"
import {BraggsRoomGoniometerUI} from "./BraggsRoomGoniometerUI"

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
  @hint("GoniometerLabels (BraggsRoomGoniometerUI): φ / χ readouts")
  goniometerLabels: BraggsRoomGoniometerUI
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
  @ui.group_end

  /** Number of spot chimes played (LEAF). */
  chimeCount = 0
  /** World position of the last chime (LEAF), null before the first. */
  lastChimeWorldPos: vec3 | null = null

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

    this.controlConsole.setWavelength(this.sim.lambda)
    this.ready = true
    this.stepAndRender()
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

    const crystalWorld = this.crystal.getSceneObject().getTransform().getWorldPosition()
    const drawn = this.spotPool.render(f.lit, f.ghosts, crystalWorld)
    drawn.spots.forEach((s, i) => {
      if (s) this.wallLabels.setSpotLabel(i, s.title, s.detail)
    })
    drawn.ghosts.forEach((g, i) => {
      if (g) this.wallLabels.setGhostLabel(i, g.label)
    })
    this.wallLabels.setOffWallHint(f.offWallHint)

    this.evidenceBoard.setBoard(f.board.title, f.board.status, f.board.lines, f.board.highlightIndex)
    this.controlConsole.setLambdaLabel(f.lambdaLabel)
    this.controlConsole.setSampleTag(f.sampleTag)

    this.playChimes(f.newlyLit)
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

  testStartMission(lattice?: Lattice, a?: number): SimFrame {
    this.sim.startMission({lattice, a})
    this.controlConsole.setWavelength(this.sim.lambda)
    return this.testStep()
  }

  testEndMission(): SimFrame {
    this.sim.endMission()
    this.controlConsole.setWavelength(this.sim.lambda)
    return this.testStep()
  }

  testSubmitVerdict(verdict: Lattice): Feedback {
    const fb = this.sim.submitVerdict(verdict)
    this.testStep()
    return fb
  }

  testSetPredictor(h: number, k: number, l: number): SimFrame {
    this.sim.setPredictor({h, k, l})
    return this.testStep()
  }

  private testStep(): SimFrame {
    this.stepAndRender()
    return this.frame
  }
}
