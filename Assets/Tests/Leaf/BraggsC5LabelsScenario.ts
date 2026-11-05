/**
 * Done criterion 5: label content and rendered size (state set with hooks).
 *
 * Content: free mode shows "(0 1 0)" over "θ 11.1°  2θ 22.2°" by the lit spot; mission mode shows
 * "2θ x.x°" only (no Miller indices).
 * Size: each Text's rendered height is its local AABB height mapped to world cm through its
 * transform (so tilted desk labels are measured in their own plane); the visual angle is the
 * angle that height subtends at the user's eye, taken as the camera start position = the room
 * origin. Per-line height = block height / number of lines.
 * Thresholds: spot labels ≥ 4 cm per line (design brief, "text at least 4 cm tall"); every
 * readability-critical text ≥ 0.5° per line (a build choice, not a number from the brief).
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {braggThetaDeg} from "../../Scripts/BraggPhysics"
import {fmtDeg} from "../../Scripts/BraggText"
import {BraggsRoomMain} from "../../Scripts/BraggsRoomMain"
import {Checks, TextSize, drawnSpot, eyeWorld, f3, frames, freeBaseline, goClean, litSpot, measureText, sizeLine, so, textOn, v3s, waitForLens} from "./BraggsLeafSupport"

const MIN_SPOT_CM = 4.0
const MIN_DEG = 0.5
const TH_B = braggThetaDeg(4.0, 1.54, {h: 0, k: 1, l: 0}) as number

function measureNamed(name: string, eye: vec3, root?: SceneObject): TextSize {
  return measureText(textOn(so(name, root)), name, eye)
}

function boardSizes(eye: vec3): TextSize[] {
  const out: TextSize[] = [measureNamed("EvidenceTitle", eye), measureNamed("EvidenceStatus", eye)]
  for (let i = 0; i < 8; i++) {
    const t = textOn(so(`EvidenceLine_${i}`))
    if (t.text.length > 0) out.push(measureText(t, `EvidenceLine_${i}`, eye))
  }
  return out
}

function assertAngles(c: Checks, tag: string, sizes: TextSize[]): void {
  for (const s of sizes) {
    c.info(`${tag} ${s.name}: ${sizeLine(s)}`)
    c.ok(`${tag} ${s.name}: ≥ ${MIN_DEG}° per line from the user's eye`, s.lineDeg >= MIN_DEG, `${f3(s.lineDeg, 3)}° (${f3(s.lineCm, 2)} cm at ${f3(s.distCm, 1)} cm)`)
  }
}

function spotLabelSize(c: Checks, main: BraggsRoomMain, key: string, eye: vec3, tag: string): TextSize | null {
  const d = drawnSpot(main, key)
  if (!c.ok(`${tag}: spot (${key}) drawn`, !!d)) return null
  const s = measureText(textOn(d.labelObj), `SpotLabel(${key})`, eye)
  c.info(`${tag} ${s.name}: ${sizeLine(s)}`)
  c.ok(`${tag}: spot label ≥ ${MIN_SPOT_CM} cm per line`, s.lineCm >= MIN_SPOT_CM, `${f3(s.lineCm, 2)} cm per line (block ${f3(s.blockCm, 2)} cm, ${s.lines} line(s))`)
  c.ok(`${tag}: spot label ≥ ${MIN_DEG}° per line`, s.lineDeg >= MIN_DEG, `${f3(s.lineDeg, 3)}°`)
  return s
}

@component
export class BraggsC5LabelsScenario extends Scenario {
  async run(): Promise<void> {
    const c = new Checks("c5-labels-content-size")
    const main = await waitForLens()
    const eye = eyeWorld()
    const cam = so("Camera Object").getTransform().getWorldPosition()
    c.info(`eye (room origin, world) ${v3s(eye)}; runtime camera world position ${v3s(cam)}`)

    // ---------------- free mode
    freeBaseline(main)
    let f = main.testSetOrientation(TH_B, 0)
    await frames(3)
    const s = litSpot(f, "0,1,0")
    const d = drawnSpot(main, "0,1,0")
    c.ok("free: (0 1 0) lit", !!s && !!d)
    if (d) c.eq("free: spot label = (hkl) over θ and 2θ", d.label, "(0 1 0)\nθ 11.1°  2θ 22.2°")
    spotLabelSize(c, main, "0,1,0", eye, "free")
    assertAngles(c, "free", [measureNamed("PhiReadout", eye), measureNamed("ChiReadout", eye), measureNamed("SampleTag", eye)])
    assertAngles(c, "free board", boardSizes(eye))

    // ---------------- mission mode (forced SC, a = 5.0 Å so the start lights nothing)
    main.testStartMission("SC", 5.0)
    goClean(main, {h: 0, k: 1, l: 0})
    goClean(main, {h: 1, k: 1, l: 0})
    f = goClean(main, {h: 1, k: 1, l: 1})
    await frames(3)
    c.ok("mission: a spot is lit", f.lit.length > 0, `lit [${f.lit.map((q) => q.key).join(" | ")}]`)
    for (const q of f.lit) {
      const dq = drawnSpot(main, q.key)
      if (!dq) continue
      c.eq(`mission: spot label (${q.key}) is 2θ only`, dq.label, `2θ ${fmtDeg(q.twoThetaDeg)}`)
      c.ok(`mission: spot label (${q.key}) has no Miller indices`, dq.label.indexOf("(") < 0 && /^2θ \d+\.\d°$/.test(dq.label), JSON.stringify(dq.label))
      c.eq(`mission: sim title empty for (${q.key})`, q.title, "")
    }
    if (f.lit.length > 0) spotLabelSize(c, main, f.lit[0].key, eye, "mission")
    assertAngles(c, "mission", [measureNamed("PhiReadout", eye), measureNamed("ChiReadout", eye), measureNamed("SampleTag", eye)])
    assertAngles(c, "mission board", boardSizes(eye))

    // FCC round for the absence lines on the board.
    main.testStartMission("FCC", 5.0)
    goClean(main, {h: 0, k: 1, l: 0})
    goClean(main, {h: 1, k: 1, l: 0})
    goClean(main, {h: 1, k: 1, l: 1})
    await frames(3)
    assertAngles(c, "FCC board", boardSizes(eye))

    freeBaseline(main)
    await frames(2)
    c.info("'At a glance' comfort is not measurable here: only text content, height and visual angle are checked.")
    c.finish()
  }
}
