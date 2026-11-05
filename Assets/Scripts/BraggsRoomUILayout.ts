/**
 * BraggsRoomUILayout.ts: shared layout helpers for the desk-level UIKit panels (the console and
 * the predictor sub-panel). Plain functions, no component, no state.
 *
 * Owns: SceneObject creation, FlexLayout rows/columns, FlexItem cells (registered with addItems,
 * so children never stack at the origin), Text in a cm-sized rect, and a UIKit Button with a raw
 * Text label lifted off the button face.
 *
 * Text sizes are em-square heights in cm (Text.size = emCm · 43.886, StudioLib.d.ts). Desk-level
 * text must stay at least 1.2 cm (devpost/clad-handoff-1.md, display rules).
 *
 * Must not: decide what a panel shows or hold any state.
 */
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"

export const EM_CM_TO_SIZE = 43.886
export const LAYOUT_Z_LIFT = 0.02
/** A label drawn on a button face sits this far in front of it (its first glyph is never occluded). */
export const BUTTON_LABEL_Z = 0.08

export type Align = "left" | "center" | "right"

export function obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
  const sceneObject = global.scene.createSceneObject(name)
  sceneObject.setParent(parent)
  if (position) sceneObject.getTransform().setLocalPosition(position)
  return sceneObject
}

export function liftInZ(sceneObject: SceneObject, zOffset: number): void {
  const t = sceneObject.getTransform()
  const p = t.getLocalPosition()
  t.setLocalPosition(new vec3(p.x, p.y, p.z + zOffset))
}

/** A Text in a w × h cm rect, aligned within it. `wrap` lets it run onto several lines. */
export function makeText(
  so: SceneObject,
  value: string,
  emCm: number,
  weight: number,
  color: vec4,
  w: number,
  h: number,
  align: Align,
  wrap = false,
): Text {
  const t = so.createComponent("Component.Text") as Text
  t.text = value
  t.depthTest = true
  t.size = emCm * EM_CM_TO_SIZE
  ;(t as Text & {weight?: number}).weight = weight
  t.textFill.color = color
  t.horizontalAlignment =
    align === "left" ? HorizontalAlignment.Left : align === "right" ? HorizontalAlignment.Right : HorizontalAlignment.Center
  t.verticalAlignment = VerticalAlignment.Center
  t.horizontalOverflow = wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Shrink
  t.verticalOverflow = wrap ? VerticalOverflow.Shrink : VerticalOverflow.Overflow
  t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
  return t
}

export function flexLayout(
  container: SceneObject,
  width: number,
  height: number,
  direction: FlexDirection,
  opts?: {gap?: number; justify?: FlexJustify; align?: FlexAlign},
): FlexLayout {
  const layout = container.createComponent(FlexLayout.getTypeName()) as FlexLayout
  layout.autoDiscoverItemsOnStart = false // children are registered with addItems (flexChild)
  layout.onInitialized.add(() => {
    layout.width = width
    layout.height = height
    layout.direction = direction
    if (direction === FlexDirection.Row) layout.columnGap = opts?.gap ?? 0
    else layout.rowGap = opts?.gap ?? 0
    layout.justifyContent = opts?.justify ?? FlexJustify.Start
    layout.alignItems = opts?.align ?? FlexAlign.Center
  })
  return layout
}

/** A row container (its own FlexLayout) inside a flex cell. */
export function flexRow(
  parent: SceneObject,
  width: number,
  height: number,
  opts?: {gap?: number; justify?: FlexJustify; align?: FlexAlign},
  name = "Row",
): SceneObject {
  const container = obj(parent, name)
  liftInZ(container, LAYOUT_Z_LIFT)
  flexLayout(container, width, height, FlexDirection.Row, opts)
  return container
}

/** A fixed-size cell registered with its parent's FlexLayout. The builder fills the cell. */
export function flexChild(
  parent: SceneObject,
  size: {w?: number; h?: number; grow?: number},
  builder?: (child: SceneObject) => void,
  name = "Item",
): {so: SceneObject; item: FlexItem} {
  const child = obj(parent, name)
  liftInZ(child, LAYOUT_Z_LIFT)
  const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
  if (size.w !== undefined && size.w > 0) item.overrideWidth = size.w
  if (size.h !== undefined && size.h > 0) item.overrideHeight = size.h
  item.flexGrow = size.grow ?? 0
  item.flexShrink = 0
  if (builder) builder(child)
  const parentLayout = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
  if (parentLayout) parentLayout.addItems([item])
  return {so: child, item}
}

/**
 * A UIKit Button named `name` (size set before init) with a raw Text label on a child lifted
 * off the face. Returns the button and its label so the caller can relabel it.
 */
export function labeledButton(
  parent: SceneObject,
  name: string,
  w: number,
  h: number,
  label: string,
  emCm: number,
  weight: number,
  color: vec4,
  playAudio: boolean,
): {button: Button; label: Text} {
  const so = obj(parent, name)
  const button = so.createComponent(Button.getTypeName()) as Button
  button.size = new vec3(w, h, 1) // BEFORE init
  button.playAudio = playAudio
  const labelSo = obj(so, "ButtonLabel", new vec3(0, 0, BUTTON_LABEL_Z))
  const text = makeText(labelSo, label, emCm, weight, color, w - 0.6, h, "center")
  return {button, label: text}
}
