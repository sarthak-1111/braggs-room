---
status: approved
---

# Design brief: Bragg's Room

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

Everything here is Sarthak's decision except values marked (default), which plan-lens filled in for Sarthak to review.

**Audience:** undergraduate physics, chemistry and materials students, and their teachers. Flat textbook diagrams of diffraction don't convey the 3D geometry.

## The one spatial moment
A crystal sits on my desk at a comfortable size, and an X-ray beam passes through it. I pinch to rotate the crystal, and when a set of lattice planes meets the Bragg condition, a diffraction spot lights up on a detector on my wall, at the true angle (2θ). In the mission, I use this to identify a mystery crystal as simple cubic (SC) or face-centred cubic (FCC) from which reflections appear and which stay dark.

## Why it belongs on glasses
- Uses: draws in the world; leaves your body free; shares your view: on glasses, the detector anchors to the real wall you're facing. In the preview this is a stand-in (virtual wall), feel unproven.
- Why it's better than the phone or laptop version: my hands rotate the crystal while my eyes stay on the wall pattern. The geometry happens at room scale with real angles, so the 3D link between crystal orientation, beam and spot is something you see in your own room, not a flat diagram.

## Product or overlay
- Type: product. The virtual crystal, beam and detector are the experience.
- What the real version would sense: the real wall, so the detector sits on your own wall.
- Stand-in for the preview: the preview has no real room, so the Lens provides a virtual desk and a virtual wall at real size. If World Query returns wall hits in the preview's simulated room, the detector snaps to that wall; otherwise it uses the virtual wall (default). The done criteria use the virtual wall. On real glasses, the detector is clipped to the detected wall's size (out of scope for the done criteria).

## Where things live
- Where the user is looking during the main task: at the wall pattern around the beam stop, with the crystal in the lower part of the view. The crystal sits about 25° below the eye line and the beam stop about 7° below (default), so both fit in view together.
- Look: short, glanceable labels; nothing that looks like a floating web page. The wall is drawn as a faint light grid, not a solid panel, because black renders as transparent (default).
- Virtual desk: in front of the user at start, top 45 cm below eye level, 120 × 60 cm (default).
- Crystal: on the desk at about arm's length, 55 cm forward and 20 cm left of centre (default), on a 20 cm goniometer post (default), so it sits about 25 cm below eye level. Drawn enlarged, about 8 cm across (default), labelled "atoms not to scale".
- Beam source: to one side, on a small stand on the desk to the user's left, about 20 cm in front of them, on the beam line (default). A compact X-ray tube with a collimator, about 15 cm long (default).
- Beam: travels straight away from the user, through the crystal, to the wall at crystal height, perpendicular to the wall (default).
- Detector: on the wall, 1.5 m beyond the crystal. A small beam-stop disc marks where the straight-through beam lands, at the centre of the pattern (default). In the preview, the detector area is 4 m wide × 2.6 m tall around the beam stop, from 1 m below to 1.6 m above beam height (vertical placement default). On real glasses it is clipped to the detected wall's size.
- Evidence board: on the wall beside the beam stop, about 60 × 40 cm, drawn just in front of the wall so spots never cover it (position and size default).
- Spot labels: next to each lit spot on the wall, with text at least 4 cm tall (default).
- Angle readouts (φ for spin, χ for tilt): small, on the goniometer base, facing the user (default).
- Control console: on the desk to the right of the crystal, within easy reach (default). It holds the wavelength slider, Reset orientation, the mode button, the FCC toggle (free mode), the predictor and the verdict buttons.

## Hands and input
- Turn the crystal by pinch-dragging it. Left and right turn it about the vertical axis (φ). Up and down tilt it about the horizontal axis perpendicular to the beam (χ), up to ±45°. It never rolls about the beam axis, because that only spins the pattern around the centre of the wall. This is how a real two-circle goniometer works.
- Rotation slows slightly near a reflection, so it's easy to land on one. Within 2° it turns at half speed (default).
- Reset orientation: a button.
- Wavelength: a slider from about 0.7 to 2.3 Å, with marks for common lab sources: Mo Kα 0.71, Cu Kα 1.54, Co Kα 1.79 and Cr Kα 2.29 Å (which lines: default). Free mode starts at Cu Kα (1.54 Å). Mission rounds start at Mo Kα (0.71 Å), and the slider stays live during the mission.
- Free-mode crystal: simple cubic, a = 4.0 Å. A toggle switches it to FCC.
- Start mission / Back to free mode: one button (default).
- Predictor (mission mode): pick any (hkl) and see where that reflection would land. Three big +/− steppers for h, k and l, in place of typing.
- Verdict: two big buttons, "Simple cubic" and "Face-centred cubic".
- Targets are big and highlight when aimed at. Buttons are at least 4 cm across (default).
- Voice: none.

