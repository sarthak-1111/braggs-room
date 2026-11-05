/**
 * BraggPhysics.ts: X-ray diffraction geometry for Bragg's Room.
 *
 * Pure TypeScript with no Lens Studio globals, so it is unit-tested from the
 * command line (see tests/). Every number the Lens draws comes from here.
 *
 * Units: lengths in Å and wavevectors in Å⁻¹ (crystallographic convention,
 * |k| = 1/λ and G = (h, k, l)/a with no 2π); positions in the room in cm;
 * angles in degrees at the API surface.
 *
 * Lab frame (the room's local frame, matching Lens Studio):
 *   +x = the user's right, +y = up, +z = toward the user.
 *   The incident beam travels along −z, away from the user, toward the wall.
 *
 * Crystal frame: the cubic axes [100], [010], [001].
 *   At φ = χ = 0: [100] points along the beam (−z), [001] points up (+y),
 *   and [010] = [001] × [100] points to the user's left (−x).
 *
 * Orientation (a two-circle goniometer): R = R_χ · R_φ
 *   R_φ: spin by φ about the goniometer's vertical axis (+y before tilting).
 *        φ > 0 turns the near side of the crystal to the user's right
 *        (anticlockwise seen from above).
 *   R_χ: tilt by χ about the lab horizontal axis perpendicular to the beam (x).
 *        χ > 0 tilts the top of the crystal away from the user, toward the wall
 *        (a right-handed rotation by −χ about +x).
 *   There is no third angle, so the crystal can never roll about the beam.
 *
 * Bragg / Laue condition, in vector form:
 *   k = (1/λ) b̂ with b̂ = (0, 0, −1); G_lab = R · G_crystal.
 *   A reflection is exactly in condition when |k + G| = |k|. That is the same as
 *   the signed glancing angle α between the beam and the (hkl) planes,
 *   sin α = −b̂·Ĝ, equalling θ_B, where sin θ_B = λ|G|/2 = λ/2d.
 *   The Lens lights a reflection when |α − θ_B| ≤ the mosaic tolerance (1.0°),
 *   so spots can be found by hand.
 *   Diffracted wavevector: k' = k + G. Inside the tolerance |k + G| ≠ |k| exactly,
 *   so the spot is drawn at exactly 2θ_B from the beam, at the azimuth of k + G
 *   around the beam (equal to the azimuth of G's component perpendicular to the beam).
 */

export const DEG = Math.PI / 180

export interface V3 {
  x: number
  y: number
  z: number
}

export interface Miller {
  h: number
  k: number
  l: number
}

export type Lattice = "SC" | "FCC"

export const BEAM_DIR: V3 = {x: 0, y: 0, z: -1}

// ---------------------------------------------------------------- vectors

export function v3(x: number, y: number, z: number): V3 {
  return {x, y, z}
}
export function add(a: V3, b: V3): V3 {
  return {x: a.x + b.x, y: a.y + b.y, z: a.z + b.z}
}
export function sub(a: V3, b: V3): V3 {
  return {x: a.x - b.x, y: a.y - b.y, z: a.z - b.z}
}
export function scale(a: V3, s: number): V3 {
  return {x: a.x * s, y: a.y * s, z: a.z * s}
}
export function dot(a: V3, b: V3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}
export function cross(a: V3, b: V3): V3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}
export function len(a: V3): number {
  return Math.sqrt(dot(a, a))
}
export function normalize(a: V3): V3 {
  const n = len(a)
  return n > 0 ? scale(a, 1 / n) : {x: 0, y: 0, z: 0}
}
function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

/** Right-handed rotation by `deg` about +y. +z goes toward +x. */
export function rotY(v: V3, deg: number): V3 {
  const c = Math.cos(deg * DEG)
  const s = Math.sin(deg * DEG)
  return {x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c}
}

/** Right-handed rotation by `deg` about +x. +y goes toward +z. */
export function rotX(v: V3, deg: number): V3 {
  const c = Math.cos(deg * DEG)
  const s = Math.sin(deg * DEG)
  return {x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c}
}

// ---------------------------------------------------------------- crystal frame

