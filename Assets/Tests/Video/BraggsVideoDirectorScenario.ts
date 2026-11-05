/**
 * BraggsVideoDirectorScenario: drives the Lens through the demo-video shots (test code only).
 *
 * Nothing runs on Lens start: LeafIndex only registers this scenario, and LEAF creates it when a
 * run is requested (LEAF panel, or the Lens Studio MCP tool run_leaf_scenario).
 *
 * LEAF restarts the Lens before every run, so a whole take is one run: the `plan` parameter lists
 * its steps, and the director holds each resulting state until it is told to go on. The signal
 * is a nudge of the Interactive Preview camera (any move of more than NUDGE_CM, e.g. a 0.02 cm
 * MovePreviewCamera setPosition offset, far below a pixel, or a reframing move): after a nudge it
 * applies the next step, lets the Lens settle, and prints the state as one
 * "[BRAGG-VIDEO] STATE {json}" log line. A capture tool can wait for that line, capture the
 * Preview panel, then nudge again, so every capture shows a finished state.
 *
 * Parameters
 *   plan   steps separated by "|", each "<shot>#<actions>" (the shot id is only reported back).
 *          Step 0 runs straight away; every later step waits for a camera nudge. After the last
 *          step the director waits for one more nudge, shows LEAF's strip again and finishes.
 *          The registered timeout (120 s) only suits single cmds: pass __leaf__timeout_secs for a
 *          take (the demo-video take of 98 steps ran about 16 minutes with "7200").
 *   cmd   without a plan: apply these actions once and print the state. Default "status" (prints
 *          only), so "run all" in the LEAF panel is harmless.
 *   tag    copied into every STATE line, to tell takes apart in the log.
 *
 * Actions (";"-separated, applied in order)
 *   none                  nothing (a hold, e.g. while the camera reframes)
 *   phi:<deg> / chi:<deg> turn / tilt the crystal to an absolute φ / χ with real pinch-drags (closed loop)
 *   lambda:<Å>            move the WavelengthSlider through its own value setter (Slider.currentValue),
 *                         which fires the slider's onValueChange: the console's handler (source snap
 *                         included) and sim.setWavelength, the same path a hand on the knob takes
 *   press:<Name>          real trigger of a SIK interactable (ModeButton, ResetButton, PredictButton,
 *                         HPlus … LMinus, VerdictSCButton, VerdictFCCButton)
 *   force:<SC|FCC>:<a>    TEST HOOK BraggsRoomMain.testStartMission(lattice, a): the ModeButton's own
 *                         startMission path with the round's type and a fixed (a predictable round)
 *   wait:<ms>             sleep
 *   until:<s>             wait until the Lens has run for this many seconds (e.g. past the intro line)
 *   probe                 measure the preview's frame rate and Lens-time speed
 *
 * LEAF's own on-screen log strip (LeafDebugUICamera, test tooling) is hidden while a plan or a cmd
 * other than "status" runs, so captures show only the Lens; a plan shows it again when it ends.
 *
 * Never changes the Lens scripts or their behaviour: besides real input it only reads state, plus
 * the one test hook above when a shot needs a fixed mission round.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {ScenarioConfig} from "Leaf.lspkg/Scenarios/scenario/ScenarioConfig"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Slider} from "SpectaclesUIKit.lspkg/Scripts/Components/Slider/Slider"
import {DEFAULT_CONFIG} from "../../Scripts/BraggSim"
import {Lattice} from "../../Scripts/BraggPhysics"
import {BraggsRoomMain} from "../../Scripts/BraggsRoomMain"
import {SCENE_NAMES} from "../../Scripts/BraggsRoomSceneContracts"
import {drawnSpot, frames, interactable, so, textOf, waitForLens} from "../Leaf/BraggsLeafSupport"

const TAG = "[BRAGG-VIDEO]"
/** Closed-loop turn: stop within this many degrees of the target. */
const TURN_TOL_DEG = 0.05
/** Settle after the actions (slider knob spring, button hover states), ms. */
const SETTLE_MS = 300
/** A camera move larger than this (cm) is a nudge: go to the next step. */
const NUDGE_CM = 0.005
/** Give up on a plan if no nudge arrives for this long. */
const NUDGE_TIMEOUT_MS = 20 * 60 * 1000

function r2(x: number): number {
  return Math.round(x * 100) / 100
}

function r3(x: number): number {
  return Math.round(x * 1000) / 1000
}

function clampAbs(x: number, lo: number, hi: number): number {
  const s = x < 0 ? -1 : 1
  return s * Math.min(hi, Math.max(lo, Math.abs(x)))
}

function setLeafHud(on: boolean): void {
  const o = findSceneObjectByName("LeafDebugUICamera")
  if (o && o.enabled !== on) o.enabled = on
}

function shown(name: string): boolean {
  const o = findSceneObjectByName(name)
  return !!o && o.isEnabledInHierarchy
}

