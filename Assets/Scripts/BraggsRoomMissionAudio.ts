/**
 * BraggsRoomMissionAudio: the mission's two audio cues (put it on "MissionAudio", placed at the
 * beam stop).
 *
 * Owns: two AudioComponents on child objects:
 *   Flourish  the "identified" chime phrase (MissionFlourish.wav, /build-music), spatial, from the
 *             beam stop, played once on frame.justSolved;
 *   NotYet    a soft low two-note tone (VerdictNotYet.wav, /build-sfx) for a wrong or
 *             insufficient verdict; not spatial (it answers the button the user just pressed).
 *
 * Inputs: References (the two tracks) and Settings (volumes).
 *
 * Talks to BraggsRoomMain through playFlourish() and playNotYet().
 *
 * Must not: decide when a verdict is right (the sim does).
 */
@component
export class BraggsRoomMissionAudio extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BraggsRoomMissionAudio – verdict flourish and "not yet" tone</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("MissionFlourish.wav: the rising three-note chime for a correct verdict")
  flourish: AudioTrackAsset

  @input
  @hint("VerdictNotYet.wav: the soft low tone for a wrong or insufficient verdict")
  notYet: AudioTrackAsset
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Flourish volume")
  @widget(new SliderWidget(0, 1, 0.05))
  flourishVolume: number = 0.9

  @input
  @hint("'Not yet' volume (kept gentle)")
  @widget(new SliderWidget(0, 1, 0.05))
  notYetVolume: number = 0.45
  @ui.group_end

  private flourishAudio: AudioComponent
  private notYetAudio: AudioComponent

  onAwake(): void {
    if (!this.flourish || !this.notYet) print("BraggsRoomMissionAudio: flourish and notYet tracks must be wired")
    this.flourishAudio = this.makeAudio("Flourish", this.flourish, true)
    this.notYetAudio = this.makeAudio("NotYet", this.notYet, false)
  }

  playFlourish(): void {
    this.play(this.flourishAudio, this.flourishVolume)
  }

  playNotYet(): void {
    this.play(this.notYetAudio, this.notYetVolume)
  }

  private play(a: AudioComponent, volume: number): void {
    if (!a || !a.audioTrack) return
    if (a.isPlaying()) a.stop(false)
    a.volume = volume
    a.play(1)
  }

  private makeAudio(name: string, track: AudioTrackAsset, spatial: boolean): AudioComponent {
    const so = global.scene.createSceneObject(name)
    so.setParent(this.sceneObject)
    const a = so.createComponent("Component.AudioComponent") as AudioComponent
    a.playbackMode = Audio.PlaybackMode.LowLatency // interactive cue
    if (track) a.audioTrack = track
    if (spatial) {
      a.spatialAudio.enabled = true
      a.spatialAudio.positionEffect.enabled = true
      a.spatialAudio.distanceEffect.enabled = false // 2 m away; direction carries the cue
    }
    return a
  }
}
