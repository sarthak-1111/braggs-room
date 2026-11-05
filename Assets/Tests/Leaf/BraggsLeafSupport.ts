/**
 * BraggsLeafSupport: shared helpers for the Bragg's Room LEAF scenarios (test code only).
 *
 * - Checks: records every sub-check as a "[BRAGG-LEAF] CHECK-PASS|CHECK-FAIL" log line, so one
 *   run shows every sub-check, then fails the scenario (LEAF expect) if any sub-check failed.
 * - Scene lookups by the names in BraggsRoomSceneContracts (BraggsRoom, Crystal, BeamStop, ...).
 * - goClean: the command-line tests' strategy (tests/sim.test.ts) for a "clean" orientation,
 *   driven through the Lens test hook testSetOrientation.
 * - measureText: rendered size of a Text from its AABB and its visual angle from an eye point.
 *
 * Never changes the Lens scripts; it only calls the public test hooks on BraggsRoomMain.
 */
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {BraggsRoomMain} from "../../Scripts/BraggsRoomMain"
import {SimFrame, SpotView, GhostView} from "../../Scripts/BraggSim"
import * as P from "../../Scripts/BraggPhysics"

export const TAG = "[BRAGG-LEAF]"
export const DEG = Math.PI / 180

export function f3(x: number, d = 3): string {
  return Number.isFinite(x) ? x.toFixed(d) : String(x)
}

export function v3s(v: vec3, d = 3): string {
  return `(${f3(v.x, d)}, ${f3(v.y, d)}, ${f3(v.z, d)})`
}

/** Collects sub-checks; finish() fails the scenario if any failed. */
export class Checks {
  private fails: string[] = []
  private count = 0

  constructor(private scenario: string) {}

  ok(name: string, cond: boolean, detail = ""): boolean {
    this.count++
    const d = detail ? ` :: ${detail}` : ""
    print(`${TAG} ${cond ? "CHECK-PASS" : "CHECK-FAIL"} ${this.scenario} :: ${name}${d}`)
    if (!cond) this.fails.push(`${name}${detail ? " [" + detail + "]" : ""}`)
    return cond
  }

  near(name: string, actual: number, expected: number, tol: number, unit = ""): boolean {
    const good = Number.isFinite(actual) && Math.abs(actual - expected) <= tol
    return this.ok(name, good, `actual ${f3(actual, 4)}${unit}, expected ${f3(expected, 4)}${unit} ± ${tol}`)
  }

