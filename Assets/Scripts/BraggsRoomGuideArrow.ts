/**
 * BraggsRoomGuideArrow: the subtle curved arrow on the goniometer that shows which way to drag
 * (put it on "GuideArrow", placed at the crystal centre C; it does not rotate with the crystal).
 *
 * Owns: two code-authored arcs (BraggGeometry.guideArcGeometry), soft green and faint:
 *   GuideArrowPhi  a horizontal arc just below the crystal (radius ~7 cm, ~70° on the near side);
 *                  the head points to the user's right for sign +1, left for −1;
 *   GuideArrowChi  a vertical arc through the crystal (around the x axis, near side);
 *                  the head points up for sign +1, down for −1.
 * Only the arc for frame.guide.axis shows, and only while frame.guide.visible.
 *
 * Inputs: References (material, the two authored child SceneObjects).
 *
 * Talks to BraggsRoomMain through setGuide(visible, axis, sign) and getState().
 *
 * Must not: decide when or which way to guide (BraggSim.helpers does, from a, λ, φ, χ and the
 * full candidate set only, so it never leaks the lattice type).
 */
import {GUIDE_ARC, guideArcGeometry} from "./BraggGeometry"
import {geoToMesh, glowMaterial} from "./BraggMeshes"

export interface GuideState {
  visible: boolean
  axis: "phi" | "chi"
  sign: 1 | -1
}

@component
export class BraggsRoomGuideArrow extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomGuideArrow – which way to drag (φ or χ)</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("vertexBaseColorMaterial (SimpleVertexBaseColor.lspkg); the arrow draws with an additive clone")
  material: Material

  @input
  @hint("GuideArrowPhi: holder for the horizontal arc, placed just below the crystal")
  phiArrow: SceneObject

  @input
  @hint("GuideArrowChi: holder for the vertical arc, at the crystal centre")
  chiArrow: SceneObject
  @ui.group_end

  private phiVisual: RenderMeshVisual
  private chiVisual: RenderMeshVisual
  private meshes: {phi: {plus: RenderMesh; minus: RenderMesh}; chi: {plus: RenderMesh; minus: RenderMesh}}
  private state: GuideState = {visible: false, axis: "phi", sign: 1}

  onAwake(): void {
    if (!this.material || !this.phiArrow || !this.chiArrow) {
      print("BraggsRoomGuideArrow: material, phiArrow and chiArrow must be wired")
      return
    }
    this.meshes = {
      phi: {
        plus: geoToMesh(guideArcGeometry("phi", 1, GUIDE_ARC.phiRadiusCm)),
        minus: geoToMesh(guideArcGeometry("phi", -1, GUIDE_ARC.phiRadiusCm)),
      },
      chi: {
        plus: geoToMesh(guideArcGeometry("chi", 1, GUIDE_ARC.chiRadiusCm)),
        minus: geoToMesh(guideArcGeometry("chi", -1, GUIDE_ARC.chiRadiusCm)),
      },
    }
    const glow = glowMaterial(this.material)
    this.phiVisual = this.makeVisual(this.phiArrow, this.meshes.phi.plus, glow)
    this.chiVisual = this.makeVisual(this.chiArrow, this.meshes.chi.plus, glow)
  }

  /** Draw frame.guide. Cheap to call every frame. */
  setGuide(visible: boolean, axis: "phi" | "chi", sign: 1 | -1): void {
    if (!this.phiVisual) return
    const s = this.state
    if (s.visible === visible && s.axis === axis && s.sign === sign) return
    this.state = {visible, axis, sign}
    const set = axis === "phi" ? this.meshes.phi : this.meshes.chi
    const v = axis === "phi" ? this.phiVisual : this.chiVisual
    v.mesh = sign > 0 ? set.plus : set.minus
    this.phiVisual.enabled = visible && axis === "phi"
    this.chiVisual.enabled = visible && axis === "chi"
  }

  /** What is drawn right now (LEAF): {visible, axis, sign}. */
  getState(): GuideState {
    return {...this.state}
  }

  private makeVisual(holder: SceneObject, mesh: RenderMesh, material: Material): RenderMeshVisual {
    const v = holder.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    v.mesh = mesh
    v.mainMaterial = material
    v.enabled = false
    return v
  }
}
