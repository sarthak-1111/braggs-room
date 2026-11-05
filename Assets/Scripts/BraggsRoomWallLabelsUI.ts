/**
 * BraggsRoomWallLabelsUI: every label drawn on the wall (a passive view).
 *
 * Owns:
 *   - the 2θ tick labels along the beam stop's horizontal axis (10° … 50° each side, at
 *     x = ±150·tan 2θ, from BraggGeometry.twoThetaTickX) plus a "2θ" caption at each end;
 *   - the off-wall hint ("Spot is off the wall. Try a shorter wavelength.") under the beam stop;
 *   - the Text on the pooled spot and ghost label holders (SpotPool > Spot_i > SpotLabel,
 *     SpotPool > Ghost_i > GhostLabel), bound once with bindSpotLabels / bindGhostLabels.
 * These labels are placed by physics, not by a layout, which is why this module is plain
 * Text rather than a FlexLayout panel. It still owns every visible string on the wall, so
 * no gameplay script creates Text.
 *
 * Inputs: presentation settings only. Authored on "WallLabels", placed at the beam stop and
 * 0.6 cm in front of the wall (same plane as the spots).
 *
 * Talks to BraggsRoomMain through: bindSpotLabels(holders), setSpotLabel(i, title, detail),
 * bindGhostLabels(holders), setGhostLabel(i, text), setOffWallHint(visible).
 *
 * Must not: decide where a label goes (SpotPool positions the holders) or what it says
 * (the sim writes the strings).
 */
import {TEXT} from "./BraggText"
import {TWO_THETA_TICKS_DEG, twoThetaTickX} from "./BraggGeometry"
import {SCENE_NAMES} from "./BraggsRoomSceneContracts"

const EM_CM_TO_SIZE = 43.886

