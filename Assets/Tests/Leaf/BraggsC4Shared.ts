/** Shared steps for the criterion-4 scenarios (test code only, not a component). */
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {Lattice, Miller} from "../../Scripts/BraggPhysics"
import {fmtDeg, TEXT} from "../../Scripts/BraggText"
import {BraggsRoomMain} from "../../Scripts/BraggsRoomMain"
import {Checks, drawnSpot, f3, frames, freeBaseline, goClean, interactable, so, textOf} from "./BraggsLeafSupport"

export const A_TEST = 5.0

export function verdictShown(): {sc: boolean; fcc: boolean} {
  return {sc: so("VerdictSCButton").isEnabledInHierarchy, fcc: so("VerdictFCCButton").isEnabledInHierarchy}
}

export function boardLine(i: number): string {
  return textOf(`EvidenceLine_${i}`)
}

export async function pressModeButtonToMission(c: Checks, main: BraggsRoomMain, interactor: DefaultLeafInteractor): Promise<void> {
  freeBaseline(main)
  await frames(3)
  c.eq("ModeButton label in free mode", textOf("ButtonLabel", so("ModeButton")), TEXT.startMission)
  await interactor.trigger(interactable("ModeButton"))
  await frames(3)
  const f = main.getFrame()
  c.eq("ModeButton (real press) starts a mission", f.mode, "mission")
  c.near("mission starts at Mo Kα", f.lambda, 0.71, 1e-9, " Å")
  c.eq("λ label at mission start", f.lambdaLabel, "λ 0.71 Å · Mo Kα")
  c.ok("random a in [3.3, 5.7] Å", f.a >= 3.3 - 1e-9 && f.a <= 5.7 + 1e-9, `a ${f.a}`)
  c.eq("lattice hidden (mystery cell)", f.drawnLattice, null)
  c.ok("sample tag says Mystery sample", textOf("SampleTag").startsWith("Mystery sample"), JSON.stringify(textOf("SampleTag")))
  c.eq("ModeButton label in mission", textOf("ButtonLabel", so("ModeButton")), TEXT.backToFree)
  c.ok("verdict buttons hidden at round start", !verdictShown().sc && !verdictShown().fcc)
}

export async function forceRound(c: Checks, main: BraggsRoomMain, lattice: Lattice): Promise<void> {
  const f = main.testStartMission(lattice, A_TEST)
  await frames(2)
  c.eq(`forced ${lattice} round: mode`, f.mode, "mission")
  c.eq(`forced ${lattice} round: secret lattice`, main.getSim().getMissionLattice(), lattice)
  c.near(`forced ${lattice} round: a`, f.a, A_TEST, 1e-9, " Å")
  c.near(`forced ${lattice} round: λ = Mo Kα`, f.lambda, 0.71, 1e-9, " Å")
  c.ok(`forced ${lattice} round: nothing lit, nothing logged at the start`, f.lit.length === 0 && f.board.lines.length === 0)
}

/** Mission spot labels before solving: "2θ x.x°" only. */
export function checkMissionLabels(c: Checks, main: BraggsRoomMain, tag: string): void {
  const f = main.getFrame()
  for (const s of f.lit) {
    const d = drawnSpot(main, s.key)
    if (!d) continue
    c.eq(`${tag}: mission label of a lit spot is 2θ only`, d.label, `2θ ${fmtDeg(s.twoThetaDeg)}`)
  }
}

export async function clean(c: Checks, main: BraggsRoomMain, m: Miller, tag: string) {
  const f = goClean(main, m)
  await frames(2)
  c.info(`${tag}: goClean (${m.h} ${m.k} ${m.l}) at φ ${f3(f.phi, 3)}°, χ ${f3(f.chi, 1)}° → lit [${f.lit.map((s) => s.key).join(" | ")}], distinct ${main.getSim().distinctCount()}, board ${JSON.stringify(f.board.lines)}`)
  return main.getFrame()
}

export async function checkCelebration(c: Checks, main: BraggsRoomMain, flourishBefore: number, tag: string): Promise<void> {
  c.eq(`${tag}: flourish played once`, main.flourishCount - flourishBefore, 1)
  let maxPulse = 1
  for (let i = 0; i < 20; i++) {
    await sleep(60)
    maxPulse = Math.max(maxPulse, main.spotPool.getPulseScale())
  }
  c.ok(`${tag}: spots pulse (celebration)`, maxPulse > 1.02, `max pulse scale ${f3(maxPulse, 3)}`)
}
