/**
 * Done criterion 4: mission rounds.
 *
 * BraggsC4ScScenario: the real ModeButton starts a round at Mo Kα; the round is then forced to SC,
 *   a = 5.0 Å (testStartMission). Clean orientations (testSetOrientation) record (100), (110),
 *   (111); the verdict buttons stay hidden until the third distinct d-spacing. Real presses:
 *   "Face-centred cubic" (wrong: names the (100)-type spot, highlights it on the board, "not yet"
 *   tone), then "Simple cubic" (correct: reveals indices, names caesium chloride, flourish).
 * BraggsC4FccScenario: forced FCC, a = 5.0 Å. The board logs the (100) and (110) absences; after
 *   (111), (200), (220) the verdict unlocks. Real presses: "Simple cubic" (wrong: the absences),
 *   then "Face-centred cubic" (correct: rock salt). The real ModeButton then returns to free mode.
 * BraggsC4NoLeakScenario: the same orientation path (sim.applyDrag steps, the crystal-drag code
 *   path) with the same a and λ changes in a forced-SC and a forced-FCC round gives identical
 *   guide arrows (as drawn, getGuideState) and slowdown (frame.slowFactor) at every step.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {nextFrame} from "Leaf.lspkg/Utils/common/Utils"
import {Lattice} from "../../Scripts/BraggPhysics"
import {Checks, f3, frames, freeBaseline, waitForLens} from "./BraggsLeafSupport"

@component
export class BraggsC4NoLeakScenario extends Scenario {
  async run(): Promise<void> {
    const c = new Checks("c4-no-leak-helpers")
    const main = await waitForLens()
    const A_LEAK = 4.37
    const STEPS = 600

    const runPath = async (lattice: Lattice): Promise<string[]> => {
      main.testStartMission(lattice, A_LEAK)
      const sim = main.getSim()
      const trace: string[] = []
      for (let i = 0; i < STEPS; i++) {
        // A wandering path through many conditions, with λ changes on the way (tests/sim.test.ts).
        sim.applyDrag(0.35 * Math.sin(i / 37) + 0.25, 0.3 * Math.cos(i / 23))
        if (i === 200) main.testSetWavelength(1.2)
        if (i === 400) main.testSetWavelength(0.85)
        const f = main.testSetOrientation(sim.phi, sim.chi) // render the reached orientation once
        const g = main.getGuideState()
        trace.push(`${f.phi.toFixed(6)}|${f.chi.toFixed(6)}|${f.lambda.toFixed(3)}|${f.slowFactor}|${g.visible}|${g.axis}|${g.sign}|${f.guide.visible}|${f.guide.axis}|${f.guide.sign}`)
        if (i % 25 === 0) await nextFrame()
      }
      c.info(`${lattice} path end: φ ${f3(sim.phi)}°, χ ${f3(sim.chi)}°, λ ${sim.lambda}, distinct ${sim.distinctCount()}, absences [${sim.absencesLogged().join(",")}]`)
      return trace
    }

    const sc = await runPath("SC")
    const scDistinct = main.getSim().distinctCount()
    const fcc = await runPath("FCC")
    const fccDistinct = main.getSim().distinctCount()

    let mismatches = 0
    let first = -1
    for (let i = 0; i < STEPS; i++) {
      if (sc[i] !== fcc[i]) {
        mismatches++
        if (first < 0) first = i
      }
    }
    c.eq("same path: SC and FCC traces have the same length", sc.length, fcc.length)
    c.ok("guide arrow (as drawn) and slowdown identical at every step", mismatches === 0, mismatches ? `${mismatches} mismatches, first at step ${first}: SC ${sc[first]} vs FCC ${fcc[first]}` : `${STEPS} steps compared`)
    const shown = sc.filter((t) => t.split("|")[4] === "true").length
    const slowed = sc.filter((t) => t.split("|")[3] !== "1").length
    const chiSteps = sc.filter((t) => t.split("|")[5] === "chi" && t.split("|")[4] === "true").length
    c.ok("the path exercised the guide arrow", shown > 20, `guide shown on ${shown} steps (${chiSteps} on the χ axis)`)
    c.ok("the path exercised the slowdown", slowed > 20, `slowed on ${slowed} steps`)
    c.info(`rounds recorded different evidence along the same path: distinct d-spacings SC ${scDistinct}, FCC ${fccDistinct}`)

    freeBaseline(main)
    await frames(2)
    c.finish()
  }
}
