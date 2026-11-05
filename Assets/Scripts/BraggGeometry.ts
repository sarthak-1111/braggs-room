/**
 * BraggGeometry.ts: code-authored geometry for Bragg's Room.
 * Pure TypeScript (no Lens globals), unit-tested from the command line (tests/geometry.test.ts).
 *
 * Every generator returns a Geo: interleaved vertices (position 3, normal 3, color 4) and
 * triangle indices. BraggMeshes.ts turns a Geo into a RenderMesh with MeshBuilder.
 *
 * Units are cm. Front faces are counter-clockwise seen from outside (Lens culls back faces);
 * the tests check every triangle against its vertex normals.
 *
 * Pivots: each part is built around the point it is placed at in the handoff layout
 * (devpost/clad-handoff-1.md), so its SceneObject's local position is that point.
 * BRAGG_LAYOUT lists those points in the BraggsRoom frame (+x right, +y up, +z toward the user).
 */
import {DEFAULT_DETECTOR} from "./BraggPhysics"

export type Vec3 = [number, number, number]
export type RGBA = [number, number, number, number]

/** Floats per vertex: position 3, normal 3, color 4. */
export const STRIDE = 10

/** Where each part's pivot sits in the BraggsRoom frame (cm). */
export const BRAGG_LAYOUT = {
  /** Crystal centre C (pivot of Crystal and CrystalVisual). */
  crystal: [-20, -25, -55] as Vec3,
  /** Goniometer pivot: centre of the base disc, on the desk top. */
  goniometer: [-20, -45, -55] as Vec3,
  /** VirtualDesk pivot: centre of the 120 × 3 × 60 cm desk slab (top surface at y = −45). */
  desk: [0, -46.5, -50] as Vec3,
  /** XRayTube pivot: middle of the tube axis (the tube runs z = −20 … −35). */
  xrayTube: [-20, -25, -27.5] as Vec3,
  /** Beam pivot: the collimator tip, where the beam leaves the tube. */
  beamStart: [-20, -25, -35] as Vec3,
  /** BeamStop and VirtualWall pivot: the beam stop B on the wall plane. */
  beamStop: [-20, -25, -205] as Vec3,
}

/** Crystal-to-wall distance used for the 2θ ticks (cm). */
export const WALL_DISTANCE_CM = DEFAULT_DETECTOR.distanceCm

/** 2θ values that get a tick on the wall's horizontal axis, each side of the beam stop. */
export const TWO_THETA_TICKS_DEG = [10, 20, 30, 40, 50]

/** Wall x offset (cm from the beam stop) of a 2θ tick on the horizontal axis. */
export function twoThetaTickX(twoThetaDeg: number): number {
  return WALL_DISTANCE_CM * Math.tan((twoThetaDeg * Math.PI) / 180)
}

// ---------------------------------------------------------------- Geo container

export class Geo {
  readonly verts: number[] = []
  readonly indices: number[] = []

  get vertexCount(): number {
    return this.verts.length / STRIDE
  }

  get triangleCount(): number {
    return this.indices.length / 3
  }

  /** Append one vertex; returns its index. */
  vertex(p: Vec3, n: Vec3, c: RGBA): number {
    const i = this.vertexCount
    this.verts.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], c[3])
    return i
  }

  tri(a: number, b: number, c: number): void {
    this.indices.push(a, b, c)
  }

  /** Copy another Geo into this one. */
  append(other: Geo): this {
    const base = this.vertexCount
    for (let i = 0; i < other.verts.length; i++) this.verts.push(other.verts[i])
    for (let i = 0; i < other.indices.length; i++) this.indices.push(other.indices[i] + base)
    return this
  }

  /** Multiply the RGB of every vertex from `fromVertex` on by `k` (alpha untouched). */
  scaleColor(k: number, fromVertex = 0): this {
    for (let v = fromVertex; v < this.vertexCount; v++) {
      const o = v * STRIDE + 6
      this.verts[o] *= k
      this.verts[o + 1] *= k
      this.verts[o + 2] *= k
    }
    return this
  }

  /**
   * Bake simple key-light shading into the vertex colors, so an unlit vertex-color
   * material still reads as 3D: rgb *= ambient + (1 − ambient)·max(0, n·L).
   */
  bakeShading(light: Vec3 = KEY_LIGHT, ambient = 0.58, fromVertex = 0): this {
    const L = norm(light)
    for (let v = fromVertex; v < this.vertexCount; v++) {
      const o = v * STRIDE
      const ndl = Math.max(0, this.verts[o + 3] * L[0] + this.verts[o + 4] * L[1] + this.verts[o + 5] * L[2])
      const k = ambient + (1 - ambient) * ndl
      this.verts[o + 6] *= k
      this.verts[o + 7] *= k
      this.verts[o + 8] *= k
    }
    return this
  }
}

