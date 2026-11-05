/**
 * BraggsRoomPredictorUI: the predictor sub-panel just above the console (UIKit only).
 *
 * Owns (a passive view): a small BackPlate with the current prediction "(h k l)" and a row of
 * three big steppers, one each for h, k and l: a "−" button (HMinus/KMinus/LMinus), the value,
 * and a "+" button (HPlus/KPlus/LPlus), each value in −4 … 4. It holds only the user's current
 * selection (input state, like a slider position); whether it is unfolded is decided by Main.
 *
 * Inputs: presentation settings only. Authored on "PredictorPanel", a child of "Console" placed
 * just above the console's top edge and sharing its tilt. It has no Canvas of its own: it lives
 * under the Console's Canvas, which sorts it with the rest of the console.
 *
 * Talks to BraggsRoomMain through:
 *   Main → UI : setOpen(open), setSelection(h, k, l), getSelection()
 *   UI → Main : onSelectionChange({h, k, l}) when a stepper is pressed
 *
 * Must not: talk to the sim or decide what the prediction shows (the sim's ring does).
 */
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {ContentVerticalAlignment} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/LayoutTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Miller} from "./BraggPhysics"
import {fmtMiller} from "./BraggText"
import {PREDICTOR_MAX, PREDICTOR_MIN, PREDICTOR_START, SCENE_NAMES} from "./BraggsRoomSceneContracts"
import {flexChild, flexLayout, flexRow, labeledButton, makeText, obj} from "./BraggsRoomUILayout"

type Axis = "h" | "k" | "l"
const AXES: {axis: Axis; minus: string; plus: string}[] = [
  {axis: "h", minus: SCENE_NAMES.hMinus, plus: SCENE_NAMES.hPlus},
  {axis: "k", minus: SCENE_NAMES.kMinus, plus: SCENE_NAMES.kPlus},
  {axis: "l", minus: SCENE_NAMES.lMinus, plus: SCENE_NAMES.lPlus},
]

const PAD = 1.0
const GAP = 0.6
const TITLE_H = 2.4
const STEP_H = 4.4

