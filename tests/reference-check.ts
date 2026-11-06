/**
 * Checks the Lens's physics against a measured powder pattern of real aluminium. Run: npm run reference
 *
 * Reference: H. E. Swanson & E. Tatge, Standard X-ray Diffraction Powder Patterns, NBS Circular 539, Vol. I
 * (National Bureau of Standards, 1953), "Aluminum (Cubic)", Table 3, Swanson and Tatge column (Cu, 1.5405 Å, 23 °C;
 * a = 4.0494 Å). https://doi.org/10.6028/NBS.CIRC.539v1 (free PDF at nvlpubs.nist.gov). d values as printed.
 *
 * Three checks, all with the functions the Lens itself uses (Assets/Scripts/BraggPhysics.ts):
 *  1. Selection rule: the reflections the FCC rule allows up to (422) are exactly the lines in the measured pattern.
 *  2. d-spacings: the Lens's aluminium (a = 4.05 Å, the value it names on an FCC verdict) against the measured d.
 *  3. Angles through the vector path: for each line, the crystal is turned into its exact Bragg condition
 *     (solvePhiForCondition), and the angle between the diffracted ray k + G and the beam is compared with the
 *     2θ the measured d gives at the measurement's wavelength.
 * Exits with code 1 if any check fails. Not part of `npm test`, so the unit-test count stays as reported.
 */
import * as P from "../Assets/Scripts/BraggPhysics"

const LAMBDA = 1.5405 // Å, Cu Kα as used for the measurement
const MEASURED: Array<[string, P.Miller, number]> = [
  ["111", {h: 1, k: 1, l: 1}, 2.338],
  ["200", {h: 2, k: 0, l: 0}, 2.024],
  ["220", {h: 2, k: 2, l: 0}, 1.431],
  ["311", {h: 3, k: 1, l: 1}, 1.221],
  ["222", {h: 2, k: 2, l: 2}, 1.169],
  ["400", {h: 4, k: 0, l: 0}, 1.0124],
  ["331", {h: 3, k: 3, l: 1}, 0.9289],
  ["420", {h: 4, k: 2, l: 0}, 0.9055],
  ["422", {h: 4, k: 2, l: 2}, 0.8266],
]
const D_TOL = 0.002 // Å: the measured d are printed to 3–4 decimals
const TT_TOL = 0.05 // degrees

const al = P.MATERIALS.find((m) => m.name === "aluminium")
if (!al || al.lattice !== "FCC") throw new Error("aluminium is missing from MATERIALS")
const a = al.a
let failures = 0
const fail = (msg: string) => {
  failures++
  console.log(`FAIL  ${msg}`)
}

// 1. selection rule
const maxN = Math.max(...MEASURED.map(([, m]) => P.millerN(m)))
const allowedN = new Set<number>()
for (const m of P.enumerateReflections(maxN)) if (P.isAllowed(m, "FCC")) allowedN.add(P.millerN(m))
const measuredN = new Set(MEASURED.map(([, m]) => P.millerN(m)))
const allowedList = [...allowedN].sort((x, y) => x - y)
const measuredList = [...measuredN].sort((x, y) => x - y)
console.log(`FCC-allowed h²+k²+l² up to ${maxN}: ${allowedList.join(", ")}`)
console.log(`lines in the measured pattern:     ${measuredList.join(", ")}`)
if (allowedList.join() !== measuredList.join()) fail("the FCC selection rule does not match the measured lines")
const forbidden = [...Array(maxN).keys()].map((i) => i + 1).filter((n) => !allowedN.has(n) && P.enumerateReflections(n).some((m) => P.millerN(m) === n))
console.log(`forbidden by FCC (absent from the measurement): ${forbidden.join(", ")}\n`)

// 2 and 3. d-spacings and angles
console.log(`Aluminium in the Lens: FCC, a = ${a.toFixed(2)} Å. Measured: a = 4.0494 Å. λ = ${LAMBDA} Å (Cu Kα).`)
console.log("The last column repeats Δ2θ with the measured average cell (a = 4.0494 Å); what's left is the scatter of the")
console.log("measured lines themselves (their per-line a runs from 4.047 to 4.050 Å in the table).")
console.log("hkl   d measured  d Lens    Δd (Å)    2θ from measured d  2θ Lens (k + G)  Δ2θ (°)   |k+G|−|k| (Å⁻¹)  Δ2θ at 4.0494")
for (const [name, m, dMeas] of MEASURED) {
  const dLens = P.dSpacing(a, m)
  const ttMeas = (2 * Math.asin(LAMBDA / (2 * dMeas))) / P.DEG
  // turn the crystal into the exact condition; some reflections need a tilt to be reachable by the spin
  let phi: number | null = null
  let chi = 0
  for (const c of [0, 10, 20, 30, 40, -10, -20, -30, -40]) {
    phi = P.solvePhiForCondition(m, a, LAMBDA, c, 0)
    if (phi !== null) {
      chi = c
      break
    }
  }
  if (phi === null) {
    fail(`(${name}) no orientation reaches the Bragg condition`)
    continue
  }
  const k = P.kIncident(LAMBDA)
  const kp = P.kDiffracted(m, a, LAMBDA, phi, chi)
  const ttLens = Math.acos(P.dot(k, kp) / (P.len(k) * P.len(kp))) / P.DEG
  const mismatch = P.laueMismatch(m, a, LAMBDA, phi, chi)
  const dd = dLens - dMeas
  const dtt = ttLens - ttMeas
  const ttCell = 2 * (P.braggThetaDeg(4.0494, LAMBDA, m) as number)
  const sgn = (x: number, n: number) => `${x >= 0 ? "+" : ""}${x.toFixed(n)}`
  console.log(
    `${name}   ${dMeas.toFixed(4)}      ${dLens.toFixed(4)}   ${sgn(dd, 4)}   ${ttMeas.toFixed(3).padStart(7)}             ${ttLens.toFixed(3).padStart(7)}          ${sgn(dtt, 3)}    ${mismatch.toExponential(1).padStart(8)}         ${sgn(ttCell - ttMeas, 3)}`,
  )
  if (Math.abs(dd) > D_TOL) fail(`(${name}) d differs by ${dd.toFixed(4)} Å`)
  if (Math.abs(dtt) > TT_TOL) fail(`(${name}) 2θ differs by ${dtt.toFixed(3)}°`)
  if (Math.abs(mismatch) > 1e-9) fail(`(${name}) k + G is not on the Ewald sphere`)
}
console.log(failures === 0 ? `\nAll checks pass (|Δd| ≤ ${D_TOL} Å, |Δ2θ| ≤ ${TT_TOL}°).` : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
