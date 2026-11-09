# Video script: Bragg's Room (2:50)

A screen recording of Lens Studio's **Interactive Preview** with a voiceover synthesised by **Bark** text-to-speech, plus one slot of real footage of a student or colleague solving the mission, recorded **with their permission**. Target length 2:50; Devpost judges stop at 3:00.

This script follows the approved brief's demo notes, which win where they differ from the original outline:
- It opens on a flat textbook diagram that doesn't land, and **a spot lights up on the wall by 0:15**.
- The challenge is the brief's **"Identify the crystal"** mission (it replaced the earlier "find three reflections" idea).
- **One sentence covers the positive-control rule** (line 10).
- It **ends with a student or colleague solving the mission** (the slot at 2:28).
- It says plainly that **the wall is a virtual stand-in** in the preview (line 4).

## Notes for Bark

- Each narration line is written to be generated as **one Bark prompt**. Bark is reliable up to about 13 seconds of speech per generation, so every line here is under ~30 words. Generate them separately and place them on the timeline.
- Symbols are spelled out the way they should be spoken: "two-theta", "angstroms", "zero one zero". Paste the **Bark text** column, not the on-screen labels.
- Use one speaker preset for every line so the voice stays consistent (I chose `v2/en_speaker_6`). Generate several takes of each line and keep the clearest.
- Leave the chime audible: keep any music well under the voice and let the Lens's spot chime play at 0:15.
- No copyrighted music or third-party logos. The textbook diagram at 0:00 is drawn for this video, not scanned from a book.

## Timeline

| # | Time | Bark text (narration) | On screen |
|---|---|---|---|
| 1 | 0:00–0:08 | This is how most of us first meet X-ray diffraction. Two lines for the planes, two arrows, and n lambda equals two d sine theta. | A flat textbook-style Bragg diagram drawn for this video: two horizontal lines for lattice planes, an incoming and an outgoing ray, θ marked, the equation underneath. Static. |
| 2 | 0:08–0:12 | It's true. But where does the spot actually go? | Same diagram, slow push-in. **Hard cut at 0:12.** |
| 3 | 0:12–0:22 | Here's the same idea in a room. I turn the crystal about eleven degrees, and a spot lights up on the wall. | Interactive Preview from the user's position: crystal on the desk, wall and beam stop ahead, beam pulse running. Click-drag the crystal to the right. **The (0 1 0) spot lights with its chime at about 0:15**, 61 cm left of the beam stop. |
| 4 | 0:22–0:32 | The angle is real: two-theta, twenty-two point two degrees, just where Bragg's law puts it. In the preview the wall is a virtual stand-in. | Hold on the spot label "(0 1 0) θ 11.1° 2θ 22.2°" and the faint ray from the crystal to the spot. Then pan briefly across the faint wall grid. |
| 5 | 0:32–0:41 | Turn one degree further and it goes dark. That window is the mosaic spread, exaggerated so you can find spots by hand. | Drag a little further: the spot goes dark. Show the φ readout on the goniometer base and the "mosaic spread exaggerated (1.0°)" footnote on the console. |
| 6 | 0:41–0:53 | Now the wavelength. Longer X-rays push the spot out, shorter ones pull it in, and a ghost remembers where it would land. | Turn back to the spot. Drag the λ slider up (spot moves outward), then down (inward, then dark). Continue down to Mo Kα: the faint ghost sits at 2θ 10.2°, about 27 cm from the beam stop. |
| 7 | 0:53–1:03 | Then the challenge: identify the crystal. Is this mystery sample simple cubic, or face-centred cubic? | Press **Start mission** on the console. The crystal becomes a frosted cube; the tag reads "Mystery sample · a = … Å"; λ jumps to Mo Kα. |
| 8 | 1:03–1:13 | The labels now show only two-theta. Every new d-spacing I find goes on the evidence board. | Turn the crystal: spots light with 2θ-only labels; the evidence board on the wall fills with "Spot 2θ …" lines. |
| 9 | 1:13–1:24 | It also logs the conditions where nothing lights, like the one zero zero and one one zero conditions passing with no spot. | Follow the guide arrow on the goniometer to a condition; nothing lights; the board adds "(100) Bragg condition reached: no spot", then "(110) Bragg condition reached: no spot". |
| 10 | 1:24–1:36 | An absence only counts with a positive control: a one one one or two zero zero spot proves the setup could see spots at all. | A (111)-type spot lights. Open **Predict (hkl)**, step to (1 1 1), and show its ring sitting on the spot. |
| 11 | 1:36–1:40 | So which is it? | The two verdict buttons, now unlocked, on the console. Hold for a beat; don't press. |
| 12 | 1:40–1:52 | I planned this with the plan-lens skill. Its interview turned my idea into a design brief: where everything sits, what each hand does, and what done looks like. | Scroll through `devpost/design-brief.md`: "The one spatial moment", "Where things live", "Done criteria". |
| 13 | 1:52–2:05 | Then coding agents built it with CLAD, through the Lens Studio MCP: the room, the console, the sounds, and a physics module checked against hand-computed Bragg angles. | Sped-up screen capture of Lens Studio while the agent builds (objects appearing in the Scene Hierarchy, the scene filling in). Cut to `BraggPhysics.ts` for a second. |
| 14 | 2:05–2:17 | Every done criterion has a LEAF test that drives the Lens in the preview. Here all eight pass, with a hundred and twenty-four unit tests. | The LEAF panel running the eight scenarios, each ending "completed successfully" (the final build run passed 8 of 8; see `devpost/build-report.md`). Re-run them before recording so what's on screen is live. Then a terminal running `npm test` in `tests/`, ending in "pass 124". |
| 15 | 2:17–2:28 | Only the atoms and the mosaic spread are enlarged, and they're labelled. Every angle and direction is real. | Close-up of the crystal with "atoms not to scale", then the wall pattern from the user's position. |
| 16 | 2:28–2:46 | *(no narration over the first ~12 s: let the room audio play)* | **🎥 SLOT: STUDENT OR COLLEAGUE FOOTAGE. Record only with their written permission.** They run one mission round in the Interactive Preview (screen capture, optionally with a small picture-in-picture of them at the keyboard): they gather evidence and press a verdict. The clip must end on the correct-verdict moment: the chime flourish, the pulsing spots and the banner "Identified: SC, like …" or "Identified: FCC, like …". Until I have that footage, a stand-in solve fills the slot, labelled as one. |
| 17 | 2:46–2:50 | Bragg's Room. Diffraction you can stand inside. | Over the last second of the solve: the banner stays on screen. Optional small title "Bragg's Room · Learn AR with SPECS". End. |

