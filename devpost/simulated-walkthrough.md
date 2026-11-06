# Simulated first-time-user walkthrough (Nov 6 2026)

**These were not real users.** Before testing with real students, I had the coding agent run three simulated walkthroughs. In each one, a separate AI agent played a persona and drove the Lens in Lens Studio's Interactive Preview through the Lens Studio MCP.
- Each agent could read only the README's controls section (and, for the lecturer, the lesson plan). It saw only Preview screenshots: no source code, no logs, no scene queries.
- Each logged a think-aloud for every step and took 37–43 screenshots.

A simulated user can find usability problems and check what the screen says. It can't show that anyone *learns* from the Lens, because the agent already knows Bragg's law. That needs real students (see "What's next" in `submission.md`).

## The personas and what they managed

| Persona | Tasks | Result |
|---|---|---|
| **A.** First-year chemistry undergraduate: has seen nλ = 2d sin θ once, new to AR | first spot; what the wavelength does; the mission | Got a spot in about 7 steps and the λ effect in 7. Solved the mission (SC) but guessed, because nothing on screen gave the SC/FCC rule. |
| **B.** Materials-science PhD student who runs a single-crystal diffractometer | the same, plus a physics audit of every number on screen | Spot in about 6 steps, λ in about 14, mission solved (FCC) in about 25. **Every angle, wavelength and lattice constant was correct to 0.1°.** |
| **C.** Lecturer running the lesson plan step by step | the lesson plan's Parts A, B and C | Part C worked as written. Part B's values matched, but the handout missed what the screen shows. Part A asked for a distance the screen doesn't show. |

## What they found

**Agreed by more than one persona (design):**
1. **The off-wall hint confuses** (all three). "Spot is off the wall. Try a shorter wavelength."
   - It appears before any spot is visible, at the moment (0 1 0) simply goes dark, and while the found reflection's ghost is on the wall.
   - It never says which reflection it means.
   - The PhD persona noted it can suggest that spots slide with λ, when a still crystal's spot goes dark instead.
2. **The mission's question and the verdict feedback.**
   - The question (SC or FCC?) isn't stated when the mission starts (A).
   - The verdict text never says "correct", and "Aluminium: a = 4.05 Å. This sample: a = 4.22 Å." can read as "the sample is aluminium" (A, B).
3. **The evidence board logs reflections the user never saw on the wall**, because they lit outside the view (A, C).
4. **Seeing the crystal, the wall and the console at once** needs a step back from the start position (B, C).

**One persona each:**
- "(100) condition passed: no spot" can read as "the check passed" (B).
- θ and 2θ are rounded separately ("θ 13.8° 2θ 27.5°") (B).
- After solving, labels drop "2θ" (B).
- The predictor's ring needs a note that a single-crystal spot appears at one point on it (B).
- The evidence board can sit over high-angle spots and labels (A).

**The lesson plan** (C): Part A asked students to read a distance in cm that isn't on screen. Part B missed that at Mo Kα the second-order (0 2 0) and the (0 1 1) spots light at the same crystal angle. The mission key only covered a = 4.05 Å. 25 minutes was too tight.

**Simulation artifacts, not design problems:**
- Injected touches needed a second press: the first one only moves the simulated hand.
- The tall Preview panel used for capture cropped text at the edges.
- Coarse injected slider drags may have skipped narrow conditions.
- In the first walkthrough, two of the agent's inspection tools installed helper packages into the project that broke compilation. The agent removed them without saving, and the repo was unchanged.

## What worked (all three)

- θ and 2θ shown together on every spot label, and numbers that check out by hand.
- The green turn arrow and the edge chevron, which found every spot outside the view.
- The drawn diffracted ray from the crystal to the spot, which answers "where does the spot go?" directly.
- The ghost, which makes the λ dependence visible even when the spot is dark.
- The mission's logged absences and positive control ("how I'd argue FCC from an indexed dataset", persona B).
- The reveal after a correct verdict.
- The honest disclaimers, "atoms not to scale" and "mosaic spread exaggerated (1.0°)".

## What I changed

- **Lesson plan, done.** It now:
  - computes the distance from 2θ and the 150 cm wall distance;
  - introduces the ghost in Part B;
  - adds the Mo Kα second-order (0 2 0) as a question and a discussion point;
  - gives a key for any mission round (sin θ = λ√N / 2a);
  - explains why φ at first light is a little below θ;
  - adds setup tips and runs 30 minutes.
- **The Lens.** Changes to the off-wall hint and to the mission and verdict wording are proposed; build report, open question 6.

The full reports, with think-aloud logs and 122 screenshots, are kept outside the repo, in my video build folder.
