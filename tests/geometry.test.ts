/**
 * Unit tests for Assets/Scripts/BraggGeometry.ts: every triangle faces outward
 * (counter-clockwise from outside, since Lens culls back faces), indices fit UInt16,
 * and the parts match the sizes in devpost/clad-handoff-1.md.
 */
import {test} from "node:test"
import assert from "node:assert/strict"
import {
  BRAGG_LAYOUT,
  GHOST_BRIGHTNESS,
  GONIOMETER_HEAD_RADIUS_CM,
  GONIOMETER_HEAD_TOP_CM,
  Geo,
  STRIDE,
  Vec3,
  beamStopGeometry,
  cellCornerAtomsGeometry,
  cellEdgesGeometry,
  cellFaceAtomsGeometry,
  deskGeometry,
  goniometerGeometry,
  mysteryCubeGeometry,
  spotGeometry,
  twoThetaTickX,
  unitBeamGeometry,
  unitPulseGeometry,
  unitRayGeometry,
  wallGridGeometry,
  xrayTubeGeometry,
} from "../Assets/Scripts/BraggGeometry"
import {crystalToLab, DEFAULT_DETECTOR} from "../Assets/Scripts/BraggPhysics"

const PARTS: Record<string, () => Geo> = {
  desk: deskGeometry,
  goniometer: goniometerGeometry,
  xrayTube: xrayTubeGeometry,
  beamStop: beamStopGeometry,
  wallGrid: wallGridGeometry,
  spot: () => spotGeometry(1),
  ghost: () => spotGeometry(GHOST_BRIGHTNESS),
  ray: unitRayGeometry,
  beam: unitBeamGeometry,
  pulse: unitPulseGeometry,
  cornerAtoms: () => cellCornerAtomsGeometry(),
  faceAtoms: () => cellFaceAtomsGeometry(),
  cellEdges: () => cellEdgesGeometry(),
  mystery: () => mysteryCubeGeometry(),
}

const OPAQUE = ["desk", "goniometer", "xrayTube", "beamStop", "cornerAtoms", "faceAtoms", "cellEdges"]

function pos(g: Geo, i: number): Vec3 {
  const o = i * STRIDE
  return [g.verts[o], g.verts[o + 1], g.verts[o + 2]]
}
function nrm(g: Geo, i: number): Vec3 {
  const o = i * STRIDE
  return [g.verts[o + 3], g.verts[o + 4], g.verts[o + 5]]
}
function rgb(g: Geo, i: number): Vec3 {
  const o = i * STRIDE + 6
  return [g.verts[o], g.verts[o + 1], g.verts[o + 2]]
}
function bounds(g: Geo): {min: Vec3; max: Vec3} {
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < g.vertexCount; i++) {
    const p = pos(g, i)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[k])
      max[k] = Math.max(max[k], p[k])
    }
  }
  return {min, max}
}
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps

for (const [name, make] of Object.entries(PARTS)) {
  test(`${name}: valid UInt16 triangle list`, () => {
    const g = make()
    assert.ok(g.vertexCount > 0)
    assert.ok(g.vertexCount <= 65535, `${g.vertexCount} vertices`)
    assert.equal(g.verts.length % STRIDE, 0)
    assert.equal(g.indices.length % 3, 0)
    for (const i of g.indices) assert.ok(Number.isInteger(i) && i >= 0 && i < g.vertexCount)
  })

  test(`${name}: every triangle is counter-clockwise from outside`, () => {
    const g = make()
    let checked = 0
    for (let t = 0; t < g.indices.length; t += 3) {
      const [a, b, c] = [g.indices[t], g.indices[t + 1], g.indices[t + 2]]
      const p0 = pos(g, a), p1 = pos(g, b), p2 = pos(g, c)
      const e1: Vec3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]
      const e2: Vec3 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]
      const fn: Vec3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
      const area2 = Math.hypot(fn[0], fn[1], fn[2])
      if (area2 < 1e-9) continue // pole triangles of a lathe collapse to a point
      const n0 = nrm(g, a), n1 = nrm(g, b), n2 = nrm(g, c)
      const vn: Vec3 = [n0[0] + n1[0] + n2[0], n0[1] + n1[1] + n2[1], n0[2] + n1[2] + n2[2]]
      const d = (fn[0] * vn[0] + fn[1] * vn[1] + fn[2] * vn[2]) / area2
      assert.ok(d > 0, `${name} triangle ${t / 3} winds against its normal (${d.toFixed(3)})`)
      checked++
    }
    assert.ok(checked > 0)
  })

  test(`${name}: colors stay within 0…1`, () => {
    const g = make()
    for (let i = 0; i < g.vertexCount; i++) for (const c of rgb(g, i)) assert.ok(c >= 0 && c <= 1 + 1e-9)
  })
}

