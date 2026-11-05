/**
 * BraggsRoomSpotPool: draws the sim's lit spots, found ghosts and rays, and plays the spot
 * chimes as spatial audio from the spot's position (put it on "SpotPool", placed at the
 * beam stop B so a spot at wall offset (x, y) is simply local (x, y, 0.6)).
 *
 * Owns (pooled, built once in onAwake, never per frame):
 *   SpotPool > Spot_0 … Spot_11   disc + halo (glow)
 *                 > SpotLabel     label holder (Text added by BraggsRoomWallLabelsUI)
 *                 > SpotAudio     spatial AudioComponent for the chime
 *                 > SpotRay       faint ray from the crystal centre to the spot
 *   SpotPool > Ghost_0 … Ghost_15 25 % disc
 *                 > GhostLabel    label holder (Text added by BraggsRoomWallLabelsUI)
 * A slot keeps its spot while that reflection stays lit, so labels and chimes don't jump.
 * Spot_i itself always stays enabled, so a chime that started is never cut off when its
 * spot goes dark; the slot's disc, label and ray show and hide instead (isSlotLit(i)).
 *
 * Inputs: References (vertex-colour material, the two chime tracks) and Settings.
 *
 * Talks to BraggsRoomMain through: render(lit, ghosts, crystalWorldPos), slotForKey(key),
 * playChimeForSpot(spot, firstTime), getSpotLabelHolders(), getGhostLabelHolders().
 *
 * Must not: compute physics or decide which spots are lit; it draws SimFrame data.
 */
import {GhostView, SpotView} from "./BraggSim"
import {attachPart, placeRay} from "./BraggMeshes"
import {GHOST_POOL_SIZE, GHOST_WALL_OFFSET_CM, SCENE_NAMES, SPOT_POOL_SIZE, SPOT_WALL_OFFSET_CM} from "./BraggsRoomSceneContracts"

interface SpotSlot {
  root: SceneObject
  transform: Transform
  disc: RenderMeshVisual
  label: SceneObject
  ray: SceneObject
  audio: AudioComponent
  key: string | null
}

interface GhostSlot {
  root: SceneObject
  transform: Transform
  label: SceneObject
}