@component
export class BraggsRoomWallLabelsUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomWallLabelsUI – spot, ghost and 2θ labels on the wall</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Line height of the lit-spot labels, cm (the handoff floor for wall text is 4 cm)")
  @widget(new SliderWidget(4, 8, 0.1))
  spotLabelHeightCm: number = 4.5

  @input
  @hint("Line height of ghost labels, 2θ tick labels and the off-wall hint, cm (at least 4)")
  @widget(new SliderWidget(4, 8, 0.1))
  smallLabelHeightCm: number = 4.0

  @input("vec4", "{0.98,0.96,0.9,1}")
  @hint("Lit-spot label colour (warm white). Keep it light: the display is additive.")
  @widget(new ColorWidget())
  labelColor: vec4

  @input
  @hint("Opacity of ghost labels and 2θ tick labels (they are deliberately faint)")
  @widget(new SliderWidget(0.2, 1, 0.05))
  faintAlpha: number = 0.45

  @input("vec4", "{1,0.84,0.55,1}")
  @hint("Off-wall hint colour")
  @widget(new ColorWidget())
  hintColor: vec4

  @input
  @hint("How far below the horizontal axis the 2θ tick labels sit, cm")
  @widget(new SliderWidget(3, 12, 0.5))
  tickLabelDropCm: number = 6
  @ui.group_end

  private spotTexts: Text[] = []
  private spotStrings: string[] = []
  private ghostTexts: Text[] = []
  private ghostStrings: string[] = []
  private hintObject: SceneObject

  onAwake(): void {
    const faint = new vec4(this.labelColor.x, this.labelColor.y, this.labelColor.z, this.faintAlpha)
    for (const deg of TWO_THETA_TICKS_DEG) {
      const x = twoThetaTickX(deg)
      for (const side of [1, -1]) {
        const so = this.obj(this.sceneObject, `TwoThetaTick_${side > 0 ? "R" : "L"}${deg}`, new vec3(side * x, -this.tickLabelDropCm, 0))
        this.makeText(so, `${deg}°`, this.smallLabelHeightCm, faint, HorizontalAlignment.Center, 14)
      }
    }
    // "2θ" captions near the ends of the axis, past the 50° ticks.
    for (const side of [1, -1]) {
      const so = this.obj(this.sceneObject, `TwoThetaCaption_${side > 0 ? "R" : "L"}`, new vec3(side * 193, this.tickLabelDropCm, 0))
      this.makeText(so, "2θ", this.smallLabelHeightCm, faint, HorizontalAlignment.Center, 12)
    }
    this.hintObject = this.obj(this.sceneObject, SCENE_NAMES.offWallHint, new vec3(0, -18, 0))
    this.makeText(this.hintObject, TEXT.offWall, this.smallLabelHeightCm, this.hintColor, HorizontalAlignment.Center, 160)
    this.hintObject.enabled = false
  }

  // ------------------------------------------------------------------ public API (Main → UI)

  /** Put a label Text on each SpotPool > Spot_i > SpotLabel holder (above-right of the spot). */
  bindSpotLabels(holders: SceneObject[]): void {
    this.spotTexts = holders.map((h) => this.makeAboveText(h, this.spotLabelHeightCm, this.labelColor, 80))
    this.spotStrings = holders.map(() => "")
  }

  /** Lit-spot label: "(0 1 0)" over "θ 11.1°  2θ 22.2°" (free mode), or just "2θ 14.3°" (mission). */
  setSpotLabel(index: number, title: string, detail: string): void {
    const t = this.spotTexts[index]
    if (!t) return
    const s = title ? `${title}\n${detail}` : detail
    if (this.spotStrings[index] === s) return
    this.spotStrings[index] = s
    t.text = s
  }

  /** Put a faint label Text on each SpotPool > Ghost_i > GhostLabel holder. */
  bindGhostLabels(holders: SceneObject[]): void {
    const faint = new vec4(this.labelColor.x, this.labelColor.y, this.labelColor.z, this.faintAlpha)
    this.ghostTexts = holders.map((h) => this.makeAboveText(h, this.smallLabelHeightCm, faint, 60))
    this.ghostStrings = holders.map(() => "")
  }

  /** Ghost label, e.g. "(0 1 0) 10.2°" (ghost.label from the sim). */
  setGhostLabel(index: number, label: string): void {
    const t = this.ghostTexts[index]
    if (!t || this.ghostStrings[index] === label) return
    this.ghostStrings[index] = label
    t.text = label
  }

  /** Show or hide "Spot is off the wall. Try a shorter wavelength." (frame.offWallHint). */
  setOffWallHint(visible: boolean): void {
    if (this.hintObject && this.hintObject.enabled !== visible) this.hintObject.enabled = visible
  }

  // ------------------------------------------------------------------ helpers

  private makeText(so: SceneObject, value: string, lineHeightCm: number, color: vec4, align: HorizontalAlignment, widthCm: number): Text {
    const t = so.createComponent("Component.Text") as Text
    t.text = value
    t.depthTest = true
    t.size = lineHeightCm * EM_CM_TO_SIZE
    ;(t as Text & {weight?: number}).weight = 500
    t.textFill.color = color
    t.horizontalAlignment = align
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    const left = align === HorizontalAlignment.Left ? 0 : -widthCm / 2
    t.layoutRect = Rect.create(left, left + widthCm, -lineHeightCm, lineHeightCm)
    return t
  }

  /**
   * Spot and ghost labels sit above-right of their holder: the text block grows upward from
   * the holder, so a label never covers the 2θ tick labels just under the horizontal axis.
   */
  private makeAboveText(so: SceneObject, lineHeightCm: number, color: vec4, widthCm: number): Text {
    const t = this.makeText(so, "", lineHeightCm, color, HorizontalAlignment.Left, widthCm)
    t.verticalAlignment = VerticalAlignment.Bottom
    t.layoutRect = Rect.create(0, widthCm, 0, lineHeightCm * 3)
    return t
  }

  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const sceneObject = global.scene.createSceneObject(name)
    sceneObject.setParent(parent)
    if (position) sceneObject.getTransform().setLocalPosition(position)
    return sceneObject
  }
}
