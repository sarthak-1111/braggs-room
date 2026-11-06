/**
 * Done criterion 3 (hooks for λ: testSetWavelength drives sim.setWavelength and the slider knob,
 * the same path as the WavelengthSlider minus the source snap).
 * With (0 1 0) lit at φ = θ_B, raising λ moves the spot outward and lowering λ moves it inward,
 * each until it goes dark; its found ghost then follows sin θ = λ / 2d, so at Mo Kα (0.71 Å) it
 * sits at 2θ ≈ 10.18°, about 26.94 cm from the beam stop.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {braggThetaDeg} from "../../Scripts/BraggPhysics"
import {BraggsRoomMain} from "../../Scripts/BraggsRoomMain"
import {Checks, drawnSpot, f3, frames, freeBaseline, ghost, ghostSlotObject, litSpot, offsetFromB, so, textOn, v3s, waitForLens} from "./BraggsLeafSupport"

const A = 4.0
const D010 = A // d(010) = a
const TH_B = braggThetaDeg(A, 1.54, {h: 0, k: 1, l: 0}) as number
const KEY = "0,1,0"

/** Sweep λ from 1.54 in `step` increments until (0 1 0) goes dark; |x| must move monotonically. */
function sweep(c: Checks, main: BraggsRoomMain, step: number, outward: boolean): number | null {
  const label = outward ? "λ up" : "λ down"
  let f = main.testSetWavelength(1.54)
  const s0 = litSpot(f, KEY)
  if (!c.ok(`${label}: (0 1 0) lit at λ 1.54 Å before the sweep`, !!s0)) return null
  let prevSim = Math.abs(s0.wall.x)
  let prevDrawn = Math.abs(offsetFromB((drawnSpot(main, KEY) as {world: vec3}).world).x)
  let monotonicSim = true
  let monotonicDrawn = true
  let litSteps = 0
  let darkAt: number | null = null
  const trail: string[] = [`1.54:${f3(-prevSim, 2)}`]
  for (let i = 1; i <= 40; i++) {
    const lambda = Math.round((1.54 + step * i) * 1000) / 1000
    f = main.testSetWavelength(lambda)
    const s = litSpot(f, KEY)
    if (!s) {
      darkAt = lambda
      break
    }
    litSteps++
    const x = Math.abs(s.wall.x)
    const d = drawnSpot(main, KEY)
    const xd = d ? Math.abs(offsetFromB(d.world).x) : NaN
    trail.push(`${lambda.toFixed(2)}:${f3(s.wall.x, 2)}`)
    if (outward ? !(x > prevSim) : !(x < prevSim)) monotonicSim = false
    if (outward ? !(xd > prevDrawn) : !(xd < prevDrawn)) monotonicDrawn = false
    if (Math.abs(s.wall.y) > 0.05) monotonicSim = false
    prevSim = x
    prevDrawn = xd
  }
  c.info(`${label}: λ:wall-x trail ${trail.join(" ")}${darkAt !== null ? `, dark at λ ${darkAt}` : ""}`)
  c.ok(`${label}: spot lit for several steps while sliding`, litSteps >= 3, `${litSteps} lit steps`)
  c.ok(`${label}: spot moves ${outward ? "outward" : "inward"} at every step (sim wall x)`, monotonicSim)
  c.ok(`${label}: drawn spot moves ${outward ? "outward" : "inward"} at every step (SpotPool slot)`, monotonicDrawn)
  if (c.ok(`${label}: spot goes dark`, darkAt !== null)) {
    // Dark once |θ_B(λ) − α| > 1°, with α = θ_B(1.54) fixed: λ_edge = 2d sin(α ± 1°).
    const edge = 2 * D010 * Math.sin(((TH_B + (outward ? 1 : -1)) * Math.PI) / 180)
    c.ok(`${label}: goes dark at the mosaic edge λ ≈ ${f3(edge, 3)} Å`, Math.abs((darkAt as number) - edge) <= Math.abs(step) + 1e-6, `dark at λ ${darkAt} Å`)
  }
  return darkAt
}

function checkGhost(c: Checks, main: BraggsRoomMain, lambda: number, labelExpected: string | null): void {
  const f = main.testSetWavelength(lambda)
  const tt = (2 * Math.asin(lambda / (2 * D010)) * 180) / Math.PI
  const x = -150 * Math.tan((tt * Math.PI) / 180)
  const g = ghost(f, KEY)
  if (!c.ok(`λ ${lambda}: (0 1 0) found ghost shown (spot dark)`, !!g && !litSpot(f, KEY), `ghost keys [${f.ghosts.map((q) => q.key).join(" | ")}]`)) return
  c.near(`λ ${lambda}: ghost 2θ = 2 asin(λ/2d)`, g.g.twoThetaDeg, tt, 0.005, "°")
  c.near(`λ ${lambda}: ghost wall x`, g.g.wall.x, x, 0.05, " cm")
  c.near(`λ ${lambda}: ghost wall y`, g.g.wall.y, 0, 0.05, " cm")
  const root = ghostSlotObject(g.index)
  c.ok(`λ ${lambda}: Ghost_${g.index} enabled`, root.isEnabledInHierarchy)
  const off = offsetFromB(root.getTransform().getWorldPosition())
  c.info(`λ ${lambda}: Ghost_${g.index} offset from beam stop ${v3s(off)} cm, label "${textOn(so("GhostLabel", root)).text}"`)
  c.near(`λ ${lambda}: drawn ghost x offset from beam stop`, off.x, x, 0.5, " cm")
  c.near(`λ ${lambda}: drawn ghost y offset from beam stop`, off.y, 0, 0.5, " cm")
  if (labelExpected !== null) c.eq(`λ ${lambda}: ghost label`, textOn(so("GhostLabel", root)).text, labelExpected)
}

@component
export class BraggsC3WavelengthScenario extends Scenario {
  async run(): Promise<void> {
    const c = new Checks("c3-wavelength-slide-ghost")
    const main = await waitForLens()
    freeBaseline(main)
    const f0 = main.testSetOrientation(TH_B, 0)
    c.ok("(0 1 0) lit at φ = θ_B, λ 1.54 Å", !!litSpot(f0, KEY))
    await frames(1)

    const darkUp = sweep(c, main, 0.01, true)
    if (darkUp !== null) checkGhost(c, main, darkUp, null)
    const darkDown = sweep(c, main, -0.01, false)
    if (darkDown !== null) checkGhost(c, main, darkDown, null)

    // The ghost keeps following sin θ = λ / 2d down to Mo Kα.
    checkGhost(c, main, 1.2, null)
    checkGhost(c, main, 0.9, null)
    checkGhost(c, main, 0.71, "(0 1 0) 2θ 10.2°")
    const g = ghost(main.getFrame(), KEY)
    if (g) {
      c.near("Mo Kα: ghost 2θ ≈ 10.18°", g.g.twoThetaDeg, 10.1834, 0.002, "°")
      c.near("Mo Kα: ghost ≈ 26.94 cm from the beam stop", Math.hypot(g.g.wall.x, g.g.wall.y), 26.944, 0.02, " cm")
    }
    c.eq("Mo Kα: λ label", main.getFrame().lambdaLabel, "λ 0.71 Å · Mo Kα")

    freeBaseline(main)
    await frames(2)
    c.finish()
  }
}
