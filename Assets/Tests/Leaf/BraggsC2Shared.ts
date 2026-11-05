/** Shared expectations for the criterion-2 scenarios (test code only, not a component). */
import {braggThetaDeg} from "../../Scripts/BraggPhysics"
import {BraggsRoomMain} from "../../Scripts/BraggsRoomMain"
import {Checks, drawnSpot, f3, litSpot, offsetFromB, v3s} from "./BraggsLeafSupport"

export const A = 4.0
export const LAMBDA = 1.54
export const TH_B = braggThetaDeg(A, LAMBDA, {h: 0, k: 1, l: 0}) as number // 11.0987°
export const WALL_X = -150 * Math.tan(2 * TH_B * (Math.PI / 180)) // −61.206 cm

/** Label, wall offset and chime checks for a lit spot; shared by the hook and real-drag runs. */
export function checkLitSpot(c: Checks, main: BraggsRoomMain, key: string, title: string, expX: number, chimesBefore: number, prefix: string): void {
  const f = main.getFrame()
  const s = litSpot(f, key)
  if (!c.ok(`${prefix}: (${key}) is lit`, !!s, `lit keys [${f.lit.map((x) => x.key).join(" | ")}]`)) return
  c.eq(`${prefix}: spot title`, s.title, title)
  c.eq(`${prefix}: spot detail`, s.detail, "θ 11.1°  2θ 22.2°")
  c.near(`${prefix}: θ`, s.thetaDeg, TH_B, 0.001, "°")
  c.near(`${prefix}: 2θ`, s.twoThetaDeg, 2 * TH_B, 0.001, "°")
  c.near(`${prefix}: sim wall x (cm from B)`, s.wall.x, expX, 0.05, " cm")
  c.near(`${prefix}: sim wall y (cm from B)`, s.wall.y, 0, 0.05, " cm")
  const d = drawnSpot(main, key)
  if (!c.ok(`${prefix}: spot drawn in a SpotPool slot`, !!d)) return
  c.eq(`${prefix}: SpotLabel text`, d.label, `${title}\nθ 11.1°  2θ 22.2°`)
  c.ok(`${prefix}: SpotLabel enabled`, d.labelObj.isEnabledInHierarchy)
  const off = offsetFromB(d.world)
  c.info(`${prefix}: drawn spot offset from beam stop (room frame) ${v3s(off)} cm`)
  c.near(`${prefix}: drawn spot x offset from beam stop`, off.x, expX, 1.0, " cm")
  c.near(`${prefix}: drawn spot y offset from beam stop (on the horizontal line)`, off.y, 0, 1.0, " cm")
  const dc = main.chimeCount - chimesBefore
  c.ok(`${prefix}: a chime played`, dc >= 1, `chimeCount +${dc}`)
  const cp = main.lastChimeWorldPos
  c.ok(`${prefix}: chime played from the spot`, !!cp && cp.distance(d.world) < 1.0, cp ? `chime ${v3s(offsetFromB(cp))} vs spot ${v3s(off)} (from B), Δ ${f3(cp.distance(d.world))} cm` : "no chime position")
}
