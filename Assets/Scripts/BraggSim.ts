/**
 * BraggSim.ts: the whole experiment as a deterministic state machine.
 *
 * Pure TypeScript (no Lens globals), unit-tested from the command line. The Lens
 * scripts feed it input (drag deltas, slider, buttons), call step() once per
 * frame, and draw the SimFrame it returns. Nothing in the scene decides physics.
 *
 * Free mode: SC (or FCC by toggle), a = 4.0 Å, λ = 1.54 Å.
 * Mission: a mystery SC or FCC crystal, a ∈ [3.3, 5.7] Å, starting at λ = 0.71 Å.
 *
 * Fairness rule (brief, done criterion 4): the guide arrow and the slowdown use
 * only a, λ, the orientation and the full simple-cubic candidate set in mission
 * mode. They never read the lattice type, so they behave identically in SC and
 * FCC rounds.
 */
import {
  DEFAULT_DETECTOR,
  DetectorConfig,
  Lattice,
  Miller,
  ReflectionGeometry,
  WallPoint,
  braggThetaDeg,
  closestMaterial,
  enumerateReflections,
  evaluateReflection,
  familyKey,
  glancingAngleDeg,
  isAllowed,
  isMixedParity,
  millerKey,
  millerN,
  solvePhiForCondition,
} from "./BraggPhysics"
import {
  TEXT,
  fmtChi,
  fmtDeg,
  fmtFamily,
  fmtLambda,
  fmtLatticeParam,
  fmtMiller,
  fmtNumber,
  fmtPhi,
  spotLabelFree,
  spotLabelMission,
} from "./BraggText"

export type Mode = "free" | "mission"

export interface SimConfig {
  /** Mosaic tolerance: a reflection lights when |α − θ_B| ≤ this (degrees). */
  toleranceDeg: number
  /** The guide arrow appears within this many degrees of a reflection. */
  guideWindowDeg: number
  /** Rotation slows within this many degrees of a reflection. */
  slowWindowDeg: number
  /** Drag speed multiplier inside the slow window. */
  slowFactor: number
  /** Tilt limit, ±degrees. */
  chiLimitDeg: number
  /** Reflections modelled: all (hkl) with 0 < h² + k² + l² ≤ maxN. */
  maxN: number
  lambdaMin: number
  lambdaMax: number
  freeLambda: number
  missionLambda: number
  freeA: number
  missionAMin: number
  missionAMax: number
  /** Distinct d-spacings needed before the verdict buttons unlock. */
  verdictMinDistinct: number
  detector: DetectorConfig
  /** Largest orientation step (degrees) evaluated at once while dragging. */
  dragSubstepDeg: number
  /** Largest wavelength step (Å) evaluated at once while sliding λ. */
  lambdaSubstep: number
  /** Most lines the evidence board shows. */
  boardMaxLines: number
}

export const DEFAULT_CONFIG: SimConfig = {
  toleranceDeg: 1.0,
  guideWindowDeg: 4.0,
  slowWindowDeg: 2.0,
  slowFactor: 0.5,
  chiLimitDeg: 45,
  maxN: 12,
  lambdaMin: 0.7,
  lambdaMax: 2.3,
  freeLambda: 1.54,
  missionLambda: 0.71,
  freeA: 4.0,
  missionAMin: 3.3,
  missionAMax: 5.7,
  verdictMinDistinct: 3,
  detector: DEFAULT_DETECTOR,
  dragSubstepDeg: 0.25,
  lambdaSubstep: 0.01,
  boardMaxLines: 8,
}

export interface SpotView {
  key: string
  m: Miller
  N: number
  thetaDeg: number
  twoThetaDeg: number
  /** cm from the beam stop on the wall (x right, y up). */
  wall: WallPoint
  /** "(0 1 0)" in free mode or after a correct verdict; "" while the mission is unsolved. */
  title: string
  /** "θ 11.1°  2θ 22.2°" in free mode; "2θ 14.3°" in mission mode. */
  detail: string
  /** In newlyLit only: true the first time this (hkl) is ever seen this session or round. */
  firstTime: boolean
}

export interface GhostView {
  key: string
  m: Miller
  wall: WallPoint
  twoThetaDeg: number
  label: string
}

export interface RingView {
  m: Miller
  label: string
  reachable: boolean
  twoThetaDeg: number | null
  /** Ring radius on the wall around the beam stop, cm; null if 2θ ≥ 90° or unreachable. */
  radiusCm: number | null
}