test("opaque parts avoid dark colors (black is transparent on Specs)", () => {
  for (const name of OPAQUE) {
    const g = PARTS[name]()
    for (let i = 0; i < g.vertexCount; i++) {
      const [r, gg, b] = rgb(g, i)
      assert.ok(Math.max(r, gg, b) >= 0.25, `${name} vertex ${i} is too dark`)
    }
  }
})

test("desk: 120 × 3 × 60 slab, top 1.5 cm above its pivot (y = −45), legs to the floor (y = −150)", () => {
  const {min, max} = bounds(deskGeometry())
  assert.ok(near(max[1], 1.5) && near(BRAGG_LAYOUT.desk[1] + max[1], -45))
  assert.ok(near(BRAGG_LAYOUT.desk[1] + min[1], -150))
  assert.ok(near(min[0], -60) && near(max[0], 60) && near(min[2], -30) && near(max[2], 30))
})

test("goniometer: Ø10 base on the desk top, pin up to the cell", () => {
  const {min, max} = bounds(goniometerGeometry())
  assert.ok(near(min[1], 0) && near(max[1], 16.5))
  assert.ok(near(max[0], 5, 1e-3) && near(min[0], -5, 1e-3))
  assert.ok(near(BRAGG_LAYOUT.goniometer[1], -45))
  // The crystal centre is 20 cm above the goniometer pivot.
  assert.ok(near(BRAGG_LAYOUT.crystal[1] - BRAGG_LAYOUT.goniometer[1], 20))
})

test("goniometer head stays clear of the rotating cell for |χ| ≤ 45°", () => {
  const s = 4
  const atomR = 0.7
  const edgeR = 0.12
  const pts: {p: Vec3; r: number}[] = []
  for (const x of [-s, s]) for (const y of [-s, s]) for (const z of [-s, s]) pts.push({p: [x, y, z], r: atomR})
  for (const c of [[s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]] as Vec3[]) pts.push({p: c, r: atomR})
  // Points along the 12 edges.
  for (let k = 0; k <= 16; k++) {
    const t = -s + (2 * s * k) / 16
    for (const a of [-s, s]) for (const b of [-s, s]) {
      pts.push({p: [t, a, b], r: edgeR}, {p: [a, t, b], r: edgeR}, {p: [a, b, t], r: edgeR})
    }
  }
  let lowest = Infinity
  for (let phi = -180; phi <= 180; phi += 3) {
    for (let chi = -45; chi <= 45; chi += 3) {
      for (const {p, r} of pts) {
        // Local cell offsets are lab offsets at φ = χ = 0; convert to crystal-frame components first.
        const c = {x: -p[2], y: -p[0], z: p[1]}
        const v = crystalToLab(c, phi, chi)
        const horizontal = Math.hypot(v.x, v.z)
        if (horizontal > GONIOMETER_HEAD_RADIUS_CM + r) continue
        lowest = Math.min(lowest, 20 + v.y - r)
      }
    }
  }
  assert.ok(lowest > GONIOMETER_HEAD_TOP_CM, `lowest cell point over the head: ${lowest.toFixed(2)} cm`)
})

