/**
 * BraggsRoomEvidenceBoardUI: the evidence board on the wall beside the beam stop (UIKit only).
 *
 * Owns (a passive view): a fixed-size BackPlate (60 × 40 cm by default) with a column of
 * text: the board title, the mission's question (a row that collapses to nothing when there is no
 * question: free mode, or once solved), a status line and up to 8 evidence lines, exactly as
 * frame.board (BraggSim.BoardView) describes them. Rows shrink their text to the board's width
 * rather than clip. The highlighted line (the evidence a wrong
 * verdict points at, frame.board.highlightIndex) gets a "» " prefix and the highlight colour.
 *
 * Inputs: presentation settings only. Authored on the "EvidenceBoard" SceneObject, placed
 * 2 cm in front of the wall so spots never draw over it.
 *
 * Talks to BraggsRoomMain through setBoard(title, question, status, lines, highlightIndex).
 *
 * Must not: hold or interpret evidence. The sim writes every string.
 */
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {ContentVerticalAlignment} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/LayoutTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"

// Text.size is the em-square height: em cm = size / 43.886. The board is read from
// about 2.1 m, so its scale is set in cm for that distance (not the 110 cm Specs scale).
const EM_CM_TO_SIZE = 43.886
type Role = "Title" | "Question" | "Status" | "Line"
const TYPE_SCALE: Record<Role, {emCm: number; weight: number}> = {
  Title: {emCm: 3.2, weight: 700},
  Question: {emCm: 2.4, weight: 600},
  Status: {emCm: 2.4, weight: 500},
  Line: {emCm: 2.6, weight: 500},
}
// Height budget (40 cm plate, 2 cm padding each side = 36 cm): title 4.0 + question 3.0 + status 3.0
// + 8 lines × 3.0 + 10 gaps × 0.1 = 35.0 cm, so a full mission board with its question stays on the plate.
// The question's two-line long form (6.0) only shows with at most 4 evidence lines (26.0 cm).
const ROW_H: Record<Role, number> = {Title: 4.0, Question: 3.0, Status: 3.0, Line: 3.0}
const ROW_GAP = 0.1
const MAX_LINES = 8
const LAYOUT_Z_LIFT = 0.02

@component
export class BraggsRoomEvidenceBoardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomEvidenceBoardUI – found reflections / mission evidence on the wall</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Board width in cm")
  @widget(new SliderWidget(40, 100, 1))
  boardWidthCm: number = 60

  @input
  @hint("Board height in cm")
  @widget(new SliderWidget(30, 80, 1))
  boardHeightCm: number = 40

  @input
  @hint("Multiplies every text size on the board")
  @widget(new SliderWidget(0.8, 1.6, 0.05))
  textScale: number = 1.0

  @input("vec4", "{0.95,0.96,1,1}")
  @hint("Text colour. Keep it light: the Specs display is additive.")
  @widget(new ColorWidget())
  textColor: vec4

  @input("vec4", "{1,0.8,0.45,1}")
  @hint("Colour of the line a wrong verdict points at (warm amber)")
  @widget(new ColorWidget())
  highlightColor: vec4
  @ui.group_end

  private titleText: Text
  private questionText: Text
  private questionItem: FlexItem
  private statusText: Text
  private lineTexts: Text[] = []
  private lastKey = ""

  onAwake(): void {
    const pad = 2.0
    const innerW = this.boardWidthCm - pad * 2

    this.sceneObject.createComponent("Component.Canvas")
    const backPlate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    backPlate.size = new vec2(this.boardWidthCm, this.boardHeightCm)

    const content = this.obj(this.sceneObject, "Content", new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false // rows are registered with addItems
    flex.width = this.boardWidthCm
    flex.height = this.boardHeightCm
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    // Center: the fixed 40 cm column is centred on the plate (Top would hang it from the plate's
    // centre, so long boards ran below the plate into the banner); rows start at its top.
    flex.verticalAlignment = ContentVerticalAlignment.Center
    flex.rowGap = ROW_GAP
    flex.paddingTop = pad
    flex.paddingBottom = pad
    flex.paddingLeft = pad
    flex.paddingRight = pad

    this.titleText = this.addRow(content, "EvidenceTitle", "Found reflections", "Title", innerW)
    this.questionText = this.addRow(content, "EvidenceQuestion", "", "Question", innerW)
    this.questionItem = this.questionText.getSceneObject().getComponent(FlexItem.getTypeName()) as FlexItem
    this.questionItem.overrideHeight = 0 // collapsed until a mission asks its question
    this.statusText = this.addRow(content, "EvidenceStatus", "None yet. Turn the crystal.", "Status", innerW)
    this.statusText.textFill.color = new vec4(this.textColor.x, this.textColor.y, this.textColor.z, 0.7)
    for (let i = 0; i < MAX_LINES; i++) {
      this.lineTexts.push(this.addRow(content, `EvidenceLine_${i}`, "", "Line", innerW))
    }
  }

  /** Show frame.board. Cheap to call every frame: it only touches Text when something changed. */
  setBoard(title: string, question: string, status: string, lines: string[], highlightIndex: number): void {
    const key = `${title}\u0001${question}\u0001${status}\u0001${lines.join("\u0002")}\u0001${highlightIndex}`
    if (key === this.lastKey || !this.titleText) return
    this.lastKey = key
    this.titleText.text = title
    // One sentence per line, so the long form ("…cubic? Find 3 distinct reflections.") stays at full
    // size. It only shows before three distinct reflections are logged, when the board has at most
    // 4 evidence lines, so its second line still fits the plate.
    const q = question.split("? ").join("?\n")
    this.questionText.text = q
    this.questionItem.overrideHeight = q ? q.split("\n").length * ROW_H.Question : 0
    this.statusText.text = status
    for (let i = 0; i < this.lineTexts.length; i++) {
      const t = this.lineTexts[i]
      const hi = i === highlightIndex && i < lines.length
      t.text = i < lines.length ? (hi ? `» ${lines[i]}` : lines[i]) : ""
      t.textFill.color = hi ? this.highlightColor : this.textColor
    }
  }

  // ------------------------------------------------------------------ helpers

  private addRow(parent: SceneObject, name: string, value: string, role: Role, w: number): Text {
    const h = ROW_H[role]
    const so = this.obj(parent, name)
    so.getTransform().setLocalPosition(new vec3(0, 0, LAYOUT_Z_LIFT))
    const t = so.createComponent("Component.Text") as Text
    t.text = value
    t.depthTest = true
    t.size = TYPE_SCALE[role].emCm * EM_CM_TO_SIZE * this.textScale
    ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
    t.textFill.color = this.textColor
    t.horizontalAlignment = HorizontalAlignment.Left
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Shrink
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = w
    item.overrideHeight = h
    item.flexShrink = 0
    const layout = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (layout) layout.addItems([item])
    return t
  }

  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const sceneObject = global.scene.createSceneObject(name)
    sceneObject.setParent(parent)
    if (position) sceneObject.getTransform().setLocalPosition(position)
    return sceneObject
  }
}
