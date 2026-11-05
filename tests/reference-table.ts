/** Prints the reference table quoted in devpost/build-report.md. Run: npm run table */
import * as P from "../Assets/Scripts/BraggPhysics"

const rows: Array<[string, P.Miller, number, number]> = [
  ["(100)", {h: 1, k: 0, l: 0}, 4.0, 1.54],
  ["(110)", {h: 1, k: 1, l: 0}, 4.0, 1.54],
  ["(111)", {h: 1, k: 1, l: 1}, 4.0, 1.54],
  ["(200)", {h: 2, k: 0, l: 0}, 4.0, 1.54],
  ["(010)", {h: 0, k: 1, l: 0}, 4.0, 0.71],
]
console.log("hkl    a(Å)  λ(Å)   d(Å)     θ(°)      2θ(°)     L·tan2θ (cm, L = 150)")
for (const [name, m, a, lam] of rows) {
  const th = P.braggThetaDeg(a, lam, m) as number
  console.log(
    `${name}  ${a.toFixed(2)}  ${lam.toFixed(2)}   ${P.dSpacing(a, m).toFixed(4)}   ${th.toFixed(4)}   ${(2 * th).toFixed(4)}   ${(150 * Math.tan(2 * th * P.DEG)).toFixed(3)}`,
  )
}
const phi = P.solvePhiForCondition({h: 0, k: 1, l: 0}, 4.0, 1.54, 0, 0) as number
const r = P.evaluateReflection({h: 0, k: 1, l: 0}, 4.0, 1.54, phi, 0, 1.0)
console.log(`(0 1 0) exact condition at φ = ${phi.toFixed(4)}°, χ = 0: wall (x, y) = (${r.wall!.x.toFixed(3)}, ${r.wall!.y.toFixed(3)}) cm, |k+G|−|k| = ${P.laueMismatch({h: 0, k: 1, l: 0}, 4.0, 1.54, phi, 0).toExponential(2)} Å⁻¹`)