export type GuideAxis = "phi" | "chi"

export interface GuideView {
  visible: boolean
  /** Which goniometer circle to turn. phi: drag left/right. chi: drag up/down. */
  axis: GuideAxis
  /** +1: drag right (phi) or up (chi). −1: drag left or down. */
  sign: 1 | -1
  /** Signed distance from the nearest condition, degrees (α − θ_B). */
  deltaDeg: number
}

export interface BoardView {
  title: string
  status: string
  lines: string[]
  /** Index into lines of the evidence a wrong verdict points at; −1 for none. */
  highlightIndex: number
}

export type FeedbackKind = "correct" | "wrong" | "insufficient"

export interface Feedback {
  kind: FeedbackKind
  message: string
}

export interface SimFrame {
  mode: Mode
  /** Lattice to draw on the goniometer. null in an unsolved mission (the crystal is a mystery). */
  drawnLattice: Lattice | null
  a: number
  lambda: number
  phi: number
  chi: number
  /** Lit spots that land on the detector. */
  lit: SpotView[]
  /** A lit reflection lands off the detector and no lit reflection lands on it. */
  offWallHint: boolean
  ghosts: GhostView[]
  ring: RingView | null
  guide: GuideView
  slowFactor: number
  board: BoardView
  verdictUnlocked: boolean
  solved: boolean
  feedback: Feedback | null
  /** "Identified: FCC, like copper" after a correct verdict, else "". */
  banner: string
  sampleTag: string
  readoutPhi: string
  readoutChi: string
  lambdaLabel: string
  /** Spots that lit since the previous step(): play the chime from each. */
  newlyLit: SpotView[]
  /** True on the step a correct verdict was given: play the flourish. */
  justSolved: boolean
}

interface FoundRecord {
  m: Miller
  phiSeen: number
  chiSeen: number
  order: number
}

interface DistinctRecord {
  N: number
  m: Miller
  twoThetaDeg: number
  lambda: number
  order: number
}

type LogEntry = {kind: "spot"; N: number} | {kind: "absence"; family: "100" | "110"}

export interface MissionOptions {
  lattice?: Lattice
  a?: number
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

function latticeName(l: Lattice): string {
  return l === "SC" ? "Simple cubic" : "Face-centred cubic"
}

export class BraggSim {
  readonly cfg: SimConfig
  /** The simple-cubic candidate set: every (hkl) with 0 < N ≤ maxN. */
  readonly candidates: Miller[]

  mode: Mode = "free"
  freeLattice: Lattice = "SC"
  phi = 0
  chi = 0
  lambda: number
  a: number
  round = 0

  private rng: () => number
  private missionLattice: Lattice = "SC"
  private litKeys = new Set<string>()
  private pendingNew = new Map<string, {r: ReflectionGeometry; firstTime: boolean}>()
  private found = new Map<string, FoundRecord>()
  private distinct = new Map<number, DistinctRecord>()
  private absences: Array<"100" | "110"> = []
  private log: LogEntry[] = []
  private order = 0
  private solvedFlag = false
  private pendingSolved = false
  private feedback: Feedback | null = null
  private highlight: LogEntry | null = null
  private banner = ""
  private predictor: Miller | null = null

  constructor(cfg: Partial<SimConfig> = {}, rng: () => number = Math.random) {
    this.cfg = {...DEFAULT_CONFIG, ...cfg}
    this.rng = rng
    this.candidates = enumerateReflections(this.cfg.maxN)
    this.lambda = this.cfg.freeLambda
    this.a = this.cfg.freeA
    this.detect()
  }

  /** The lattice that decides which spots light. Secret during a mission. */
  get lattice(): Lattice {
    return this.mode === "mission" ? this.missionLattice : this.freeLattice
  }

  // ------------------------------------------------------------ input

