/**
 * CrystalCellMesh: the conventional unit cell drawn on the goniometer (put it on CrystalVisual).
 *
 * Builds four child SceneObjects under this one and toggles them by lattice:
 *   SC      -> CornerAtoms + CellEdges
 *   FCC     -> CornerAtoms + FaceAtoms + CellEdges
 *   null    -> MysteryCube (frosted, for an unsolved mission round)
 * Call setLattice(frame.drawnLattice) when it changes. The children rotate with this
 * object; the cell axes at φ = χ = 0 are [100] -> local −z, [010] -> local −x,
 * [001] -> local +y (BraggPhysics.CRYSTAL_AXES_AT_ZERO).
 */
import {
  cellCornerAtomsGeometry,
  cellEdgesGeometry,
  cellFaceAtomsGeometry,
  mysteryCubeGeometry,
} from "./BraggGeometry"
import {geoToMesh, glowMaterial} from "./BraggMeshes"

export type DrawnLattice = "SC" | "FCC" | null

@component
export class CrystalCellMesh extends BaseScriptComponent {
  @input
  @hint("vertexBaseColorMaterial (SimpleVertexBaseColor.lspkg). The mystery cube uses an additive clone of it.")
  material: Material

  @input
  @hint("Edge of the drawn cell, cm (enlarged: atoms not to scale)")
  cellSizeCm: number = 8

  @input
  @hint("Atom sphere diameter, cm")
  atomDiameterCm: number = 1.4

  @input("string", "SC")
  @widget(new ComboBoxWidget([new ComboBoxItem("Simple cubic", "SC"), new ComboBoxItem("FCC", "FCC"), new ComboBoxItem("Mystery", "Mystery")]))
  @hint("Lattice shown before the main script calls setLattice")
  startLattice: string = "SC"

  private cornerAtoms: SceneObject
  private faceAtoms: SceneObject
  private cellEdges: SceneObject
  private mysteryCube: SceneObject
  private lattice: DrawnLattice = "SC"

  onAwake(): void {
    if (!this.material) print("CrystalCellMesh: no material on " + this.sceneObject.name)
    const glow = this.material ? glowMaterial(this.material) : null
    this.cornerAtoms = this.makeChild("CornerAtoms", geoToMesh(cellCornerAtomsGeometry(this.cellSizeCm, this.atomDiameterCm)), this.material)
    this.faceAtoms = this.makeChild("FaceAtoms", geoToMesh(cellFaceAtomsGeometry(this.cellSizeCm, this.atomDiameterCm)), this.material)
    this.cellEdges = this.makeChild("CellEdges", geoToMesh(cellEdgesGeometry(this.cellSizeCm)), this.material)
    this.mysteryCube = this.makeChild("MysteryCube", geoToMesh(mysteryCubeGeometry(this.cellSizeCm)), glow)
    this.setLattice(this.startLattice === "Mystery" ? null : (this.startLattice as DrawnLattice))
  }

  /** Show the SC cell, the FCC cell, or (null) the frosted mystery cube. */
  setLattice(lattice: DrawnLattice): void {
    this.lattice = lattice
    if (!this.cornerAtoms) return
    const known = lattice !== null
    this.cornerAtoms.enabled = known
    this.cellEdges.enabled = known
    this.faceAtoms.enabled = lattice === "FCC"
    this.mysteryCube.enabled = !known
  }

  getLattice(): DrawnLattice {
    return this.lattice
  }

  private makeChild(name: string, mesh: RenderMesh, material: Material | null): SceneObject {
    const child = global.scene.createSceneObject(name)
    child.setParent(this.sceneObject)
    const visual = child.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh = mesh
    if (material) visual.mainMaterial = material
    return child
  }
}