## When things show
- Intro (10 s): the beam animates from the source through the crystal to the beam stop, with one line, "Drag the crystal. Watch the wall." (content default), then fades into free exploration.
- Beam: a short animated pulse travelling along the beam line.
- Lit spot: bright only while its Bragg condition is met, with a spatial chime from the spot's position on the wall. A faint ray runs from the crystal to the spot while it's lit (default).
- Found ghosts: once a reflection has been observed, a faint ghost stays where it would land at the current wavelength, so you can track it while changing λ.
- Prediction ghosts (mission): the (hkl) chosen in the predictor shows a ghost where it would land at the current wavelength, whether or not it's allowed. Its position depends only on a and λ, so it reveals nothing about the lattice type. Ghosts are never drawn automatically for allowed reflections.
- Guide arrow: subtle. It appears within 4° of a reflection (default) as a small curved arrow on the goniometer showing which way to drag (default), and it disappears when the spot lights.
- In mission mode, the guide arrow and the slowdown ignore the lattice type. They use the full simple-cubic candidate set (every hkl) in both SC and FCC rounds. Otherwise FCC rounds would skip conditions like (210), (211) and (300) that SC rounds show, which would reveal the answer.
- Off-wall hint: if a lit spot falls off the detector, a short hint reads "Spot is off the wall. Try a shorter wavelength."
- Spot labels: free mode shows (hkl), θ and 2θ. Mission mode shows 2θ only.
- Evidence board, free mode: lists found reflections with (hkl), 2θ, and the sin²θ ratio to the lowest-angle one found, as a teaching aside (layout default).
- Evidence board, mission mode: lists each distinct reflection observed (2θ only). It logs "(100) condition passed: no spot" or "(110) condition passed: no spot" when the crystal passes through those conditions and nothing lights.
- Verdict buttons: appear once at least three distinct reflections are recorded. "Distinct" means a different d-spacing (a different h²+k²+l² at the round's a). Symmetry-equivalent reflections, and different reflections that share a d-spacing, count once. Both buttons unlock together, so an unlocked button never gives the answer away.
- Predictor: folded behind a "Predict (hkl)" button until it's opened (default).
- If something needs attention out of view: the spatial chime plays from the spot, and a small chevron at the edge of the view points toward a lit spot outside it, fading once it's in view (default).
- Ewald sphere view: an optional stretch goal, only after every done criterion passes.

## The mission
- Each round's mystery crystal is randomly SC or FCC. Its sample tag shows the lattice parameter, drawn at random from 3.3–5.7 Å. The mystery is the centring, not the cell size, as in real practice, where the cell size usually comes from earlier measurements.
- Each round starts at Mo Kα (0.71 Å), so the first reflections of either lattice land on the detector. The slider stays live. A lit spot counts as observed only if it lands on the detector (default); if it falls off, the off-wall hint suggests a shorter wavelength.
- SC verdict: supported once any mixed-parity reflection, such as (100) or (110), has been observed.
- FCC verdict: supported once the Lens confirms the crystal has passed through the (100) and (110) Bragg conditions with no spot appearing, and at least one allowed reflection, (111) or (200), has been observed. That reflection is the positive control: it proves the setup could see spots, so the absence means something.
- No ratio test in the mission. Ratios stay in free mode as a teaching aside.
- On submit (default logic):
  - If the evidence contradicts the verdict, the Lens says so and points to that evidence. For example: "this spot is (100)-type: FCC forbids it", or "(100) and (110) passed with no spot: SC would show them".
  - If the verdict's evidence rule is met, it's correct.
  - Otherwise the Lens says "not enough evidence yet" and what's missing.
- Correct verdict: reveal every spot's (hkl) and name a real material with that structure. FCC: copper (3.61 Å), aluminium (4.05 Å) or rock salt (5.64 Å). SC: α-polonium (3.35 Å), or the primitive cubic lattice of caesium chloride (4.12 Å). Name the one whose a is closest to the round's a (default). Celebrate with a chime flourish, pulsing spots and "Identified: FCC, like copper" (default).
- Wrong verdict: show the contradicting evidence and let the student look again (default).

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Dragging the crystal left or right turns it about the vertical axis, and dragging up or down tilts it about the horizontal axis across the beam. It never rolls about the beam. The φ and χ readouts follow the crystal, and Reset orientation returns both to 0°.
2. In free mode (simple cubic, a = 4.0 Å, λ = 1.54 Å), turning the crystal about 11° from the start position lights a spot labelled (0 1 0) or (0 −1 0), θ = 11.1°, 2θ = 22.2°, on the beam stop's horizontal line about 61 cm to the side, with a chime from the spot. Turning on past it, the spot goes dark within about 1° (the mosaic tolerance).
3. With that spot lit, sliding λ up moves it outward and sliding λ down moves it inward, until it goes dark. Its found ghost keeps following sin θ = λ/2d, so at Mo Kα (0.71 Å) the ghost sits at 2θ ≈ 10.2°, about 27 cm from the beam stop.
4. A mission round starts at Mo Kα (0.71 Å) and ends correctly for both crystal types (tests can force the type and a). After three reflections with distinct d-spacings (symmetry equivalents and shared d-spacings count once), the verdict buttons unlock.
   - SC: with a (100)- or (110)-type spot observed, "Simple cubic" reveals the indices, names a real material and celebrates.
   - FCC: the evidence board logs "(100) condition passed: no spot" and "(110) condition passed: no spot". With a (111) or (200) spot observed, "Face-centred cubic" does the same as above.
   - A wrong verdict shows the evidence against it.
   - No leak from the helpers: along the same orientation path, with the same a and λ, the guide arrows and the slowdown behave identically in a forced-SC round and a forced-FCC round.
5. Labels are short and readable at a glance from the user's position. Free mode shows (hkl), θ and 2θ by each lit spot, mission mode shows 2θ only, and the φ/χ readouts and the evidence board can be read without moving closer.

## Out of scope
- Recognizing real crystals or reading real X-ray data.
- Spot intensities beyond allowed or forbidden: all allowed spots are equally bright (default).
- Lattice types other than SC and FCC (default).
- Roll about the beam axis.
- Voice, two-hand gestures or custom gestures.
- Remembering progress between sessions; sharing the Lens with a second person.
- Real-wall snapping, and clipping the detector to the real wall's size, as done criteria.
- The Ewald sphere view, unless every done criterion already passes.

## Risks and open questions
- Real wall: Sarthak asked for the detector to be anchored to a real wall the glasses detect. The preview can't detect walls, so the done criteria use the virtual wall, and snapping is attempted only if World Query returns hits in the preview. Feel unproven.
- "Shares your view" is claimed on the strength of the real-wall anchor, which the preview can only show as a stand-in. Judges may read "shares your view" as using what the camera sees, so the video and description should say plainly that the wall is a stand-in in the preview.
- High angles land far out. On a flat wall 1.5 m away, a spot sits 1.5 m × tan 2θ from the beam stop, so 2θ = 45° is already 1.5 m out, and anything past about 60° misses the detector. Mission rounds start at Mo Kα, so for a = 3.3–5.7 Å, an FCC round's (111), (200) and (220) all land within about 1.1 m. The off-wall hint covers the rest. Out-of-view spots rely on the chime and the edge chevron.
- The off-wall hint only fires for a reflection that exists. In a mission it tells the student a reflection happened at that orientation, even though they can't read its 2θ.
- Narrow view: the crystal and the beam stop fit in view together, but spots more than about half a metre from the beam stop won't be in view at the same time as the crystal. Feel unproven.
- Many controls (slider, reset, mode, FCC toggle, predictor, verdicts) work against "a few big targets". The predictor stays folded until it's needed. Feel unproven.
- The 1.0° mosaic tolerance is exaggerated so spots can be found by hand, and it's labelled "mosaic spread exaggerated" on screen.
- The FCC absence check needs the Lens to test the forbidden (100) and (110) conditions with the same Bragg test as allowed ones. The guide arrow, the slowdown and the ghosts must not reveal which reflections exist (see done criterion 4).

## Physics for CLAD (Sarthak's specification)
- Use the vector (Laue/Ewald) form. |k| = 1/λ along the beam. The reciprocal lattice vectors G = (h, k, l)/a in the crystal frame rotate with the crystal.
- A reflection lights when |k + G| ≈ |k| within the mosaic tolerance. Implement this as: the glancing angle between the beam and the planes is within 1.0° of θ_B, where sin θ_B = λ|G|/2 = λ/2d.
- The diffracted direction is k' = k + G, intersected with the wall plane. Draw the spot at exactly 2θ_B from the beam, at the azimuth of k + G around the beam, so the 2θ on the wall is exact even inside the tolerance (default).
- A reflection with λ > 2d can never light, so it fades out.
- FCC allows (h, k, l) all even or all odd. SC allows all of them.
- Orientation uses two angles: R = R_χ (tilt about the lab horizontal axis perpendicular to the beam) · R_φ (spin about the goniometer's vertical axis), so no roll ever builds up (default). At the start, φ = χ = 0 with crystal [100] along the beam and [001] vertical. The spots then form layer lines, with (hk0) on the horizontal line through the beam stop.
- Distinct reflections: a different d-spacing, which means a different h² + k² + l² at the round's a. Symmetry equivalents, and different (hkl) sharing a d-spacing such as (300) and (221), count once.
- Mission helpers: the guide arrow and the slowdown test every (hkl) of the simple-cubic set in both SC and FCC rounds, independent of the lattice type.
- Found ghost at the current λ: the point where that (hkl) would land if spun into its Bragg condition about the vertical axis at the current tilt, choosing the solution nearest where it was seen (default).
- Prediction ghost: a faint ring at 2θ_B around the beam stop, labelled with the (hkl) and 2θ (default).
- Tests must be able to set the mystery crystal's type and a (default).
- The crystal is drawn enlarged and labelled "atoms not to scale". All angles and directions are real.

## Notes for the demo video (Sarthak's plan; not part of the build)
- Open with a textbook diagram failing, then cut to a spot lighting up on the wall within 15 seconds.
- End with a student or colleague solving the mission. Get their permission before including them.
- Include a sentence on the positive-control rule.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
