/**
 * Unit tests for Assets/Scripts/BraggPhysics.ts against hand-computed values.
 *
 * Reference values, computed by hand with sin θ = λ√(h²+k²+l²) / 2a, 2θ = 2θ,
 * and the wall offset L·tan 2θ with L = 150 cm:
 *
 *   a = 4.0 Å, λ = 1.54 Å (Cu Kα)
 *   (100): d = 4.0000 Å  sin θ = 0.192500  θ = 11.0987°  2θ = 22.1974°  61.206 cm
 *   (110): d = 2.8284 Å  sin θ = 0.272236  θ = 15.7974°  2θ = 31.5947°  92.262 cm
 *   (111): d = 2.3094 Å  sin θ = 0.333420  θ = 19.4765°  2θ = 38.9530°  121.264 cm
 *   (200): d = 2.0000 Å  sin θ = 0.385000  θ = 22.6437°  2θ = 45.2875°  151.513 cm
 *
 *   a = 4.0 Å, λ = 0.71 Å (Mo Kα)
 *   (010): sin θ = 0.088750  θ = 5.0917°  2θ = 10.1834°  26.944 cm
 *
 *   (111) at χ = 0, a = 4.0, λ = 1.54: b̂·G = (cos φ − sin φ)/4 must equal −|G| sin θ_B,
 *   so cos(φ + 45°) = −0.40835 and φ = 69.1015° (or −159.1015°).
 */
import {test} from "node:test"
import assert from "node:assert/strict"
import * as P from "../Assets/Scripts/BraggPhysics"

