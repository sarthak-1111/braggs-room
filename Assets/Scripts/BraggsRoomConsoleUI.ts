/**
 * BraggsRoomConsoleUI: the control console on the desk, right of the crystal (UIKit only).
 *
 * Owns (a passive view), top to bottom:
 *   - the wavelength row (label + λ readout), the WavelengthSlider (0.70 … 2.30 Å) and the source
 *     marks "Mo 0.71", "Cu 1.54", "Co 1.79", "Cr 2.29" at their proportional positions;
 *   - the controls row: ResetButton and ModeButton ("Start mission" / "Back to free mode");
 *   - free mode: the SC / FCC LatticeToggle row;
 *   - mission: the Stage2Slot, holding PredictButton (folds/unfolds the predictor sub-panel),
 *     VerdictSCButton + VerdictFCCButton (shown together once the verdict is unlocked, hidden
 *     once solved) and the FeedbackLine (frame.feedback.message, wrapped, coloured by kind);
 *   - the "mosaic spread exaggerated (1.0°)" footnote.
 * The panel is top-anchored: its top edge stays at topEdgeCm and it grows downward when the
 * mission rows appear (36 × 26 cm in free mode, 36 × 30 cm in a mission). Nothing moves while a
 * mission runs: the feedback area is reserved for the whole round. The predictor steppers live on
 * the PredictorPanel sub-panel just above the top edge (BraggsRoomPredictorUI).
 *
 * Inputs: presentation settings only. Authored on the "Console" SceneObject; its transform
 * places and tilts the panel.
 *
 * Talks to BraggsRoomMain through:
 *   Main → UI : setWavelength(λ), followWavelength(λ), setLambdaLabel(s), setLattice(l),
 *               setMissionState(mode, verdictUnlocked, solved, feedback), setPredictorOpen(open)
 *   UI → Main : onWavelengthChange(λ), onResetOrientation(), onLatticeChange(l), onModeButton(),
 *               onPredictButton(), onVerdict(l)
 *
 * Size: ~480 lines, over the usual split threshold, because it is one composed panel whose rows
 * share a single column layout; the predictor sub-panel and the shared layout helpers already live
 * in BraggsRoomPredictorUI.ts and BraggsRoomUILayout.ts.
 *
 * Must not: hold sim state or compute physics. It turns the slider position into λ (a linear map
 * over the slider's range) and reports what the user asked for; the sim decides everything else.
 */
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {ContentVerticalAlignment} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/LayoutTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Slider} from "SpectaclesUIKit.lspkg/Scripts/Components/Slider/Slider"
import {Switch} from "SpectaclesUIKit.lspkg/Scripts/Components/Switch/Switch"
import {Lattice} from "./BraggPhysics"
import {DEFAULT_CONFIG, Feedback, Mode} from "./BraggSim"
import {SOURCES, TEXT} from "./BraggText"
import {SCENE_NAMES} from "./BraggsRoomSceneContracts"
import {LAYOUT_Z_LIFT, flexChild, flexRow, labeledButton, makeText, obj} from "./BraggsRoomUILayout"

// ── Typography ─────────────────────────────────────────────────────────────────────
// em-square height in cm. The handoff sets a 1.2 cm floor for desk-level text, larger than the
// Specs type scale at 110 cm, so this panel keeps its own scale. textScale multiplies every role.
type Role = "Value" | "Body" | "Caption" | "Mark"
const TYPE_SCALE: Record<Role, {emCm: number; weight: number}> = {
  Value: {emCm: 1.7, weight: 700},
  Body: {emCm: 1.5, weight: 500},
  Caption: {emCm: 1.25, weight: 500},
  Mark: {emCm: 1.0, weight: 500},
}

const PAD = 1.5
const ROW_GAP = 0.6
const BUTTON_H = 4.4
const ROW_H = 4.6
const FEEDBACK_H = 4.0

/** Source marks alternate between two rows so close lines (Cu 1.54, Co 1.79) never overlap. */
const MARKS_H = 3.4
const MARK_ROW_Y = [0.15, -1.25]
const MARK_TICK_Y = 1.35