  eq(name: string, actual: unknown, expected: unknown): boolean {
    return this.ok(name, actual === expected, `actual ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
  }

  info(msg: string): void {
    print(`${TAG} INFO ${this.scenario} :: ${msg}`)
  }

  failed(): number {
    return this.fails.length
  }

  finish(): void {
    print(`${TAG} SUMMARY ${this.scenario} :: ${this.count - this.fails.length}/${this.count} checks passed`)
    expect(this.fails.length, `${this.fails.length} failed check(s): ${this.fails.join(" | ")}`).toBe(0)
  }
}

// ------------------------------------------------------------------ scene access

export function so(name: string, root?: SceneObject): SceneObject {
  const o = findSceneObjectByName(name, root)
  if (!o) throw new Error(`SceneObject "${name}" not found`)
  return o
}

export function getMain(): BraggsRoomMain {
  const main = so("BraggsRoom").getComponent(BraggsRoomMain.getTypeName()) as BraggsRoomMain
  if (!main) throw new Error("BraggsRoomMain is not on BraggsRoom")
  return main
}

/** Wait until BraggsRoomMain has started (spot labels bound, controls built). */
export async function waitForLens(): Promise<BraggsRoomMain> {
  for (let i = 0; i < 100; i++) {
    const root = findSceneObjectByName("BraggsRoom")
    const main = root ? (root.getComponent(BraggsRoomMain.getTypeName()) as BraggsRoomMain) : null
    const reset = findInteractableByName("ResetButton")
    const label = findSceneObjectByName("SpotLabel")
    if (main && main.getFrame() && reset && label && label.getComponent("Component.Text")) {
      await sleep(300)
      return main
    }
    await sleep(100)
  }
  throw new Error("Bragg's Room did not finish starting within 10 s")
}

export async function frames(n: number): Promise<void> {
  for (let i = 0; i < n; i++) await nextFrame()
}

export function textOn(o: SceneObject): Text {
  const t = o.getComponent("Component.Text") as Text
  if (!t) throw new Error(`No Text on "${o.name}"`)
  return t
}

export function textOf(name: string, root?: SceneObject): string {
  return textOn(so(name, root)).text
}

export function interactable(name: string, enabledOnly = true): Interactable {
  const i = findInteractableByName(name, undefined, enabledOnly)
  if (!i) throw new Error(`Interactable "${name}" not found${enabledOnly ? " (or not enabled)" : ""}`)
  return i
}

/** Room frame = BraggsRoom's local frame. */
export function toRoom(world: vec3): vec3 {
  return so("BraggsRoom").getTransform().getInvertedWorldTransform().multiplyPoint(world)
}

export function roomDir(worldDir: vec3): vec3 {
  return so("BraggsRoom").getTransform().getInvertedWorldTransform().multiplyDirection(worldDir).normalize()
}

export function beamStopWorld(): vec3 {
  return so("BeamStop").getTransform().getWorldPosition()
}

/** Offset of a world point from the beam stop B, in the room frame (cm). */
export function offsetFromB(world: vec3): vec3 {
  return toRoom(world).sub(toRoom(beamStopWorld()))
}

/** The room-frame eye: the camera start position, the room origin. */
export function eyeWorld(): vec3 {
  return so("BraggsRoom").getTransform().getWorldTransform().multiplyPoint(vec3.zero())
}

// ------------------------------------------------------------------ spots and ghosts

export function spotSlotObject(i: number): SceneObject {
  return so(`Spot_${i}`, so("SpotPool"))
}

export function ghostSlotObject(i: number): SceneObject {
  return so(`Ghost_${i}`, so("SpotPool"))
}

export function litSpot(f: SimFrame, key: string): SpotView | undefined {
  return f.lit.find((s) => s.key === key)
}

export function ghost(f: SimFrame, key: string): {g: GhostView; index: number} | undefined {
  const index = f.ghosts.findIndex((g) => g.key === key)
  return index >= 0 ? {g: f.ghosts[index], index} : undefined
}

/** Slot index, world position and label text of the drawn spot for `key`, or null. */
export function drawnSpot(main: BraggsRoomMain, key: string): {slot: number; world: vec3; label: string; labelObj: SceneObject} | null {
  const slot = main.spotPool.slotForKey(key)
  if (slot < 0) return null
  const root = spotSlotObject(slot)
  const labelObj = so("SpotLabel", root)
  return {slot, world: root.getTransform().getWorldPosition(), label: textOn(labelObj).text, labelObj}
}

// ------------------------------------------------------------------ state set-up (test hooks)

/** Free mode, SC, λ = 1.54 Å, orientation 0/0, through the public hooks. */
export function freeBaseline(main: BraggsRoomMain): SimFrame {
  if (main.getSim().mode === "mission") main.testEndMission()
  main.getSim().setFreeLattice("SC")
  main.testSetWavelength(1.54)
  return main.testSetOrientation(0, 0)
}

/**
 * Put (hkl) exactly in its Bragg condition at an orientation where no reflection with a
 * different d-spacing is also in condition (tests/sim.test.ts goClean), via testSetOrientation.
 */
export function goClean(main: BraggsRoomMain, m: P.Miller): SimFrame {
  const sim = main.getSim()
  const N = P.millerN(m)
  const tol = sim.cfg.toleranceDeg
  const det = sim.cfg.detector
  for (let chi = 0; chi <= 40; chi = chi <= 0 ? 1 - chi : -chi) {
    for (const near of [0, 90, -90, 180]) {
      const phi = P.solvePhiForCondition(m, sim.a, sim.lambda, chi, near)
      if (phi === null) continue
      const r0 = P.evaluateReflection(m, sim.a, sim.lambda, phi, chi, tol, det)
      if (!r0.onDetector) continue
      const others = sim.candidates.filter((c) => {
        const r = P.evaluateReflection(c, sim.a, sim.lambda, phi, chi, tol, det)
        return r.inCondition && r.onDetector && P.millerN(c) !== N
      })
      if (others.length === 0) return main.testSetOrientation(phi, chi)
    }
  }
  throw new Error(`no clean orientation for (${m.h} ${m.k} ${m.l}) at a = ${sim.a}`)
}

// ------------------------------------------------------------------ text size

export interface TextSize {
  name: string
  text: string
  lines: number
  /** Rendered block height in world cm (local AABB height mapped through the transform). */
  blockCm: number
  /** blockCm / number of lines. */
  lineCm: number
  /** World-AABB y extent, cm (equals blockCm for untilted text). */
  worldYcm: number
  distCm: number
  blockDeg: number
  lineDeg: number
  /** Font em height in world cm from Text.size / 43.886 (the build's own conversion; info only). */
  emCm: number
  emDeg: number
}

function angleDeg(eye: vec3, a: vec3, b: vec3): number {
  const u = a.sub(eye).normalize()
  const v = b.sub(eye).normalize()
  return Math.acos(Math.max(-1, Math.min(1, u.dot(v)))) / DEG
}

/**
 * Rendered height of a Text: its local AABB's top-centre and bottom-centre mapped to world,
 * and the visual angle they subtend at `eye` (so a tilted desk label is foreshortened).
 */
export function measureText(t: Text, name: string, eye: vec3): TextSize {
  const lmin = t.localAabbMin()
  const lmax = t.localAabbMax()
  const cx = (lmin.x + lmax.x) / 2
  const cz = (lmin.z + lmax.z) / 2
  const wt = t.getSceneObject().getTransform().getWorldTransform()
  const top = wt.multiplyPoint(new vec3(cx, lmax.y, cz))
  const bot = wt.multiplyPoint(new vec3(cx, lmin.y, cz))
  const blockCm = top.distance(bot)
  const lines = Math.max(1, t.text.split("\n").length)
  const lineCm = blockCm / lines
  const mid = top.add(bot).uniformScale(0.5)
  const dir = blockCm > 1e-6 ? top.sub(bot).normalize() : vec3.up()
  const half = dir.uniformScale(lineCm / 2)
  const wmin = t.worldAabbMin()
  const wmax = t.worldAabbMax()
  const emCm = (t.size / 43.886) * t.getSceneObject().getTransform().getWorldScale().y
  const emHalf = dir.uniformScale(emCm / 2)
  return {
    name,
    text: t.text,
    lines,
    blockCm,
    lineCm,
    worldYcm: wmax.y - wmin.y,
    distCm: mid.distance(eye),
    blockDeg: angleDeg(eye, top, bot),
    lineDeg: angleDeg(eye, mid.add(half), mid.sub(half)),
    emCm,
    emDeg: angleDeg(eye, mid.add(emHalf), mid.sub(emHalf)),
  }
}

export function sizeLine(s: TextSize): string {
  return `"${s.text.replace(/\n/g, "⏎")}" lines ${s.lines}, block ${f3(s.blockCm, 2)} cm (world-AABB y ${f3(s.worldYcm, 2)} cm), per line ${f3(s.lineCm, 2)} cm, dist ${f3(s.distCm, 1)} cm, block ${f3(s.blockDeg, 3)}°, per line ${f3(s.lineDeg, 3)}°; font em ${f3(s.emCm, 2)} cm = ${f3(s.emDeg, 3)}° (info)`
}