function near(actual: number, expected: number, tol: number, what = ""): void {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${what}: expected ${expected} ± ${tol}, got ${actual}`,
  )
}

const A = 4.0
const CU = 1.54
const MO = 0.71
const L = 150

const HAND = [
  {m: {h: 1, k: 0, l: 0}, d: 4.0, theta: 11.0987, twoTheta: 22.1974, wall: 61.206},
  {m: {h: 1, k: 1, l: 0}, d: 2.82843, theta: 15.7974, twoTheta: 31.5947, wall: 92.262},
  {m: {h: 1, k: 1, l: 1}, d: 2.3094, theta: 19.4765, twoTheta: 38.953, wall: 121.264},
  {m: {h: 2, k: 0, l: 0}, d: 2.0, theta: 22.6437, twoTheta: 45.2875, wall: 151.513},
]

test("d-spacings and Bragg angles match hand-computed values (a = 4.0 Å, λ = 1.54 Å)", () => {
  for (const r of HAND) {
    const name = `(${r.m.h}${r.m.k}${r.m.l})`
    near(P.dSpacing(A, r.m), r.d, 1e-4, `${name} d`)
    const th = P.braggThetaDeg(A, CU, r.m) as number
    near(th, r.theta, 1e-3, `${name} θ`)
    near(2 * th, r.twoTheta, 2e-3, `${name} 2θ`)
    near(L * Math.tan(2 * th * P.DEG), r.wall, 2e-3, `${name} wall offset`)
  }
})

test("(100) gives θ ≈ 11.10° and 2θ ≈ 22.2° (the brief's worked example)", () => {
  const th = P.braggThetaDeg(A, CU, {h: 1, k: 0, l: 0}) as number
  assert.equal(th.toFixed(2), "11.10")
  assert.equal((2 * th).toFixed(1), "22.2")
})

test("Mo Kα (0.71 Å): (010) at 2θ ≈ 10.18°, about 27 cm from the beam stop", () => {
  const th = P.braggThetaDeg(A, MO, {h: 0, k: 1, l: 0}) as number
  near(th, 5.0917, 1e-3, "θ")
  near(2 * th, 10.1834, 2e-3, "2θ")
  near(L * Math.tan(2 * th * P.DEG), 26.944, 2e-3, "wall offset")
})

test("a reflection with λ > 2d can never occur", () => {
  // (222) with a = 3.3 Å: d = 0.9526 Å, 2d = 1.905 Å < 2.29 Å (Cr Kα)
  assert.equal(P.braggThetaDeg(3.3, 2.29, {h: 2, k: 2, l: 2}), null)
  // Exactly λ = 2d gives back-scattering, θ = 90°
  near(P.braggThetaDeg(4.0, 8.0, {h: 1, k: 0, l: 0}) as number, 90, 1e-9, "λ = 2d")
})

test("selection rules: SC allows all; FCC needs h, k, l all even or all odd", () => {
  const fccAllowed = [
    [1, 1, 1], [2, 0, 0], [0, 0, 2], [2, 2, 0], [3, 1, 1], [2, 2, 2], [-1, 1, -1], [0, -2, 0], [-3, 1, 1],
  ]
  const fccForbidden = [
    [1, 0, 0], [0, -1, 0], [1, 1, 0], [2, 1, 0], [2, 1, 1], [3, 0, 0], [2, 2, 1], [3, 1, 0], [1, -1, 0],
  ]
  for (const [h, k, l] of fccAllowed) {
    assert.equal(P.isAllowed({h, k, l}, "FCC"), true, `FCC (${h}${k}${l})`)
    assert.equal(P.isMixedParity({h, k, l}), false)
  }
  for (const [h, k, l] of fccForbidden) {
    assert.equal(P.isAllowed({h, k, l}, "FCC"), false, `FCC (${h}${k}${l})`)
    assert.equal(P.isMixedParity({h, k, l}), true)
  }
  for (const m of P.enumerateReflections(12)) assert.equal(P.isAllowed(m, "SC"), true)
})

test("candidate set: every (hkl) with 0 < N ≤ 12 is 178 reflections, and N = 7 never occurs", () => {
  const set = P.enumerateReflections(12)
  assert.equal(set.length, 178)
  assert.equal(set.some((m) => P.millerN(m) === 7), false)
})

test("orientation convention at φ = χ = 0: [100] along the beam, [001] up, right-handed", () => {
  const ax = (h: number, k: number, l: number) => P.crystalToLab({x: h, y: k, z: l}, 0, 0)
  assert.deepEqual(ax(1, 0, 0), {x: 0, y: 0, z: -1})
  assert.deepEqual(ax(0, 0, 1), {x: 0, y: 1, z: 0})
  assert.deepEqual(ax(0, 1, 0), {x: -1, y: 0, z: 0})
  const c = P.cross(ax(1, 0, 0), ax(0, 1, 0))
  near(c.x, 0, 1e-12, "a1×a2 x")
  near(c.y, 1, 1e-12, "a1×a2 y")
  near(c.z, 0, 1e-12, "a1×a2 z")
})

test("φ spins about the vertical; χ > 0 tilts the top away from the user", () => {
  // φ = 90°: the far end of [100] swings to the user's left, so the near side went right.
  const a1 = P.crystalToLab({x: 1, y: 0, z: 0}, 90, 0)
  near(a1.x, -1, 1e-12, "[100] x")
  near(a1.z, 0, 1e-12, "[100] z")
  // [001] is the spin axis: unchanged by φ
  const up = P.crystalToLab({x: 0, y: 0, z: 1}, 57, 0)
  near(up.y, 1, 1e-12, "[001] y")
  // χ = 30°: the top tips toward −z (away from the user)
  const top = P.crystalToLab({x: 0, y: 0, z: 1}, 0, 30)
  near(top.y, Math.cos(30 * P.DEG), 1e-12, "top y")
  near(top.z, -Math.sin(30 * P.DEG), 1e-12, "top z")
})

test("the crystal never rolls about the beam: the goniometer axis stays in the vertical plane of the beam", () => {
  for (let i = 0; i < 200; i++) {
    const phi = -180 + 360 * ((i * 0.618034) % 1)
    const chi = -45 + 90 * ((i * 0.414214) % 1)
    const axis = P.crystalToLab({x: 0, y: 0, z: 1}, phi, chi)
    near(axis.x, 0, 1e-12, `axis x at φ=${phi.toFixed(1)}, χ=${chi.toFixed(1)}`)
  }
})

test("criterion 2 geometry: (0 1 0) lights at φ = +11.10°, landing 61.2 cm left of the beam stop on its horizontal line", () => {
  const th = P.braggThetaDeg(A, CU, {h: 0, k: 1, l: 0}) as number
  const r = P.evaluateReflection({h: 0, k: 1, l: 0}, A, CU, th, 0, 1.0)
  assert.equal(r.inCondition, true)
  near(r.delta as number, 0, 1e-9, "δ")
  near((r.wall as P.WallPoint).x, -61.206, 2e-3, "wall x")
  near((r.wall as P.WallPoint).y, 0, 1e-9, "wall y")
  assert.equal(r.onDetector, true)
  // and (0 −1 0) at φ = −11.10°, landing to the right
  const r2 = P.evaluateReflection({h: 0, k: -1, l: 0}, A, CU, -th, 0, 1.0)
  assert.equal(r2.inCondition, true)
  near((r2.wall as P.WallPoint).x, 61.206, 2e-3, "wall x (0 −1 0)")
})

test("mosaic window: lit within 1.0° of θ_B, dark beyond it", () => {
  const m = {h: 0, k: 1, l: 0}
  const th = P.braggThetaDeg(A, CU, m) as number
  assert.equal(P.evaluateReflection(m, A, CU, th + 0.95, 0, 1.0).inCondition, true)
  assert.equal(P.evaluateReflection(m, A, CU, th - 0.95, 0, 1.0).inCondition, true)
  assert.equal(P.evaluateReflection(m, A, CU, th + 1.05, 0, 1.0).inCondition, false)
  assert.equal(P.evaluateReflection(m, A, CU, th - 1.05, 0, 1.0).inCondition, false)
})

test("vector (Laue/Ewald) form: at the solved orientation |k + G| = |k| and k' = k + G is at 2θ_B", () => {
  const cases: Array<[P.Miller, number]> = [
    [{h: 0, k: 1, l: 0}, 0],
    [{h: 1, k: 1, l: 0}, 0],
    [{h: 1, k: 1, l: 1}, 0],
    [{h: -1, k: 2, l: 1}, 20],
    [{h: 2, k: 0, l: -2}, 30], // (unreachable at χ = −30°: the solver correctly returns null there)
    [{h: 3, k: 1, l: 1}, 12],
  ]
  for (const [m, chi] of cases) {
    const phi = P.solvePhiForCondition(m, A, CU, chi, 0)
    assert.notEqual(phi, null, `solution for ${JSON.stringify(m)}`)
    const p = phi as number
    near(P.laueMismatch(m, A, CU, p, chi), 0, 1e-12, `|k+G|−|k| for ${JSON.stringify(m)}`)
    const k = P.kIncident(CU)
    const kp = P.kDiffracted(m, A, CU, p, chi)
    const ang = Math.acos(P.dot(k, kp) / (P.len(k) * P.len(kp))) / P.DEG
    const th = P.braggThetaDeg(A, CU, m) as number
    near(ang, 2 * th, 1e-8, `angle(k, k') for ${JSON.stringify(m)}`)
    // drawn direction (exact 2θ at the azimuth of k + G) equals k' at the exact condition
    const r = P.evaluateReflection(m, A, CU, p, chi, 1.0)
    const drawn = P.diffractedDir(2 * th, r.azimuth as P.V3)
    const kpn = P.normalize(kp)
    near(drawn.x, kpn.x, 1e-9, "dir x")
    near(drawn.y, kpn.y, 1e-9, "dir y")
    near(drawn.z, kpn.z, 1e-9, "dir z")
  }
})