function cameraTransform(): Transform {
  const o = findSceneObjectByName("Camera Object")
  if (!o) throw new Error('SceneObject "Camera Object" not found')
  return o.getTransform()
}

/** BraggsRoomMain once it has started; no extra wait when it is already running. */
async function lensReady(): Promise<BraggsRoomMain> {
  const root = findSceneObjectByName(SCENE_NAMES.root)
  const main = root ? (root.getComponent(BraggsRoomMain.getTypeName()) as BraggsRoomMain) : null
  if (main && main.getFrame() && findSceneObjectByName(SCENE_NAMES.resetButton)) return main
  return waitForLens()
}

/** Frames rendered and Lens seconds elapsed per wall-clock second (the preview slows when the session is locked). */
async function probeRate(): Promise<{fps: number; lensSecPerSec: number}> {
  const w0 = Date.now()
  const t0 = getTime()
  let n = 0
  while (Date.now() - w0 < 1500) {
    await frames(1)
    n++
  }
  const wall = (Date.now() - w0) / 1000
  return {fps: r2(n / wall), lensSecPerSec: r2((getTime() - t0) / wall)}
}

interface StepLog {
  notes: string[]
  forced: string[]
  rate: {fps: number; lensSecPerSec: number} | null
}

class Director {
  private ix = new DefaultLeafInteractor()

  constructor(private main: BraggsRoomMain) {}

  /** Turn and/or tilt to an absolute (φ, χ) with real drags, learning the drag gain as it goes. */
  private async turnTo(phiT: number | null, chiT: number | null): Promise<string> {
    const crystal: Interactable = interactable(SCENE_NAMES.crystal)
    // Degrees per (cm per frame) of drag vector, per 250 ms drag. Measured about 6 at 21 fps;
    // the frame rate and the sim's slowdown near conditions change it, so it is learned.
    let gx = 8
    let gy = 8
    let n = 0
    for (; n < 40; n++) {
      const f = this.main.getFrame()
      const ep = phiT === null ? 0 : phiT - f.phi
      const ec = chiT === null ? 0 : chiT - f.chi
      if (Math.abs(ep) <= TURN_TOL_DEG && Math.abs(ec) <= TURN_TOL_DEG) break
      const k = n === 0 ? 0.6 : 0.8
      const vx = Math.abs(ep) > TURN_TOL_DEG ? clampAbs((k * ep) / gx, 0.0005, 2.0) : 0
      const vy = Math.abs(ec) > TURN_TOL_DEG ? clampAbs((k * ec) / gy, 0.0005, 2.0) : 0
      await this.ix.drag(crystal, new vec3(vx, vy, 0), 250)
      await frames(2)
      const g = this.main.getFrame()
      if (vx !== 0 && Math.abs(g.phi - f.phi) > 0.003) gx = clampAbs((g.phi - f.phi) / vx, 0.1, 60)
      if (vy !== 0 && Math.abs(g.chi - f.chi) > 0.003) gy = clampAbs((g.chi - f.chi) / vy, 0.1, 60)
    }
    return `${n} real drags`
  }

  private async setLambda(target: number): Promise<void> {
    const slider = so(SCENE_NAMES.wavelengthSlider).getComponent(Slider.getTypeName()) as Slider
    if (!slider) throw new Error("WavelengthSlider has no Slider")
    const v = (target - DEFAULT_CONFIG.lambdaMin) / (DEFAULT_CONFIG.lambdaMax - DEFAULT_CONFIG.lambdaMin)
    slider.currentValue = Math.min(1, Math.max(0, v))
    await frames(3)
  }

  async apply(actions: string, log: StepLog): Promise<void> {
    for (const raw of actions.split(";")) {
      const action = raw.trim()
      if (!action || action === "status" || action === "none") continue
      const [verb, ...rest] = action.split(":")
      const arg = rest.join(":")
      if (verb === "phi" || verb === "chi") {
        const t = Number(arg)
        if (!Number.isFinite(t)) throw new Error(`bad ${verb} target "${arg}"`)
        log.notes.push(`${verb}→${t}: ${await this.turnTo(verb === "phi" ? t : null, verb === "chi" ? t : null)}`)
      } else if (verb === "lambda") {
        await this.setLambda(Number(arg))
      } else if (verb === "press") {
        await this.ix.trigger(interactable(arg))
        await frames(3)
      } else if (verb === "force") {
        const [lat, a] = arg.split(":")
        this.main.testStartMission(lat as Lattice, Number(a))
        log.forced.push(`testStartMission(${lat}, ${a})`)
        await frames(2)
      } else if (verb === "wait") {
        await sleep(Number(arg))
      } else if (verb === "until") {
        while (getTime() < Number(arg)) await frames(1)
      } else if (verb === "probe") {
        log.rate = await probeRate()
      } else {
        throw new Error(`unknown action "${action}"`)
      }
    }
  }

