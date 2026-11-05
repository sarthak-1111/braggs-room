/**
 * BraggsRoomConsoleUI: the control console on the desk, right of the crystal (UIKit only).
 *
 * Owns (a passive view): the sample tag header, the wavelength row (label + λ readout),
 * the WavelengthSlider (0.70 … 2.30 Å) with source marks "Mo 0.71", "Cu 1.54", "Co 1.79",
 * "Cr 2.29" at their proportional positions, the ResetButton, the SC / FCC LatticeToggle,
 * the "mosaic spread exaggerated (1.0°)" footnote, and an empty Stage2Slot column at the
 * bottom where the stage-2 controls (mission, predictor, verdicts) will go.
 *
 * Inputs: presentation settings only. Authored on the "Console" SceneObject; the
 * SceneObject's transform places and tilts the panel.
 *
 * Talks to BraggsRoomMain through:
 *   Main → UI : setWavelength(λ), setLambdaLabel(s), setSampleTag(s), setLattice(l)
 *   UI → Main : onWavelengthChange(λ), onResetOrientation(), onLatticeChange(l)
 *
 * Must not: hold sim state or compute physics. It only turns the slider position into λ
 * (a linear map over the slider's range) and reports what the user asked for.
 */
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {ContentVerticalAlignment} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/LayoutTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {Slider} from "SpectaclesUIKit.lspkg/Scripts/Components/Slider/Slider"
import {Switch} from "SpectaclesUIKit.lspkg/Scripts/Components/Switch/Switch"
import {Lattice} from "./BraggPhysics"
import {DEFAULT_CONFIG} from "./BraggSim"
import {SOURCES, TEXT} from "./BraggText"
import {SCENE_NAMES} from "./BraggsRoomSceneContracts"

// ── Typography ─────────────────────────────────────────────────────────────────────
// Text.size is the em-square height: em cm = size / 43.886 (StudioLib.d.ts).
// The handoff sets a floor for desk-level text of 1.2 cm, which is larger than the
// Specs type scale at 110 cm, so this panel keeps its own scale in cm. Size and weight
// always travel together through applyRole; textScale (an @input) scales every role.
const EM_CM_TO_SIZE = 43.886
type Role = "Title" | "Value" | "Body" | "Caption" | "Mark"
const TYPE_SCALE: Record<Role, {emCm: number; weight: number}> = {
  Title: {emCm: 1.9, weight: 700},
  Value: {emCm: 1.7, weight: 700},
  Body: {emCm: 1.5, weight: 500},
  Caption: {emCm: 1.25, weight: 500},
  Mark: {emCm: 1.0, weight: 500},
}

const LAYOUT_Z_LIFT = 0.02
const BUTTON_LABEL_Z = 0.08
const PAD = 2.0
const ROW_GAP = 1.0

/** Source marks alternate between two rows so close lines (Cu 1.54, Co 1.79) never overlap. */
const MARK_ROW_Y = [0.1, -1.5]
const MARK_TICK_Y = 1.45

