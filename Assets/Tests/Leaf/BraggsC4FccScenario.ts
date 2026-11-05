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
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {TEXT} from "../../Scripts/BraggText"
import {Checks, drawnSpot, frames, freeBaseline, interactable, so, textOf, waitForLens} from "./BraggsLeafSupport"
import {boardLine, checkCelebration, checkMissionLabels, clean, forceRound, pressModeButtonToMission, verdictShown} from "./BraggsC4Shared"

@component
export class BraggsC4FccScenario extends Scenario {
  async run(): Promise<void> {
    const c = new Checks("c4-mission-fcc-verdict")
    const main = await waitForLens()
    const interactor = new DefaultLeafInteractor()
    await pressModeButtonToMission(c, main, interactor)
    await forceRound(c, main, "FCC")

    let f = await clean(c, main, {h: 0, k: 1, l: 0}, "FCC")
    c.eq("(100) condition met in FCC: nothing lights", f.lit.length, 0)
    c.ok("board logs the (100) absence", JSON.stringify(f.board.lines) === JSON.stringify([TEXT.absence100]), JSON.stringify(f.board.lines))
    c.eq("EvidenceLine_0 shows '(100) condition passed: no spot'", boardLine(0), "(100) condition passed: no spot")
    f = await clean(c, main, {h: 1, k: 1, l: 0}, "FCC")
    c.ok("board logs the (110) absence", JSON.stringify(f.board.lines) === JSON.stringify([TEXT.absence100, TEXT.absence110]), JSON.stringify(f.board.lines))
    c.eq("EvidenceLine_1 shows '(110) condition passed: no spot'", boardLine(1), "(110) condition passed: no spot")
    c.eq("absences do not count as reflections", main.getSim().distinctCount(), 0)
    f = await clean(c, main, {h: 1, k: 1, l: 1}, "FCC") // N = 3, the positive control
    checkMissionLabels(c, main, "FCC (111)")
    f = await clean(c, main, {h: 0, k: 2, l: 0}, "FCC") // N = 4
    c.eq("2 distinct: verdict locked", f.verdictUnlocked, false)
    c.ok("2 distinct: verdict buttons hidden", !verdictShown().sc && !verdictShown().fcc)
    f = await clean(c, main, {h: 2, k: 2, l: 0}, "FCC") // N = 8
    c.eq("3 distinct: verdict unlocked", f.verdictUnlocked, true)
    c.ok("3 distinct: both verdict buttons shown", verdictShown().sc && verdictShown().fcc)
    await frames(4)

    // Wrong verdict (real press): SC is refused with the two absences.
    const wrongMsg = "(100) and (110) passed with no spot: SC would show them."
    let notYet = main.notYetCount
    await interactor.trigger(interactable("VerdictSCButton"))
    await frames(3)
    f = main.getFrame()
    c.eq("wrong SC verdict: feedback kind", f.feedback ? f.feedback.kind : null, "wrong")
    c.eq("wrong SC verdict: message names the evidence", f.feedback ? f.feedback.message : null, wrongMsg)
    c.eq("wrong SC verdict: FeedbackLine text", textOf("FeedbackLine"), wrongMsg)
    c.eq("wrong SC verdict: board highlights the (100) absence", f.board.highlightIndex, 0)
    c.eq("wrong SC verdict: EvidenceLine_0 drawn highlighted", boardLine(0), "» (100) condition passed: no spot")
    c.eq("wrong SC verdict: 'not yet' tone", main.notYetCount - notYet, 1)

    // Correct verdict (real press).
    const flourish = main.flourishCount
    notYet = main.notYetCount
    await interactor.trigger(interactable("VerdictFCCButton"))
    await frames(3)
    f = main.getFrame()
    c.eq("FCC verdict: feedback kind", f.feedback ? f.feedback.kind : null, "correct")
    c.ok("FCC verdict: message names a real material (rock salt, a = 5.64 Å)", !!f.feedback && f.feedback.message.indexOf("ock salt") >= 0 && f.feedback.message.indexOf("5.64") >= 0, f.feedback ? f.feedback.message : "")
    c.eq("FCC verdict: banner", f.banner, "Identified: FCC, like rock salt")
    c.ok("FCC verdict: Banner shown with that text", so("Banner").isEnabledInHierarchy && textOf("Banner") === f.banner, JSON.stringify(textOf("Banner")))
    c.eq("FCC verdict: no 'not yet' tone", main.notYetCount - notYet, 0)
    c.eq("FCC verdict: lattice revealed", f.drawnLattice, "FCC")
    c.eq("FCC verdict: sample tag revealed", textOf("SampleTag"), "Face-centred cubic\na = 5.00 Å")
    c.ok("FCC verdict: absences still on the board", f.board.lines[0] === TEXT.absence100 && f.board.lines[1] === TEXT.absence110, JSON.stringify(f.board.lines))
    c.ok("FCC verdict: board spot lines name the families", f.board.lines.slice(2).every((l) => l.startsWith("(")), JSON.stringify(f.board.lines))
    for (const s of f.lit) {
      const d = drawnSpot(main, s.key)
      c.ok(`FCC verdict: lit spot label gains (hkl) (${s.key})`, !!d && d.label.startsWith("("), d ? JSON.stringify(d.label) : "not drawn")
    }
    await checkCelebration(c, main, flourish, "FCC verdict")

    // Real ModeButton back to free mode.
    await interactor.trigger(interactable("ModeButton"))
    await frames(3)
    f = main.getFrame()
    c.eq("ModeButton (real press) returns to free mode", f.mode, "free")
    c.near("free mode λ restored", f.lambda, 1.54, 1e-9, " Å")
    c.near("free mode a restored", f.a, 4.0, 1e-9, " Å")

    freeBaseline(main)
    await frames(2)
    c.finish()
  }
}