/** Light from the upper left, slightly toward the user. */
export const KEY_LIGHT: Vec3 = [-0.4, 0.85, 0.35]

// ---------------------------------------------------------------- vector helpers

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function len(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2])
}

function norm(a: Vec3): Vec3 {
  const l = len(a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

function scaleRGB(c: RGBA, k: number): RGBA {
  return [c[0] * k, c[1] * k, c[2] * k, c[3]]
}

/**
 * A proper rotation (det +1) taking local +Y to `axis`: columns U, A, W with W = U × A.
 * Winding is preserved because the map is a rotation, not a reflection.
 */
function basisForAxis(axis: Vec3): {u: Vec3; a: Vec3; w: Vec3} {
  const a = norm(axis)
  const ref: Vec3 = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]
  const d = ref[0] * a[0] + ref[1] * a[1] + ref[2] * a[2]
  const u = norm([ref[0] - d * a[0], ref[1] - d * a[1], ref[2] - d * a[2]])
  const w = cross(u, a)
  return {u, a, w}
}

// ---------------------------------------------------------------- primitives

/** Axis-aligned box, 4 vertices per face (24 total). Winding from the skill's verified addBox. */
export function addBox(g: Geo, center: Vec3, half: Vec3, color: RGBA): void {
  const [cx, cy, cz] = center
  const x0 = cx - half[0], x1 = cx + half[0]
  const y0 = cy - half[1], y1 = cy + half[1]
  const z0 = cz - half[2], z1 = cz + half[2]
  const face = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, n: Vec3): void => {
    const i = g.vertex(p0, n, color)
    g.vertex(p1, n, color)
    g.vertex(p2, n, color)
    g.vertex(p3, n, color)
    g.tri(i, i + 1, i + 2)
    g.tri(i, i + 2, i + 3)
  }
  face([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0])
  face([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0])
  face([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0])
  face([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0])
  face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1])
  face([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1])
}

export interface LatheOptions {
  /** Pivot of the lathe axis (where profile height 0 sits). Default origin. */
  origin?: Vec3
  /** Direction the profile height runs along. Default +Y. */
  axis?: Vec3
  /** Per-profile-point colors (overrides `color` along the profile). */
  colors?: RGBA[]
  /** Close the ends with flat discs where the profile radius is non-zero. Default true. */
  caps?: boolean
}

/**
 * Revolve a [radius, height] profile (bottom to top, radius ≥ 0) around an axis.
 * Winding [bl, br, tr, bl, tr, tl] is the skill's verified Y-axis lathe; the axis
 * change is a proper rotation, so it stays counter-clockwise from outside.
 */
export function addLathe(
  g: Geo,
  profile: [number, number][],
  segments: number,
  color: RGBA,
  opts: LatheOptions = {},
): void {
  const origin = opts.origin ?? [0, 0, 0]
  const {u, a, w} = basisForAxis(opts.axis ?? [0, 1, 0])
  const caps = opts.caps ?? true
  const P = profile.length
  const colorAt = (j: number): RGBA => (opts.colors ? opts.colors[j] : color)
  const map = (x: number, y: number, z: number): Vec3 => [
    origin[0] + x * u[0] + y * a[0] + z * w[0],
    origin[1] + x * u[1] + y * a[1] + z * w[1],
    origin[2] + x * u[2] + y * a[2] + z * w[2],
  ]
  const mapDir = (x: number, y: number, z: number): Vec3 => [
    x * u[0] + y * a[0] + z * w[0],
    x * u[1] + y * a[1] + z * w[1],
    x * u[2] + y * a[2] + z * w[2],
  ]

  // Outward 2D profile normals (dy, −dx).
  const n2: [number, number][] = []
  for (let j = 0; j < P; j++) {
    const prev = profile[Math.max(0, j - 1)]
    const next = profile[Math.min(P - 1, j + 1)]
    const dx = next[0] - prev[0]
    const dy = next[1] - prev[1]
    const l = Math.hypot(dy, dx) || 1
    n2.push([dy / l, -dx / l])
  }

  const start = g.vertexCount
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2
    const c = Math.cos(th)
    const s = Math.sin(th)
    for (let j = 0; j < P; j++) {
      const [r, y] = profile[j]
      g.vertex(map(r * c, y, r * s), mapDir(n2[j][0] * c, n2[j][1], n2[j][0] * s), colorAt(j))
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < P - 1; j++) {
      const bl = start + i * P + j
      const br = start + i * P + j + 1
      const tl = start + (i + 1) * P + j
      const tr = start + (i + 1) * P + j + 1
      g.tri(bl, br, tr)
      g.tri(bl, tr, tl)
    }
  }
  if (!caps) return

  const down = mapDir(0, -1, 0)
  const up = mapDir(0, 1, 0)
  if (profile[0][0] > 1e-6) {
    const [r, y] = profile[0]
    const center = g.vertex(map(0, y, 0), down, colorAt(0))
    for (let i = 0; i <= segments; i++) {
      const th = (i / segments) * Math.PI * 2
      g.vertex(map(r * Math.cos(th), y, r * Math.sin(th)), down, colorAt(0))
    }
    for (let i = 0; i < segments; i++) g.tri(center, center + 1 + i, center + 2 + i)
  }
  if (profile[P - 1][0] > 1e-6) {
    const [r, y] = profile[P - 1]
    const center = g.vertex(map(0, y, 0), up, colorAt(P - 1))
    for (let i = 0; i <= segments; i++) {
      const th = (i / segments) * Math.PI * 2
      g.vertex(map(r * Math.cos(th), y, r * Math.sin(th)), up, colorAt(P - 1))
    }
    for (let i = 0; i < segments; i++) g.tri(center, center + 2 + i, center + 1 + i)
  }
}