/** Lab directions of the crystal axes at φ = χ = 0. */
export const CRYSTAL_AXES_AT_ZERO = {
  a1: {x: 0, y: 0, z: -1} as V3, // [100] along the beam
  a2: {x: -1, y: 0, z: 0} as V3, // [010] to the user's left
  a3: {x: 0, y: 1, z: 0} as V3, // [001] up
}

/** Crystal-frame vector (components along [100], [010], [001]) to the lab frame at φ = χ = 0. */
export function crystalToLabAtZero(c: V3): V3 {
  const {a1, a2, a3} = CRYSTAL_AXES_AT_ZERO
  return add(add(scale(a1, c.x), scale(a2, c.y)), scale(a3, c.z))
}

/** Apply the goniometer orientation R = R_χ · R_φ to a lab vector given at φ = χ = 0. */
export function orient(vAtZero: V3, phiDeg: number, chiDeg: number): V3 {
  return rotX(rotY(vAtZero, phiDeg), -chiDeg)
}

/** Crystal-frame vector to the lab frame at orientation (φ, χ). */
export function crystalToLab(c: V3, phiDeg: number, chiDeg: number): V3 {
  return orient(crystalToLabAtZero(c), phiDeg, chiDeg)
}

// ---------------------------------------------------------------- reciprocal lattice

export function millerN(m: Miller): number {
  return m.h * m.h + m.k * m.k + m.l * m.l
}

/** Interplanar spacing d = a / √(h² + k² + l²), in Å. */
export function dSpacing(a: number, m: Miller): number {
  return a / Math.sqrt(millerN(m))
}

/** |G| = 1/d, in Å⁻¹. */
export function gMagnitude(a: number, m: Miller): number {
  return Math.sqrt(millerN(m)) / a
}

/** Reciprocal lattice vector G = (h, k, l)/a in the lab frame at orientation (φ, χ). */
export function gLab(m: Miller, a: number, phiDeg: number, chiDeg: number): V3 {
  return crystalToLab({x: m.h / a, y: m.k / a, z: m.l / a}, phiDeg, chiDeg)
}

/** Incident wavevector k = (1/λ) b̂. */
export function kIncident(lambda: number): V3 {
  return scale(BEAM_DIR, 1 / lambda)
}

/** Diffracted wavevector k' = k + G (Laue form). */
export function kDiffracted(m: Miller, a: number, lambda: number, phiDeg: number, chiDeg: number): V3 {
  return add(kIncident(lambda), gLab(m, a, phiDeg, chiDeg))
}

/** Ewald-sphere mismatch |k + G| − |k|, in Å⁻¹. Zero exactly at the Bragg condition. */
export function laueMismatch(m: Miller, a: number, lambda: number, phiDeg: number, chiDeg: number): number {
  return len(kDiffracted(m, a, lambda, phiDeg, chiDeg)) - 1 / lambda
}

/** Selection rule. SC allows every (hkl); FCC allows h, k, l all even or all odd. */
export function isAllowed(m: Miller, lattice: Lattice): boolean {
  if (lattice === "SC") return true
  const ph = Math.abs(m.h) % 2
  const pk = Math.abs(m.k) % 2
  const pl = Math.abs(m.l) % 2
  return ph === pk && pk === pl
}

/** Mixed parity: neither all even nor all odd. These are the reflections FCC forbids. */
export function isMixedParity(m: Miller): boolean {
  return !isAllowed(m, "FCC")
}

/** Bragg angle θ_B in degrees, or null when λ > 2d (the reflection can never occur). */
export function braggThetaDeg(a: number, lambda: number, m: Miller): number | null {
  const s = (lambda * gMagnitude(a, m)) / 2
  if (s > 1) return null
  return Math.asin(s) / DEG
}

/** Signed glancing angle α (degrees) between the beam and the (hkl) planes: sin α = −b̂·Ĝ. */
export function glancingAngleDeg(m: Miller, a: number, phiDeg: number, chiDeg: number): number {
  const g = gLab(m, a, phiDeg, chiDeg)
  const c = dot(BEAM_DIR, g) / len(g)
  return Math.asin(clamp(-c, -1, 1)) / DEG
}