  /** One STATE line: everything the manifest needs about what is on screen. */
  report(extra: Record<string, unknown>, log: StepLog, counts: {chime: number; flourish: number; notYet: number}): void {
    const main = this.main
    const f = main.getFrame()
    const lit = f.lit.map((s) => {
      const d = drawnSpot(main, s.key)
      return {key: s.key, N: s.N, twoTheta: r2(s.twoThetaDeg), wall: [r2(s.wall.x), r2(s.wall.y)], label: d ? d.label : null}
    })
    const sel = main.predictor.getSelection()
    const cam = cameraTransform().getWorldPosition()
    const state = {
      ...extra,
      t: r2(getTime()),
      wallMs: Date.now(),
      cam: [r3(cam.x), r3(cam.y), r3(cam.z)],
      rate: log.rate,
      mode: f.mode,
      phi: r2(f.phi),
      chi: r2(f.chi),
      readouts: [f.readoutPhi, f.readoutChi],
      lambda: r2(f.lambda),
      lambdaLabel: f.lambdaLabel,
      a: f.a,
      drawnLattice: f.drawnLattice,
      sampleTag: textOf(SCENE_NAMES.sampleTag),
      modeButton: textOf("ButtonLabel", so(SCENE_NAMES.modeButton)),
      lit,
      ghosts: f.ghosts.map((g) => ({key: g.key, label: g.label, twoTheta: r2(g.twoThetaDeg)})),
      offWallHint: f.offWallHint,
      board: {title: f.board.title, status: f.board.status, lines: f.board.lines.slice(), highlight: f.board.highlightIndex},
      guide: main.getGuideState(),
      predictor: {open: main.predictor.isOpen(), hkl: [sel.h, sel.k, sel.l]},
      ring: f.ring ? {label: f.ring.label, radiusCm: f.ring.radiusCm === null ? null : r2(f.ring.radiusCm)} : null,
      verdictUnlocked: f.verdictUnlocked,
      verdictButtons: {sc: shown(SCENE_NAMES.verdictSCButton), fcc: shown(SCENE_NAMES.verdictFCCButton)},
      feedback: f.feedback,
      solved: f.solved,
      banner: shown(SCENE_NAMES.banner) ? textOf(SCENE_NAMES.banner) : "",
      introLine: shown(SCENE_NAMES.introText),
      pulseScale: r2(main.spotPool.getPulseScale()),
      events: {chimes: main.chimeCount - counts.chime, flourish: main.flourishCount - counts.flourish, notYet: main.notYetCount - counts.notYet},
      forced: log.forced,
      notes: log.notes,
    }
    print(`${TAG} STATE ${JSON.stringify(state)}`)
  }

  counts(): {chime: number; flourish: number; notYet: number} {
    return {chime: this.main.chimeCount, flourish: this.main.flourishCount, notYet: this.main.notYetCount}
  }
}

async function waitForNudge(cam: Transform, from: vec3): Promise<void> {
  const t0 = Date.now()
  while (cam.getWorldPosition().distance(from) <= NUDGE_CM) {
    if (Date.now() - t0 > NUDGE_TIMEOUT_MS) throw new Error(`no camera nudge for ${NUDGE_TIMEOUT_MS / 60000} min`)
    await frames(1)
  }
}

@component
export class BraggsVideoDirectorScenario extends Scenario {
  async run(config?: ScenarioConfig): Promise<void> {
    const plan = (config && config.get("plan")) || ""
    const cmd = (config && config.get("cmd")) || "status"
    const tag = (config && config.get("tag")) || ""
    const main = await lensReady()
    const d = new Director(main)

    if (!plan) {
      if (cmd !== "status") setLeafHud(false)
      const counts = d.counts()
      const log: StepLog = {notes: [], forced: [], rate: null}
      await d.apply(cmd, log)
      if (cmd !== "status") {
        await frames(3)
        await sleep(SETTLE_MS)
      }
      d.report({tag, cmd}, log, counts)
      return
    }

    setLeafHud(false)
    const steps = plan.split("|").map((s) => s.trim()).filter((s) => s.length > 0)
    const cam = cameraTransform()
    for (let i = 0; i < steps.length; i++) {
      if (i > 0) await waitForNudge(cam, cam.getWorldPosition())
      const hash = steps[i].indexOf("#")
      const shot = hash >= 0 ? steps[i].slice(0, hash) : ""
      const actions = hash >= 0 ? steps[i].slice(hash + 1) : steps[i]
      const counts = d.counts()
      const log: StepLog = {notes: [], forced: [], rate: null}
      await d.apply(actions, log)
      await frames(3)
      await sleep(SETTLE_MS)
      d.report({tag, step: i, of: steps.length, shot, cmd: actions}, log, counts)
    }
    await waitForNudge(cam, cam.getWorldPosition())
    setLeafHud(true)
  }
}
