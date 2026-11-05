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
  GUIDE_ARC,
  RING_SEGMENTS,
  SAMPLE_TAG,
  chevronGeometry,
  guideArcGeometry,
  ringGeometry,
  ringLabelY,
  sampleTagCardGeometry,
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
  ring: () => ringGeometry(61.3),
  guidePhiPlus: () => guideArcGeometry("phi", 1, GUIDE_ARC.phiRadiusCm),
  guidePhiMinus: () => guideArcGeometry("phi", -1, GUIDE_ARC.phiRadiusCm),
  guideChiPlus: () => guideArcGeometry("chi", 1, GUIDE_ARC.chiRadiusCm),
  guideChiMinus: () => guideArcGeometry("chi", -1, GUIDE_ARC.chiRadiusCm),
  chevron: () => chevronGeometry(3),
  sampleTag: () => sampleTagCardGeometry(),
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

// ---------------------------------------------------------------- stage 2 parts

test("prediction ring: mid-radius r, constant width, vertex layout independent of r (rewritable in place)", () => {
  const a = ringGeometry(26.4, 0.6)
  const b = ringGeometry(140, 0.6)
  assert.equal(a.vertexCount, 2 * (RING_SEGMENTS + 1))
  assert.equal(a.vertexCount, b.vertexCount)
  assert.deepEqual(a.indices, b.indices)
  for (let i = 0; i < a.vertexCount; i++) {
    const [x, y, z] = pos(a, i)
    const r = Math.hypot(x, y)
    assert.ok(near(z, 0))
    assert.ok(near(r, i % 2 === 0 ? 26.1 : 26.7, 1e-6), `vertex ${i} at r = ${r}`)
  }
})

test("prediction ring clipped to the wall: off-wall parts are black (transparent), on-wall parts keep the colour", () => {
  const W = DEFAULT_DETECTOR
  // A small ring is entirely on the wall: clipping changes nothing.
  assert.deepEqual(ringGeometry(43.9, 0.6, RING_SEGMENTS, undefined, W).verts, ringGeometry(43.9, 0.6).verts)
  // (4 4 4) at Mo Kα, a = 5.00 Å: 2θ 58.9°, r = 150·tan 58.9° ≈ 249 cm, larger than the wall.
  const big = ringGeometry(249, 0.6, RING_SEGMENTS, undefined, W)
  assert.equal(big.vertexCount, ringGeometry(10).vertexCount) // same layout: still rewritable in place
  let lit = 0
  for (let i = 0; i < big.vertexCount; i += 2) {
    const [x, y] = pos(big, i)
    const rgb = big.verts.slice(i * STRIDE + 6, i * STRIDE + 9)
    const mx = x * (249 / Math.hypot(x, y))
    const my = y * (249 / Math.hypot(x, y))
    const onWall = mx >= W.minX && mx <= W.maxX && my >= W.minY && my <= W.maxY
    if (onWall) lit++
    assert.ok(onWall ? rgb.some((c) => c > 0) : rgb.every((c) => c === 0), `vertex ${i} at (${mx.toFixed(0)}, ${my.toFixed(0)})`)
  }
  assert.ok(lit > 0 && lit < RING_SEGMENTS / 4, `only the corner arcs of a 249 cm ring are on the wall (${lit} lit)`)
})

test("prediction ring label: above the ring when it fits on the wall, else under the beam stop", () => {
  const W = DEFAULT_DETECTOR
  assert.ok(near(ringLabelY(43.9, 4, W), 43.9 + 3.2))
  assert.ok(near(ringLabelY(null, 4, W), -10.4)) // unreachable or 2θ ≥ 90°
  assert.ok(near(ringLabelY(249, 4, W), -10.4)) // ring top off the wall
  assert.ok(near(ringLabelY(150, 4, W), 153.2)) // 153.2 + 2 ≤ 160: still fits
  assert.ok(near(ringLabelY(156, 4, W), -10.4))
})

