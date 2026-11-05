/**
 * BraggsRoomEdgeChevron: a small chevron at the edge of the view pointing toward a lit spot that
 * is outside it (put it on "EdgeChevron"). It is the only thing in the room that follows the head.
 *
 * Owns: one ~3 cm code-authored arrowhead (BraggGeometry.chevronGeometry). Each frame it projects
 * the lit spots' world positions with the main camera (worldSpaceToScreenSpace); if one is out of
 * view, it places the chevron chevronDepthCm in front of the camera at the clamped edge position
 * (screen 0.1 … 0.9) and rotates it to point at that spot. It fades in and out smoothly and is
 * gone once the spots are in view. Several out-of-view spots: it points at the one closest to
 * the view direction.
 *
 * Inputs: References (main camera, vertex-colour material) and Settings.
 *
 * Talks to BraggsRoomMain through setTargets(worldPositions) and getState().
 *
 * Must not: decide which spots are lit (the frame does).
 */
import {STRIDE, chevronGeometry} from "./BraggGeometry"
import {glowMaterial} from "./BraggMeshes"

const VERTEX_LAYOUT = [
  {name: "position", components: 3},
  {name: "normal", components: 3, normalized: true},
  {name: "color", components: 4},
]

@component
export class BraggsRoomEdgeChevron extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomEdgeChevron – points at a lit spot outside the view</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("The main camera (Camera Object)")
  camera: Camera

  @input
  @hint("vertexBaseColorMaterial (SimpleVertexBaseColor.lspkg); the chevron draws with an additive clone")
  material: Material
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Distance in front of the camera, cm")
  @widget(new SliderWidget(30, 120, 1))
  chevronDepthCm: number = 60

  @input
  @hint("Chevron size, cm")
  @widget(new SliderWidget(1.5, 6, 0.1))
  chevronSizeCm: number = 3

  @input
  @hint("How far from the screen edge the chevron sits (0.1 = screen 0.1 … 0.9)")
  @widget(new SliderWidget(0.03, 0.3, 0.01))
  edgeMargin: number = 0.1

  @input
  @hint("Peak brightness (it is subtle by design)")
  @widget(new SliderWidget(0.2, 1, 0.05))
  brightness: number = 0.75
  @ui.group_end

  private builder: MeshBuilder
  private base: number[] = []
  private visual: RenderMeshVisual
  private targets: vec3[] = []
  private alpha = 0
  private drawnAlpha = -1
  private pointing: vec3 | null = null

  onAwake(): void {
    if (!this.camera || !this.material) print("BraggsRoomEdgeChevron: camera and material must be wired")
    const geo = chevronGeometry(this.chevronSizeCm)
    this.base = geo.verts.slice()
    this.builder = new MeshBuilder(VERTEX_LAYOUT)
    this.builder.topology = MeshTopology.Triangles
    this.builder.indexType = MeshIndexType.UInt16
    this.builder.appendVerticesInterleaved(geo.verts)
    this.builder.appendIndices(geo.indices)
    this.builder.updateMesh()
    const so = global.scene.createSceneObject("ChevronMesh")
    so.setParent(this.sceneObject)
    this.visual = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.visual.mesh = this.builder.getMesh()
    if (this.material) this.visual.mainMaterial = glowMaterial(this.material)
    this.visual.enabled = false
    this.createEvent("LateUpdateEvent").bind(() => this.update())
  }

  /** World positions of the spots lit this frame. */
  setTargets(worldPositions: vec3[]): void {
    this.targets = worldPositions
  }

  /** What is drawn (LEAF): whether it shows, its opacity and the spot it points at. */
  getState(): {visible: boolean; alpha: number; target: vec3 | null} {
    return {visible: this.visual.enabled, alpha: this.alpha, target: this.pointing}
  }

  private update(): void {
    if (!this.camera) return
    const camT = this.camera.getSceneObject().getTransform()
    const inv = camT.getInvertedWorldTransform()
    let best: {local: vec3; world: vec3; angle: number} | null = null
    for (const p of this.targets) {
      const local = inv.multiplyPoint(p)
      const len = local.length
      if (len < 1e-3) continue
      const inFront = local.z < 0
      if (inFront) {
        const s = this.camera.worldSpaceToScreenSpace(p)
        if (s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1) continue // in view
      }
      const angle = Math.acos(Math.max(-1, Math.min(1, -local.z / len)))
      if (!best || angle < best.angle) best = {local, world: p, angle}
    }

    const dt = Math.min(0.1, getDeltaTime())
    const target = best ? 1 : 0
    this.alpha += (target - this.alpha) * Math.min(1, dt * 6)
    if (this.alpha < 0.01 && !best) this.alpha = 0

    if (best) {
      this.pointing = best.world
      // Direction on screen in camera-up coordinates (x right, y up). Points in front project;
      // points behind use their sideways offset so the chevron still points the short way round.
      const l = best.local
      let dx = l.z < 0 ? l.x / -l.z : l.x
      let dy = l.z < 0 ? l.y / -l.z : l.y
      if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) dx = -1
      const half = 0.5 - this.edgeMargin
      const k = half / Math.max(Math.abs(dx), Math.abs(dy))
      dx *= k
      dy *= k
      const screen = new vec2(0.5 + dx, 0.5 - dy)
      const t = this.getTransform()
      t.setWorldPosition(this.camera.screenSpaceToWorldSpace(screen, this.chevronDepthCm))
      t.setWorldRotation(camT.getWorldRotation().multiply(quat.angleAxis(Math.atan2(dy, dx), vec3.forward())))
    } else if (this.alpha === 0) {
      this.pointing = null
    }

    const on = this.alpha > 0.01
    if (this.visual.enabled !== on) this.visual.enabled = on
    if (on && Math.abs(this.alpha - this.drawnAlpha) > 0.02) this.applyAlpha(this.alpha)
  }

  /** Additive material: fade by scaling the vertex RGB. */
  private applyAlpha(a: number): void {
    this.drawnAlpha = a
    const k = a * this.brightness
    const n = this.base.length / STRIDE
    for (let i = 0; i < n; i++) {
      const v = this.base.slice(i * STRIDE, (i + 1) * STRIDE)
      v[6] *= k
      v[7] *= k
      v[8] *= k
      this.builder.setVertexInterleaved(i, v)
    }
    this.builder.updateMesh()
  }
}
