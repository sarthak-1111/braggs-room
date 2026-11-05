/**
 * BraggsRoomSceneContracts.ts: stable names and pool sizes the scene, the scripts and the
 * LEAF tests agree on (devpost/clad-handoff-1.md, "Names and test hooks").
 *
 * Owns: constants only. No Lens globals, no state.
 * Must not: compute physics or layout. Positions live on the authored SceneObjects
 * (BraggsRoom children) and in BraggGeometry.BRAGG_LAYOUT.
 *
 * Authored hierarchy (all under BraggsRoom, the lab frame: +x right, +y up, +z toward the user):
 *   VirtualDesk (preview stand-in), Goniometer, Crystal > CrystalVisual, XRayTube, Beam,
 *   BeamStop, VirtualWall (preview stand-in), SpotPool, WallLabels, EvidenceBoard, Console,
 *   GoniometerLabels > PhiReadout, ChiReadout, AtomsNotToScale
 * Runtime-built (pooled, never created per frame):
 *   SpotPool > Spot_0 … Spot_11 > SpotLabel, SpotAudio, SpotRay
 *   SpotPool > Ghost_0 … Ghost_15 > GhostLabel
 *   Console > … > WavelengthSlider, ResetButton, LatticeToggle, Stage2Slot
 */

export const SCENE_NAMES = {
  root: "BraggsRoom",
  crystal: "Crystal",
  crystalVisual: "CrystalVisual",
  beamStop: "BeamStop",
  phiReadout: "PhiReadout",
  chiReadout: "ChiReadout",
  evidenceBoard: "EvidenceBoard",
  wavelengthSlider: "WavelengthSlider",
  resetButton: "ResetButton",
  latticeToggle: "LatticeToggle",
  stage2Slot: "Stage2Slot",
  spotPool: "SpotPool",
  spotPrefix: "Spot_",
  spotLabel: "SpotLabel",
  spotAudio: "SpotAudio",
  spotRay: "SpotRay",
  ghostPrefix: "Ghost_",
  ghostLabel: "GhostLabel",
  offWallHint: "OffWallHint",
}

/** Spot_0 … Spot_11 (handoff contract). */
export const SPOT_POOL_SIZE = 12

/** Found ghosts drawn at once. */
export const GHOST_POOL_SIZE = 16

/** A spot at wall offset (x, y) is drawn at B + (x, y, SPOT_WALL_OFFSET_CM) (handoff contract). */
export const SPOT_WALL_OFFSET_CM = 0.6

/** Ghosts sit a hair behind the spot plane so a lit spot always draws over its own ghost. */
export const GHOST_WALL_OFFSET_CM = 0.5
