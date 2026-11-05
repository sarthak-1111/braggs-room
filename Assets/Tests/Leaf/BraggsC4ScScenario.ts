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
import {braggThetaDeg} from "../../Scripts/BraggPhysics"
import {fmtDeg} from "../../Scripts/BraggText"
import {Checks, drawnSpot, frames, freeBaseline, interactable, so, textOf, waitForLens} from "./BraggsLeafSupport"
import {A_TEST, boardLine, checkCelebration, checkMissionLabels, clean, forceRound, pressModeButtonToMission, verdictShown} from "./BraggsC4Shared"

@component
export class BraggsC4ScScenario extends Scenario {
  async run(): Promise<void> {
    const c = new Checks("c4-mission-sc-verdict")
    const main = await waitForLens()
    const interactor = new DefaultLeafInteractor()
    await pressModeButtonToMission(c, main, interactor)
    await forceRound(c, main, "SC")

    let f = await clean(c, main, {h: 0, k: 1, l: 0}, "SC") // N = 1, (100)-type, FCC forbids it
    checkMissionLabels(c, main, "SC (010)")
    f = await clean(c, main, {h: 1, k: 1, l: 0}, "SC") // N = 2
    c.eq("2 distinct d-spacings: verdict locked", f.verdictUnlocked, false)
    c.ok("2 distinct: verdict buttons hidden", !verdictShown().sc && !verdictShown().fcc)
    c.eq("2 distinct: board status", f.board.status, "Distinct reflections: 2 of 3")
    f = await clean(c, main, {h: 1, k: 1, l: 1}, "SC") // N = 3
    c.eq("3 distinct d-spacings: verdict unlocked", f.verdictUnlocked, true)
    c.ok("3 distinct: both verdict buttons shown", verdictShown().sc && verdictShown().fcc)
    c.eq("3 distinct: board status", f.board.status, "3 distinct reflections: verdict unlocked")
    c.ok("board lines are unlabelled spots before the verdict", f.board.lines.length === 3 && f.board.lines.every((l) => l.startsWith("Spot  2θ")), JSON.stringify(f.board.lines))
    checkMissionLabels(c, main, "SC (111)")
    await frames(4)

    // Wrong verdict (real press): FCC is refused with the (100)-type spot as evidence.
    const tt100 = 2 * (braggThetaDeg(A_TEST, 0.71, {h: 1, k: 0, l: 0}) as number)
    const wrongMsg = `The spot at 2θ ${fmtDeg(tt100)} is (100)-type: FCC forbids it.`
    let notYet = main.notYetCount
    await interactor.trigger(interactable("VerdictFCCButton"))
    await frames(3)
    f = main.getFrame()
    c.eq("wrong FCC verdict: feedback kind", f.feedback ? f.feedback.kind : null, "wrong")
    c.eq("wrong FCC verdict: message names the evidence", f.feedback ? f.feedback.message : null, wrongMsg)
    c.eq("wrong FCC verdict: FeedbackLine text", textOf("FeedbackLine"), wrongMsg)
    c.eq("wrong FCC verdict: board highlights the (100)-type spot line", f.board.highlightIndex, 0)
    c.ok("wrong FCC verdict: EvidenceLine_0 drawn highlighted (» prefix)", boardLine(0).startsWith("» Spot  2θ"), JSON.stringify(boardLine(0)))
    c.eq("wrong FCC verdict: 'not yet' tone", main.notYetCount - notYet, 1)
    c.eq("wrong FCC verdict: still unsolved", f.solved, false)

    // Correct verdict (real press): SC reveals, names a real material, celebrates.
    const flourish = main.flourishCount
    notYet = main.notYetCount
    await interactor.trigger(interactable("VerdictSCButton"))
    await frames(3)
    f = main.getFrame()
    c.eq("SC verdict: feedback kind", f.feedback ? f.feedback.kind : null, "correct")
    c.ok("SC verdict: message names a real material (caesium chloride, a = 4.12 Å)", !!f.feedback && f.feedback.message.indexOf("aesium chloride") >= 0 && f.feedback.message.indexOf("4.12") >= 0, f.feedback ? f.feedback.message : "")
    c.eq("SC verdict: banner", f.banner, "Identified: SC, like caesium chloride")
    c.ok("SC verdict: Banner shown with that text", so("Banner").isEnabledInHierarchy && textOf("Banner") === f.banner, JSON.stringify(textOf("Banner")))
    c.eq("SC verdict: no 'not yet' tone", main.notYetCount - notYet, 0)
    c.eq("SC verdict: solved", f.solved, true)
    c.eq("SC verdict: lattice revealed on the goniometer", f.drawnLattice, "SC")
    c.eq("SC verdict: sample tag revealed", textOf("SampleTag"), "Simple cubic\na = 5.00 Å")
    c.ok("SC verdict: board lines now name the families", f.board.lines[0].startsWith("(100)  2θ") && f.board.lines[1].startsWith("(110)  2θ") && f.board.lines[2].startsWith("(111)  2θ"), JSON.stringify(f.board.lines))
    c.ok("SC verdict: verdict buttons hidden once solved", !verdictShown().sc && !verdictShown().fcc)
    c.ok("SC verdict: a spot is lit to show its indices", f.lit.length > 0)
    for (const s of f.lit) {
      const d = drawnSpot(main, s.key)
      c.ok(`SC verdict: lit spot label gains (hkl) (${s.key})`, !!d && d.label.startsWith("(") && d.label.indexOf("2θ") > 0, d ? JSON.stringify(d.label) : "not drawn")
    }
    await checkCelebration(c, main, flourish, "SC verdict")

    freeBaseline(main)
    await frames(2)
    c.finish()
  }
}