@component
export class BraggsRoomConsoleUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomConsoleUI – wavelength, reset, mode, SC/FCC, predictor, verdicts</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm. Rows, the slider and the source marks scale to fit.")
  @widget(new SliderWidget(32, 48, 0.5))
  panelWidthCm: number = 36

  @input
  @hint("Where the panel's top edge sits on this object's local y axis, cm. The panel grows downward from it when the mission rows appear, so the controls above never move.")
  @widget(new SliderWidget(0, 25, 0.5))
  topEdgeCm: number = 13

  @input
  @hint("Multiplies every text size on the console (desk-level text must stay at least 1.2 cm tall).")
  @widget(new SliderWidget(1, 1.6, 0.05))
  textScale: number = 1.0

  @input("vec4", "{0.94,0.96,1,1}")
  @hint("Main text colour, also the 'correct' feedback colour. Keep it light: the Specs display is additive, so dark text disappears.")
  @widget(new ColorWidget())
  textColor: vec4

  @input("vec4", "{0.62,0.93,1,1}")
  @hint("Accent colour for the λ readout and the active SC/FCC label.")
  @widget(new ColorWidget())
  accentColor: vec4

  @input("vec4", "{1,0.76,0.42,1}")
  @hint("Feedback colour for a wrong verdict (warm amber).")
  @widget(new ColorWidget())
  wrongColor: vec4

  @input("vec4", "{0.66,0.82,1,1}")
  @hint("Feedback colour for 'not enough evidence yet' (pale blue).")
  @widget(new ColorWidget())
  insufficientColor: vec4

  @input
  @hint("Within this many Å of a source line (Mo, Cu, Co, Cr), the slider snaps λ onto the line.")
  @widget(new SliderWidget(0, 0.08, 0.005))
  sourceSnapAngstrom: number = 0.03

  @input
  @hint("Play UIKit's built-in click sounds on the buttons and the toggle.")
  playClickSounds: boolean = true
  @ui.group_end

  private _onWavelengthChange = new Event<number>()
  private _onResetOrientation = new Event<void>()
  private _onLatticeChange = new Event<Lattice>()
  private _onModeButton = new Event<void>()
  private _onPredictButton = new Event<void>()
  private _onVerdict = new Event<Lattice>()

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
  /** The user pressed ModeButton ("Start mission" or "Back to free mode"). */
  get onModeButton(): PublicApi<void> {
    return this._onModeButton.publicApi()
  }
  /** The user pressed PredictButton (fold / unfold the predictor). */
  get onPredictButton(): PublicApi<void> {
    return this._onPredictButton.publicApi()
  }
  /** The user pressed a verdict button. */
  get onVerdict(): PublicApi<Lattice> {
    return this._onVerdict.publicApi()
  }

  private column: FlexLayout
  private plate: BackPlate
  private plateObject: SceneObject
  private slider: Slider
  private latticeSwitch: Switch
  private lambdaText: Text
  private scLabel: Text
  private fccLabel: Text
  private modeLabel: Text
  private predictLabel: Text
  private feedbackText: Text
  private stage2Slot: SceneObject
  private verdictSC: SceneObject
  private verdictFCC: SceneObject

  /** Column cells in layout order; the mode decides which are laid out. */
  private cells: {item: FlexItem; so: SceneObject; show: (mode: Mode) => boolean}[] = []

  private lambdaMin = DEFAULT_CONFIG.lambdaMin
  private lambdaMax = DEFAULT_CONFIG.lambdaMax
  private lastLambda = DEFAULT_CONFIG.freeLambda
  private lastLattice: Lattice = "SC"
  private sliderW = 33
  private sliderH = 3.2

  // Wanted view state; applied after the first frame so every UIKit control initialises while
  // enabled (a control disabled before its OnStart would never initialise).
  private started = false
  private mode: Mode = "free"
  private showVerdicts = false
  private feedbackKey = ""
  private feedback: Feedback | null = null

  onAwake(): void {
    const innerW = this.panelWidthCm - PAD * 2
    this.sliderW = innerW

    this.sceneObject.createComponent("Component.Canvas")
    // The plate is created before Content so the Canvas hierarchy sort paints it first.
    this.plateObject = obj(this.sceneObject, "ConsolePlate", new vec3(0, this.topEdgeCm - 13, 0))
    this.plate = this.plateObject.createComponent(BackPlate.getTypeName()) as BackPlate

    const content = obj(this.sceneObject, "Content", new vec3(0, this.topEdgeCm, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false // cells are registered with addItems
    flex.width = this.panelWidthCm
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    flex.verticalAlignment = ContentVerticalAlignment.Top // grows downward from the top edge
    flex.rowGap = ROW_GAP
    flex.paddingTop = PAD
    flex.paddingBottom = PAD
    flex.paddingLeft = PAD
    flex.paddingRight = PAD
    flex.onLayoutComplete.add((r) => {
      this.plate.size = new vec2(r.containerWidth, r.containerHeight)
      this.plateObject.getTransform().setLocalPosition(new vec3(0, this.topEdgeCm - r.containerHeight / 2, 0))
    })
    this.column = flex
    const always = (): boolean => true

    // 1. Wavelength row: label left, live λ readout right.
    this.cell(content, 2.4, always, (item) => {
      const row = flexRow(item, innerW, 2.4, {justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
      flexChild(row, {w: 11, h: 2.4}, (cell) => this.addText(cell, "WavelengthLabel", "Wavelength", "Body", 11, 2.4, "left"))
      flexChild(row, {w: innerW - 12, h: 2.4}, (cell) => {
        this.lambdaText = this.addText(cell, "LambdaReadout", "λ 1.54 Å · Cu Kα", "Value", innerW - 12, 2.4, "right")
        this.lambdaText.textFill.color = this.accentColor
      })
    })

    // 2. The slider, on a child of the cell so the layout never resizes it after init
    //    (Slider only computes fill/knob from the size it had at init).
    this.cell(content, this.sliderH, always, (item) => {
      const so = obj(item, SCENE_NAMES.wavelengthSlider)
      const slider = so.createComponent(Slider.getTypeName()) as Slider
      slider.size = new vec3(this.sliderW, this.sliderH, 1) // BEFORE init
      slider.resetToValue(this.lambdaToValue(this.lastLambda))
      slider.onValueChange.add((v: number) => this.handleSlider(v))
      this.slider = slider
    })

    // 3. Source marks under the slider, at the knob position for each line.
    this.cell(content, MARKS_H, always, (item) => this.buildSourceMarks(item))

    // 4. Controls: Reset orientation and the mode button.
    this.cell(content, ROW_H, always, (item) => {
      const row = flexRow(item, innerW, ROW_H, {justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
      const w = (innerW - 1) / 2
      flexChild(row, {w, h: ROW_H}, (cell) => {
        const b = this.button(cell, SCENE_NAMES.resetButton, w, TEXT.reset)
        b.button.onTriggerUp.add(() => this._onResetOrientation.invoke())
      })
      flexChild(row, {w, h: ROW_H}, (cell) => {
        const b = this.button(cell, SCENE_NAMES.modeButton, w, TEXT.startMission)
        this.modeLabel = b.label
        b.button.onTriggerUp.add(() => this._onModeButton.invoke())
      })
    })

    // 5a. Free mode: the SC / FCC toggle.
    this.cell(content, ROW_H, (m) => m === "free", (item) => this.buildLatticeToggle(item), "LatticeCell")

    // 5b. Mission: the Stage2Slot (predict + verdict buttons, then the feedback line).
    this.cell(content, ROW_H + ROW_GAP + FEEDBACK_H, (m) => m === "mission", (item) => {
      this.stage2Slot = obj(item, SCENE_NAMES.stage2Slot)
      this.buildMissionControls(this.stage2Slot, innerW)
    }, "Stage2Cell")

    // 6. Footnote.
    this.cell(content, 1.8, always, (item) => {
      const t = this.addText(item, "MosaicFootnote", TEXT.mosaic, "Caption", innerW, 1.8, "center")
      t.textFill.color = this.withAlpha(this.textColor, 0.62)
    })

    this.relayout()
    this.createEvent("UpdateEvent").bind(() => {
      if (this.started) return
      this.started = true
      this.applyView()
    })
  }

  // ------------------------------------------------------------------ public API (Main → UI)

  /** Move the slider to λ without emitting onWavelengthChange (mission start, tests, reset). */
  setWavelength(lambda: number): void {
    this.lastLambda = lambda
    if (this.slider) this.slider.resetToValue(this.lambdaToValue(lambda))
  }

  /**
   * Follow the sim's λ (frame.lambda) when the sim changed it itself, e.g. startMission() sets
   * 0.71 Å and endMission() 1.54 Å. A change the user just made through the slider already
   * matches, so the knob is never pulled from under the hand.
   */
  followWavelength(lambda: number): void {
    if (Math.abs(lambda - this.lastLambda) > 1e-4) this.setWavelength(lambda)
  }

  /** The λ readout, e.g. frame.lambdaLabel ("λ 1.54 Å · Cu Kα"). */
  setLambdaLabel(label: string): void {
    if (this.lambdaText && this.lambdaText.text !== label) this.lambdaText.text = label
  }

  /** Show which lattice is active without emitting onLatticeChange. */
  setLattice(lattice: Lattice): void {
    this.lastLattice = lattice
    if (this.latticeSwitch && this.latticeSwitch.isOn !== (lattice === "FCC")) {
      this.latticeSwitch.isOn = lattice === "FCC"
    }
    this.refreshLatticeLabels()
  }

  /** Draw the mode-dependent controls from the frame. Cheap to call every frame. */
  setMissionState(mode: Mode, verdictUnlocked: boolean, solved: boolean, feedback: Feedback | null): void {
    const showVerdicts = mode === "mission" && verdictUnlocked && !solved
    const key = feedback ? `${feedback.kind}\u0001${feedback.message}` : ""
    if (mode === this.mode && showVerdicts === this.showVerdicts && key === this.feedbackKey) return
    const modeChanged = mode !== this.mode
    this.mode = mode
    this.showVerdicts = showVerdicts
    this.feedbackKey = key
    this.feedback = feedback
    if (modeChanged) this.relayout()
    this.applyView()
  }

  /** PredictButton label: "Predict (hkl)" while folded, "Hide predictor" while unfolded. */
  setPredictorOpen(open: boolean): void {
    if (this.predictLabel) this.predictLabel.text = open ? "Hide\npredictor" : "Predict\n(hkl)"
  }

  /** The Stage2Slot SceneObject (holds the mission controls). */
  getStage2Slot(): SceneObject {
    return this.stage2Slot
  }

  // ------------------------------------------------------------------ view state

  private relayout(): void {
    if (!this.column) return
    this.column.clearItems()
    this.column.addItems(this.cells.filter((c) => c.show(this.mode)).map((c) => c.item))
  }

  private applyView(): void {
    if (!this.started) return
    for (const c of this.cells) {
      const on = c.show(this.mode)
      if (c.so.enabled !== on) c.so.enabled = on
    }
    if (this.verdictSC.enabled !== this.showVerdicts) this.verdictSC.enabled = this.showVerdicts
    if (this.verdictFCC.enabled !== this.showVerdicts) this.verdictFCC.enabled = this.showVerdicts
    if (this.modeLabel) this.modeLabel.text = this.mode === "mission" ? TEXT.backToFree : TEXT.startMission
    const fb = this.mode === "mission" ? this.feedback : null
    this.feedbackText.text = fb ? fb.message : ""
    this.feedbackText.textFill.color =
      !fb || fb.kind === "correct" ? this.textColor : fb.kind === "wrong" ? this.wrongColor : this.insufficientColor
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

  private buildLatticeToggle(parent: SceneObject): void {
    const row = flexRow(parent, 14, ROW_H, {justify: FlexJustify.Center, align: FlexAlign.Center, gap: 0.6})
    flexChild(row, {w: 3.0, h: 2.4}, (cell) => {
      this.scLabel = this.addText(cell, "LatticeSC", "SC", "Value", 3.0, 2.4, "right")
    })
    flexChild(row, {w: 6.4, h: 3.6}, (cell) => {
      const so = obj(cell, SCENE_NAMES.latticeToggle)
      const sw = so.createComponent(Switch.getTypeName()) as Switch
      sw.size = new vec3(6.4, 3.4, 1) // BEFORE init
      sw.isOn = this.lastLattice === "FCC"
      sw.playAudio = this.playClickSounds
      // Switch.onFinished always carries true for a user toggle, so read isOn instead.
      sw.onValueChange.add(() => this.handleSwitch())
      this.latticeSwitch = sw
    })
    flexChild(row, {w: 4.0, h: 2.4}, (cell) => {
      this.fccLabel = this.addText(cell, "LatticeFCC", "FCC", "Value", 4.0, 2.4, "left")
    })
    this.refreshLatticeLabels()
  }

  /** Stage2Slot: [Predict (hkl)] [Simple cubic] [Face-centred cubic], then the feedback line. */
  private buildMissionControls(slot: SceneObject, innerW: number): void {
    const half = (ROW_H + ROW_GAP + FEEDBACK_H) / 2
    const buttons = obj(slot, "MissionButtons", new vec3(0, half - ROW_H / 2, 0))
    const row = flexRow(buttons, innerW, ROW_H, {justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    flexChild(row, {w: 10.6, h: ROW_H}, (cell) => {
      const b = this.button(cell, SCENE_NAMES.predictButton, 10.6, "Predict\n(hkl)")
      this.predictLabel = b.label
      b.button.onTriggerUp.add(() => this._onPredictButton.invoke())
    })
    flexChild(row, {w: 8.4, h: ROW_H}, (cell) => {
      const b = this.button(cell, SCENE_NAMES.verdictSCButton, 8.4, "Simple\ncubic")
      b.button.onTriggerUp.add(() => this._onVerdict.invoke("SC"))
      this.verdictSC = b.button.getSceneObject()
    })
    flexChild(row, {w: 11.6, h: ROW_H}, (cell) => {
      const b = this.button(cell, SCENE_NAMES.verdictFCCButton, 11.6, "Face-centred\ncubic")
      b.button.onTriggerUp.add(() => this._onVerdict.invoke("FCC"))
      this.verdictFCC = b.button.getSceneObject()
    })
    const fb = obj(slot, SCENE_NAMES.feedbackLine, new vec3(0, -half + FEEDBACK_H / 2, LAYOUT_Z_LIFT))
    this.feedbackText = makeText(fb, "", this.em("Caption"), 500, this.textColor, innerW, FEEDBACK_H, "center", true)
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
      const tick = obj(parent, `Mark_${s.name}`, new vec3(x, MARK_TICK_Y, LAYOUT_Z_LIFT))
      const tickText = makeText(tick, "|", this.em("Mark"), 500, this.withAlpha(this.textColor, 0.55), 1, 1.2, "center")
      tickText.horizontalOverflow = HorizontalOverflow.Overflow

      const label = `${s.name.split(" ")[0]} ${s.lambda.toFixed(2)}`
      const w = 6.0
      const cx = Math.min(half - w / 2, Math.max(-half + w / 2, x))
      const so = obj(parent, `MarkLabel_${i}`, new vec3(cx, MARK_ROW_Y[i % 2], LAYOUT_Z_LIFT))
      makeText(so, label, this.em("Caption"), 500, this.withAlpha(this.textColor, 0.8), w, 1.6, "center")
    })
  }

  private refreshLatticeLabels(): void {
    if (!this.scLabel || !this.fccLabel) return
    const fcc = this.lastLattice === "FCC"
    this.scLabel.textFill.color = fcc ? this.withAlpha(this.textColor, 0.45) : this.accentColor
    this.fccLabel.textFill.color = fcc ? this.accentColor : this.withAlpha(this.textColor, 0.45)
  }

  // ------------------------------------------------------------------ helpers

  /** A column cell (FlexItem) shown only in the modes `show` accepts. Returns the cell. */
  private cell(parent: SceneObject, h: number, show: (mode: Mode) => boolean, builder: (cell: SceneObject) => void, name = "Item"): SceneObject {
    const c = flexChild(parent, {w: this.panelWidthCm - PAD * 2, h}, builder, name)
    this.cells.push({item: c.item, so: c.so, show})
    return c.so
  }

  private button(parent: SceneObject, name: string, w: number, label: string) {
    return labeledButton(parent, name, w, BUTTON_H, label, this.em("Body"), TYPE_SCALE.Body.weight, this.textColor, this.playClickSounds)
  }

  private em(role: Role): number {
    return TYPE_SCALE[role].emCm * this.textScale
  }

  private addText(parent: SceneObject, name: string, value: string, role: Role, w: number, h: number, align: "left" | "center" | "right"): Text {
    const so = obj(parent, name)
    return makeText(so, value, this.em(role), TYPE_SCALE[role].weight, this.textColor, w, h, align)
  }

  private lambdaToValue(lambda: number): number {
    const v = (lambda - this.lambdaMin) / (this.lambdaMax - this.lambdaMin)
    return Math.min(1, Math.max(0, v))
  }

  private withAlpha(c: vec4, a: number): vec4 {
    return new vec4(c.x, c.y, c.z, a)
  }
}