/** The vertex of an arc mesh farthest along `dir` (the arrow tip). */
function extreme(g: Geo, dir: Vec3): Vec3 {
  let best = pos(g, 0)
  let bestD = -Infinity
  for (let i = 0; i < g.vertexCount; i++) {
    const p = pos(g, i)
    const d = p[0] * dir[0] + p[1] * dir[1] + p[2] * dir[2]
    if (d > bestD) {
      bestD = d
      best = p
    }
  }
  return best
}

test("guide arrow φ: horizontal arc on the near side; the head points right for +1 and left for −1", () => {
  for (const sign of [1, -1] as const) {
    const g = guideArcGeometry("phi", sign, GUIDE_ARC.phiRadiusCm)
    const {min, max} = bounds(g)
    assert.ok(min[2] > 0, "near side only (z > 0, toward the user)")
    assert.ok(Math.max(Math.abs(min[1]), Math.abs(max[1])) <= GUIDE_ARC.headRadiusCm + 1e-6, "flat in the horizontal plane")
    const tip = extreme(g, [sign, 0, 0])
    const other = extreme(g, [-sign, 0, 0])
    assert.ok(Math.abs(tip[0]) > Math.abs(other[0]) - 1e-6, "the head end reaches farther out on its side")
    assert.ok(sign * tip[0] > 0)
    // The arc stays clear of the goniometer axis and the tilted cell above it.
    for (let i = 0; i < g.vertexCount; i++) {
      const p = pos(g, i)
      assert.ok(Math.hypot(p[0], p[2]) >= GUIDE_ARC.phiRadiusCm - GUIDE_ARC.headRadiusCm - 1e-6)
    }
  }
})

test("guide arrow χ: vertical arc on the near side; the head points up for +1 and down for −1; clears the cell", () => {
  const cellClear = 4 * Math.sqrt(3) + 0.7 // cube half-diagonal + atom radius
  for (const sign of [1, -1] as const) {
    const g = guideArcGeometry("chi", sign, GUIDE_ARC.chiRadiusCm)
    const {min, max} = bounds(g)
    assert.ok(min[2] > 0, "near side only")
    assert.ok(Math.max(Math.abs(min[0]), Math.abs(max[0])) <= GUIDE_ARC.headRadiusCm + 1e-6, "in the vertical plane x = 0")
    const tip = extreme(g, [0, sign, 0])
    const other = extreme(g, [0, -sign, 0])
    assert.ok(Math.abs(tip[1]) > Math.abs(other[1]) - 1e-6)
    assert.ok(sign * tip[1] > 0)
    for (let i = 0; i < g.vertexCount; i++) {
      const p = pos(g, i)
      assert.ok(Math.hypot(p[0], p[1], p[2]) > cellClear, "never inside the rotating cell")
    }
  }
})

test("edge chevron: ~3 cm arrowhead pointing +x, facing +z", () => {
  const g = chevronGeometry(3)
  const {min, max} = bounds(g)
  assert.ok(near(max[0], 1.5) && near(min[0], -1.5) && near(max[1], 1.5) && near(min[1], -1.5))
  const tip = extreme(g, [1, 0, 0])
  assert.ok(near(tip[1], 0))
})

test("sample tag: card of the declared size with a tether out to the post", () => {
  const {min, max} = bounds(sampleTagCardGeometry())
  assert.ok(max[0] >= SAMPLE_TAG.widthCm / 2 && max[0] <= SAMPLE_TAG.widthCm / 2 + 0.1)
  assert.ok(min[1] <= -SAMPLE_TAG.heightCm / 2 && min[1] >= -SAMPLE_TAG.heightCm / 2 - 0.1)
  // The tether reaches the post, beyond the card's left edge.
  assert.ok(min[0] <= SAMPLE_TAG.tether[0] + 0.1)
  assert.ok(max[1] >= SAMPLE_TAG.tether[1] - 0.1)
})
