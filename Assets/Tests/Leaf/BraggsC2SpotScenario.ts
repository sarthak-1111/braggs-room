/**
 * Done criterion 2, free mode (SC, a = 4.0 Å, λ = 1.54 Å).
 *
 * BraggsC2SpotScenario (hooks): testSetOrientation(θ_B, 0) lights (0 1 0): label, θ / 2θ, spot on
 *   the beam stop's horizontal line ≈ 61.2 cm to the left, a chime from the spot; θ_B + 0.9° still
 *   lit, θ_B + 1.1° dark (mosaic ±1.0°); (0 −1 0) at −θ_B lands ≈ 61.2 cm to the right.
 * BraggsC2RealDragScenario (real drag): from φ = 0, small real pinch-drags to the right until the
 *   (0 1 0) spot lights; the label, position and chime are checked the same way.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {Checks, f3, frames, freeBaseline, litSpot, waitForLens} from "./BraggsLeafSupport"
import {A, LAMBDA, TH_B, WALL_X, checkLitSpot} from "./BraggsC2Shared"

@component
export class BraggsC2SpotScenario extends Scenario {
  async run(): Promise<void> {
    const c = new Checks("c2-spot-010-hooks")
    const main = await waitForLens()
    let f = freeBaseline(main)
    c.info(`θ_B(0 1 0) = ${f3(TH_B, 4)}°, expected wall x ${f3(WALL_X, 3)} cm`)
    c.eq("free mode", f.mode, "free")
    c.near("free a", f.a, A, 1e-9, " Å")
    c.near("free λ", f.lambda, LAMBDA, 1e-9, " Å")
    c.ok("start orientation lights nothing", f.lit.length === 0, `lit [${f.lit.map((s) => s.key).join(" | ")}]`)
    await sleep(400) // clear the chime rate limit

    // About 11° from the start position: (0 1 0) lights.
    let chimes = main.chimeCount
    f = main.testSetOrientation(TH_B, 0)
    checkLitSpot(c, main, "0,1,0", "(0 1 0)", WALL_X, chimes, "φ = θ_B")
    c.ok("φ = θ_B: only (0 1 0) is lit", f.lit.length === 1, `lit [${f.lit.map((s) => s.key).join(" | ")}]`)

    // Mosaic tolerance: still lit at +0.9°, dark at +1.1°.
    f = main.testSetOrientation(TH_B + 0.9, 0)
    c.ok("φ = θ_B + 0.9°: (0 1 0) still lit", !!litSpot(f, "0,1,0"))
    f = main.testSetOrientation(TH_B + 1.1, 0)
    c.ok("φ = θ_B + 1.1°: (0 1 0) dark", !litSpot(f, "0,1,0"), `lit [${f.lit.map((s) => s.key).join(" | ")}]`)
    c.eq("φ = θ_B + 1.1°: no SpotPool slot shows (0 1 0)", main.spotPool.slotForKey("0,1,0"), -1)
    f = main.testSetOrientation(TH_B + 3, 0)
    c.ok("φ = θ_B + 3°: (0 1 0) dark", !litSpot(f, "0,1,0"))

    // The other side: (0 −1 0) at −θ_B lands ≈ 61.2 cm to the right.
    main.testSetOrientation(0, 0)
    await sleep(400)
    chimes = main.chimeCount
    main.testSetOrientation(-TH_B, 0)
    checkLitSpot(c, main, "0,-1,0", "(0 −1 0)", -WALL_X, chimes, "φ = −θ_B")

    freeBaseline(main)
    await frames(2)
    c.finish()
  }
}
