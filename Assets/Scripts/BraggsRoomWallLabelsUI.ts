/**
 * BraggsRoomWallLabelsUI: every label drawn on the wall (a passive view).
 *
 * Owns:
 *   - the 2θ tick labels along the beam stop's horizontal axis (10° … 50° each side, at
 *     x = ±150·tan 2θ, from BraggGeometry.twoThetaTickX) plus a "2θ" caption at each end;
 *   - the off-wall hint ("A reflection at 2θ 95.3° is lit, but misses the wall.", frame.offWallText)
 *     18 cm under the beam stop;
 *   - the wall-distance label ("wall 150 cm from the crystal", from the detector config), faint,
 *     below the hint and to the right of the incoming beam;
 *   - stage 2: the prediction ring's label (RingLabel, at the top of the ring, or under the beam
 *     stop when the ring cannot be drawn), the Banner after a correct verdict, and the IntroText
 *     ("Drag the crystal. Watch the wall.") that fades in at Lens start and out after introSeconds;
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
 * bindGhostLabels(holders), setGhostLabel(i, text), setOffWallHint(text),
 * setRingLabel(label, radiusCm), setBanner(text), playIntro().
 *
 * Must not: decide where a label goes (SpotPool positions the holders) or what it says
 * (the sim writes the strings).
 */
import {TEXT, fmtWallDistance} from "./BraggText"
import {TWO_THETA_TICKS_DEG, ringLabelY, twoThetaTickX} from "./BraggGeometry"
import {DEFAULT_DETECTOR} from "./BraggPhysics"
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

  @input
  @hint("Line height of the banner and the intro line, cm (at least 6)")
  @widget(new SliderWidget(6, 10, 0.1))
  headlineHeightCm: number = 6.5

  @input
  @hint("How far above the beam stop the banner and the intro line sit, cm")
  @widget(new SliderWidget(6, 30, 0.5))
  headlineRiseCm: number = 12

  @input("vec4", "{0.84,0.76,1,1}")
  @hint("Colour of the prediction ring's label (a light version of the ring's violet)")
  @widget(new ColorWidget())
  ringLabelColor: vec4

  @input
  @hint("Seconds the intro line stays up after Lens start before it fades out")
  @widget(new SliderWidget(3, 20, 0.5))
  introSeconds: number = 10
  @ui.group_end

  private spotTexts: Text[] = []
  private spotStrings: string[] = []
  private ghostTexts: Text[] = []
  private ghostStrings: string[] = []
  private hintObject: SceneObject
  private hintText: Text
  private ringObject: SceneObject
  private ringText: Text
  private bannerObject: SceneObject
  private bannerText: Text
  private introObject: SceneObject
  private introText: Text
  private introStart = -1
  private introCut = false

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
    this.hintText = this.makeText(this.hintObject, "", this.smallLabelHeightCm, this.hintColor, HorizontalAlignment.Center, 160)
    this.hintObject.enabled = false

    // Wall distance: faint and left-aligned, below the hint (y −18) with a 4 cm gap, starting just
    // right of the beam stop: seen from the user's position the incoming beam reaches the stop from
    // the lower left, so it doesn't cross the label. Clear of the 2θ ticks (y −6), the ring label under the stop (y ≈ −10) and the
    // intro line and banner above the stop.
    const distanceObject = this.obj(this.sceneObject, SCENE_NAMES.wallDistance, new vec3(4, -26, 0))
    this.makeText(distanceObject, fmtWallDistance(DEFAULT_DETECTOR.distanceCm), this.smallLabelHeightCm, faint, HorizontalAlignment.Left, 80)

    this.ringObject = this.obj(this.sceneObject, SCENE_NAMES.ringLabel, new vec3(0, 0, 0.05))
    this.ringText = this.makeText(this.ringObject, "", this.smallLabelHeightCm, this.ringLabelColor, HorizontalAlignment.Center, 120)
    this.ringObject.enabled = false

    const rise = new vec3(0, this.headlineRiseCm, 0.1)
    this.bannerObject = this.obj(this.sceneObject, SCENE_NAMES.banner, rise)
    this.bannerText = this.makeText(this.bannerObject, "", this.headlineHeightCm, this.labelColor, HorizontalAlignment.Center, 200)
    ;(this.bannerText as Text & {weight?: number}).weight = 700
    this.bannerObject.enabled = false

    this.introObject = this.obj(this.sceneObject, SCENE_NAMES.introText, rise)
    this.introText = this.makeText(this.introObject, TEXT.intro, this.headlineHeightCm, this.labelColor, HorizontalAlignment.Center, 200)
    this.introObject.enabled = false
    this.createEvent("UpdateEvent").bind(() => this.updateIntro())
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

  /** The off-wall hint (frame.offWallText), e.g. "A reflection at 2θ 95.3° is lit, but misses the wall."; "" hides it. */
  setOffWallHint(text: string): void {
    if (!this.hintObject) return
    const visible = text.length > 0
    if (visible && this.hintText.text !== text) this.hintText.text = text
    if (this.hintObject.enabled !== visible) this.hintObject.enabled = visible
  }

  /**
   * The prediction ring's label (frame.ring.label). radiusCm is the ring radius when the ring is
   * drawn (the label sits at its top) or null (the label sits under the beam stop). null label hides it.
   */
  setRingLabel(label: string | null, radiusCm: number | null): void {
    const on = !!label
    if (this.ringObject.enabled !== on) this.ringObject.enabled = on
    if (!on) return
    if (this.ringText.text !== label) this.ringText.text = label as string
    const y = ringLabelY(radiusCm, this.smallLabelHeightCm, DEFAULT_DETECTOR)
    const p = this.ringObject.getTransform().getLocalPosition()
    if (Math.abs(p.y - y) > 1e-3) this.ringObject.getTransform().setLocalPosition(new vec3(0, y, p.z))
  }

  /** "Identified: FCC, like copper" after a correct verdict (frame.banner); "" hides it. */
  setBanner(text: string): void {
    const on = text.length > 0
    if (on && this.introObject.enabled) this.introCut = true // the banner replaces the intro line
    if (this.bannerObject.enabled !== on) this.bannerObject.enabled = on
    if (on && this.bannerText.text !== text) this.bannerText.text = text
  }

  /** Start the intro line: fade in over ~1 s, hold until introSeconds, fade out over ~1 s. */
  playIntro(): void {
    this.introStart = getTime()
    this.introCut = false
    this.introObject.enabled = true
    this.setIntroAlpha(0)
  }

  /** True while the intro line is on screen (LEAF). */
  isIntroVisible(): boolean {
    return this.introObject.enabled
  }

  // ------------------------------------------------------------------ helpers

  private updateIntro(): void {
    if (this.introStart < 0) return
    const t = getTime() - this.introStart
    const fadeIn = Math.min(1, Math.max(0, (t - 0.4) / 1.0))
    const fadeOut = this.introCut ? 0 : Math.min(1, Math.max(0, (this.introSeconds + 1 - t) / 1.0))
    const a = Math.min(fadeIn, fadeOut)
    if (a <= 0 && t > 0.5) {
      this.introObject.enabled = false
      this.introStart = -1
      return
    }
    this.setIntroAlpha(a)
  }

  private setIntroAlpha(a: number): void {
    const c = this.labelColor
    this.introText.textFill.color = new vec4(c.x, c.y, c.z, a)
  }

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
