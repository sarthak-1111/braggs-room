/**
 * BraggMeshes.ts: turns BraggGeometry parts into RenderMeshes and attaches them.
 *
 * Two materials, both from one vertex-color material (vertexBaseColorMaterial,
 * SimpleVertexBaseColor.lspkg, an unlit shader that draws the vertex colors):
 *   - opaque parts (desk, goniometer, tube, beam stop, crystal) use it as is;
 *   - glow parts (wall grid, beam, pulse, spots, ghosts, rays, mystery cube) use an
 *     additive clone without depth writes, so black is transparent in the preview too,
 *     exactly as on the Specs display.
 *
 * Meshes are built once per part and shared, so pooled spots, ghosts and rays cost no
 * geometry at runtime. Nothing here computes physics.
 */
import {
  Geo,
  GHOST_BRIGHTNESS,
  beamStopGeometry,
  deskGeometry,
  goniometerGeometry,
  sampleTagCardGeometry,
  spotGeometry,
  unitBeamGeometry,
  unitPulseGeometry,
  unitRayGeometry,
  wallGridGeometry,
  xrayTubeGeometry,
} from "./BraggGeometry"

export type BraggPart =
  | "VirtualDesk"
  | "Goniometer"
  | "XRayTube"
  | "BeamStop"
  | "VirtualWall"
  | "Spot"
  | "GhostSpot"
  | "Ray"
  | "Beam"
  | "BeamPulse"
  | "SampleTagCard"

const BUILDERS: Record<BraggPart, () => Geo> = {
  VirtualDesk: deskGeometry,
  Goniometer: goniometerGeometry,
  XRayTube: xrayTubeGeometry,
  BeamStop: beamStopGeometry,
  VirtualWall: wallGridGeometry,
  Spot: () => spotGeometry(1),
  GhostSpot: () => spotGeometry(GHOST_BRIGHTNESS),
  Ray: unitRayGeometry,
  Beam: unitBeamGeometry,
  BeamPulse: unitPulseGeometry,
  SampleTagCard: () => sampleTagCardGeometry(),
}

/** Parts drawn with the additive glow material. */
const GLOW_PARTS: BraggPart[] = ["VirtualWall", "Spot", "GhostSpot", "Ray", "Beam", "BeamPulse", "SampleTagCard"]

export function isGlowPart(part: BraggPart): boolean {
  return GLOW_PARTS.indexOf(part) >= 0
}

export function isBraggPart(name: string): name is BraggPart {
  return Object.prototype.hasOwnProperty.call(BUILDERS, name)
}

const VERTEX_LAYOUT = [
  {name: "position", components: 3},
  {name: "normal", components: 3, normalized: true},
  {name: "color", components: 4},
]

/** Upload a Geo into a new RenderMesh (one MeshBuilder per mesh). */
export function geoToMesh(geo: Geo): RenderMesh {
  const builder = new MeshBuilder(VERTEX_LAYOUT)
  builder.topology = MeshTopology.Triangles
  builder.indexType = MeshIndexType.UInt16
  builder.appendVerticesInterleaved(geo.verts)
  builder.appendIndices(geo.indices)
  const mesh = builder.getMesh()
  builder.updateMesh()
  return mesh
}

const meshCache: {[part: string]: RenderMesh} = {}

/** Shared mesh for a part, built on first use. */
export function partMesh(part: BraggPart): RenderMesh {
  let mesh = meshCache[part]
  if (!mesh) {
    mesh = geoToMesh(BUILDERS[part]())
    meshCache[part] = mesh
  }
  return mesh
}

const glowCache: {base: Material; glow: Material}[] = []

/** Additive, no-depth-write clone of a vertex-color material (cached per base material). */
export function glowMaterial(base: Material): Material {
  for (const entry of glowCache) {
    if (entry.base === base || entry.base.isSame(base)) return entry.glow
  }
  const glow = base.clone()
  glow.mainPass.blendMode = BlendMode.Add
  glow.mainPass.depthWrite = false
  glowCache.push({base, glow})
  return glow
}

/** The right material for a part: the base for opaque parts, its glow clone for glow parts. */
export function materialFor(part: BraggPart, base: Material): Material {
  return isGlowPart(part) ? glowMaterial(base) : base
}

/**
 * Add a RenderMeshVisual showing `part` to a SceneObject (for pooled objects created by
 * script, e.g. Spot_0…Spot_11, ghosts and rays). Returns the visual so its mesh can be
 * swapped later, e.g. visual.mesh = partMesh("GhostSpot").
 */
export function attachPart(sceneObject: SceneObject, part: BraggPart, baseMaterial: Material): RenderMeshVisual {
  const visual = sceneObject.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
  visual.mesh = partMesh(part)
  if (baseMaterial) visual.mainMaterial = materialFor(part, baseMaterial)
  return visual
}

/**
 * Point a "Ray" object from `from` to `to` (both in its parent's local frame, cm):
 * the unit ray runs along local −z, so rotate −z onto the ray and scale z by its length.
 * Rays go toward the wall, so the rotation never meets the antiparallel case.
 */
export function placeRay(transform: Transform, from: vec3, to: vec3): void {
  const d = to.sub(from)
  const length = d.length
  transform.setLocalPosition(from)
  if (length < 1e-4) {
    transform.setLocalScale(new vec3(1, 1, 1e-4))
    return
  }
  transform.setLocalRotation(quat.rotationFromTo(vec3.back(), d.uniformScale(1 / length)))
  transform.setLocalScale(new vec3(1, 1, length))
}
