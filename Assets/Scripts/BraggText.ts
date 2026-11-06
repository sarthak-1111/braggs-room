/**
 * BraggText.ts: short, glanceable strings for labels, readouts and the evidence board.
 * Pure TypeScript (no Lens globals), unit-tested from the command line.
 */
import {Miller, familyKey} from "./BraggPhysics"

/** U+2212 MINUS SIGN, used for negative indices and angles. */
export const MINUS = "−"

export interface XraySource {
  name: string
  lambda: number
}

/** Common lab sources marked on the wavelength slider (Å). */
export const SOURCES: XraySource[] = [
  {name: "Mo Kα", lambda: 0.71},
  {name: "Cu Kα", lambda: 1.54},
  {name: "Co Kα", lambda: 1.79},
  {name: "Cr Kα", lambda: 2.29},
]

function signed(n: number): string {
  return n < 0 ? MINUS + String(-n) : String(n)
}

/** Round to `digits` decimals without ever printing "-0.0". */
export function fmtNumber(x: number, digits = 1): string {
  const p = Math.pow(10, digits)
  let v = Math.round(x * p) / p
  if (v === 0) v = 0 // drops negative zero
  const s = Math.abs(v).toFixed(digits)
  return v < 0 ? MINUS + s : s
}

export function fmtDeg(x: number, digits = 1): string {
  return fmtNumber(x, digits) + "°"
}

/** A specific reflection: "(0 −1 0)". */
export function fmtMiller(m: Miller): string {
  return `(${signed(m.h)} ${signed(m.k)} ${signed(m.l)})`
}

/** A family of symmetry equivalents: "(100)". */
export function fmtFamily(m: Miller): string {
  return `(${familyKey(m)})`
}

/** Free-mode spot label: two short lines. */
export function spotLabelFree(m: Miller, thetaDeg: number, twoThetaDeg: number): {title: string; detail: string} {
  return {
    title: fmtMiller(m),
    detail: `θ ${fmtDeg(thetaDeg)}  2θ ${fmtDeg(twoThetaDeg)}`,
  }
}

/** Mission-mode spot label: 2θ only. */
export function spotLabelMission(twoThetaDeg: number): string {
  return `2θ ${fmtDeg(twoThetaDeg)}`
}

/** "λ 1.54 Å · Cu Kα" when on a marked line, else "λ 1.60 Å". */
export function fmtLambda(lambda: number): string {
  const base = `λ ${fmtNumber(lambda, 2)} Å`
  const src = SOURCES.find((s) => Math.abs(s.lambda - lambda) < 0.005)
  return src ? `${base} · ${src.name}` : base
}

export function fmtPhi(phiDeg: number): string {
  return `φ ${fmtDeg(phiDeg)}`
}

export function fmtChi(chiDeg: number): string {
  return `χ ${fmtDeg(chiDeg)}`
}

export function fmtLatticeParam(a: number): string {
  return `a = ${fmtNumber(a, 2)} Å`
}

/** Off-wall hint: names the reflection by 2θ only, so it never gives away (hkl) in a mission. */
export function fmtOffWallHint(twoThetaDeg: number): string {
  return `A reflection at 2θ ${fmtDeg(twoThetaDeg)} is lit, but misses the wall.`
}

/**
 * The mission's question for the evidence board: "Simple cubic or face-centred cubic? Find 3 distinct
 * reflections." while fewer than `needed` distinct reflections are logged, then the question alone.
 */
export function fmtMissionQuestion(found: number, needed: number): string {
  return found >= needed ? TEXT.missionQuestion : `${TEXT.missionQuestion} Find ${needed} distinct reflections.`
}

/** Small label at the beam stop: "wall 150 cm from the crystal". */
export function fmtWallDistance(distanceCm: number): string {
  return `wall ${fmtNumber(distanceCm, 0)} cm from the crystal`
}

export const TEXT = {
  intro: "Drag the crystal. Watch the wall.",
  atomsNotToScale: "atoms not to scale",
  mosaic: "mosaic spread exaggerated (1.0°)",
  absence100: "(100) Bragg condition reached: no spot",
  absence110: "(110) Bragg condition reached: no spot",
  /** The mission's question, on the evidence board until the verdict is correct (see fmtMissionQuestion). */
  missionQuestion: "Simple cubic or face-centred cubic?",
  startMission: "Start mission",
  backToFree: "Back to free mode",
  verdictSC: "Simple cubic",
  verdictFCC: "Face-centred cubic",
  predict: "Predict (hkl)",
  reset: "Reset orientation",
}