## Recording checklist

- **Lens Studio:** Preview set to **SPECS** and **Interactive Preview**. Hide other panels or record just the Preview panel at 1080p or higher. Turn the system volume up so the chimes are captured.
- **Before take 1:** reset the Lens (the Preview's refresh button) so it starts in free mode at Cu Kα, φ = χ = 0.
- **Moving in the preview:** right-drag to look; click and drag on the crystal to turn it; click a console button to press it.
- **Mission footage:** for a predictable round in the narrated section, I start a few missions until I get one I like. The tag shows a before I start turning.
- **Permission:** keep a written note (a message is fine) from the student or colleague agreeing to appear in a public YouTube video.
- **Upload:** YouTube, visibility **Public**, under 3:00. Paste the link into the Devpost form and into `devpost/submission.md`.

## How the video was made (Nov 5–9 2026)

The coding agent made the cut with my existing video setup (Remotion, FFmpeg, Bark, Whisper). It follows this timeline with these differences. The on-screen text and the closing credits say the same.

**Re-cut on Nov 9 (2:35, https://youtu.be/oRucnWf3XC8).** In the judges' live review they asked for a stretch of uncut footage, so you see what someone sees from start to finish, in order. They also asked entrants to say who the Lens is for. So:
- The mission section is now one uncut round (below). It replaces the frame-by-frame mission shots and the scripted solve.
- A line naming the audience is on screen from the first frame and on the closing card.

The first cut (2:29, https://youtu.be/9aPGQw05psg) is now unlisted: the link still works, but only the re-cut shows on YouTube. The notes below describe the re-cut; where the first cut differed, they say so.

- **The opening is shorter than the timeline above.** Line 1 keeps only its first sentence and line 2 drops "It's true.", so the Lens is on screen at 0:04 and (0 1 0) lights with its chime at 0:08, not 0:15. The first cut (2:37) reached the Lens at about 0:11; I wanted the demo inside the first 10 seconds.
- **One mission round is an uncut real-time screen recording (0:48–1:42, 54 s).** FFmpeg recorded the Preview viewport from the Lens Studio window while the `video-director` LEAF scenario played the round:
  - a real press of Start mission, then the test hook below;
  - real pinch-drags turning the crystal φ 0 → 4.2° → 8.9° → 9.6° → 19.6°. The board logs the (100) and (110) absences, (200) lights as the positive control, and (220) unlocks the verdict;
  - a real press of Face-centred cubic.

  A running clock and a log of the scripted input are on screen.
  - **Frame rate.** The preview runs at only about 5 fps on my PC, so the motion is choppy. The director now makes each drag last about 5 frames at the measured rate. With 250 ms drags at that frame rate the crystal barely turned, and the first attempt failed.
  - **The random round shows first.** For about 2 s after the press, the board shows the random round (a = 4.43 Å) before the hook fixes it to 4.05 Å.
  - **Sounds.** The director logs each sound the Lens plays with its wall-clock time, and the Lens's own sound files are placed at those times.
- **The other footage is captured frame by frame, not screen-recorded.** When those shots were made, the Windows session running Lens Studio had no display to record from, so the Preview panel was captured as stills through the Lens Studio MCP (`CapturePanelScreenshotTool`) while the `video-director` LEAF scenario (`Assets/Tests/Video/BraggsVideoDirectorScenario.ts`) stepped the Lens: real pinch-drag gestures and button presses, the λ slider set through its value setter. The stills are played back at their captured pace (motion steps of 0.07–0.13 s, holds of 1–2 s). Nothing in a frame is drawn over or edited; the readouts beside the preview come from the Lens's own state at each capture.
- **Every Lens shot was re-shot on Nov 6, after the changes from the simulated walkthrough** (`devpost/simulated-walkthrough.md`). The frames show:
  - the off-wall hint naming the reflection ("A reflection at 2θ 51.0° is lit, but misses the wall.");
  - the mission's question on the board;
  - "Bragg condition reached: no spot";
  - "Correct: …" after the verdict;
  - the "wall 150 cm from the crystal" label.

  The plans, framings and frame counts are the same as before. The opening four shots (spot on the wall, label and wall, past the window, wavelength) use finer steps than the first take: 0.25° turns, 0.1° past the mosaic window and 0.02 Å on the λ slider.
- **Text cut at the frame edge.** On the turn towards (0 1 0) (φ 5.7°–10.0°) the hint shows, because a reflection is lit beyond the wall while nothing is lit on it. The Preview panel used for capture is tall and narrow, so the end of that sentence is cut off at the frame edge. The 2θ value stays readable.
- **The Lens's sounds are placed, not recorded.** Panel captures carry no audio, so the Lens's own files (`Assets/GeneratedSFX`: first-sighting chime, repeat chime, verdict chord) are mixed in on the frame where the Lens logged playing them, at most one chime per 0.25 s as in the Lens.
- **The mission round is fixed to FCC, a = 4.05 Å** with the `testStartMission` hook, after a real press of Start mission, so the narration matches the sample. The subtitle on screen says so.
- **No student footage.** The first cut ended on a scripted solve at 2:10, labelled as a stand-in. The re-cut drops it: the uncut round ends on its own real verdict. Footage of a student or colleague goes in only with their written permission.
- **The process section uses stills**, not a screen capture of the build: CLAD's own Lens Studio captures from the build, a count of the coordinating session's Lens Studio MCP calls, and the LEAF results in the Lens Studio Logger.
- **Music:** a quiet synthesized bed (CC0, made from scratch with a script), low-passed and ducked under the voice, with one closing hit on the title card.
- **Narration:** Bark, preset `v2/en_speaker_6`, one prompt per line, four takes each; the take that Whisper transcribed cleanest, before and after processing, was kept, trimmed and sped up 1.1×. The voice sits about 20 dB above the music on every line.
