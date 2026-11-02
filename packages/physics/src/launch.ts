import { add, type Ephemeris, type Vec3 } from "@starshot/ephemeris";

/** Earth's own GM [km^3/s^2], without the Moon, for the departure hyperbola. */
export const EARTH_GM = 398600.435507;
/** A 200 km low Earth parking orbit radius [km]. */
export const LEO_RADIUS_KM = 6371 + 200;

/**
 * Patched-conic departure: the heliocentric start state of a probe that leaves
 * Earth with hyperbolic excess velocity vInf [km/s]. The escape hyperbola is
 * shorter than a day of a months-long flight, so the probe starts at Earth's
 * centre moving at Earth's velocity plus vInf; pass `departFrom: "earth"` to
 * `simulate` so Earth's gravity is switched on only once the probe is clear.
 * This keeps the game's aim consistent with a Lambert solution.
 */
export function departureState(ephemeris: Ephemeris, et: number, vInf: Vec3): { r: Vec3; v: Vec3 } {
  const earth = ephemeris.state("earth", et);
  return { r: earth.r, v: add(earth.v, vInf) };
}

/** Delta-v [km/s] for one burn from a circular parking orbit to escape with excess speed vInf. */
export function deltaVFromLeo(vInfKmS: number, parkingRadiusKm = LEO_RADIUS_KM): number {
  const vCirc = Math.sqrt(EARTH_GM / parkingRadiusKm);
  return Math.sqrt(vInfKmS * vInfKmS + (2 * EARTH_GM) / parkingRadiusKm) - vCirc;
}

/** Characteristic energy C3 = vInf^2 [km^2/s^2], the number launch vehicles are rated by. */
export const c3 = (vInfKmS: number): number => vInfKmS * vInfKmS;
