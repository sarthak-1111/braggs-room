/**
 * BraggPartMesh: draws one code-authored part of Bragg's Room on this SceneObject.
 *
 * Put it on an authored SceneObject placed at the part's pivot (BraggGeometry.BRAGG_LAYOUT):
 *   VirtualDesk (preview stand-in)  -> VirtualDesk
 *   Goniometer                      -> Goniometer
 *   XRayTube                        -> XRayTube
 *   BeamStop                        -> BeamStop
 *   VirtualWall (preview stand-in)  -> VirtualWall (the detector grid)
 *   SampleTag                       -> SampleTagCard (the card; its text comes from BraggsRoomGoniometerUI)
 * Spot / GhostSpot / Ray are listed for completeness; pooled objects created by script
 * should call BraggMeshes.attachPart instead (inputs are not set before onAwake runs).
 */
import {BraggPart, attachPart, isBraggPart, materialFor, partMesh} from "./BraggMeshes"

@component
export class BraggPartMesh extends BaseScriptComponent {
  @input("string", "VirtualDesk")
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Virtual desk (preview stand-in)", "VirtualDesk"),
      new ComboBoxItem("Goniometer", "Goniometer"),
      new ComboBoxItem("X-ray tube", "XRayTube"),
      new ComboBoxItem("Beam stop", "BeamStop"),
      new ComboBoxItem("Virtual wall grid (preview stand-in)", "VirtualWall"),
      new ComboBoxItem("Spot", "Spot"),
      new ComboBoxItem("Ghost spot", "GhostSpot"),
      new ComboBoxItem("Ray (unit, along -z)", "Ray"),
      new ComboBoxItem("Sample tag card", "SampleTagCard"),
    ]),
  )
  part: string = "VirtualDesk"

  @input
  @hint("vertexBaseColorMaterial (SimpleVertexBaseColor.lspkg). Glow parts use an additive clone of it.")
  material: Material

  private visual: RenderMeshVisual

  onAwake(): void {
    if (!isBraggPart(this.part)) {
      print("BraggPartMesh: unknown part '" + this.part + "' on " + this.sceneObject.name)
      return
    }
    if (!this.material) print("BraggPartMesh: no material on " + this.sceneObject.name)
    this.visual = attachPart(this.sceneObject, this.part, this.material)
  }

  /** The RenderMeshVisual this component created. */
  getVisual(): RenderMeshVisual {
    return this.visual
  }

  /** Switch to another part (e.g. Spot <-> GhostSpot); keeps the same visual. */
  setPart(part: BraggPart): void {
    this.part = part
    if (!this.visual) return
    this.visual.mesh = partMesh(part)
    if (this.material) this.visual.mainMaterial = materialFor(part, this.material)
  }
}
