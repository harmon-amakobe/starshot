import { shotRequestFor } from '../levels';
import { shotKey } from '../sim/preview';
import { launchEtForDay, normalizeDeg, vInfFromAim, type Aim } from '../sim/shot';
import { isLunarLevel } from '../missions';
import { lunarRequest } from '../sim/lunar-request';
import type { FlightRequest as ShotRequest } from '../sim/flight-request';
import { missionFor, type Session } from './session';
export function finalRequest(save: Session, value: Aim = save.aim) {
  const level = missionFor(save), lunar = isLunarLevel(level);
  const aim = { angleDeg: lunar ? Math.max(-35, Math.min(35, value.angleDeg)) : normalizeDeg(value.angleDeg), speedKmS: Math.max(0, Math.min(level.vInfMaxKmS, value.speedKmS)) };
  return { aim, shot: lunar ? lunarRequest(save.phase === 'aim' ? save.et : save.launchEt!, aim, save.parking!) : shotRequestFor(level, launchEtForDay(level.window.startIso, save.day), vInfFromAim(aim)) };
}
export function matchesRestore(shot: ShotRequest, save: Session) { return shotKey(shot) === shotKey(finalRequest(save).shot); }
export function aimFromPull(dx: number, dy: number, rotation: number, orbit: [number, number]) {
  const planeY = dy / Math.cos(orbit[0]), planeX = (-dx - Math.sin(orbit[1]) * Math.sin(orbit[0]) * planeY) / Math.cos(orbit[1]);
  return normalizeDeg((Math.atan2(planeY, planeX) + rotation) * 180 / Math.PI);
}
/** Screen clearance may shorten the drawn sleeve, never the input's precision. */
export const chargeFromPull = (initial: number, startDistance: number, distance: number, travel: number) =>
  Math.max(0, Math.min(1, initial + (distance - startDistance) / Math.max(160, travel)));
/** Orthographic depth must include the front surface, not just increase the far plane. */
export function depthRange(extents: Array<{ centre: number; radius: number }>) {
  let minimum = -1000, maximum = 1000;
  for (const e of extents) { minimum = Math.min(minimum, e.centre - e.radius); maximum = Math.max(maximum, e.centre + e.radius); }
  const distance = Math.max(8000, maximum + 2000); return { distance, near: .1, far: distance - minimum + 2000 };
}