/** UV sphere as a lathe of a semicircle (closes at both poles, so no caps). */
export function addSphere(g: Geo, center: Vec3, radius: number, color: RGBA, segments = 14, rings = 9): void {
  const profile: [number, number][] = []
  for (let j = 0; j <= rings; j++) {
    const t = (j / rings) * Math.PI
    profile.push([radius * Math.sin(t), -radius * Math.cos(t)])
  }
  profile[0][0] = 0
  profile[rings][0] = 0
  addLathe(g, profile, segments, color, {origin: center})
}

/** Cylinder from a to b. Open (no end discs) unless caps is true. */
export function addCylinder(g: Geo, a: Vec3, b: Vec3, radius: number, color: RGBA, segments = 10, caps = false): void {
  const d = sub(b, a)
  addLathe(g, [[radius, 0], [radius, len(d)]], segments, color, {origin: a, axis: d, caps})
}

/**
 * Flat disc in the plane z = center.z, facing +z, built from concentric rings with
 * their own colors: rings[k] = [radius, color], radius increasing, first radius 0.
 * Used for spots with a soft halo (the color fades to black, which the additive
 * glow material draws as transparent).
 */
export function addRadialDiscXY(g: Geo, center: Vec3, rings: [number, RGBA][], segments = 32): void {
  const n: Vec3 = [0, 0, 1]
  const hub = g.vertex(center, n, rings[0][1])
  let prevStart = -1
  for (let k = 1; k < rings.length; k++) {
    const [r, c] = rings[k]
    const ringStart = g.vertexCount
    for (let i = 0; i <= segments; i++) {
      const th = (i / segments) * Math.PI * 2
      g.vertex([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th), center[2]], n, c)
    }
    for (let i = 0; i < segments; i++) {
      if (k === 1) {
        g.tri(hub, ringStart + i, ringStart + i + 1)
      } else {
        const ai = prevStart + i
        const di = prevStart + i + 1
        const bi = ringStart + i
        const ci = ringStart + i + 1
        g.tri(ai, bi, ci)
        g.tri(ai, ci, di)
      }
    }
    prevStart = ringStart
  }
}

/** Thin flat bar from (x0, y0) to (x1, y1) in the plane z, facing +z (a line with a width). */
export function addBarXY(g: Geo, x0: number, y0: number, x1: number, y1: number, width: number, z: number, color: RGBA): void {
  const dx = x1 - x0
  const dy = y1 - y0
  const l = Math.hypot(dx, dy) || 1
  // Left-hand perpendicular of the direction, half the width long.
  const px = (-dy / l) * (width / 2)
  const py = (dx / l) * (width / 2)
  const n: Vec3 = [0, 0, 1]
  const i = g.vertex([x0 - px, y0 - py, z], n, color)
  g.vertex([x1 - px, y1 - py, z], n, color)
  g.vertex([x1 + px, y1 + py, z], n, color)
  g.vertex([x0 + px, y0 + py, z], n, color)
  g.tri(i, i + 1, i + 2)
  g.tri(i, i + 2, i + 3)
}

// ---------------------------------------------------------------- palette (light colors only: the display is additive)