@component
export class BraggsRoomConsoleUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomConsoleUI – wavelength, reset, SC/FCC (desk console)</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm. Rows, the slider and the source marks scale to fit.")
  @widget(new SliderWidget(28, 48, 0.5))
  panelWidthCm: number = 36

  @input
  @hint("Multiplies every text size on the console (desk-level text must stay at least 1.2 cm tall).")
  @widget(new SliderWidget(1, 1.6, 0.05))
  textScale: number = 1.0

  @input("vec4", "{0.94,0.96,1,1}")
  @hint("Main text colour. Keep it light: the Specs display is additive, so dark text disappears.")
  @widget(new ColorWidget())
  textColor: vec4

  @input("vec4", "{0.62,0.93,1,1}")
  @hint("Accent colour for the λ readout and the active SC/FCC label.")
  @widget(new ColorWidget())
  accentColor: vec4

  @input
  @hint("Within this many Å of a source line (Mo, Cu, Co, Cr), the slider snaps λ onto the line.")
  @widget(new SliderWidget(0, 0.08, 0.005))
  sourceSnapAngstrom: number = 0.03

  @input
  @hint("Play UIKit's built-in click sounds on the button and the toggle.")
  playClickSounds: boolean = true
  @ui.group_end

  private _onWavelengthChange = new Event<number>()
  private _onResetOrientation = new Event<void>()
  private _onLatticeChange = new Event<Lattice>()

  /** The user moved the wavelength slider (Å, already snapped to a source line when close). */
  get onWavelengthChange(): PublicApi<number> {
    return this._onWavelengthChange.publicApi()
  }
  /** The user pressed Reset orientation. */
  get onResetOrientation(): PublicApi<void> {
    return this._onResetOrientation.publicApi()
  }
  /** The user flipped the SC / FCC toggle. */
  get onLatticeChange(): PublicApi<Lattice> {
    return this._onLatticeChange.publicApi()
  }

  private slider: Slider
  private latticeSwitch: Switch
  private sampleTagText: Text
  private lambdaText: Text
  private scLabel: Text
  private fccLabel: Text
  private stage2Slot: SceneObject

  private lambdaMin = DEFAULT_CONFIG.lambdaMin
  private lambdaMax = DEFAULT_CONFIG.lambdaMax
  private lastLambda = DEFAULT_CONFIG.freeLambda
  private lastLattice: Lattice = "SC"
  private sliderW = 32
  private sliderH = 3.2

  onAwake(): void {
    const innerW = this.panelWidthCm - PAD * 2
    this.sliderW = innerW

    this.sceneObject.createComponent("Component.Canvas")
    // BackPlate before Content so the Canvas hierarchy sort paints it first.
    const backPlate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate

    const content = this.obj(this.sceneObject, "Content", new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false // children are registered with addItems (flexChild)
    flex.width = this.panelWidthCm
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    flex.verticalAlignment = ContentVerticalAlignment.Center
    flex.rowGap = ROW_GAP
    flex.paddingTop = PAD
    flex.paddingBottom = PAD
    flex.paddingLeft = PAD
    flex.paddingRight = PAD
    flex.onLayoutComplete.add((r) => {
      backPlate.size = new vec2(r.containerWidth, r.containerHeight)
    })

    // 1. Sample tag header ("Simple cubic · a = 4.00 Å").
    this.flexChild(content, {w: innerW, h: 2.6}, (item) => {
      this.sampleTagText = this.addText(item, "SampleTag", "Simple cubic · a = 4.00 Å", "Title", innerW, 2.6, "center")
    })

    // 2. Wavelength row: label left, live λ readout right.
    this.flexChild(content, {w: innerW, h: 2.4}, (item) => {
      const row = this.flexRow(item, innerW, 2.4, {justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
      this.flexChild(row, {w: 11, h: 2.4}, (cell) => {
        this.addText(cell, "WavelengthLabel", "Wavelength", "Body", 11, 2.4, "left")
      })
      this.flexChild(row, {w: innerW - 12, h: 2.4}, (cell) => {
        this.lambdaText = this.addText(cell, "LambdaReadout", "λ 1.54 Å · Cu Kα", "Value", innerW - 12, 2.4, "right")
        this.lambdaText.textFill.color = this.accentColor
      })
    })

    // 3. The slider. It sits on a child of the flex cell so the layout never resizes it
    //    after init (Slider only computes fill/knob from the size it had at init).
    this.flexChild(content, {w: innerW, h: this.sliderH}, (item) => {
      const so = this.obj(item, SCENE_NAMES.wavelengthSlider)
      const slider = so.createComponent(Slider.getTypeName()) as Slider
      slider.size = new vec3(this.sliderW, this.sliderH, 1) // BEFORE init
      slider.resetToValue(this.lambdaToValue(this.lastLambda))
      slider.onValueChange.add((v: number) => this.handleSlider(v))
      this.slider = slider
    })

    // 4. Source marks under the slider, at the knob position for each line.
    this.flexChild(content, {w: innerW, h: 4.0}, (item) => this.buildSourceMarks(item))

    // 5. Controls: Reset orientation button, SC / FCC toggle.
    this.flexChild(content, {w: innerW, h: 4.6}, (item) => {
      const row = this.flexRow(item, innerW, 4.6, {justify: FlexJustify.SpaceBetween, align: FlexAlign.Center, gap: 1.0})
      this.flexChild(row, {w: 16, h: 4.6}, (cell) => this.buildResetButton(cell, 16, 4.4))
      this.flexChild(row, {w: 14, h: 4.6}, (cell) => this.buildLatticeToggle(cell))
    })

    // 6. Footnote.
    this.flexChild(content, {w: innerW, h: 1.8}, (item) => {
      const t = this.addText(item, "MosaicFootnote", TEXT.mosaic, "Caption", innerW, 1.8, "center")
      t.textFill.color = this.withAlpha(this.textColor, 0.62)
    })

    // 7. Stage-2 slot: an empty column the stage-2 controls are added to. The BackPlate
    //    follows the layout, so the console grows when they arrive.
    this.flexChild(content, {w: innerW, h: 0.01}, (item) => {
      this.stage2Slot = this.obj(item, SCENE_NAMES.stage2Slot)
    })
  }

  // ------------------------------------------------------------------ public API (Main → UI)

  /** Move the slider to λ without emitting onWavelengthChange (mission start, tests, reset). */
  setWavelength(lambda: number): void {
    this.lastLambda = lambda
    if (this.slider) this.slider.resetToValue(this.lambdaToValue(lambda))
  }

  /** The λ readout, e.g. frame.lambdaLabel ("λ 1.54 Å · Cu Kα"). */
  setLambdaLabel(label: string): void {
    if (this.lambdaText && this.lambdaText.text !== label) this.lambdaText.text = label
  }

  /** The header, e.g. frame.sampleTag ("Simple cubic · a = 4.00 Å"). */
  setSampleTag(tag: string): void {
    if (this.sampleTagText && this.sampleTagText.text !== tag) this.sampleTagText.text = tag
  }

  /** Show which lattice is active without emitting onLatticeChange. */
  setLattice(lattice: Lattice): void {
    this.lastLattice = lattice
    if (this.latticeSwitch && this.latticeSwitch.isOn !== (lattice === "FCC")) {
      this.latticeSwitch.isOn = lattice === "FCC"
    }
    this.refreshLatticeLabels()
  }

  /** Parent for the stage-2 controls (empty in stage 1). */
  getStage2Slot(): SceneObject {
    return this.stage2Slot
  }

  // ------------------------------------------------------------------ input handling (UI → Main)

  private handleSlider(v: number): void {
    let lambda = this.lambdaMin + v * (this.lambdaMax - this.lambdaMin)
    for (const s of SOURCES) {
      if (Math.abs(lambda - s.lambda) <= this.sourceSnapAngstrom) {
        lambda = s.lambda
        break
      }
    }
    if (Math.abs(lambda - this.lastLambda) < 1e-4) return
    this.lastLambda = lambda
    this._onWavelengthChange.invoke(lambda)
  }

  private handleSwitch(): void {
    const lattice: Lattice = this.latticeSwitch.isOn ? "FCC" : "SC"
    if (lattice === this.lastLattice) return // our own setLattice, or no change
    this.lastLattice = lattice
    this.refreshLatticeLabels()
    this._onLatticeChange.invoke(lattice)
  }

  // ------------------------------------------------------------------ builders

  private buildResetButton(parent: SceneObject, w: number, h: number): void {
    const so = this.obj(parent, SCENE_NAMES.resetButton)
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(w, h, 1) // BEFORE init
    btn.playAudio = this.playClickSounds
    const label = this.obj(so, "ButtonLabel", new vec3(0, 0, BUTTON_LABEL_Z))
    this.makeText(label, TEXT.reset, "Body", w - 0.6, h, "center")
    btn.onTriggerUp.add(() => this._onResetOrientation.invoke())
  }

  private buildLatticeToggle(parent: SceneObject): void {
    const row = this.flexRow(parent, 14, 4.6, {justify: FlexJustify.Center, align: FlexAlign.Center, gap: 0.6})
    this.flexChild(row, {w: 3.0, h: 2.4}, (cell) => {
      this.scLabel = this.addText(cell, "LatticeSC", "SC", "Value", 3.0, 2.4, "right")
    })
    this.flexChild(row, {w: 6.4, h: 3.6}, (cell) => {
      const so = this.obj(cell, SCENE_NAMES.latticeToggle)
      const sw = so.createComponent(Switch.getTypeName()) as Switch
      sw.size = new vec3(6.4, 3.4, 1) // BEFORE init
      sw.isOn = this.lastLattice === "FCC"
      sw.playAudio = this.playClickSounds
      // Switch.onFinished always carries true for a user toggle, so read isOn instead.
      sw.onValueChange.add(() => this.handleSwitch())
      this.latticeSwitch = sw
    })
    this.flexChild(row, {w: 4.0, h: 2.4}, (cell) => {
      this.fccLabel = this.addText(cell, "LatticeFCC", "FCC", "Value", 4.0, 2.4, "left")
    })
    this.refreshLatticeLabels()
  }

  /**
   * Axis marks for the X-ray source lines. These are data-placed (like axis ticks), not a
   * stacked layout: each mark's x is the knob centre for that λ, computed the same way UIKit
   * places the knob: x = (v − 0.5) · (sliderWidth − knobWidth), knobWidth = slider height.
   */
  private buildSourceMarks(parent: SceneObject): void {
    const half = this.sliderW / 2
    SOURCES.forEach((s, i) => {
      const x = (this.lambdaToValue(s.lambda) - 0.5) * (this.sliderW - this.sliderH)
      const tick = this.obj(parent, `Mark_${s.name}`, new vec3(x, MARK_TICK_Y, LAYOUT_Z_LIFT))
      const tickText = this.makeText(tick, "|", "Mark", 1, 1.2, "center")
      tickText.textFill.color = this.withAlpha(this.textColor, 0.55)

      const label = `${s.name.split(" ")[0]} ${s.lambda.toFixed(2)}`
      const w = 6.0
      const cx = Math.min(half - w / 2, Math.max(-half + w / 2, x))
      const so = this.obj(parent, `MarkLabel_${i}`, new vec3(cx, MARK_ROW_Y[i % 2], LAYOUT_Z_LIFT))
      const t = this.makeText(so, label, "Caption", w, 1.6, "center")
      t.textFill.color = this.withAlpha(this.textColor, 0.8)
    })
  }

  private refreshLatticeLabels(): void {
    if (!this.scLabel || !this.fccLabel) return
    const fcc = this.lastLattice === "FCC"
    this.scLabel.textFill.color = fcc ? this.withAlpha(this.textColor, 0.45) : this.accentColor
    this.fccLabel.textFill.color = fcc ? this.accentColor : this.withAlpha(this.textColor, 0.45)
  }

  // ------------------------------------------------------------------ helpers

  private lambdaToValue(lambda: number): number {
    const v = (lambda - this.lambdaMin) / (this.lambdaMax - this.lambdaMin)
    return Math.min(1, Math.max(0, v))
  }

  private withAlpha(c: vec4, a: number): vec4 {
    return new vec4(c.x, c.y, c.z, a)
  }

  private applyRole(t: Text, role: Role): void {
    t.size = TYPE_SCALE[role].emCm * EM_CM_TO_SIZE * this.textScale
    ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
  }

  /** A Text on `so`, sized by its rect (width × height, cm) and aligned within it. */
  private makeText(so: SceneObject, value: string, role: Role, w: number, h: number, align: "left" | "center" | "right"): Text {
    const t = so.createComponent("Component.Text") as Text
    t.text = value
    t.depthTest = true
    this.applyRole(t, role)
    t.textFill.color = this.textColor
    t.horizontalAlignment =
      align === "left" ? HorizontalAlignment.Left : align === "right" ? HorizontalAlignment.Right : HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Shrink
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    return t
  }

  /** A Text on its own child SceneObject inside a flex cell (the cell owns the FlexItem). */
  private addText(parent: SceneObject, name: string, value: string, role: Role, w: number, h: number, align: "left" | "center" | "right"): Text {
    const so = this.obj(parent, name)
    return this.makeText(so, value, role, w, h, align)
  }

  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const sceneObject = global.scene.createSceneObject(name)
    sceneObject.setParent(parent)
    if (position) sceneObject.getTransform().setLocalPosition(position)
    return sceneObject
  }

  private liftInZ(sceneObject: SceneObject, zOffset: number): void {
    const transform = sceneObject.getTransform()
    const pos = transform.getLocalPosition()
    transform.setLocalPosition(new vec3(pos.x, pos.y, pos.z + zOffset))
  }

  private flexRow(parent: SceneObject, width: number, height: number, opts?: {gap?: number; justify?: FlexJustify; align?: FlexAlign}): SceneObject {
    const container = this.obj(parent, "Row")
    this.liftInZ(container, LAYOUT_Z_LIFT)
    const flexLayout = container.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flexLayout.autoDiscoverItemsOnStart = false // children are registered with addItems (flexChild)
    flexLayout.onInitialized.add(() => {
      flexLayout.width = width
      flexLayout.height = height
      flexLayout.direction = FlexDirection.Row
      flexLayout.columnGap = opts?.gap ?? 0
      flexLayout.justifyContent = opts?.justify ?? FlexJustify.Start
      flexLayout.alignItems = opts?.align ?? FlexAlign.Center
    })
    return container
  }

  private flexChild(parent: SceneObject, size: {w?: number; h?: number; grow?: number}, builder: (child: SceneObject) => void): SceneObject {
    const child = this.obj(parent, "Item")
    this.liftInZ(child, LAYOUT_Z_LIFT)
    const flexItem = child.createComponent(FlexItem.getTypeName()) as FlexItem
    if (size.w !== undefined && size.w > 0) flexItem.overrideWidth = size.w
    if (size.h !== undefined && size.h > 0) flexItem.overrideHeight = size.h
    flexItem.flexGrow = size.grow ?? 0
    flexItem.flexShrink = 0
    builder(child)
    const parentFlexLayout = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (parentFlexLayout) parentFlexLayout.addItems([flexItem])
    return child
  }
}
