import { requestFor, MOON_SOI_KM, SETTINGS, type ParkingOrbit } from '@starshot/physics/lunar';
import type { Aim } from './shot';
import type { LunarShotRequest } from './flight-request';

/** Built from constants alone, so the main thread makes a Moon request without the rail. */
export function lunarRequest(launchEt: number, aim: Aim, parking: ParkingOrbit): LunarShotRequest {
  if (aim.angleDeg < -35 || aim.angleDeg > 35) throw new RangeError('Burn angle must be within 35 degrees of prograde');
  return { ...requestFor(aim.speedKmS, aim.angleDeg), kind: 'lunar', target: 'moon', launchEt,
    parkingRadiusKm: parking.radiusKm, parkingPhaseDeg: parking.phaseDeg, parking: { ...parking },
    approachRadiusKm: MOON_SOI_KM, settings: SETTINGS, stopAtEntry: true };
}