export const COLORS = {
  deskTop: [0.66, 0.62, 0.56, 1] as RGBA,
  deskLeg: [0.5, 0.48, 0.45, 1] as RGBA,
  steel: [0.78, 0.8, 0.84, 1] as RGBA,
  steelDark: [0.62, 0.65, 0.7, 1] as RGBA,
  brass: [0.9, 0.76, 0.45, 1] as RGBA,
  tubeHousing: [0.72, 0.77, 0.86, 1] as RGBA,
  warningBand: [0.98, 0.82, 0.3, 1] as RGBA,
  beamStopRim: [0.86, 0.88, 0.92, 1] as RGBA,
  beamStopFace: [0.36, 0.62, 0.68, 1] as RGBA,
  /** Simple-cubic (corner) atoms. */
  atomCorner: [0.55, 0.8, 1.0, 1] as RGBA,
  /** Face-centre atoms (FCC only). */
  atomFace: [1.0, 0.7, 0.35, 1] as RGBA,
  cellEdge: [0.86, 0.89, 0.94, 1] as RGBA,
  // Glow colors (additive: brightness is the RGB, black is transparent).
  gridLine: [0.13, 0.14, 0.16, 1] as RGBA,
  gridBorder: [0.22, 0.23, 0.26, 1] as RGBA,
  gridAxis: [0.34, 0.36, 0.4, 1] as RGBA,
  gridTick: [0.55, 0.57, 0.62, 1] as RGBA,
  beamCore: [0.1, 0.42, 0.5, 1] as RGBA,
  beamShell: [0.02, 0.09, 0.11, 1] as RGBA,
  pulse: [0.6, 1.0, 1.0, 1] as RGBA,
  spot: [1.0, 0.95, 0.82, 1] as RGBA,
  rayCore: [0.32, 0.29, 0.22, 1] as RGBA,
  rayShell: [0.06, 0.055, 0.04, 1] as RGBA,
  mysteryFace: [0.2, 0.19, 0.3, 1] as RGBA,
  mysteryEdge: [0.42, 0.4, 0.58, 1] as RGBA,
}

/** Found ghosts are the spot at this brightness. */
export const GHOST_BRIGHTNESS = 0.25

// ---------------------------------------------------------------- parts: lab apparatus (opaque)

/**
 * VirtualDesk (preview stand-in). Pivot: centre of the slab.
 * Slab 120 × 3 × 60 cm (top surface at local y = +1.5), legs 4 × 4 cm down to local y = −103.5 (room floor, y = −150).
 */
export function deskGeometry(): Geo {
  const g = new Geo()
  addBox(g, [0, 0, 0], [60, 1.5, 30], COLORS.deskTop)
  const legHalfH = (103.5 - 1.5) / 2
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, [sx * 55, -1.5 - legHalfH, sz * 25], [2, legHalfH, 2], COLORS.deskLeg)
    }
  }
  return g.bakeShading()
}

/**
 * Goniometer. Pivot: centre of the base disc's underside, on the desk top.
 * Base Ø10 × 2 cm, post to 9.5 cm, head (Ø2.8) to 12 cm, sample pin to 16.5 cm.
 * The crystal centre is 20 cm above the pivot. With |χ| ≤ 45° the lowest atom surface
 * near the axis stays above the head (tests/geometry.test.ts sweeps φ and χ); only the
 * thin pin reaches into the cell, like a crystal mounted on a fibre.
 */
export const GONIOMETER_HEAD_TOP_CM = 12.0
export const GONIOMETER_HEAD_RADIUS_CM = 1.4

export function goniometerGeometry(): Geo {
  const g = new Geo()
  const top = GONIOMETER_HEAD_TOP_CM
  const r = GONIOMETER_HEAD_RADIUS_CM
  addLathe(g, [[5.0, 0], [5.0, 1.4], [4.7, 2.0], [0, 2.0]], 28, COLORS.steel)
  addLathe(g, [[0.8, 2.0], [0.8, 9.5]], 16, COLORS.steelDark)
  addLathe(g, [[r, 9.5], [r, top - 0.6], [0.9, top], [0, top]], 20, COLORS.brass)
  addLathe(g, [[0.25, top], [0.25, 16.3], [0, 16.5]], 10, COLORS.brass)
  return g.bakeShading()
}

/**
 * X-ray tube on its stand. Pivot: middle of the tube axis.
 * The tube runs along z from +7.5 (rear, toward the user) to −7.5 (collimator tip, where the beam starts).
 * Housing Ø4.4, collimator snout Ø1.8, stand down to the desk top at local y = −20.
 */
