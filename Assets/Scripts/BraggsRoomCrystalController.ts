/**
 * BraggsRoomCrystalController: the pinch-drag target at the crystal centre C (put it on "Crystal").
 *
 * Owns:
 *   - a SIK Interactable plus a box collider (~14 cm, a big target) on this SceneObject,
 *     created at start. This object never rotates, so the target stays put;
 *   - turning each drag into room-frame centimetres: the per-event drag vector
 *     (planecastDragVector ?? dragVector) projected onto the room's right (+x) and up (+y);
 *   - drawing the orientation: CrystalVisual's local rotation from (φ, χ) with
 *     R = R_χ · R_φ, R_φ about +y by φ and R_χ about +x by −χ;
 *   - a small hover highlight (CrystalVisual grows slightly while aimed at).
 *
 * Inputs: References (CrystalVisual) and Settings (collider size, hover scale, debug).
 *
 * Talks to BraggsRoomMain through: onDrag (vec2: dx, dy in cm), setOrientation(φ, χ).
 *
 * Must not: compute physics, apply the drag gain or clamp χ (BraggSim does). The drag gain
 * lives on BraggsRoomMain.
 */
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {DragInteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"

const DEG = Math.PI / 180

@component
export class BraggsRoomCrystalController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomCrystalController – pinch-drag the crystal (φ / χ)</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("CrystalVisual: the child that rotates. This object (Crystal) never rotates.")
  crystalVisual: SceneObject
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Edge of the box collider around the crystal, cm (a big, easy target)")
  @widget(new SliderWidget(8, 30, 0.5))
  colliderSizeCm: number = 14

  @input
  @hint("CrystalVisual scale while the crystal is aimed at (hover highlight); 1 = off")
  @widget(new SliderWidget(1, 1.3, 0.01))
  hoverScale: number = 1.08
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Debug</span>')
  @ui.group_start("Debug")
  @input
  @hint("Draw the crystal's collider as a wireframe")
  debugColliders: boolean = false
  @ui.group_end

  private _onDrag = new Event<vec2>()
  private _onDragStart = new Event<void>()
  private _onDragEnd = new Event<void>()

  /** Per-event drag in cm along the room's right (+x) and up (+y). */
  get onDrag(): PublicApi<vec2> {
    return this._onDrag.publicApi()
  }
  get onDragStart(): PublicApi<void> {
    return this._onDragStart.publicApi()
  }
  get onDragEnd(): PublicApi<void> {
    return this._onDragEnd.publicApi()
  }

  private interactable: Interactable
  private collider: ColliderComponent
  private visualTransform: Transform

  onAwake(): void {
    if (!this.crystalVisual) {
      print("BraggsRoomCrystalController: crystalVisual is not wired")
    } else {
      this.visualTransform = this.crystalVisual.getTransform()
    }

    this.collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(this.colliderSizeCm, this.colliderSizeCm, this.colliderSizeCm)
    this.collider.shape = shape
    this.collider.fitVisual = false
    this.collider.debugDrawEnabled = this.debugColliders

    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
    this.interactable.targetingMode = 3 // direct pinch and ray (and the mouse in the preview)

    this.createEvent("OnStartEvent").bind(() => {
      this.interactable.onDragStart.add(() => this._onDragStart.invoke())
      this.interactable.onDragUpdate.add((e: DragInteractorEvent) => this.handleDrag(e))
      this.interactable.onDragEnd.add(() => this._onDragEnd.invoke())
      this.interactable.onHoverEnter.add(() => this.setHover(true))
      this.interactable.onHoverExit.add(() => this.setHover(false))
    })
  }

  /** Draw the goniometer orientation: rot = R_χ · R_φ (χ about −x, φ about +y), degrees. */
  setOrientation(phiDeg: number, chiDeg: number): void {
    if (!this.visualTransform) return
    const rot = quat.angleAxis(-chiDeg * DEG, vec3.right()).multiply(quat.angleAxis(phiDeg * DEG, vec3.up()))
    this.visualTransform.setLocalRotation(rot)
  }

  /** Toggle the collider wireframe at runtime. */
  setDebugColliders(on: boolean): void {
    this.debugColliders = on
    if (this.collider) this.collider.debugDrawEnabled = on
  }

  private handleDrag(e: DragInteractorEvent): void {
    const d = e.planecastDragVector ?? e.dragVector
    if (!d) return
    // This object has the room's orientation (identity local rotation under BraggsRoom),
    // so its world right/up are the room's +x / +y.
    const t = this.sceneObject.getTransform()
    const dx = d.dot(t.right)
    const dy = d.dot(t.up)
    if (dx === 0 && dy === 0) return
    this._onDrag.invoke(new vec2(dx, dy))
  }

  private setHover(on: boolean): void {
    if (!this.visualTransform) return
    const s = on ? this.hoverScale : 1
    this.visualTransform.setLocalScale(new vec3(s, s, s))
  }
}
