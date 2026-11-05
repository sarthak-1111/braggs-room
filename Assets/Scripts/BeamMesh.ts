/**
 * BeamMesh: the X-ray beam (put it on Beam, placed at the collimator tip).
 *
 * A faint cyan line along local −z for `lengthCm`, plus a short bright pulse that runs
 * from the tube to the beam stop and repeats every `pulsePeriodSec`. Both are unit
 * meshes scaled along z, so setLengthCm is free.
 *
 * Intro (stage 2): playIntro(travelSec) hides the line, sends the bright pulse as a "head" from
 * the collimator to the beam stop while the line grows behind it, then hands over to the normal
 * repeating pulse.
 */
import {partMesh, glowMaterial} from "./BraggMeshes"

@component
export class BeamMesh extends BaseScriptComponent {
  @input
  @hint("vertexBaseColorMaterial (SimpleVertexBaseColor.lspkg); the beam draws with an additive clone")
  material: Material

  @input
  @hint("Collimator tip to beam stop, cm (z = −35 to −205)")
  lengthCm: number = 170

  @input
  @hint("Length of the travelling pulse, cm")
  pulseLengthCm: number = 10

  @input
  @hint("Seconds between pulses")
  pulsePeriodSec: number = 1.5

  @input
  pulseEnabled: boolean = true

  private line: SceneObject
  private pulse: SceneObject
  private pulseTransform: Transform
  private startTime = 0
  private fullLengthCm = 170
  private introStart = -1
  private introTravelSec = 2

  onAwake(): void {
    if (!this.material) print("BeamMesh: no material on " + this.sceneObject.name)
    const glow = this.material ? glowMaterial(this.material) : null
    this.line = this.makeChild("BeamLine", partMesh("Beam"), glow)
    this.pulse = this.makeChild("BeamPulse", partMesh("BeamPulse"), glow)
    this.pulseTransform = this.pulse.getTransform()
    this.fullLengthCm = this.lengthCm
    this.setLengthCm(this.lengthCm)
    this.setPulseEnabled(this.pulseEnabled)
    this.startTime = getTime()
    this.createEvent("UpdateEvent").bind(() => {
      if (this.introStart >= 0) this.updateIntro()
      else this.updatePulse()
    })
  }

  /** Lens-start reveal: a bright head travels the full beam in `travelSec`, the line grows behind it. */
  playIntro(travelSec: number): void {
    this.introTravelSec = Math.max(0.1, travelSec)
    this.introStart = getTime()
    if (this.pulse) this.pulse.enabled = true
    this.updateIntro()
  }

  /** True while the intro head is travelling. */
  isIntroPlaying(): boolean {
    return this.introStart >= 0
  }

  private updateIntro(): void {
    const u = Math.min(1, (getTime() - this.introStart) / this.introTravelSec)
    const eased = u * u * (3 - 2 * u)
    const reach = Math.max(0.001, eased * this.fullLengthCm)
    this.line.getTransform().setLocalScale(new vec3(1, 1, reach))
    const head = Math.min(this.pulseLengthCm, reach)
    this.pulseTransform.setLocalScale(new vec3(1, 1, head))
    this.pulseTransform.setLocalPosition(new vec3(0, 0, -(reach - head)))
    if (u >= 1) {
      this.introStart = -1
      this.setLengthCm(this.fullLengthCm)
      this.setPulseEnabled(this.pulseEnabled)
    }
  }

  /** Visible beam length from the collimator tip, cm. */
  setLengthCm(cm: number): void {
    this.lengthCm = Math.max(0.001, cm)
    if (!this.line) return
    this.line.getTransform().setLocalScale(new vec3(1, 1, this.lengthCm))
    this.pulseTransform.setLocalScale(new vec3(1, 1, Math.min(this.pulseLengthCm, this.lengthCm)))
  }

  setPulseEnabled(on: boolean): void {
    this.pulseEnabled = on
    if (this.pulse) this.pulse.enabled = on
    this.startTime = getTime()
  }

  private updatePulse(): void {
    if (!this.pulseEnabled) return
    const period = Math.max(0.1, this.pulsePeriodSec)
    const t = ((getTime() - this.startTime) % period) / period
    const travel = Math.max(0, this.lengthCm - this.pulseLengthCm)
    this.pulseTransform.setLocalPosition(new vec3(0, 0, -t * travel))
  }

  private makeChild(name: string, mesh: RenderMesh, material: Material | null): SceneObject {
    const child = global.scene.createSceneObject(name)
    child.setParent(this.sceneObject)
    const visual = child.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh = mesh
    if (material) visual.mainMaterial = material
    return child
  }
}