export function xrayTubeGeometry(): Geo {
  const g = new Geo()
  const along = {origin: [0, 0, 7.5] as Vec3, axis: [0, 0, -1] as Vec3}
  addLathe(g, [[0, 0], [2.0, 0], [2.3, 0.4], [2.3, 2.6], [2.0, 2.9], [2.0, 12.0], [1.5, 12.4], [0, 12.4]], 28, COLORS.tubeHousing, along)
  addLathe(g, [[2.06, 8.4], [2.06, 10.0]], 28, COLORS.warningBand, along)
  addLathe(g, [[0.9, 12.4], [0.9, 14.6], [0.7, 15.0], [0, 15.0]], 16, COLORS.steel, along)
  // Stand: cradle under the tube, post, foot plate on the desk.
  addBox(g, [0, -2.7, 1.0], [1.6, 0.6, 3.0], COLORS.steelDark)
  addCylinder(g, [0, -19.2, 1.0], [0, -3.3, 1.0], 0.7, COLORS.steelDark, 12, true)
  addBox(g, [0, -19.6, 1.0], [3.5, 0.4, 4.0], COLORS.steel)
  return g.bakeShading()
}

/**
 * Beam stop B. Pivot: the beam-stop point on the wall plane.
 * Ø4 cm disc, 0.55 cm thick, facing the user (+z): light rim, cyan face where the beam lands.
 */
export function beamStopGeometry(): Geo {
  const g = new Geo()
  const rim = COLORS.beamStopRim
  const face = COLORS.beamStopFace
  addLathe(
    g,
    [[2.0, 0], [2.0, 0.4], [1.75, 0.55], [1.35, 0.55], [1.3, 0.55], [0, 0.55]],
    32,
    rim,
    {axis: [0, 0, 1], colors: [rim, rim, rim, rim, face, face]},
  )
  return g.bakeShading([0, 0.3, 1], 0.75)
}

// ---------------------------------------------------------------- parts: glow (draw with the additive material)

/**
 * VirtualWall detector grid (preview stand-in). Pivot: the beam stop B; the grid lies in local z = 0.
 * Lines every 20 cm over the detector extent, brighter border and axis lines through B,
 * and 2θ ticks at x = ±150·tan 2θ for 10°…50°.
 */
export function wallGridGeometry(): Geo {
  const g = new Geo()
  const {minX, maxX, minY, maxY} = DEFAULT_DETECTOR
  const step = 20
  const lineW = 0.35
  for (let x = minX; x <= maxX + 1e-6; x += step) {
    if (Math.abs(x) < 1e-6) continue // the axis line goes there
    const edge = Math.abs(x - minX) < 1e-6 || Math.abs(x - maxX) < 1e-6
    addBarXY(g, x, minY, x, maxY, lineW, 0, edge ? COLORS.gridBorder : COLORS.gridLine)
  }
  for (let y = minY; y <= maxY + 1e-6; y += step) {
    if (Math.abs(y) < 1e-6) continue
    const edge = Math.abs(y - minY) < 1e-6 || Math.abs(y - maxY) < 1e-6
    addBarXY(g, minX, y, maxX, y, lineW, 0, edge ? COLORS.gridBorder : COLORS.gridLine)
  }
  addBarXY(g, minX, 0, maxX, 0, 0.5, 0, COLORS.gridAxis)
  addBarXY(g, 0, minY, 0, maxY, 0.5, 0, COLORS.gridAxis)
  for (const t of TWO_THETA_TICKS_DEG) {
    const x = twoThetaTickX(t)
    for (const side of [-1, 1]) addBarXY(g, side * x, -3, side * x, 3, 0.6, 0.05, COLORS.gridTick)
  }
  return g
}

/**
 * Diffraction spot. Pivot: the spot centre; the disc faces +z.
 * A Ø5 cm warm-white disc with a soft halo out to r = 7.5 cm.
 * brightness 1 for a lit spot, GHOST_BRIGHTNESS for a found ghost.
 */
export function spotGeometry(brightness = 1): Geo {
  const g = new Geo()
  const c = COLORS.spot
  const rings: [number, RGBA][] = [
    [0, scaleRGB(c, 1.0)],
    [1.6, scaleRGB(c, 1.0)],
    [2.5, scaleRGB(c, 0.85)],
    [2.9, scaleRGB(c, 0.42)],
    [4.0, scaleRGB(c, 0.2)],
    [5.5, scaleRGB(c, 0.08)],
    [7.5, scaleRGB(c, 0.0)],
  ]
  addRadialDiscXY(g, [0, 0, 0], rings, 32)
  return g.scaleColor(brightness)
}