  /**
   * Turn the crystal by a drag, in degrees (dPhi: left/right, dChi: up/down).
   * Applied in small substeps so a fast drag cannot skip a condition, with the
   * slowdown applied near any candidate reflection.
   */
  applyDrag(dPhi: number, dChi: number): void {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dPhi), Math.abs(dChi)) / this.cfg.dragSubstepDeg))
    for (let i = 0; i < n; i++) {
      const f = this.helpers().slowFactor
      this.phi += (dPhi / n) * f
      this.chi = clamp(this.chi + (dChi / n) * f, -this.cfg.chiLimitDeg, this.cfg.chiLimitDeg)
      this.detect()
    }
  }

  /** Set the orientation directly (Reset orientation, tests). No slowdown. */
  setOrientation(phiDeg: number, chiDeg: number): void {
    this.phi = phiDeg
    this.chi = clamp(chiDeg, -this.cfg.chiLimitDeg, this.cfg.chiLimitDeg)
    this.detect()
  }

  resetOrientation(): void {
    this.setOrientation(0, 0)
  }

  /** Slide the wavelength. Swept in small steps so spots passed on the way still count. */
  setWavelength(lambda: number): void {
    const target = clamp(lambda, this.cfg.lambdaMin, this.cfg.lambdaMax)
    const n = Math.max(1, Math.ceil(Math.abs(target - this.lambda) / this.cfg.lambdaSubstep))
    const start = this.lambda
    for (let i = 1; i <= n; i++) {
      this.lambda = start + ((target - start) * i) / n
      this.detect()
    }
    this.lambda = target
  }

  /** Free mode only: switch the drawn and diffracting lattice. Clears the found list. */
  setFreeLattice(lattice: Lattice): void {
    if (this.mode !== "free" || lattice === this.freeLattice) return
    this.freeLattice = lattice
    this.clearTracking()
    this.detect()
  }

  /** Begin a mission round. Tests can force the lattice type and a. */
  startMission(opts: MissionOptions = {}): void {
    this.mode = "mission"
    this.round++
    this.missionLattice = opts.lattice ?? (this.rng() < 0.5 ? "SC" : "FCC")
    const a = opts.a ?? this.cfg.missionAMin + this.rng() * (this.cfg.missionAMax - this.cfg.missionAMin)
    this.a = Math.round(a * 100) / 100
    this.lambda = this.cfg.missionLambda
    this.phi = 0
    this.chi = 0
    this.clearTracking()
    this.detect()
  }

  /** Back to free mode: SC/FCC as last chosen, a = 4.0 Å, λ = 1.54 Å, orientation reset. */
  endMission(): void {
    this.mode = "free"
    this.a = this.cfg.freeA
    this.lambda = this.cfg.freeLambda
    this.phi = 0
    this.chi = 0
    this.clearTracking()
    this.detect()
  }

  /** Predictor selection (mission). null hides the prediction ring. */
  setPredictor(m: Miller | null): void {
    this.predictor = m && millerN(m) > 0 ? {h: m.h, k: m.k, l: m.l} : null
  }

  getPredictor(): Miller | null {
    return this.predictor
  }

  /** The secret lattice, for tests and the reveal only. */
  getMissionLattice(): Lattice {
    return this.missionLattice
  }

  // ------------------------------------------------------------ verdict

  submitVerdict(verdict: Lattice): Feedback {
    let fb: Feedback
    if (this.mode !== "mission") {
      fb = {kind: "insufficient", message: "Start a mission first."}
    } else if (!this.verdictUnlocked()) {
      fb = {kind: "insufficient", message: "Record three distinct reflections first."}
    } else {
      fb = this.judge(verdict)
    }
    this.feedback = fb
    return fb
  }

  private judge(verdict: Lattice): Feedback {
    this.highlight = null
    const mixed = this.firstMixedObservation()
    // 1. Evidence that contradicts the verdict.
    if (verdict === "SC" && this.absences.length > 0) {
      const both = this.absences.length >= 2
      const fams = both ? "(100) and (110)" : `(${this.absences[0]})`
      this.highlight = this.log.find((e) => e.kind === "absence") ?? null
      return {
        kind: "wrong",
        message: `${fams} passed with no spot: SC would show ${both ? "them" : "it"}.`,
      }
    }
    if (verdict === "FCC" && mixed) {
      this.highlight = this.log.find((e) => e.kind === "spot" && e.N === mixed.N) ?? null
      return {
        kind: "wrong",
        message: `The spot at 2θ ${fmtDeg(mixed.twoThetaDeg)} is ${fmtFamily(mixed.m)}-type: FCC forbids it.`,
      }
    }
    // 2. The verdict's evidence rule is met.
    const fccRule = this.absences.includes("100") && this.absences.includes("110") && this.hasPositiveControl()
    if ((verdict === "SC" && mixed) || (verdict === "FCC" && fccRule)) {
      const mat = closestMaterial(verdict, this.a)
      this.solvedFlag = true
      this.pendingSolved = true
      this.banner = `Identified: ${verdict}, like ${mat.name.split(" (")[0]}`
      return {
        kind: "correct",
        message: `${latticeName(verdict)}. ${capitalize(mat.name)}: a = ${fmtNumber(mat.a, 2)} Å. This sample: ${fmtLatticeParam(this.a)}.`,
      }
    }
    // 3. Not enough evidence yet.
    if (verdict === "SC") {
      return {
        kind: "insufficient",
        message: "Not enough evidence yet. Find a spot FCC forbids, such as a (100)- or (110)-type spot.",
      }
    }
    const missing: string[] = []
    if (!this.absences.includes("100")) missing.push("pass the (100) condition with no spot")
    if (!this.absences.includes("110")) missing.push("pass the (110) condition with no spot")
    if (!this.hasPositiveControl()) missing.push("see a (111) or (200) spot (the positive control)")
    return {kind: "insufficient", message: `Not enough evidence yet. Still needed: ${missing.join("; ")}.`}
  }

  private firstMixedObservation(): DistinctRecord | null {
    let best: DistinctRecord | null = null
    this.distinct.forEach((r) => {
      if (isMixedParity(r.m) && (!best || r.order < best.order)) best = r
    })
    return best
  }

  private hasPositiveControl(): boolean {
    return this.distinct.has(3) || this.distinct.has(4)
  }

  verdictUnlocked(): boolean {
    return this.mode === "mission" && this.distinct.size >= this.cfg.verdictMinDistinct
  }

  /** Distinct d-spacings observed this round (count of different h² + k² + l²). */
  distinctCount(): number {
    return this.distinct.size
  }

  absencesLogged(): string[] {
    return this.absences.slice()
  }

  // ------------------------------------------------------------ per-frame

  /** Build the frame to draw and flush one-shot events (new spots, solved). */
  step(): SimFrame {
    const lit: SpotView[] = []
    let offWall = false
    const litKeysNow = new Set<string>()
    for (const m of this.candidates) {
      if (!isAllowed(m, this.lattice)) continue
      const r = this.eval(m)
      if (!r.inCondition) continue
      if (r.onDetector && r.wall) {
        lit.push(this.spotView(r))
        litKeysNow.add(millerKey(m))
      } else offWall = true
    }

    const ghosts: GhostView[] = []
    this.found.forEach((rec, key) => {
      if (litKeysNow.has(key)) return
      const g = this.ghostFor(rec)
      if (g) ghosts.push(g)
    })

    const newlyLit: SpotView[] = []
    this.pendingNew.forEach((p) => {
      if (p.r.wall) newlyLit.push(this.spotView(p.r, p.firstTime))
    })
    this.pendingNew.clear()
    const justSolved = this.pendingSolved
    this.pendingSolved = false

    const h = this.helpers()
    return {
      mode: this.mode,
      drawnLattice: this.mode === "free" || this.solvedFlag ? this.lattice : null,
      a: this.a,
      lambda: this.lambda,
      phi: this.phi,
      chi: this.chi,
      lit,
      // Only when nothing lit is on the wall: next to a lit spot the hint reads as a contradiction.
      offWallHint: offWall && lit.length === 0,
      ghosts,
      ring: this.ringView(),
      guide: h.guide,
      slowFactor: h.slowFactor,
      board: this.boardView(),
      verdictUnlocked: this.verdictUnlocked(),
      solved: this.solvedFlag,
      feedback: this.feedback,
      banner: this.banner,
      sampleTag: this.sampleTag(),
      readoutPhi: fmtPhi(this.phi),
      readoutChi: fmtChi(this.chi),
      lambdaLabel: fmtLambda(this.lambda),
      newlyLit,
      justSolved,
    }
  }

  // ------------------------------------------------------------ helpers (guide arrow + slowdown)

  /**
   * Guide arrow and slowdown. Inputs: a, λ, φ, χ and the candidate set only.
   * In mission mode the candidate set is the full SC set regardless of the round's lattice.
   */
  helpers(): {guide: GuideView; slowFactor: number} {
    const useAll = this.mode === "mission"
    let slow = 1
    let anyIn = false
    let nearest: ReflectionGeometry | null = null
    for (const m of this.candidates) {
      if (!useAll && !isAllowed(m, this.freeLattice)) continue
      const r = this.eval(m)
      if (r.delta === null || !r.onDetector) continue
      const ad = Math.abs(r.delta)
      if (ad <= this.cfg.slowWindowDeg) slow = this.cfg.slowFactor
      if (r.inCondition) anyIn = true
      if (!nearest || ad < Math.abs(nearest.delta as number)) nearest = r
    }
    const hidden: GuideView = {visible: false, axis: "phi", sign: 1, deltaDeg: 0}
    if (anyIn || !nearest || Math.abs(nearest.delta as number) > this.cfg.guideWindowDeg) {
      return {guide: hidden, slowFactor: slow}
    }
    const delta = nearest.delta as number
    const m = nearest.m
    const eps = 0.05
    const dAdPhi =
      (glancingAngleDeg(m, this.a, this.phi + eps, this.chi) - glancingAngleDeg(m, this.a, this.phi - eps, this.chi)) /
      (2 * eps)
    const dAdChi =
      (glancingAngleDeg(m, this.a, this.phi, this.chi + eps) - glancingAngleDeg(m, this.a, this.phi, this.chi - eps)) /
      (2 * eps)
    const need = -delta
    let axis: GuideAxis = Math.abs(dAdPhi) >= Math.abs(dAdChi) ? "phi" : "chi"
    if (axis === "chi") {
      const dir = Math.sign(need * dAdChi)
      const atLimit =
        (dir > 0 && this.chi >= this.cfg.chiLimitDeg - 1e-6) || (dir < 0 && this.chi <= -this.cfg.chiLimitDeg + 1e-6)
      if (atLimit) axis = "phi"
    }
    const partial = axis === "phi" ? dAdPhi : dAdChi
    if (Math.abs(partial) < 1e-6) return {guide: hidden, slowFactor: slow}
    const sign: 1 | -1 = need * partial >= 0 ? 1 : -1
    return {guide: {visible: true, axis, sign, deltaDeg: delta}, slowFactor: slow}
  }

  // ------------------------------------------------------------ internals

  private eval(m: Miller): ReflectionGeometry {
    return evaluateReflection(m, this.a, this.lambda, this.phi, this.chi, this.cfg.toleranceDeg, this.cfg.detector)
  }

  private clearTracking(): void {
    this.litKeys.clear()
    this.pendingNew.clear()
    this.found.clear()
    this.distinct.clear()
    this.absences = []
    this.log = []
    this.solvedFlag = false
    this.pendingSolved = false
    this.feedback = null
    this.highlight = null
    this.banner = ""
  }

  /** Evaluate every candidate at the current state and record what happened. */
  private detect(): void {
    const nowLit = new Set<string>()
    for (const m of this.candidates) {
      const r = this.eval(m)
      if (!r.inCondition) continue
      const key = millerKey(m)
      if (isAllowed(m, this.lattice)) {
        nowLit.add(key)
        if (r.onDetector) {
          if (!this.litKeys.has(key)) this.pendingNew.set(key, {r, firstTime: !this.found.has(key)})
          this.recordObservation(m, r)
        }
      } else if (this.mode === "mission" && r.onDetector) {
        // A forbidden reflection's condition was met and nothing lit: log (100)/(110) absences.
        const fam = familyKey(m)
        if ((fam === "100" || fam === "110") && this.absences.indexOf(fam) < 0) {
          this.absences.push(fam)
          this.log.push({kind: "absence", family: fam})
        }
      }
    }
    this.litKeys = nowLit
  }

  private recordObservation(m: Miller, r: ReflectionGeometry): void {
    const key = millerKey(m)
    if (!this.found.has(key)) {
      this.found.set(key, {m, phiSeen: this.phi, chiSeen: this.chi, order: ++this.order})
    }
    if (this.mode === "mission" && !this.distinct.has(r.N)) {
      this.distinct.set(r.N, {N: r.N, m, twoThetaDeg: r.twoThetaB as number, lambda: this.lambda, order: ++this.order})
      this.log.push({kind: "spot", N: r.N})
    }
  }

  private showIndices(): boolean {
    return this.mode === "free" || this.solvedFlag
  }

  private spotView(r: ReflectionGeometry, firstTime = false): SpotView {
    const theta = r.thetaB as number
    const twoTheta = r.twoThetaB as number
    let title = ""
    let detail = spotLabelMission(twoTheta)
    if (this.showIndices()) {
      const lab = spotLabelFree(r.m, theta, twoTheta)
      title = lab.title
      detail = lab.detail
    }
    return {
      key: millerKey(r.m),
      m: r.m,
      N: r.N,
      thetaDeg: theta,
      twoThetaDeg: twoTheta,
      wall: r.wall as WallPoint,
      title,
      detail,
      firstTime,
    }
  }

  /**
   * Found ghost: where this (hkl) would land at the current λ if spun into its
   * Bragg condition about the vertical axis at the current tilt, choosing the
   * solution nearest the φ where it was seen.
   */
  private ghostFor(rec: FoundRecord): GhostView | null {
    const phi = solvePhiForCondition(rec.m, this.a, this.lambda, this.chi, rec.phiSeen)
    if (phi === null) return null
    const r = evaluateReflection(rec.m, this.a, this.lambda, phi, this.chi, this.cfg.toleranceDeg, this.cfg.detector)
    if (!r.wall || !r.onDetector) return null
    const twoTheta = r.twoThetaB as number
    const label = this.showIndices()
      ? `${fmtMiller(rec.m)} ${fmtDeg(twoTheta)}`
      : spotLabelMission(twoTheta)
    return {key: millerKey(rec.m), m: rec.m, wall: r.wall, twoThetaDeg: twoTheta, label}
  }

  /** Prediction ring: depends only on a and λ, so it reveals nothing about the lattice. */
  private ringView(): RingView | null {
    const m = this.predictor
    if (!m || this.mode !== "mission") return null
    const theta = braggThetaDeg(this.a, this.lambda, m)
    if (theta === null) {
      return {m, label: `${fmtMiller(m)} unreachable at this λ`, reachable: false, twoThetaDeg: null, radiusCm: null}
    }
    const tt = 2 * theta
    const radius = tt < 90 ? this.cfg.detector.distanceCm * Math.tan((tt * Math.PI) / 180) : null
    return {m, label: `${fmtMiller(m)} 2θ ${fmtDeg(tt)}`, reachable: true, twoThetaDeg: tt, radiusCm: radius}
  }

  private boardView(): BoardView {
    if (this.mode === "free") return this.freeBoard()
    return this.missionBoard()
  }

  private freeBoard(): BoardView {
    const recs: FoundRecord[] = []
    this.found.forEach((r) => recs.push(r))
    recs.sort((p, q) => millerN(p.m) - millerN(q.m) || p.order - q.order)
    const nMin = recs.length ? millerN(recs[0].m) : 1
    const lines = recs.slice(0, this.cfg.boardMaxLines).map((r) => {
      const th = braggThetaDeg(this.a, this.lambda, r.m)
      const tt = th === null ? "—" : fmtDeg(2 * th)
      return `${fmtMiller(r.m)}   2θ ${tt}   ×${(millerN(r.m) / nMin).toFixed(2)}`
    })
    return {
      title: `Found reflections · ${this.freeLattice} ${fmtLatticeParam(this.a)}`,
      status: recs.length ? "(hkl)   2θ now   sin²θ ratio" : "None yet. Turn the crystal.",
      lines,
      highlightIndex: -1,
    }
  }

  private missionBoard(): BoardView {
    const all = this.log.map((e) => this.logLine(e))
    const start = Math.max(0, all.length - this.cfg.boardMaxLines)
    const lines = all.slice(start)
    const hi = this.highlight ? this.log.indexOf(this.highlight) - start : -1
    const n = this.distinct.size
    const status = this.solvedFlag
      ? "Solved"
      : n >= this.cfg.verdictMinDistinct
        ? `${n} distinct reflections: verdict unlocked`
        : `Distinct reflections: ${n} of ${this.cfg.verdictMinDistinct}`
    return {
      title: `Evidence · sample ${fmtLatticeParam(this.a)}`,
      status,
      lines,
      highlightIndex: hi >= 0 ? hi : -1,
    }
  }

  private logLine(e: LogEntry): string {
    if (e.kind === "absence") return e.family === "100" ? TEXT.absence100 : TEXT.absence110
    const r = this.distinct.get(e.N) as DistinctRecord
    const lam = `λ ${fmtNumber(r.lambda, 2)} Å`
    const head = this.solvedFlag ? fmtFamily(r.m) : "Spot"
    return `${head}  2θ ${fmtDeg(r.twoThetaDeg)}  (${lam})`
  }

  private sampleTag(): string {
    if (this.mode === "free") return `${latticeName(this.freeLattice)} · ${fmtLatticeParam(this.a)}`
    if (this.solvedFlag) return `${latticeName(this.missionLattice)} · ${fmtLatticeParam(this.a)}`
    return `Mystery sample · ${fmtLatticeParam(this.a)}`
  }
}

/** Capitalise a leading Latin letter only ("copper" → "Copper"; "α-polonium" stays as is). */
function capitalize(s: string): string {
  return /^[a-z]/.test(s) ? s[0].toUpperCase() + s.slice(1) : s
}
