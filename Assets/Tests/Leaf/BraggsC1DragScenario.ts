/**
 * Done criterion 1 (real interactions): pinch-drag the Crystal with LEAF's DefaultLeafInteractor.
 * Horizontal drag turns φ (right → φ up), vertical drag tilts χ (up → χ up), the crystal never
 * rolls about the beam (CrystalVisual's up axis keeps a zero x component in the room frame), the
 * φ / χ readouts follow, and the real ResetButton returns both to 0.0°.
 * Set-up only uses a hook (free mode, orientation 0/0).
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {fmtChi, fmtPhi} from "../../Scripts/BraggText"
import {Checks, DEG, f3, frames, freeBaseline, interactable, roomDir, so, textOf, v3s, waitForLens} from "./BraggsLeafSupport"

@component
export class BraggsC1DragScenario extends Scenario {
  async run(): Promise<void> {
    const c = new Checks("c1-drag-turn-tilt-reset")
    const main = await waitForLens()
    freeBaseline(main)
    await frames(3)

    const interactor = new DefaultLeafInteractor()
    const crystal = interactable("Crystal")
    const visual = so("CrystalVisual")

    const state = () => {
      const f = main.getFrame()
      return {phi: f.phi, chi: f.chi, f}
    }

    const checkPose = (label: string) => {
      const {phi, chi, f} = state()
      // Readouts follow the frame.
      c.eq(`${label}: PhiReadout shows fmtPhi(φ)`, textOf("PhiReadout"), fmtPhi(phi))
      c.eq(`${label}: ChiReadout shows fmtChi(χ)`, textOf("ChiReadout"), fmtChi(chi))
      c.eq(`${label}: frame.readoutPhi`, f.readoutPhi, fmtPhi(phi))
      // Drawn orientation = R_χ · R_φ, and no roll about the beam.
      const rot = visual.getTransform().getWorldRotation()
      const up = roomDir(rot.multiplyVec3(vec3.up()))
      const fwd = roomDir(rot.multiplyVec3(vec3.forward()))
      const exp = quat.angleAxis(-chi * DEG, vec3.right()).multiply(quat.angleAxis(phi * DEG, vec3.up()))
      const expUp = exp.multiplyVec3(vec3.up())
      const expFwd = exp.multiplyVec3(vec3.forward())
      c.ok(`${label}: no roll, CrystalVisual up axis has zero x (room frame)`, Math.abs(up.x) < 1e-3, `up ${v3s(up, 4)}`)
      c.ok(
        `${label}: CrystalVisual rotation = R_χ·R_φ(φ ${f3(phi, 2)}, χ ${f3(chi, 2)})`,
        up.distance(expUp) < 2e-3 && fwd.distance(expFwd) < 2e-3,
        `up ${v3s(up, 4)} vs ${v3s(expUp, 4)}, fwd ${v3s(fwd, 4)} vs ${v3s(expFwd, 4)}`,
      )
      return {up, fwd}
    }

    const drag = async (label: string, v: vec3, ms: number) => {
      const before = state()
      await interactor.drag(crystal, v, ms)
      await frames(3)
      const after = state()
      const dPhi = after.phi - before.phi
      const dChi = after.chi - before.chi
      c.info(`${label}: drag ${v3s(v, 2)} cm/frame for ${ms} ms → Δφ ${f3(dPhi, 3)}°, Δχ ${f3(dChi, 3)}° (now φ ${f3(after.phi, 3)}, χ ${f3(after.chi, 3)})`)
      return {dPhi, dChi}
    }

    checkPose("start")

    // LEAF moves the hand a set distance per frame, so how far a drag turns depends on the
    // preview's frame rate (each 0.1 cm frame is 0.15°). The direction checks below need the
    // right sign and at least one frame of turn (MIN_TURN), not a fixed size.
    const MIN_TURN = 0.1

    // 1. Horizontal: right → φ increases, χ unchanged; the near side turns right.
    let d = await drag("right", new vec3(0.1, 0, 0), 400)
    c.ok("drag right turns φ up", d.dPhi > MIN_TURN, `Δφ ${f3(d.dPhi)}°`)
    c.ok("drag right leaves χ unchanged", Math.abs(d.dChi) < 1e-6, `Δχ ${f3(d.dChi, 6)}°`)
    let pose = checkPose("after right")
    c.ok("drag right: near side (+z face) turned right (x > 0), stays level (y ≈ 0)", pose.fwd.x > 0.01 && Math.abs(pose.fwd.y) < 1e-3, `fwd ${v3s(pose.fwd, 4)}`)

    d = await drag("left", new vec3(-0.1, 0, 0), 250)
    c.ok("drag left turns φ down", d.dPhi < -MIN_TURN, `Δφ ${f3(d.dPhi)}°`)
    c.ok("drag left leaves χ unchanged", Math.abs(d.dChi) < 1e-6, `Δχ ${f3(d.dChi, 6)}°`)
    checkPose("after left")

    // 2. Vertical: up → χ increases (top tilts away), φ unchanged.
    const phiBeforeUp = state().phi
    d = await drag("up", new vec3(0, 0.1, 0), 400)
    c.ok("drag up tilts χ up", d.dChi > MIN_TURN, `Δχ ${f3(d.dChi)}°`)
    c.ok("drag up leaves φ unchanged", Math.abs(d.dPhi) < 1e-6, `Δφ ${f3(d.dPhi, 6)}°`)
    pose = checkPose("after up")
    // With φ ≠ 0 the up axis is R_χ(+y) = (0, cos χ, −sin χ): the top leans away from the user.
    c.ok("drag up: top tilts away (up axis z < 0)", pose.up.z < -0.005, `up ${v3s(pose.up, 4)}, φ ${f3(phiBeforeUp, 2)}`)

    d = await drag("down", new vec3(0, -0.1, 0), 250)
    c.ok("drag down tilts χ down", d.dChi < -MIN_TURN, `Δχ ${f3(d.dChi)}°`)
    c.ok("drag down leaves φ unchanged", Math.abs(d.dPhi) < 1e-6, `Δφ ${f3(d.dPhi, 6)}°`)
    checkPose("after down")

    // 3. Mixed drags: φ follows the horizontal part, χ the vertical part (same ratio), never a roll.
    const mixed: vec3[] = [new vec3(0.08, 0.06, 0), new vec3(-0.05, 0.09, 0), new vec3(0.1, -0.05, 0), new vec3(-0.07, -0.07, 0), new vec3(0.06, 0.1, 0)]
    for (let i = 0; i < mixed.length; i++) {
      const v = mixed[i]
      d = await drag(`mixed ${i}`, v, 300)
      c.ok(`mixed ${i}: sign(Δφ) = sign(dx) and sign(Δχ) = sign(dy)`, Math.sign(d.dPhi) === Math.sign(v.x) && Math.sign(d.dChi) === Math.sign(v.y), `Δφ ${f3(d.dPhi)}, Δχ ${f3(d.dChi)}`)
      const ratio = d.dChi / d.dPhi
      const want = v.y / v.x
      c.ok(`mixed ${i}: Δχ/Δφ = dy/dx`, Math.abs(ratio - want) <= 0.02 * Math.abs(want) + 1e-3, `ratio ${f3(ratio, 4)} vs ${f3(want, 4)}`)
      checkPose(`after mixed ${i}`)
    }
    const end = state()
    c.ok("after the drags the crystal is turned and tilted (both non-zero)", Math.abs(end.phi) > 0.5 && Math.abs(end.chi) > 0.5, `φ ${f3(end.phi)}, χ ${f3(end.chi)}`)

    // 4. Reset orientation (real UIKit button press).
    await interactor.trigger(interactable("ResetButton"))
    await frames(3)
    const r = state()
    c.eq("Reset: φ = 0", r.phi, 0)
    c.eq("Reset: χ = 0", r.chi, 0)
    c.eq("Reset: PhiReadout reads φ 0.0°", textOf("PhiReadout"), "φ 0.0°")
    c.eq("Reset: ChiReadout reads χ 0.0°", textOf("ChiReadout"), "χ 0.0°")
    pose = checkPose("after Reset")
    c.ok("Reset: CrystalVisual back to identity", pose.up.distance(vec3.up()) < 1e-3 && pose.fwd.distance(vec3.forward()) < 1e-3, `up ${v3s(pose.up)}, fwd ${v3s(pose.fwd)}`)

    c.finish()
  }
}

