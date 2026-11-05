/**
 * BraggsRoomPredictionRing: the predictor's faint violet ring on the wall (put it on
 * "PredictionRing", placed at the beam stop B, same frame as SpotPool).
 *
 * Owns: one code-authored annulus (BraggGeometry.ringGeometry) of radius frame.ring.radiusCm
 * around the beam stop. The ring's MeshBuilder is kept and its vertices are rewritten in place
 * when the radius changes (the λ slider moves it continuously), so no mesh is created per frame.
 * The ring is clipped to the wall (DEFAULT_DETECTOR): any part off the wall is not drawn.
 * Its label is drawn by BraggsRoomWallLabelsUI.
 *
 * Inputs: References (vertex-colour material) and Settings (line width, z offset).
 *
 * Talks to BraggsRoomMain through setRing(radiusCm | null) and getRadius().
 *
 * Must not: compute 2θ or the radius (the sim's RingView does).
 */
import {RING_SEGMENTS, STAGE2_COLORS, STRIDE, ringGeometry} from "./BraggGeometry"
import {DEFAULT_DETECTOR} from "./BraggPhysics"
import {glowMaterial} from "./BraggMeshes"

const VERTEX_LAYOUT = [
  {name: "position", components: 3},
  {name: "normal", components: 3, normalized: true},
  {name: "color", components: 4},
]

@component
export class BraggsRoomPredictionRing extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomPredictionRing – the predicted 2θ ring around the beam stop</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("vertexBaseColorMaterial (SimpleVertexBaseColor.lspkg); the ring draws with an additive clone")
  material: Material
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Ring line width, cm (thin and faint by design)")
  @widget(new SliderWidget(0.2, 2, 0.05))
  lineWidthCm: number = 0.6

  @input
  @hint("Distance in front of the wall, cm (between the grid and the ghost spots)")
  @widget(new SliderWidget(0, 0.5, 0.05))
  wallOffsetCm: number = 0.3
  @ui.group_end

  private builder: MeshBuilder
  private visual: RenderMeshVisual
  private radius = -1

  onAwake(): void {
    if (!this.material) print("BraggsRoomPredictionRing: material is not wired; the ring will not draw")
    const geo = ringGeometry(10, this.lineWidthCm, RING_SEGMENTS)
    this.builder = new MeshBuilder(VERTEX_LAYOUT)
    this.builder.topology = MeshTopology.Triangles
    this.builder.indexType = MeshIndexType.UInt16
    this.builder.appendVerticesInterleaved(geo.verts)
    this.builder.appendIndices(geo.indices)
    this.builder.updateMesh()

    const so = global.scene.createSceneObject("RingMesh")
    so.setParent(this.sceneObject)
    so.getTransform().setLocalPosition(new vec3(0, 0, this.wallOffsetCm))
    this.visual = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.visual.mesh = this.builder.getMesh()
    if (this.material) this.visual.mainMaterial = glowMaterial(this.material)
    this.visual.enabled = false
  }

  /** Draw the ring at this radius (frame.ring.radiusCm), or hide it (null). */
  setRing(radiusCm: number | null): void {
    const on = radiusCm !== null && radiusCm > 0
    if (this.visual.enabled !== on) this.visual.enabled = on
    if (!on || Math.abs((radiusCm as number) - this.radius) < 0.02) return
    this.radius = radiusCm as number
    const geo = ringGeometry(this.radius, this.lineWidthCm, RING_SEGMENTS, STAGE2_COLORS.ring, DEFAULT_DETECTOR)
    for (let i = 0; i < geo.vertexCount; i++) {
      this.builder.setVertexInterleaved(i, geo.verts.slice(i * STRIDE, (i + 1) * STRIDE))
    }
    this.builder.updateMesh()
  }

  /** Radius drawn now, cm; −1 when hidden (LEAF). */
  getRadius(): number {
    return this.visual && this.visual.enabled ? this.radius : -1
  }
}
