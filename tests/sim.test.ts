/**
 * Unit tests for Assets/Scripts/BraggSim.ts: the done criteria as pure logic.
 * The LEAF scenarios (Assets/Tests/) check the same criteria in the running Lens.
 */
import {test} from "node:test"
import assert from "node:assert/strict"
import * as P from "../Assets/Scripts/BraggPhysics"
import {BraggSim, SimFrame} from "../Assets/Scripts/BraggSim"

function near(actual: number, expected: number, tol: number, what = ""): void {
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: expected ${expected} ± ${tol}, got ${actual}`)
}

/** Put (hkl) exactly in its Bragg condition by spinning φ at tilt χ. */
function goTo(sim: BraggSim, m: P.Miller, chi = 0, phiNear = 0): SimFrame {
  const phi = P.solvePhiForCondition(m, sim.a, sim.lambda, chi, phiNear)
  assert.notEqual(phi, null, `no orientation reaches ${JSON.stringify(m)} at χ=${chi}`)
  sim.setOrientation(phi as number, chi)
  return sim.step()
}

function litTitles(f: SimFrame): string[] {
  return f.lit.map((s) => s.title)
}

// ------------------------------------------------------------------ criterion 1

test("criterion 1: drags turn φ and tilt χ (clamped to ±45°); reset returns both to 0°", () => {
  const sim = new BraggSim()
  sim.setOrientation(30, 0) // away from any slowdown window for a clean measurement
  sim.applyDrag(0, 100)
  assert.equal(sim.chi, 45)
  sim.applyDrag(0, -200)
  assert.equal(sim.chi, -45)
  sim.resetOrientation()
  assert.equal(sim.phi, 0)
  assert.equal(sim.chi, 0)
  const f = sim.step()
  assert.equal(f.readoutPhi, "φ 0.0°")
  assert.equal(f.readoutChi, "χ 0.0°")
})

test("criterion 1: readouts follow the crystal", () => {
  const sim = new BraggSim()
  sim.setOrientation(-12.34, 7.06)
  const f = sim.step()
  assert.equal(f.readoutPhi, "φ −12.3°")
  assert.equal(f.readoutChi, "χ 7.1°")
})

// ------------------------------------------------------------------ criterion 2

test("criterion 2: free mode starts at SC, a = 4.0 Å, λ = 1.54 Å with nothing lit", () => {
  const sim = new BraggSim()
  const f = sim.step()
  assert.equal(f.mode, "free")
  assert.equal(f.drawnLattice, "SC")
  assert.equal(f.a, 4.0)
  assert.equal(f.lambda, 1.54)
  assert.equal(f.lit.length, 0)
  assert.equal(f.lambdaLabel, "λ 1.54 Å · Cu Kα")
})

test("criterion 2: turning ~11° lights (0 1 0) with θ 11.1°, 2θ 22.2°, 61 cm to the side on the horizontal line", () => {
  const sim = new BraggSim()
  sim.setOrientation(11.1, 0)
  const f = sim.step()
  const spot = f.lit.find((s) => s.title === "(0 1 0)")
  assert.ok(spot, `lit: ${litTitles(f).join(", ")}`)
  assert.equal(spot.detail, "θ 11.1°  2θ 22.2°")
  near(spot.wall.x, -61.2, 0.05, "x")
  near(spot.wall.y, 0, 1e-9, "y")
  assert.ok(f.newlyLit.some((s) => s.title === "(0 1 0)"), "chime event for the new spot")
  // the mirror orientation gives (0 −1 0) on the other side
  sim.setOrientation(-11.1, 0)
  const g = sim.step()
  const spot2 = g.lit.find((s) => s.title === "(0 −1 0)")
  assert.ok(spot2, `lit: ${litTitles(g).join(", ")}`)
  near(spot2.wall.x, 61.2, 0.05, "x mirror")
})

test("criterion 2: dragging from the start lights (0 1 0) or (0 −1 0) between 10.1° and 12.1°", () => {
  const sim = new BraggSim()
  let litAt: number | null = null
  for (let i = 0; i < 400 && litAt === null; i++) {
    sim.applyDrag(0.1, 0)
    const f = sim.step()
    if (f.lit.some((s) => s.title === "(0 1 0)" || s.title === "(0 −1 0)")) litAt = sim.phi
  }
  assert.ok(litAt !== null, "no (010)-type spot lit while turning")
  assert.ok(litAt >= 10.09 && litAt <= 12.1, `lit at φ = ${litAt}`)
})

test("criterion 2: turning on past it, the spot goes dark within about 1° (mosaic tolerance)", () => {
  const sim = new BraggSim()
  const th = P.braggThetaDeg(4, 1.54, {h: 0, k: 1, l: 0}) as number
  sim.setOrientation(th + 0.9, 0)
  assert.ok(sim.step().lit.some((s) => s.title === "(0 1 0)"))
  sim.setOrientation(th + 1.1, 0)
  assert.ok(!sim.step().lit.some((s) => s.title === "(0 1 0)"))
})

// ------------------------------------------------------------------ criterion 3

test("criterion 3: λ up moves the lit spot outward, λ down moves it inward, until it goes dark", () => {
  const sim = new BraggSim()
  const th = P.braggThetaDeg(4, 1.54, {h: 0, k: 1, l: 0}) as number
  sim.setOrientation(th, 0)
  const x0 = Math.abs((sim.step().lit.find((s) => s.title === "(0 1 0)") as any).wall.x)
  sim.setWavelength(1.58)
  const up = sim.step().lit.find((s) => s.title === "(0 1 0)")
  assert.ok(up, "still lit at 1.58 Å")
  assert.ok(Math.abs(up.wall.x) > x0, "moved outward")
  sim.setWavelength(1.5)
  const down = sim.step().lit.find((s) => s.title === "(0 1 0)")
  assert.ok(down, "still lit at 1.50 Å")
  assert.ok(Math.abs(down.wall.x) < x0, "moved inward")
  sim.setWavelength(1.3)
  assert.ok(!sim.step().lit.some((s) => s.title === "(0 1 0)"), "dark once outside the window")
})

test("criterion 3: the found ghost follows sin θ = λ/2d; at Mo Kα it sits at 2θ ≈ 10.2°, about 27 cm out", () => {
  const sim = new BraggSim()
  sim.setOrientation(11.1, 0)
  sim.step()
  sim.setWavelength(0.71)
  const f = sim.step()
  assert.ok(!f.lit.some((s) => s.title === "(0 1 0)"))
  const ghost = f.ghosts.find((g) => g.key === "0,1,0")
  assert.ok(ghost, "ghost for (0 1 0)")
  near(ghost.twoThetaDeg, 10.1834, 2e-3, "2θ")
  near(Math.hypot(ghost.wall.x, ghost.wall.y), 26.944, 0.01, "distance from the beam stop")
  near(ghost.wall.y, 0, 1e-6, "on the horizontal line")
  assert.equal(ghost.label, "(0 1 0) 10.2°")
  // and it keeps following at another wavelength: sin θ = λ/2d
  sim.setWavelength(1.0)
  const g2 = sim.step().ghosts.find((g) => g.key === "0,1,0") as any
  near(Math.sin((g2.twoThetaDeg / 2) * P.DEG), 1.0 / 8, 1e-9, "sin θ = λ/2d")
})

// ------------------------------------------------------------------ criterion 4

test("criterion 4: a mission round starts at Mo Kα with the crystal hidden and 2θ-only labels", () => {
  const sim = new BraggSim()
  sim.startMission({lattice: "FCC", a: 4.4})
  const f = sim.step()
  assert.equal(f.mode, "mission")
  assert.equal(f.lambda, 0.71)
  assert.equal(f.a, 4.4)
  assert.equal(f.drawnLattice, null)
  assert.equal(f.sampleTag, "Mystery sample · a = 4.40 Å")
  assert.equal(f.verdictUnlocked, false)
  const g = goTo(sim, {h: 1, k: 1, l: 1})
  const spot = g.lit.find((s) => s.key === "1,1,1")
  assert.ok(spot)
  assert.equal(spot.title, "")
  assert.match(spot.detail, /^2θ \d+\.\d°$/)
})

test("criterion 4: random rounds draw SC or FCC and a in 3.3–5.7 Å", () => {
  let seed = 7
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const sim = new BraggSim({}, rng)
  const seen = new Set<string>()
  for (let i = 0; i < 40; i++) {
    sim.startMission()
    seen.add(sim.getMissionLattice())
    assert.ok(sim.a >= 3.3 && sim.a <= 5.7, `a = ${sim.a}`)
    assert.equal(sim.lambda, 0.71)
  }
  assert.deepEqual([...seen].sort(), ["FCC", "SC"])
})

/**
 * At Mo Kα several reflections are often in condition at once (θ_B is small next
 * to the 1° window), which is real rotation-photograph physics. To test one rule
 * at a time, find an orientation where every reflection in condition on the
 * detector shares the target's d-spacing. The search checks every candidate,
 * allowed or not, so it never depends on the lattice type.
 */
function goClean(sim: BraggSim, m: P.Miller): SimFrame {
  const N = P.millerN(m)
  for (let chi = 0; chi <= 40; chi = chi <= 0 ? 1 - chi : -chi) {
    for (const near of [0, 90, -90, 180]) {
      const phi = P.solvePhiForCondition(m, sim.a, sim.lambda, chi, near)
      if (phi === null) continue
      const r0 = P.evaluateReflection(m, sim.a, sim.lambda, phi, chi, 1.0)
      if (!r0.onDetector) continue
      const others = sim.candidates.filter((c) => {
        const r = P.evaluateReflection(c, sim.a, sim.lambda, phi, chi, 1.0)
        return r.inCondition && r.onDetector && P.millerN(c) !== N
      })
      if (others.length === 0) {
        sim.setOrientation(phi, chi)
        return sim.step()
      }
    }
  }
  throw new Error(`no clean orientation for ${JSON.stringify(m)} at a = ${sim.a}`)
}

/** a = 5.0 Å: nothing is in condition at the start orientation (checked below). */
const A_TEST = 5.0

test("test setup: at a = 5.0 Å and Mo Kα the start orientation lights nothing", () => {
  for (const lattice of ["SC", "FCC"] as P.Lattice[]) {
    const sim = new BraggSim()
    sim.startMission({lattice, a: A_TEST})
    assert.equal(sim.step().lit.length, 0)
    assert.equal(sim.distinctCount(), 0)
    assert.equal(sim.absencesLogged().length, 0)
  }
})

test("criterion 4: distinct means a different d-spacing; equivalents and shared d count once", () => {
  const sim = new BraggSim()
  sim.startMission({lattice: "SC", a: A_TEST})
  goClean(sim, {h: 0, k: 1, l: 0})
  goClean(sim, {h: 0, k: -1, l: 0})
  assert.equal(sim.distinctCount(), 1, "(010) and (0−10) share d")
  goClean(sim, {h: 0, k: 3, l: 0})
  goClean(sim, {h: 2, k: 2, l: 1})
  assert.equal(sim.distinctCount(), 2, "(300) and (221) share d")
  assert.equal(sim.step().verdictUnlocked, false)
  goClean(sim, {h: 1, k: 1, l: 0})
  assert.equal(sim.distinctCount(), 3)
  assert.equal(sim.step().verdictUnlocked, true)
})

test("criterion 4: the verdict unlocks exactly when the distinct d-spacings seen reach three (busy orientations too)", () => {
  const sim = new BraggSim()
  sim.startMission({lattice: "SC", a: 4.0})
  const seenN = new Set<number>()
  sim.step().lit.forEach((s) => seenN.add(s.N))
  for (const m of [{h: 0, k: 1, l: 0}, {h: 1, k: 1, l: 0}, {h: 1, k: 1, l: 1}, {h: 0, k: 2, l: 0}]) {
    const f = goTo(sim, m)
    f.lit.forEach((s) => seenN.add(s.N))
    assert.equal(sim.distinctCount(), seenN.size)
    assert.equal(f.verdictUnlocked, seenN.size >= 3)
  }
})

test("criterion 4 (SC): a (100)-type spot supports SC; FCC is refused with that evidence; SC reveals and names a material", () => {
  const sim = new BraggSim()
  sim.startMission({lattice: "SC", a: A_TEST})
  goClean(sim, {h: 0, k: 1, l: 0}) // N = 1, mixed parity
  goClean(sim, {h: 1, k: 1, l: 0}) // N = 2
  const f = goClean(sim, {h: 1, k: 1, l: 1}) // N = 3
  assert.equal(f.verdictUnlocked, true)
  assert.equal(f.board.lines.length, 3)
  assert.ok(f.board.lines.every((l) => l.startsWith("Spot  2θ")))

  const tt100 = 2 * (P.braggThetaDeg(A_TEST, 0.71, {h: 1, k: 0, l: 0}) as number)
  const wrong = sim.submitVerdict("FCC")
  assert.equal(wrong.kind, "wrong")
  assert.equal(wrong.message, `The spot at 2θ ${tt100.toFixed(1)}° is (100)-type: FCC forbids it.`)
  assert.equal(sim.step().board.highlightIndex, 0)

  const right = sim.submitVerdict("SC")
  assert.equal(right.kind, "correct")
  const g = sim.step()
  assert.equal(g.justSolved, true)
  assert.equal(g.solved, true)
  assert.equal(g.banner, "Identified: SC, like caesium chloride")
  assert.equal(g.drawnLattice, "SC")
  assert.equal(g.board.lines[0], `(100)  2θ ${tt100.toFixed(1)}°  (λ 0.71 Å)`)
  assert.ok(g.lit.every((s) => s.title.startsWith("(")), "labels now reveal the indices")
  assert.equal(sim.step().justSolved, false, "the flourish fires once")
})

test("criterion 4 (FCC): absences of (100) and (110) plus a (111) spot support FCC; SC is refused with that evidence", () => {
  const sim = new BraggSim()
  sim.startMission({lattice: "FCC", a: A_TEST})
  let f = goClean(sim, {h: 0, k: 1, l: 0})
  assert.equal(f.lit.length, 0, "the (100) condition is met and nothing lights")
  assert.deepEqual(f.board.lines, ["(100) condition passed: no spot"])
  f = goClean(sim, {h: 1, k: 1, l: 0})
  assert.deepEqual(f.board.lines, ["(100) condition passed: no spot", "(110) condition passed: no spot"])
  goClean(sim, {h: 1, k: 1, l: 1}) // N = 3: the positive control
  goClean(sim, {h: 0, k: 2, l: 0}) // N = 4
  f = goClean(sim, {h: 2, k: 2, l: 0}) // N = 8
  assert.equal(f.verdictUnlocked, true)

  const wrong = sim.submitVerdict("SC")
  assert.equal(wrong.kind, "wrong")
  assert.equal(wrong.message, "(100) and (110) passed with no spot: SC would show them.")

  const right = sim.submitVerdict("FCC")
  assert.equal(right.kind, "correct")
  const g = sim.step()
  assert.equal(g.banner, "Identified: FCC, like rock salt")
  assert.equal(g.drawnLattice, "FCC")
})

test("criterion 4 (FCC): without a positive control the Lens asks for more evidence", () => {
  const sim = new BraggSim()
  sim.startMission({lattice: "FCC", a: A_TEST})
  goClean(sim, {h: 0, k: 1, l: 0})
  goClean(sim, {h: 1, k: 1, l: 0})
  goClean(sim, {h: 2, k: 2, l: 0}) // N = 8
  goClean(sim, {h: 3, k: 1, l: 1}) // N = 11
  goClean(sim, {h: 2, k: 2, l: 2}) // N = 12
  assert.equal(sim.step().verdictUnlocked, true)
  const fb = sim.submitVerdict("FCC")
  assert.equal(fb.kind, "insufficient")
  assert.equal(fb.message, "Not enough evidence yet. Still needed: see a (111) or (200) spot (the positive control).")
  goClean(sim, {h: 1, k: 1, l: 1})
  assert.equal(sim.submitVerdict("FCC").kind, "correct")
})

test("criterion 4 (SC): without a spot FCC forbids, the SC verdict asks for more evidence", () => {
  const sim = new BraggSim()
  sim.startMission({lattice: "SC", a: A_TEST})
  goClean(sim, {h: 1, k: 1, l: 1})
  goClean(sim, {h: 0, k: 2, l: 0})
  goClean(sim, {h: 2, k: 2, l: 0})
  assert.equal(sim.step().verdictUnlocked, true)
  const fb = sim.submitVerdict("SC")
  assert.equal(fb.kind, "insufficient")
  assert.equal(fb.message, "Not enough evidence yet. Find a spot FCC forbids, such as a (100)- or (110)-type spot.")
})

test("criterion 4: verdict buttons stay locked below three distinct reflections", () => {
  const sim = new BraggSim()
  sim.startMission({lattice: "SC", a: A_TEST})
  goClean(sim, {h: 0, k: 1, l: 0})
  goClean(sim, {h: 1, k: 1, l: 0})
  assert.equal(sim.step().verdictUnlocked, false)
  assert.equal(sim.submitVerdict("SC").message, "Record three distinct reflections first.")
})

test("criterion 4: no leak. The same drag path gives identical guide arrows and slowdown in SC and FCC rounds", () => {
  const run = (lattice: P.Lattice) => {
    const sim = new BraggSim()
    sim.startMission({lattice, a: 4.37})
    const trace: unknown[] = []
    for (let i = 0; i < 900; i++) {
      // a wandering path through many conditions, with λ changes on the way
      const dPhi = 0.35 * Math.sin(i / 37) + 0.25
      const dChi = 0.3 * Math.cos(i / 23)
      sim.applyDrag(dPhi, dChi)
      if (i === 300) sim.setWavelength(1.2)
      if (i === 600) sim.setWavelength(0.85)
      const h = sim.helpers()
      trace.push([sim.phi.toFixed(9), sim.chi.toFixed(9), h.slowFactor, h.guide])
    }
    return trace
  }
  const sc = run("SC")
  const fcc = run("FCC")
  assert.deepEqual(sc, fcc)
  // and the path really did exercise the helpers
  const shown = sc.filter((t: any) => t[3].visible).length
  const slowed = sc.filter((t: any) => t[2] < 1).length
  assert.ok(shown > 20 && slowed > 20, `guide shown ${shown}, slowed ${slowed}`)
})

test("criterion 4: the prediction ring depends only on a and λ (identical in SC and FCC rounds)", () => {
  const ring = (lattice: P.Lattice) => {
    const sim = new BraggSim()
    sim.startMission({lattice, a: 4.0})
    sim.setPredictor({h: 1, k: 0, l: 0})
    return sim.step().ring
  }
  const a = ring("SC")
  assert.deepEqual(a, ring("FCC"))
  assert.ok(a)
  assert.equal(a.label, "(1 0 0) 2θ 10.2°")
  near(a.radiusCm as number, 26.944, 0.01, "ring radius")
})

// ------------------------------------------------------------------ helpers and hints

test("guide arrow: appears within 4° of a reflection, points the right way, hides in the window", () => {
  const sim = new BraggSim()
  const th = P.braggThetaDeg(4, 1.54, {h: 0, k: 1, l: 0}) as number
  sim.setOrientation(th - 3, 0)
  const h = sim.helpers()
  assert.equal(h.guide.visible, true)
  assert.equal(h.guide.axis, "phi")
  assert.equal(h.guide.sign, 1, "turn φ up toward (0 1 0)")
  sim.setOrientation(th - 0.5, 0)
  assert.equal(sim.helpers().guide.visible, false)
  assert.equal(sim.helpers().slowFactor, 0.5)
})

test("rotation runs at half speed within 2° of a reflection", () => {
  const sim = new BraggSim()
  const th = P.braggThetaDeg(4, 1.54, {h: 0, k: 1, l: 0}) as number
  sim.setOrientation(th - 1.5, 0)
  const before = sim.phi
  sim.applyDrag(0.2, 0)
  near(sim.phi - before, 0.1, 1e-9, "half speed")
})

test("off-wall hint: shows only when a lit reflection misses the detector and no lit spot lands on it", () => {
  // Only spot off the wall: the hint asks for a shorter wavelength.
  // χ = 5° keeps (0 1 1) out of condition; at χ = 0 it lights on the wall beside (0 2 0).
  const sim = new BraggSim()
  sim.setWavelength(2.29) // (020): 2θ = 69.8°, 4.1 m out
  goTo(sim, {h: 0, k: 2, l: 0}, 5, 30)
  const f = sim.step()
  assert.equal(f.offWallHint, true)
  assert.equal(f.lit.some((s) => s.key === "0,2,0"), false)
  assert.equal(f.lit.length, 0, "nothing lit on the wall")

  // Free mode, Cu Kα: (0 1 0) is lit on the wall while high-angle reflections in condition miss it.
  const free = new BraggSim()
  assert.equal(free.lambda, 1.54)
  free.setOrientation(11.0987, 0)
  const g = free.step()
  assert.ok(g.lit.some((s) => s.key === "0,1,0"), "(0 1 0) lit on the wall")
  const missed = free.candidates.filter((m) => {
    if (!P.isAllowed(m, free.freeLattice)) return false
    const r = P.evaluateReflection(m, free.a, free.lambda, free.phi, free.chi, free.cfg.toleranceDeg, free.cfg.detector)
    return r.inCondition && !(r.onDetector && r.wall)
  })
  assert.ok(missed.length > 0, "another reflection in condition misses the detector")
  assert.equal(g.offWallHint, false, "no hint next to a lit spot")
})

test("free mode FCC toggle: forbidden reflections stay dark", () => {
  const sim = new BraggSim()
  sim.setFreeLattice("FCC")
  sim.setOrientation(11.1, 0)
  assert.equal(sim.step().lit.some((s) => s.key === "0,1,0"), false)
  goTo(sim, {h: 1, k: 1, l: 1}, 0, 60)
  assert.ok(sim.step().lit.some((s) => s.key === "1,1,1"))
})

test("free-mode evidence board lists (hkl), 2θ and the sin²θ ratio to the lowest-angle reflection", () => {
  const sim = new BraggSim()
  goTo(sim, {h: 0, k: 1, l: 0})
  goTo(sim, {h: 1, k: 1, l: 0}, 0, 60)
  const f = goTo(sim, {h: 1, k: 1, l: 1}, 0, 60)
  assert.equal(f.board.lines[0], "(0 1 0)   2θ 22.2°   ×1.00")
  assert.ok(f.board.lines.some((l) => l.endsWith("×2.00")))
  assert.ok(f.board.lines.some((l) => l.endsWith("×3.00")))
})

test("a fast drag cannot skip a condition: passing through still records it", () => {
  const sim = new BraggSim()
  sim.startMission({lattice: "FCC", a: 4.0})
  sim.applyDrag(20, 0) // one big jump across (010) at φ ≈ 5.1°
  assert.ok(sim.absencesLogged().includes("100"))
})