/**
 * Unit ray along local −z, from z = 0 to z = −1. Place it with BraggMeshes.placeRay
 * (rotate −z onto the ray, scale z by its length; the radius is unaffected).
 */
export function unitRayGeometry(): Geo {
  const g = new Geo()
  addCylinder(g, [0, 0, 0], [0, 0, -1], 0.12, COLORS.rayCore, 8)
  addCylinder(g, [0, 0, 0], [0, 0, -1], 0.35, COLORS.rayShell, 8)
  return g
}

/** Unit beam along local −z (z = 0 … −1): faint cyan core plus a soft shell. Scale z by the beam length. */
export function unitBeamGeometry(): Geo {
  const g = new Geo()
  addCylinder(g, [0, 0, 0], [0, 0, -1], 0.15, COLORS.beamCore, 10)
  addCylinder(g, [0, 0, 0], [0, 0, -1], 0.45, COLORS.beamShell, 10)
  return g
}

/**
 * Unit beam pulse along local −z (z = 0 … −1), brightest toward its leading (−z) end.
 * Scale z by the pulse length (~10 cm).
 */
export function unitPulseGeometry(): Geo {
  const g = new Geo()
  const c = COLORS.pulse
  const profile: [number, number][] = [[0, 0], [0.22, 0.1], [0.3, 0.5], [0.34, 0.85], [0.26, 0.96], [0, 1]]
  const colors = [0.1, 0.25, 0.6, 1.0, 0.9, 0.7].map((k) => scaleRGB(c, k))
  addLathe(g, profile, 12, c, {axis: [0, 0, -1], colors})
  return g
}

// ---------------------------------------------------------------- crystal (pivot: crystal centre C)

/**
 * Cell axes at φ = χ = 0 follow BraggPhysics.CRYSTAL_AXES_AT_ZERO:
 * [100] → local −z, [010] → local −x, [001] → local +y. The cell is a cube centred on
 * the pivot with its faces normal to the local axes, so an atom at fractional
 * coordinates (u, v, w) sits at local cell·(½ − v, w − ½, ½ − u). For SC and FCC that
 * is the 8 corners and the 6 face centres, which are symmetric under the mapping.
 */
export function cellCornerAtomsGeometry(cellCm = 8, atomDiameterCm = 1.4): Geo {
  const g = new Geo()
  const s = cellCm / 2
  for (const x of [-s, s]) for (const y of [-s, s]) for (const z of [-s, s]) addSphere(g, [x, y, z], atomDiameterCm / 2, COLORS.atomCorner)
  return g.bakeShading()
}

/** The 6 face-centre atoms of the FCC cell (drawn with the corner atoms). */
export function cellFaceAtomsGeometry(cellCm = 8, atomDiameterCm = 1.4): Geo {
  const g = new Geo()
  const s = cellCm / 2
  const centres: Vec3[] = [[s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]]
  for (const c of centres) addSphere(g, c, atomDiameterCm / 2, COLORS.atomFace)
  return g.bakeShading()
}

function cubeEdges(s: number): [Vec3, Vec3][] {
  const edges: [Vec3, Vec3][] = []
  for (const a of [-s, s]) {
    for (const b of [-s, s]) {
      edges.push([[-s, a, b], [s, a, b]])
      edges.push([[a, -s, b], [a, s, b]])
      edges.push([[a, b, -s], [a, b, s]])
    }
  }
  return edges
}

/** The 12 cell edges as thin light rods (their ends hide inside the corner atoms). */
export function cellEdgesGeometry(cellCm = 8): Geo {
  const g = new Geo()
  for (const [a, b] of cubeEdges(cellCm / 2)) addCylinder(g, a, b, 0.12, COLORS.cellEdge, 8)
  return g.bakeShading()
}

/**
 * Frosted "mystery" cube for an unsolved mission (glow material): faint shaded faces
 * plus brighter edges, the same size as the cell.
 */
export function mysteryCubeGeometry(cellCm = 8): Geo {
  const s = cellCm / 2
  const faces = new Geo()
  addBox(faces, [0, 0, 0], [s, s, s], COLORS.mysteryFace)
  faces.bakeShading(KEY_LIGHT, 0.6)
  const g = new Geo().append(faces)
  // Stop each edge one radius short of the corners: three additive rods meeting at a
  // corner would otherwise saturate to a white blob.
  const r = 0.16
  for (const [a, b] of cubeEdges(s)) {
    const d = norm(sub(b, a))
    const a2: Vec3 = [a[0] + d[0] * r, a[1] + d[1] * r, a[2] + d[2] * r]
    const b2: Vec3 = [b[0] - d[0] * r, b[1] - d[1] * r, b[2] - d[2] * r]
    addCylinder(g, a2, b2, r, COLORS.mysteryEdge, 8)
  }
  return g
}

