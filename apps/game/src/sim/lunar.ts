import { norm, sub } from '@starshot/ephemeris';
import rail from '@starshot/ephemeris/moon-rail.json';
import { LunarModel, simulateLunar, requestFor, MOON_GM, MOON_RADIUS, MOON_SOI_KM,
  LAUNCH_ET, EARTH_RADIUS, SETTINGS, type ParkingOrbit } from '@starshot/physics/lunar';
import { periapsisKm, type ShotAnalysis, type Aim } from './shot';
import type { Hint } from './hint';
import type { LunarShotRequest, LunarResult } from './flight-request';

export const lunarModel = new LunarModel(rail);
export function lunarRequest(launchEt: number, aim: Aim, parking: ParkingOrbit): LunarShotRequest {
  if (aim.angleDeg < -35 || aim.angleDeg > 35) throw new RangeError('Burn angle must be within 35 degrees of prograde');
  return { ...requestFor(aim.speedKmS, aim.angleDeg), kind: 'lunar', target: 'moon', launchEt,
    parkingRadiusKm: parking.radiusKm, parkingPhaseDeg: parking.phaseDeg, parking: { ...parking },
    approachRadiusKm: MOON_SOI_KM, settings: SETTINGS, stopAtEntry: true };
}
export function runLunar(shot: LunarShotRequest): { result: LunarResult; analysis: ShotAnalysis } {
  const f = simulateLunar(lunarModel, shot), last = f.samples.at(-1)!, target = lunarModel.bodies(last.t).moon;
  const r = sub(last.r, target.r), v = sub(last.v, target.v), hit = f.entryEt !== null;
  const periapsis = hit ? periapsisKm(r, v, MOON_GM) : undefined;
  const termination = f.impact ? 'impact' : hit ? 'soi-reached' : 'duration';
  return { result: { samples: f.samples, relativeSamples: f.samples.map(k => {
    const earth = lunarModel.bodies(k.t).earth; return { t: k.t, r: sub(k.r, earth.r), v: sub(k.v, earth.v) };
  }), steps: f.steps, endTime: last.t, termination,
    terminatedBy: f.impact ?? (hit ? 'moon' : undefined), encounters: [], closest: {} },
  analysis: { hit, termination, terminatedBy: f.impact ?? (hit ? 'moon' : undefined), launchEt: shot.launchEt,
    endEt: last.t, flightDays: (last.t - shot.launchEt) / 86400, targetSoiKm: MOON_SOI_KM,
    captureZoneKm: MOON_SOI_KM, captureZoneScale: 1, targetRadiusKm: MOON_RADIUS,
    closestKm: periapsis ?? f.closestKm, closestEt: hit ? last.t : f.closestEt, periapsisKm: periapsis,
    arrivalSpeedKmS: hit ? norm(v) : undefined, bullseye: hit && periapsis! < 10 * MOON_RADIUS,
    flybys: [], requiredFlybyDone: false, vInfKmS: 0, deltaVKmS: shot.deltaVKmS, c3: 0, beyondEphemerisRange: false } };
}
/** The study's measured reference is re-flown at the same control precision on every request. */
export function lunarHint(): Hint {
  const aim = { angleDeg: 0, speedKmS: 3.24 }, parking = { frameEt: LAUNCH_ET, epochEt: LAUNCH_ET, phaseDeg: 225, radiusKm: EARTH_RADIUS + 200 };
  const analysis = runLunar(lunarRequest(LAUNCH_ET, aim, parking)).analysis;
  return { day: 0, launchEt: LAUNCH_ET, aim, parking, hits: analysis.hit, closestKm: analysis.closestKm, source: 'curated', simulations: 1 };
}
