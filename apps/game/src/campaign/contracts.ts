import { shotRequestFor } from '../levels';
import { shotKey } from '../sim/preview';
import type { ShotResponse } from '../sim/protocol';
import { launchEtForDay, normalizeDeg, vInfFromAim, type Aim, type ShotRequest } from '../sim/shot';
import { missionFor, type Session } from './session';
/** The preview and launch parity key (D6): a launch that summarises differently is refused. */
export const summaryOf = (res: ShotResponse | null) =>
  res
    ? `${shotKey(res.shot)}|${res.analysis.hit}|${res.analysis.endEt}|${res.analysis.closestKm}|${res.analysis.flybys.map((f) => `${f.body}@${f.t}`).join(',')}`
    : null;
export function finalRequest(save: Session, value: Aim = save.aim) {
  const level = missionFor(save),
    aim = {
      angleDeg: normalizeDeg(value.angleDeg),
      speedKmS: Math.max(0, Math.min(level.vInfMaxKmS, value.speedKmS)),
    };
  return {
    aim,
    shot: shotRequestFor(level, launchEtForDay(level.window.startIso, save.day), vInfFromAim(aim)),
  };
}
export function matchesRestore(shot: ShotRequest, save: Session) {
  return shotKey(shot) === shotKey(finalRequest(save).shot);
}
export function aimFromPull(dx: number, dy: number, rotation: number, orbit: [number, number]) {
  const planeY = dy / Math.cos(orbit[0]),
    planeX = (-dx - Math.sin(orbit[1]) * Math.sin(orbit[0]) * planeY) / Math.cos(orbit[1]);
  return normalizeDeg(((Math.atan2(planeY, planeX) + rotation) * 180) / Math.PI);
}
/** Orthographic depth must include the front surface, not just increase the far plane. */
export function depthRange(extents: Array<{ centre: number; radius: number }>) {
  let minimum = -1000,
    maximum = 1000;
  for (const e of extents) {
    minimum = Math.min(minimum, e.centre - e.radius);
    maximum = Math.max(maximum, e.centre + e.radius);
  }
  const distance = Math.max(8000, maximum + 2000);
  return { distance, near: 0.1, far: distance - minimum + 2000 };
}