// ---------------------------------------------------------------- stage 2: guides and overlays (glow parts)

export const STAGE2_COLORS = {
  /** Prediction ring: faint violet (additive). */
  ring: [0.3, 0.2, 0.46, 1] as RGBA,
  /** Guide arrow: soft green at about half brightness (additive, so "50 % alpha" is 50 % RGB). */
  guide: [0.24, 0.5, 0.3, 1] as RGBA,
  /** Edge chevron: soft warm white. */
  chevron: [0.62, 0.6, 0.54, 1] as RGBA,
  /** Sample tag: faint card, light outline and string. */
  tagFill: [0.045, 0.045, 0.05, 1] as RGBA,
  tagEdge: [0.36, 0.35, 0.32, 1] as RGBA,
}

/** Segments in the prediction ring (vertex count = 2 · (segments + 1)). */
export const RING_SEGMENTS = 128

/** A rectangle on the wall, cm from the beam stop (x right, y up); DEFAULT_DETECTOR is one. */
export interface WallRect {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Prediction ring: a thin annulus of mid-radius `radiusCm` in the plane z = 0, facing +z.
 * Its vertex layout depends only on `segments`, so a MeshBuilder built from one radius can be
 * rewritten in place (setVertexInterleaved) for another; the line width stays `widthCm`.
 * With `clip` (the wall), the parts of the ring off the wall are coloured black, which is
 * transparent on the additive display, so a large ring never draws past the wall's edges.
 */
export function ringGeometry(
  radiusCm: number,
  widthCm = 0.6,
  segments = RING_SEGMENTS,
  color: RGBA = STAGE2_COLORS.ring,
  clip: WallRect | null = null,
): Geo {
  const g = new Geo()
  const r0 = Math.max(0, radiusCm - widthCm / 2)
  const r1 = radiusCm + widthCm / 2
  const n: Vec3 = [0, 0, 1]
  const off: RGBA = [0, 0, 0, 0]
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2
    const c = Math.cos(th)
    const s = Math.sin(th)
    const x = radiusCm * c
    const y = radiusCm * s
    const onWall = !clip || (x >= clip.minX && x <= clip.maxX && y >= clip.minY && y <= clip.maxY)
    const col = onWall ? color : off
    g.vertex([r0 * c, r0 * s, 0], n, col)
    g.vertex([r1 * c, r1 * s, 0], n, col)
  }
  for (let i = 0; i < segments; i++) {
    const a = 2 * i // inner i
    const b = a + 1 // outer i
    const c = a + 2 // inner i+1
    const d = a + 3 // outer i+1
    g.tri(a, b, d)
    g.tri(a, d, c)
  }
  return g
}

/**
 * Height (cm above the beam stop) of the prediction-ring label of line height `labelHeightCm`:
 * just above the top of the ring when that fits on the wall (`wall.maxY`); otherwise (no ring:
 * unreachable, 2θ ≥ 90°, or a ring whose top is off the wall) under the beam stop.
 */
export function ringLabelY(radiusCm: number | null, labelHeightCm: number, wall: WallRect): number {
  const under = -labelHeightCm * 2.6
  if (radiusCm === null || !(radiusCm > 0)) return under
  const y = radiusCm + labelHeightCm * 0.8
  return y + labelHeightCm / 2 <= wall.maxY ? y : under
}

export type GuideAxisGeo = "phi" | "chi"

/** Guide-arc defaults (devpost/clad-handoff-2.md §3): φ arc radius ~7 cm, ~70° on the near side. */
export const GUIDE_ARC = {
  phiRadiusCm: 7,
  /** The χ arc runs in the vertical plane through the crystal; it needs to clear the rotating cell (half-diagonal 6.9 cm + atom). */
  chiRadiusCm: 8.5,
  arcDeg: 70,
  tubeRadiusCm: 0.22,
  headRadiusCm: 0.75,
  headLengthCm: 1.8,
  /** φ arc height relative to the crystal centre (just below the cell). */
  phiDropCm: 7,
}

/**
 * Curved guide arrow around the arc's centre (its pivot), on the near (+z) side.
 *   phi: arc in the horizontal plane around +y; sign +1 puts the head at the user's right end, pointing right.
 *   chi: arc in the vertical plane around +x; sign +1 puts the head at the top end, pointing up.
 * Built as a thin tube with a cone head, so it reads from any angle.
 */