// ---------------------------------------------------------------- detector

export interface DetectorConfig {
  /** Crystal-to-wall distance along the beam, cm. */
  distanceCm: number
  /** Detector extent relative to the beam stop, cm (x to the right, y up). */
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Brief: wall 1.5 m beyond the crystal; detector 4 m × 2.6 m, 1 m below to 1.6 m above beam height. */
export const DEFAULT_DETECTOR: DetectorConfig = {
  distanceCm: 150,
  minX: -200,
  maxX: 200,
  minY: -100,
  maxY: 160,
}

export interface WallPoint {
  /** cm to the right of the beam stop */
  x: number
  /** cm above the beam stop */
  y: number
}

/** Unit vector of G's component perpendicular to the beam, or null if G is along the beam. */
export function azimuthDir(g: V3): V3 | null {
  const perp = sub(g, scale(BEAM_DIR, dot(g, BEAM_DIR)))
  const n = len(perp)
  if (n < 1e-12) return null
  return scale(perp, 1 / n)
}

/** Unit direction of a diffracted ray at scattering angle 2θ and azimuth û (û ⊥ beam). */
export function diffractedDir(twoThetaDeg: number, u: V3): V3 {
  return add(scale(BEAM_DIR, Math.cos(twoThetaDeg * DEG)), scale(u, Math.sin(twoThetaDeg * DEG)))
}

/**
 * Where a ray at scattering angle 2θ and azimuth û meets the wall (a plane
 * perpendicular to the beam, distanceCm beyond the crystal). The offset from the
 * beam stop is L·tan 2θ along û. Returns null for 2θ ≥ 90° (the ray never reaches the wall).
 */
export function wallHit(twoThetaDeg: number, u: V3, det: DetectorConfig = DEFAULT_DETECTOR): WallPoint | null {
  if (twoThetaDeg >= 90) return null
  const r = det.distanceCm * Math.tan(twoThetaDeg * DEG)
  return {x: r * u.x, y: r * u.y}
}

export function isOnDetector(p: WallPoint | null, det: DetectorConfig = DEFAULT_DETECTOR): boolean {
  if (!p) return false
  return p.x >= det.minX && p.x <= det.maxX && p.y >= det.minY && p.y <= det.maxY
}

// ---------------------------------------------------------------- evaluating a reflection

export interface ReflectionGeometry {
  m: Miller
  N: number
  dSpacing: number
  /** Bragg angle, degrees; null when λ > 2d. */
  thetaB: number | null
  twoThetaB: number | null
  /** Signed glancing angle between beam and planes, degrees. */
  alpha: number
  /** α − θ_B, degrees; null when λ > 2d. */
  delta: number | null
  /** |α − θ_B| ≤ tolerance. Says nothing about whether the lattice allows it. */
  inCondition: boolean
  /** Azimuth of k + G around the beam (unit, lab frame), null if G ∥ beam. */
  azimuth: V3 | null
  /** Spot position on the wall at exactly 2θ_B, relative to the beam stop (cm). */
  wall: WallPoint | null
  onDetector: boolean
}

export function evaluateReflection(
  m: Miller,
  a: number,
  lambda: number,
  phiDeg: number,
  chiDeg: number,
  toleranceDeg: number,
  det: DetectorConfig = DEFAULT_DETECTOR,
): ReflectionGeometry {
  const g = gLab(m, a, phiDeg, chiDeg)
  const thetaB = braggThetaDeg(a, lambda, m)
  const alpha = Math.asin(clamp(-dot(BEAM_DIR, g) / len(g), -1, 1)) / DEG
  const delta = thetaB === null ? null : alpha - thetaB
  const azimuth = azimuthDir(g)
  const twoThetaB = thetaB === null ? null : 2 * thetaB
  const wall = twoThetaB !== null && azimuth ? wallHit(twoThetaB, azimuth, det) : null
  return {
    m,
    N: millerN(m),
    dSpacing: dSpacing(a, m),
    thetaB,
    twoThetaB,
    alpha,
    delta,
    inCondition: delta !== null && Math.abs(delta) <= toleranceDeg,
    azimuth,
    wall,
    onDetector: isOnDetector(wall, det),
  }
}

// ---------------------------------------------------------------- solving for an orientation

function wrapDeg(d: number): number {
  let x = ((d + 180) % 360 + 360) % 360 - 180
  if (x === -180) x = 180
  return x
}

/**
 * φ (degrees) that puts (hkl) exactly in its Bragg condition at tilt χ, choosing
 * the solution nearest phiNearDeg. Returns null when no spin about the vertical
 * axis reaches the condition at this tilt, or when λ > 2d.
 *
 * b̂·G(φ) = C + A cos φ + B sin φ, because R_φ is a rotation about y.
 * The condition is b̂·G = −|G| sin θ_B.
 */
export function solvePhiForCondition(
  m: Miller,
  a: number,
  lambda: number,
  chiDeg: number,
  phiNearDeg: number,
): number | null {
  const thetaB = braggThetaDeg(a, lambda, m)
  if (thetaB === null) return null
  const f = (phi: number) => dot(BEAM_DIR, gLab(m, a, phi, chiDeg))
  const g0 = crystalToLabAtZero({x: m.h / a, y: m.k / a, z: m.l / a})
  // C is the part of b̂·G that the φ spin cannot change (G's component along the spin axis).
  const C = dot(BEAM_DIR, rotX({x: 0, y: g0.y, z: 0}, -chiDeg))
  const A = f(0) - C
  const B = f(90) - C
  const D = -gMagnitude(a, m) * Math.sin(thetaB * DEG) - C
  const R = Math.sqrt(A * A + B * B)
  if (R < 1e-12 || Math.abs(D) > R) return null
  const phi0 = Math.atan2(B, A) / DEG
  const half = Math.acos(clamp(D / R, -1, 1)) / DEG
  const s1 = wrapDeg(phi0 + half)
  const s2 = wrapDeg(phi0 - half)
  const d1 = Math.abs(wrapDeg(s1 - phiNearDeg))
  const d2 = Math.abs(wrapDeg(s2 - phiNearDeg))
  // Return the solution expressed close to phiNear, so callers can keep φ continuous.
  const best = d1 <= d2 ? s1 : s2
  return phiNearDeg + wrapDeg(best - phiNearDeg)
}

// ---------------------------------------------------------------- candidate sets

/** All (hkl) with 0 < h² + k² + l² ≤ maxN. With maxN = 12 that runs up to (222): 178 reflections. */
export function enumerateReflections(maxN: number): Miller[] {
  const out: Miller[] = []
  const r = Math.floor(Math.sqrt(maxN))
  for (let h = -r; h <= r; h++)
    for (let k = -r; k <= r; k++)
      for (let l = -r; l <= r; l++) {
        const n = h * h + k * k + l * l
        if (n > 0 && n <= maxN) out.push({h, k, l})
      }
  return out
}

/** Family label: absolute indices sorted descending, e.g. (0, −1, 0) → "100", (1, 2, 2) → "221". */
export function familyKey(m: Miller): string {
  const v = [Math.abs(m.h), Math.abs(m.k), Math.abs(m.l)].sort((p, q) => q - p)
  return `${v[0]}${v[1]}${v[2]}`
}

export function millerKey(m: Miller): string {
  return `${m.h},${m.k},${m.l}`
}

// ---------------------------------------------------------------- materials

export interface Material {
  name: string
  lattice: Lattice
  a: number
}

/** Real materials named on a correct verdict (brief: the one whose a is closest to the round's a). */
export const MATERIALS: Material[] = [
  {name: "copper", lattice: "FCC", a: 3.61},
  {name: "aluminium", lattice: "FCC", a: 4.05},
  {name: "rock salt", lattice: "FCC", a: 5.64},
  {name: "α-polonium", lattice: "SC", a: 3.35},
  {name: "caesium chloride (primitive cubic lattice)", lattice: "SC", a: 4.12},
]

export function closestMaterial(lattice: Lattice, a: number): Material {
  let best: Material | null = null
  for (const mat of MATERIALS) {
    if (mat.lattice !== lattice) continue
    if (!best || Math.abs(mat.a - a) < Math.abs(best.a - a)) best = mat
  }
  return best as Material
}
