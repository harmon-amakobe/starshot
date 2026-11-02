import { add, scale, type State } from '@starshot/ephemeris';
import { EARTH_GM, EARTH_RADIUS, LunarModel } from './model.js';

/** Circular initial condition in the Moon's plane at epochEt, never a rotating basis. */
export interface ParkingOrbit {
  /** Fixed plane reference; changing the date must not rotate the craft with the Moon. */
  readonly frameEt?: number;
  readonly epochEt: number;
  readonly phaseDeg: number;
  readonly radiusKm: number;
}
export const parkingPeriod = (radiusKm: number) => 2 * Math.PI * Math.sqrt(radiusKm ** 3 / EARTH_GM);
export const parkingPhase = (orbit: ParkingOrbit, et: number) =>
  ((orbit.phaseDeg + (et - orbit.epochEt) / parkingPeriod(orbit.radiusKm) * 360) % 360 + 360) % 360;

/** Heliocentric ECLIPJ2000 [km, km/s], circular relative to Earth's moving centre. */
export function parkingState(model: LunarModel, orbit: ParkingOrbit, et: number): State {
  if (![orbit.epochEt, orbit.phaseDeg, orbit.radiusKm, et].every(Number.isFinite) || orbit.radiusKm <= EARTH_RADIUS) {
    throw new RangeError('Invalid parking orbit');
  }
  const basis = model.basis(orbit.frameEt ?? orbit.epochEt, parkingPhase(orbit, et)), earth = model.bodies(et).earth;
  return { r: add(earth.r, scale(basis.up, orbit.radiusKm)),
    v: add(earth.v, scale(basis.right, Math.sqrt(EARTH_GM / orbit.radiusKm))) };
}