export function guideArcGeometry(
  axis: GuideAxisGeo,
  sign: 1 | -1,
  radiusCm: number,
  arcDeg = GUIDE_ARC.arcDeg,
  color: RGBA = STAGE2_COLORS.guide,
): Geo {
  const g = new Geo()
  const half = ((arcDeg / 2) * Math.PI) / 180
  // Point and tangent (direction of increasing t) on the arc; t = 0 is straight toward the user.
  const at = (t: number): Vec3 =>
    axis === "phi" ? [radiusCm * Math.sin(t), 0, radiusCm * Math.cos(t)] : [0, radiusCm * Math.sin(t), radiusCm * Math.cos(t)]
  const tangent = (t: number): Vec3 => (axis === "phi" ? [Math.cos(t), 0, -Math.sin(t)] : [0, Math.cos(t), -Math.sin(t)])

  // The tube covers the whole arc; the cone sits on the head end and extends past it.
  const t0 = -half
  const t1 = half
  const steps = 18
  for (let i = 0; i < steps; i++) {
    const a = at(t0 + ((t1 - t0) * i) / steps)
    const b = at(t0 + ((t1 - t0) * (i + 1)) / steps)
    addCylinder(g, a, b, GUIDE_ARC.tubeRadiusCm, color, 8)
  }
  const tHead = sign > 0 ? t1 : t0
  const base = at(tHead)
  const tan = tangent(tHead)
  const dir: Vec3 = sign > 0 ? tan : [-tan[0], -tan[1], -tan[2]]
  addLathe(g, [[GUIDE_ARC.headRadiusCm, 0], [0, GUIDE_ARC.headLengthCm]], 14, color, {origin: base, axis: dir})
  return g
}

/**
 * Edge chevron: a filled arrowhead `sizeCm` across, pointing +x in the plane z = 0, facing +z.
 */
export function chevronGeometry(sizeCm = 3, color: RGBA = STAGE2_COLORS.chevron): Geo {
  const g = new Geo()
  const s = sizeCm
  const n: Vec3 = [0, 0, 1]
  const tip = g.vertex([0.5 * s, 0, 0], n, color)
  const top = g.vertex([-0.5 * s, 0.5 * s, 0], n, color)
  const notch = g.vertex([-0.2 * s, 0, 0], n, color)
  const bottom = g.vertex([-0.5 * s, -0.5 * s, 0], n, color)
  g.tri(tip, top, notch)
  g.tri(tip, notch, bottom)
  return g
}

/**
 * Sample tag card defaults: wide enough for "Face-centred cubic" at 1.3 cm text. The tag hangs
 * beside the goniometer post (to the user's right of it, clear of the φ guide arc above and the
 * φ/χ readouts below, seen from the user's eye); `tether` is where the post is in the card's frame.
 */
export const SAMPLE_TAG = {widthCm: 15, heightCm: 4.0, tether: [-9.2, 2.4] as [number, number]}

/**
 * Sample tag. Pivot: the card centre; faces +z. A faint fill, a light outline and a short tether
 * from the card's top corner nearest the post to the post.
 */
export function sampleTagCardGeometry(
  w = SAMPLE_TAG.widthCm,
  h = SAMPLE_TAG.heightCm,
  tether: [number, number] = SAMPLE_TAG.tether,
): Geo {
  const g = new Geo()
  const x = w / 2
  const y = h / 2
  const n: Vec3 = [0, 0, 1]
  const f = STAGE2_COLORS.tagFill
  const i = g.vertex([-x, -y, -0.02], n, f)
  g.vertex([x, -y, -0.02], n, f)
  g.vertex([x, y, -0.02], n, f)
  g.vertex([-x, y, -0.02], n, f)
  g.tri(i, i + 1, i + 2)
  g.tri(i, i + 2, i + 3)
  const e = STAGE2_COLORS.tagEdge
  const lw = 0.14
  addBarXY(g, -x, -y, x, -y, lw, 0, e)
  addBarXY(g, x, -y, x, y, lw, 0, e)
  addBarXY(g, x, y, -x, y, lw, 0, e)
  addBarXY(g, -x, y, -x, -y, lw, 0, e)
  // A small eyelet at the corner nearest the post, and the tether from it.
  const ex = tether[0] < 0 ? -x + 0.6 : x - 0.6
  const ey = y - 0.6
  addBarXY(g, ex, ey, tether[0], tether[1], 0.1, 0, e)
  return g
}
