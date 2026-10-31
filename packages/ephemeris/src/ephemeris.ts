import { AU_KM, BODIES, PLANET_IDS, sphereOfInfluenceKm, type BodyId } from "./bodies.js";
import { APPROX_ELEMENTS, type PlanetId } from "./elements.js";
import { stateFromElements, type ClassicalElements } from "./kepler.js";
import { DAYS_PER_JULIAN_CENTURY, SECONDS_PER_DAY } from "./time.js";
import type { Vec3 } from "./vec.js";

const DEG = Math.PI / 180;
const SECONDS_PER_CENTURY = DAYS_PER_JULIAN_CENTURY * SECONDS_PER_DAY;

export interface State {
  /** heliocentric position [km], ecliptic and equinox of J2000 */
  readonly r: Vec3;
  /** heliocentric velocity [km/s] */
  readonly v: Vec3;
}

/** Classical elements of a planet at ET (TDB seconds past J2000), following JPL's recipe. */
export function planetElements(id: PlanetId, et: number): ClassicalElements {
  const { epoch, ratePerCentury: rate } = APPROX_ELEMENTS[id];
  const T = et / SECONDS_PER_CENTURY;
  const a = (epoch.a + rate.a * T) * AU_KM;
  const e = epoch.e + rate.e * T;
  const i = (epoch.i + rate.i * T) * DEG;
  const L = (epoch.L + rate.L * T) * DEG;
  const varpi = (epoch.varpi + rate.varpi * T) * DEG;
  const node = (epoch.node + rate.node * T) * DEG;
  // Mean motion of the mean anomaly M = L - varpi, from the published rates.
  const n = ((rate.L - rate.varpi) * DEG) / SECONDS_PER_CENTURY;
  return { a, e, i, node, argPeri: varpi - node, M: L - varpi, n };
}

/** Heliocentric state of a planet (the Earth-Moon barycenter for "earth"). */
export function planetState(id: PlanetId, et: number): State {
  return stateFromElements(planetElements(id, et));
}

export interface EphemerisOptions {
  /**
   * Project every orbit onto the ecliptic plane (z = 0). Starshot's 2D levels
   * use this so a top-down aim can hit a target; real inclinations are up to 7 degrees.
   */
  readonly flatten?: boolean;
}

/** The interface the physics engine consumes: a state for any body at any ET. */
export interface Ephemeris {
  readonly bodies: readonly BodyId[];
  readonly flattened: boolean;
  state(id: BodyId, et: number): State;
  /** Sphere-of-influence radius [km] of a planet at ET. Infinity for the Sun. */
  soiKm(id: BodyId, et: number): number;
}

const ORIGIN: State = { r: [0, 0, 0], v: [0, 0, 0] };

export function createEphemeris(options: EphemerisOptions = {}): Ephemeris {
  const flatten = options.flatten ?? false;
  return {
    bodies: ["sun", ...PLANET_IDS],
    flattened: flatten,
    state(id, et) {
      if (id === "sun") return ORIGIN;
      const s = planetState(id, et);
      return flatten ? { r: [s.r[0], s.r[1], 0], v: [s.v[0], s.v[1], 0] } : s;
    },
    soiKm(id, et) {
      if (id === "sun") return Infinity;
      return sphereOfInfluenceKm(id, planetElements(id, et).a);
    },
  };
}

/**
 * Points along one full orbit of a planet using its elements frozen at ET, for
 * drawing. Returns `samples` points (closed loop when drawn).
 */
export function orbitPath(id: PlanetId, et: number, samples = 256, options: EphemerisOptions = {}): Vec3[] {
  const el = planetElements(id, et);
  const pts: Vec3[] = [];
  for (let k = 0; k < samples; k++) {
    const { r } = stateFromElements({ ...el, M: (2 * Math.PI * k) / samples });
    pts.push(options.flatten ? [r[0], r[1], 0] : r);
  }
  return pts;
}

/** Orbital period [s] from the mean motion. */
export function orbitalPeriodSeconds(id: PlanetId, et = 0): number {
  return (2 * Math.PI) / planetElements(id, et).n;
}

export { BODIES };
