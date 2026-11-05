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
 * Stage 2 (authored): SampleTag, GuideArrow > GuideArrowPhi, GuideArrowChi, PredictionRing,
 *   EdgeChevron, MissionAudio, Console > PredictorPanel
 * Runtime-built (pooled, never created per frame):
 *   SpotPool > Spot_0 … Spot_11 > SpotDisc, SpotLabel, SpotAudio, SpotRay
 *   SpotPool > Ghost_0 … Ghost_15 > GhostDisc, GhostLabel
 *   Console > … > WavelengthSlider, ResetButton, ModeButton, LatticeToggle, PredictButton,
 *                 VerdictSCButton, VerdictFCCButton, FeedbackLine, Stage2Slot
 *   PredictorPanel > … > HMinus, HPlus, KMinus, KPlus, LMinus, LPlus
 *   WallLabels > OffWallHint, RingLabel, Banner, IntroText
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
  // stage 2
  spotDisc: "SpotDisc",
  ghostDisc: "GhostDisc",
  modeButton: "ModeButton",
  predictButton: "PredictButton",
  verdictSCButton: "VerdictSCButton",
  verdictFCCButton: "VerdictFCCButton",
  feedbackLine: "FeedbackLine",
  predictorPanel: "PredictorPanel",
  hMinus: "HMinus",
  hPlus: "HPlus",
  kMinus: "KMinus",
  kPlus: "KPlus",
  lMinus: "LMinus",
  lPlus: "LPlus",
  ringLabel: "RingLabel",
  banner: "Banner",
  introText: "IntroText",
  sampleTag: "SampleTag",
  guideArrow: "GuideArrow",
  guideArrowPhi: "GuideArrowPhi",
  guideArrowChi: "GuideArrowChi",
  predictionRing: "PredictionRing",
  edgeChevron: "EdgeChevron",
}

/** Predictor stepper range and start (devpost/clad-handoff-2.md §1). */
export const PREDICTOR_MIN = -4
export const PREDICTOR_MAX = 4
export const PREDICTOR_START = {h: 1, k: 1, l: 1}

/** Spot_0 … Spot_11 (handoff contract). */
export const SPOT_POOL_SIZE = 12

/** Found ghosts drawn at once. */
export const GHOST_POOL_SIZE = 16

/** A spot at wall offset (x, y) is drawn at B + (x, y, SPOT_WALL_OFFSET_CM) (handoff contract). */
export const SPOT_WALL_OFFSET_CM = 0.6

/** Ghosts sit a hair behind the spot plane so a lit spot always draws over its own ghost. */
export const GHOST_WALL_OFFSET_CM = 0.5
