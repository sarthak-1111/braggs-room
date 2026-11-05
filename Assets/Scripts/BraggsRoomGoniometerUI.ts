/**
 * BraggsRoomGoniometerUI: the small labels on the goniometer base (a passive view).
 *
 * Owns: the φ and χ readouts ("φ 11.1°", "χ 0.0°") on the authored PhiReadout and
 * ChiReadout SceneObjects, and the "atoms not to scale" note on AtomsNotToScale. The
 * parent "GoniometerLabels" SceneObject sits at the front of the goniometer base, tilted
 * to face the user; move or tilt it there.
 *
 * Inputs: References (the three authored label SceneObjects) and presentation settings.
 *
 * Talks to BraggsRoomMain through setReadouts(phi, chi) (frame.readoutPhi / readoutChi).
 *
 * Must not: format angles (BraggText does) or read the sim.
 */
import {TEXT} from "./BraggText"

const EM_CM_TO_SIZE = 43.886

@component
export class BraggsRoomGoniometerUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomGoniometerUI – φ / χ readouts and "atoms not to scale"</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("PhiReadout: shows φ (spin about the vertical axis)")
  phiReadout: SceneObject

  @input
  @hint("ChiReadout: shows χ (tilt about the horizontal axis across the beam)")
  chiReadout: SceneObject

  @input
  @hint("AtomsNotToScale: the note that the drawn cell is enlarged")
  scaleNote: SceneObject
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Readout line height, cm (desk-level text must be at least 1.2 cm)")
  @widget(new SliderWidget(1.2, 3, 0.05))
  readoutHeightCm: number = 1.7

  @input
  @hint("'atoms not to scale' line height, cm (at least 1.2)")
  @widget(new SliderWidget(1.2, 3, 0.05))
  noteHeightCm: number = 1.3

  @input("vec4", "{0.94,0.97,1,1}")
  @hint("Text colour. Keep it light: the display is additive.")
  @widget(new ColorWidget())
  textColor: vec4
  @ui.group_end

  private phiText: Text
  private chiText: Text

  onAwake(): void {
    if (!this.phiReadout || !this.chiReadout || !this.scaleNote) {
      print("BraggsRoomGoniometerUI: phiReadout, chiReadout and scaleNote must be wired")
      return
    }
    this.phiText = this.makeText(this.phiReadout, "φ 0.0°", this.readoutHeightCm, this.textColor, 700)
    this.chiText = this.makeText(this.chiReadout, "χ 0.0°", this.readoutHeightCm, this.textColor, 700)
    const faint = new vec4(this.textColor.x, this.textColor.y, this.textColor.z, 0.7)
    this.makeText(this.scaleNote, TEXT.atomsNotToScale, this.noteHeightCm, faint, 500)
  }

  /** frame.readoutPhi, frame.readoutChi. Only touches Text when the string changed. */
  setReadouts(phi: string, chi: string): void {
    if (this.phiText && this.phiText.text !== phi) this.phiText.text = phi
    if (this.chiText && this.chiText.text !== chi) this.chiText.text = chi
  }

  private makeText(so: SceneObject, value: string, lineHeightCm: number, color: vec4, weight: number): Text {
    const t = so.createComponent("Component.Text") as Text
    t.text = value
    t.depthTest = true
    t.size = lineHeightCm * EM_CM_TO_SIZE
    ;(t as Text & {weight?: number}).weight = weight
    t.textFill.color = color
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-6, 6, -lineHeightCm, lineHeightCm)
    return t
  }
}