test("x-ray tube: axis from z = −20 to −35 at crystal height, stand on the desk top", () => {
  const {min, max} = bounds(xrayTubeGeometry())
  assert.ok(near(BRAGG_LAYOUT.xrayTube[2] + max[2], -20, 1e-6))
  assert.ok(near(BRAGG_LAYOUT.xrayTube[2] + min[2], -35, 1e-6))
  assert.ok(near(BRAGG_LAYOUT.xrayTube[1] + min[1], -45, 1e-6))
  assert.ok(near(BRAGG_LAYOUT.beamStart[2], -35) && near(BRAGG_LAYOUT.xrayTube[1], BRAGG_LAYOUT.crystal[1]))
})

test("beam stop: Ø4 disc facing the user, under the spot plane (z = +0.6)", () => {
  const {min, max} = bounds(beamStopGeometry())
  assert.ok(near(max[0], 2, 1e-3) && near(min[1], -2, 1e-3))
  assert.ok(near(min[2], 0) && max[2] < 0.6)
  assert.ok(near(BRAGG_LAYOUT.beamStop[2] - BRAGG_LAYOUT.crystal[2], -DEFAULT_DETECTOR.distanceCm))
})

test("wall grid: covers the detector extent, faces the user, 2θ ticks at 150·tan 2θ", () => {
  const g = wallGridGeometry()
  const {min, max} = bounds(g)
  assert.ok(near(min[0], DEFAULT_DETECTOR.minX, 0.31) && near(max[0], DEFAULT_DETECTOR.maxX, 0.31))
  assert.ok(near(min[1], DEFAULT_DETECTOR.minY, 0.31) && near(max[1], DEFAULT_DETECTOR.maxY, 0.31))
  assert.ok(max[2] < 0.6)
  assert.ok(near(twoThetaTickX(10), 26.449, 1e-3))
  assert.ok(near(twoThetaTickX(50), 178.763, 1e-3))
  assert.ok(twoThetaTickX(50) < DEFAULT_DETECTOR.maxX)
})

test("spot: Ø5 bright core with a halo to r = 7.5; the ghost is the same at 25%", () => {
  const lit = spotGeometry(1)
  const ghost = spotGeometry(GHOST_BRIGHTNESS)
  const {max} = bounds(lit)
  assert.ok(near(max[0], 7.5, 1e-6))
  assert.ok(near(rgb(lit, 0)[0], 1) && near(rgb(ghost, 0)[0], 0.25))
  assert.equal(lit.vertexCount, ghost.vertexCount)
  // The outer halo ring fades to black (transparent on the additive display).
  assert.ok(near(Math.max(...rgb(lit, lit.vertexCount - 1)), 0))
})

test("unit ray, beam and pulse run from z = 0 to z = −1 along the axis", () => {
  for (const g of [unitRayGeometry(), unitBeamGeometry(), unitPulseGeometry()]) {
    const {min, max} = bounds(g)
    assert.ok(near(max[2], 0) && near(min[2], -1))
    assert.ok(max[0] < 0.5 && max[1] < 0.5)
  }
})

test("crystal: 8 cm cell centred on C, 8 corner atoms + 6 face atoms of Ø1.4", () => {
  const corners = bounds(cellCornerAtomsGeometry())
  assert.ok(near(corners.max[0], 4.7, 0.02) && near(corners.min[1], -4.7, 1e-6))
  const faces = bounds(cellFaceAtomsGeometry())
  assert.ok(near(faces.max[2], 4.7, 0.05))
  const edges = bounds(cellEdgesGeometry())
  assert.ok(edges.max[0] <= 4.13 && edges.max[0] >= 4.0)
  const mystery = bounds(mysteryCubeGeometry())
  assert.ok(near(mystery.max[1], 4.16, 1e-3))
})