@component
export class BraggsRoomPredictorUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomPredictorUI – (hkl) steppers above the console</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm (match the console)")
  @widget(new SliderWidget(32, 48, 0.5))
  panelWidthCm: number = 36

  @input
  @hint("Width of each − / + button, cm (targets must stay at least 4 cm across)")
  @widget(new SliderWidget(4, 6, 0.1))
  stepButtonWidthCm: number = 4.2

  @input("vec4", "{0.94,0.96,1,1}")
  @hint("Text colour. Keep it light: the Specs display is additive.")
  @widget(new ColorWidget())
  textColor: vec4

  @input("vec4", "{0.78,0.66,1,1}")
  @hint("Colour of the (h k l) readout; matches the violet prediction ring on the wall.")
  @widget(new ColorWidget())
  accentColor: vec4

  @input
  @hint("Play UIKit's built-in click sounds on the stepper buttons.")
  playClickSounds: boolean = true
  @ui.group_end

  private _onSelectionChange = new Event<Miller>()

  /** The user pressed a stepper; carries the new (h, k, l). */
  get onSelectionChange(): PublicApi<Miller> {
    return this._onSelectionChange.publicApi()
  }

  private body: SceneObject
  private titleText: Text
  private valueTexts: Partial<Record<Axis, Text>> = {}
  private sel: Miller = {...PREDICTOR_START}
  private open = false
  private started = false

  onAwake(): void {
    const innerW = this.panelWidthCm - PAD * 2
    const height = PAD * 2 + TITLE_H + GAP + STEP_H
    this.body = obj(this.sceneObject, "PredictorBody")
    const plate = this.body.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(this.panelWidthCm, height)

    const content = obj(this.body, "Content", new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = this.panelWidthCm
    flex.height = height
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    flex.verticalAlignment = ContentVerticalAlignment.Center
    flex.rowGap = GAP
    flex.paddingTop = PAD
    flex.paddingBottom = PAD
    flex.paddingLeft = PAD
    flex.paddingRight = PAD

    flexChild(content, {w: innerW, h: TITLE_H}, (cell) => {
      const so = obj(cell, "PredictionTitle")
      this.titleText = makeText(so, "", 1.7, 700, this.accentColor, innerW, TITLE_H, "center")
    })

    flexChild(content, {w: innerW, h: STEP_H}, (cell) => {
      const groupW = (innerW - 2 * 0.8) / 3
      const row = flexRow(cell, innerW, STEP_H, {justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
      for (const a of AXES) {
        flexChild(row, {w: groupW, h: STEP_H}, (group) => this.buildStepper(group, a, groupW))
      }
    })

    this.refresh()
    // Hide only after the first frame, so the buttons initialise while enabled.
    this.createEvent("UpdateEvent").bind(() => {
      if (this.started) return
      this.started = true
      this.body.enabled = this.open
    })
  }

  // ------------------------------------------------------------------ public API (Main → UI)

  /** Unfold (show) or fold (hide) the sub-panel. */
  setOpen(open: boolean): void {
    this.open = open
    if (this.started && this.body) this.body.enabled = open
  }

  isOpen(): boolean {
    return this.open
  }

  /** Show this selection without emitting onSelectionChange (mission start, tests). */
  setSelection(h: number, k: number, l: number): void {
    this.sel = {h: this.clamp(h), k: this.clamp(k), l: this.clamp(l)}
    this.refresh()
  }

  getSelection(): Miller {
    return {...this.sel}
  }

  // ------------------------------------------------------------------ builders

  private buildStepper(parent: SceneObject, a: {axis: Axis; minus: string; plus: string}, groupW: number): void {
    const bw = this.stepButtonWidthCm
    const vw = Math.max(2.4, groupW - 2 * bw - 0.2)
    const row = flexRow(parent, groupW, STEP_H, {justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    flexChild(row, {w: bw, h: STEP_H}, (cell) => {
      const b = labeledButton(cell, a.minus, bw, STEP_H, "−", 2.2, 700, this.textColor, this.playClickSounds)
      b.button.onTriggerUp.add(() => this.step(a.axis, -1))
    })
    flexChild(row, {w: vw, h: STEP_H}, (cell) => {
      // The axis letter over its value, stacked by a column layout.
      const col = obj(cell, "Column")
      flexLayout(col, vw, STEP_H, FlexDirection.Column, {justify: FlexJustify.Center, align: FlexAlign.Center, gap: 0.1})
      flexChild(col, {w: vw, h: 1.4}, (c) => {
        const faint = new vec4(this.textColor.x, this.textColor.y, this.textColor.z, 0.6)
        makeText(obj(c, `${a.axis.toUpperCase()}Caption`), a.axis, 1.25, 500, faint, vw, 1.4, "center")
      })
      flexChild(col, {w: vw, h: 2.2}, (c) => {
        this.valueTexts[a.axis] = makeText(obj(c, `${a.axis.toUpperCase()}Value`), "1", 1.9, 700, this.textColor, vw, 2.2, "center")
      })
    })
    flexChild(row, {w: bw, h: STEP_H}, (cell) => {
      const b = labeledButton(cell, a.plus, bw, STEP_H, "+", 2.2, 700, this.textColor, this.playClickSounds)
      b.button.onTriggerUp.add(() => this.step(a.axis, 1))
    })
  }

  private step(axis: Axis, delta: number): void {
    const next = this.clamp(this.sel[axis] + delta)
    if (next === this.sel[axis]) return
    this.sel = {...this.sel, [axis]: next}
    this.refresh()
    this._onSelectionChange.invoke({...this.sel})
  }

  private refresh(): void {
    if (this.titleText) this.titleText.text = `Prediction ${fmtMiller(this.sel)}`
    for (const a of AXES) {
      const t = this.valueTexts[a.axis]
      const v = this.sel[a.axis]
      if (t) t.text = v < 0 ? `−${-v}` : String(v)
    }
  }

  private clamp(v: number): number {
    return Math.max(PREDICTOR_MIN, Math.min(PREDICTOR_MAX, Math.round(v)))
  }
}
