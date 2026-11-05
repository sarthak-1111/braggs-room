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
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {Checks, f3, frames, freeBaseline, interactable, litSpot, waitForLens} from "./BraggsLeafSupport"
import {TH_B, WALL_X, checkLitSpot} from "./BraggsC2Shared"

@component
export class BraggsC2RealDragScenario extends Scenario {
  async run(): Promise<void> {
    const c = new Checks("c2-spot-010-real-drag")
    const main = await waitForLens()
    freeBaseline(main)
    await frames(3)
    await sleep(400)
    const interactor = new DefaultLeafInteractor()
    const crystal = interactable("Crystal")
    const chimes = main.chimeCount

    let litAt: number | null = null
    let drags = 0
    while (drags < 120 && main.getFrame().phi < TH_B + 3) {
      // Coarse drags while far from the condition, then fine ones (each well under the 2° window).
      const far = main.getFrame().phi < TH_B - 2.5
      await interactor.drag(crystal, new vec3(far ? 0.25 : 0.04, 0, 0), far ? 300 : 150)
      await frames(2)
      drags++
      if (litSpot(main.getFrame(), "0,1,0")) {
        litAt = main.getFrame().phi
        break
      }
    }
    c.info(`${drags} real drags, φ now ${f3(main.getFrame().phi, 3)}°, χ ${f3(main.getFrame().chi, 3)}°`)
    if (c.ok("real drag to the right lights (0 1 0)", litAt !== null, `stopped at φ ${f3(main.getFrame().phi)}°`)) {
      c.ok("lit within the mosaic window θ_B ± 1°", Math.abs((litAt as number) - TH_B) <= 1.0, `φ ${f3(litAt as number, 3)}° vs θ_B ${f3(TH_B, 3)}°`)
      c.near("χ untouched by horizontal drags", main.getFrame().chi, 0, 1e-6, "°")
      checkLitSpot(c, main, "0,1,0", "(0 1 0)", WALL_X, chimes, "real drag")
    }

    // Keep turning past it (real drags): dark within about 1° of the condition.
    let darkAt: number | null = null
    let lastLit = main.getFrame().phi
    for (let i = 0; i < 40 && darkAt === null; i++) {
      await interactor.drag(crystal, new vec3(0.04, 0, 0), 150)
      await frames(2)
      if (!litSpot(main.getFrame(), "0,1,0")) darkAt = main.getFrame().phi
      else lastLit = main.getFrame().phi
    }
    if (c.ok("turning on past it, (0 1 0) goes dark", darkAt !== null)) {
      const dk = darkAt as number
      c.ok("last lit sample within θ_B + 1.0°, first dark sample beyond θ_B + 1.0°", lastLit - TH_B <= 1.0 + 1e-9 && dk - TH_B > 1.0, `last lit θ_B + ${f3(lastLit - TH_B, 3)}°, dark at θ_B + ${f3(dk - TH_B, 3)}° (drag step ${f3(dk - lastLit, 3)}°)`)
    }

    freeBaseline(main)
    await frames(2)
    c.finish()
  }
}