test("glancing-angle test and Ewald mismatch agree in sign: α > θ_B ⇔ |k + G| < |k|", () => {
  const m = {h: 1, k: 1, l: 1}
  for (let phi = -180; phi <= 180; phi += 7.3) {
    for (const chi of [-40, -10, 0, 15, 35]) {
      const r = P.evaluateReflection(m, A, CU, phi, chi, 1.0)
      const mis = P.laueMismatch(m, A, CU, phi, chi)
      if (Math.abs(r.delta as number) < 1e-6) continue
      assert.equal((r.delta as number) > 0, mis < 0, `φ=${phi}, χ=${chi}`)
    }
  }
})

test("solver: (111) at χ = 0 reaches its condition at φ = 69.10° or −159.10° (hand-computed)", () => {
  const m = {h: 1, k: 1, l: 1}
  near(P.solvePhiForCondition(m, A, CU, 0, 60) as number, 69.1015, 1e-3, "near 60°")
  near(P.solvePhiForCondition(m, A, CU, 0, -150) as number, -159.1015, 1e-3, "near −150°")
})

test("solver agrees with a brute-force scan for every candidate at several tilts", () => {
  for (const m of P.enumerateReflections(12)) {
    for (const chi of [-30, 0, 25]) {
      const th = P.braggThetaDeg(A, CU, m)
      const phi = P.solvePhiForCondition(m, A, CU, chi, 0)
      // brute force: is there any φ on a 0.05° grid within 0.05° of the condition?
      let best = Infinity
      for (let p = -180; p < 180; p += 0.05) {
        const r = P.evaluateReflection(m, A, CU, p, chi, 1.0)
        if (r.delta !== null) best = Math.min(best, Math.abs(r.delta))
      }
      if (th === null) {
        assert.equal(phi, null)
        continue
      }
      if (phi === null) assert.ok(best > 0.01, `missed solution for ${JSON.stringify(m)} at χ=${chi}`)
      else near(P.evaluateReflection(m, A, CU, phi, chi, 1.0).delta as number, 0, 1e-9, `δ ${JSON.stringify(m)}`)
    }
  }
})

test("detector: the wall is 4 m × 2.6 m around the beam stop; 2θ ≥ 90° never reaches it", () => {
  const right = {x: 1, y: 0, z: 0}
  assert.equal(P.wallHit(90, right), null)
  assert.equal(P.wallHit(120, right), null)
  near((P.wallHit(45, right) as P.WallPoint).x, 150, 1e-9, "45° lands 1.5 m out")
  assert.equal(P.isOnDetector({x: 199, y: 0}), true)
  assert.equal(P.isOnDetector({x: 201, y: 0}), false)
  assert.equal(P.isOnDetector({x: 0, y: -101}), false)
  assert.equal(P.isOnDetector({x: 0, y: 159}), true)
})

test("materials: the one whose a is closest to the round's a", () => {
  assert.equal(P.closestMaterial("FCC", 3.7).name, "copper")
  assert.equal(P.closestMaterial("FCC", 4.0).name, "aluminium")
  assert.equal(P.closestMaterial("FCC", 5.2).name, "rock salt")
  assert.equal(P.closestMaterial("SC", 3.5).name, "α-polonium")
  assert.equal(P.closestMaterial("SC", 4.6).name.startsWith("caesium chloride"), true)
})

test("family keys group symmetry equivalents", () => {
  assert.equal(P.familyKey({h: 0, k: -1, l: 0}), "100")
  assert.equal(P.familyKey({h: -1, k: 0, l: 1}), "110")
  assert.equal(P.familyKey({h: 1, k: -2, l: 2}), "221")
  assert.equal(P.familyKey({h: 0, k: 3, l: 0}), "300")
})
