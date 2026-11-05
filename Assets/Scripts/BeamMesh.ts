/**
 * BeamMesh: the X-ray beam (put it on Beam, placed at the collimator tip).
 *
 * A faint cyan line along local −z for `lengthCm`, plus a short bright pulse that runs
 * from the tube to the beam stop and repeats every `pulsePeriodSec`. Both are unit
 * meshes scaled along z, so setLengthCm is free (e.g. the stage-2 intro reveal).
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

  onAwake(): void {
    if (!this.material) print("BeamMesh: no material on " + this.sceneObject.name)
    const glow = this.material ? glowMaterial(this.material) : null
    this.line = this.makeChild("BeamLine", partMesh("Beam"), glow)
    this.pulse = this.makeChild("BeamPulse", partMesh("BeamPulse"), glow)
    this.pulseTransform = this.pulse.getTransform()
    this.setLengthCm(this.lengthCm)
    this.setPulseEnabled(this.pulseEnabled)
    this.startTime = getTime()
    this.createEvent("UpdateEvent").bind(() => this.updatePulse())
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