@component
export class BraggsRoomSpotPool extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomSpotPool – lit spots, ghosts, rays and spatial chimes</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("vertexBaseColorMaterial (Assets/SimpleVertexBaseColor.lspkg). Spots, ghosts and rays use an additive clone.")
  material: Material

  @input
  @hint("Chime for the first sighting of a reflection (bright)")
  chimeFirst: AudioTrackAsset

  @input
  @hint("Chime for a repeat sighting (softer)")
  chimeRepeat: AudioTrackAsset
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Volume of the first-sighting chime")
  @widget(new SliderWidget(0, 1, 0.05))
  firstChimeVolume: number = 1.0

  @input
  @hint("Volume of the repeat-sighting chime")
  @widget(new SliderWidget(0, 1, 0.05))
  repeatChimeVolume: number = 0.5

  @input
  @hint("Distance from a spot's centre to its label (the label sits above-right of the spot), cm")
  @widget(new SliderWidget(2, 12, 0.5))
  labelGapCm: number = 4.5

  @input
  @hint("Draw a faint ray from the crystal to each lit spot")
  showRays: boolean = true
  @ui.group_end

  private spots: SpotSlot[] = []
  private ghosts: GhostSlot[] = []

  onAwake(): void {
    if (!this.material) print("BraggsRoomSpotPool: material is not wired; spots will not draw")
    for (let i = 0; i < SPOT_POOL_SIZE; i++) this.spots.push(this.makeSpot(i))
    for (let i = 0; i < GHOST_POOL_SIZE; i++) this.ghosts.push(this.makeGhost(i))
  }

  // ------------------------------------------------------------------ public API

  getSpotLabelHolders(): SceneObject[] {
    return this.spots.map((s) => s.label)
  }

  getGhostLabelHolders(): SceneObject[] {
    return this.ghosts.map((g) => g.label)
  }

  /** True while slot i shows a lit spot. */
  isSlotLit(index: number): boolean {
    const s = this.spots[index]
    return !!s && s.key !== null
  }

  /** Slot showing reflection `key` ("h,k,l"), or −1. */
  slotForKey(key: string): number {
    for (let i = 0; i < this.spots.length; i++) if (this.spots[i].key === key) return i
    return -1
  }

  /**
   * Draw this frame's lit spots and found ghosts. Returns, per slot, the SpotView it shows
   * (or null), so the caller can push label strings to the wall labels.
   */
  render(lit: SpotView[], ghosts: GhostView[], crystalWorldPos: vec3): {spots: (SpotView | null)[]; ghosts: (GhostView | null)[]} {
    // 1. Keep slots for reflections that are still lit; free the rest.
    const wanted = new Map<string, SpotView>()
    for (const s of lit.slice(0, this.spots.length)) wanted.set(s.key, s)
    for (const slot of this.spots) if (slot.key !== null && !wanted.has(slot.key)) slot.key = null
    // 2. Give new reflections free slots.
    for (const s of wanted.values()) {
      if (this.slotForKey(s.key) >= 0) continue
      const free = this.spots.find((slot) => slot.key === null)
      if (free) free.key = s.key
    }
    // 3. Place and show.
    const crystalLocal = this.getTransform().getInvertedWorldTransform().multiplyPoint(crystalWorldPos)
    const spotOut: (SpotView | null)[] = []
    for (const slot of this.spots) {
      const view = slot.key !== null ? (wanted.get(slot.key) as SpotView) : null
      spotOut.push(view)
      const on = view !== null
      if (slot.disc.enabled !== on) slot.disc.enabled = on
      if (slot.label.enabled !== on) slot.label.enabled = on
      const rayOn = on && this.showRays
      if (slot.ray.enabled !== rayOn) slot.ray.enabled = rayOn
      if (!view) continue
      const p = new vec3(view.wall.x, view.wall.y, SPOT_WALL_OFFSET_CM)
      slot.transform.setLocalPosition(p)
      if (rayOn) placeRay(slot.ray.getTransform(), crystalLocal.sub(p), vec3.zero())
    }

    const ghostOut: (GhostView | null)[] = []
    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i]
      const view = i < ghosts.length ? ghosts[i] : null
      ghostOut.push(view)
      const on = view !== null
      if (g.root.enabled !== on) g.root.enabled = on
      if (view) g.transform.setLocalPosition(new vec3(view.wall.x, view.wall.y, GHOST_WALL_OFFSET_CM))
    }
    return {spots: spotOut, ghosts: ghostOut}
  }

  /**
   * Play the chime from where `spot` is on the wall. Uses the spot's own slot when it is
   * drawn; otherwise (it lit and went dark within one drag step) a free slot is moved to the
   * spot's wall position with its disc hidden, so the sound still comes from the right place.
   * Returns the world position the chime plays from, or null if nothing could play.
   */
  playChimeForSpot(spot: SpotView, firstTime: boolean): vec3 | null {
    let slot = this.spots[this.slotForKey(spot.key)]
    if (!slot) {
      slot = this.spots.find((s) => s.key === null)
      if (!slot) return null
      slot.transform.setLocalPosition(new vec3(spot.wall.x, spot.wall.y, SPOT_WALL_OFFSET_CM))
    }
    const track = firstTime ? this.chimeFirst : this.chimeRepeat
    if (track) {
      if (slot.audio.isPlaying()) slot.audio.stop(false)
      slot.audio.audioTrack = track
      slot.audio.volume = firstTime ? this.firstChimeVolume : this.repeatChimeVolume
      slot.audio.play(1)
    }
    return slot.transform.getWorldPosition()
  }

  // ------------------------------------------------------------------ pool construction

  private makeSpot(i: number): SpotSlot {
    const root = this.obj(this.sceneObject, `${SCENE_NAMES.spotPrefix}${i}`)
    const disc = attachPart(root, "Spot", this.material)
    disc.enabled = false

    // Label anchor: right of the spot and a little above it (the text grows upward from here).
    const label = this.obj(root, SCENE_NAMES.spotLabel, new vec3(this.labelGapCm * 0.7, this.labelGapCm * 0.45, 0.1))
    label.enabled = false

    const audioSO = this.obj(root, SCENE_NAMES.spotAudio)
    const audio = audioSO.createComponent("Component.AudioComponent") as AudioComponent
    audio.playbackMode = Audio.PlaybackMode.LowLatency // interactive cue
    audio.spatialAudio.enabled = true
    audio.spatialAudio.positionEffect.enabled = true
    audio.spatialAudio.distanceEffect.enabled = false // keep far spots audible; direction carries the cue

    const ray = this.obj(root, SCENE_NAMES.spotRay)
    attachPart(ray, "Ray", this.material)
    ray.enabled = false

    return {root, transform: root.getTransform(), disc, label, ray, audio, key: null}
  }

  private makeGhost(i: number): GhostSlot {
    const root = this.obj(this.sceneObject, `${SCENE_NAMES.ghostPrefix}${i}`)
    attachPart(root, "GhostSpot", this.material)
    const label = this.obj(root, SCENE_NAMES.ghostLabel, new vec3(this.labelGapCm * 0.6, this.labelGapCm * 0.35, 0.1))
    root.enabled = false
    return {root, transform: root.getTransform(), label}
  }

  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const sceneObject = global.scene.createSceneObject(name)
    sceneObject.setParent(parent)
    if (position) sceneObject.getTransform().setLocalPosition(position)
    return sceneObject
  }
}
