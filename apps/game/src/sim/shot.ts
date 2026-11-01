/**
 * One shot = one simulated probe flight. This module is the single source of
 * truth for how Starshot turns an aim into a trajectory, shared by the Web
 * Worker (aiming preview AND real launch), the hint finder and the level tests,
 * so what the player sees is exactly what they get (decision D6).
 */
import {
  BODIES,
  cross,
  dot,
  etFromIso,
  norm,
  sub,
  type Ephemeris,
  type PlanetId,
  type Vec3,
} from "@starshot/ephemeris";
import {
  c3,
  deltaVFromLeo,
  departureState,
  simulate,
  type SimulationResult,
  type Termination,
} from "@starshot/physics";

export const DAY = 86400;

/**
 * Integrator settings used for every shot. Measured in Node 22 (same V8 as
 * Chromium): 3-8 ms for the Mars, Venus and Jupiter levels, ~10-25 ms for the
 * 4.6-year Grand Tour, ~70 ms for a 16-year all-planet sandbox flight.
 */
export const SIM_SETTINGS = Object.freeze({
  rtol: 1e-10,
  atolKm: 1,
  maxStep: 2 * DAY,
  maxSteps: 20000,
});

/** Closest approach under this many target radii earns the "bullseye" star. */
export const BULLSEYE_RADII = 10;

export interface ShotRequest {
  readonly target: PlanetId;
  /** Planets whose gravity acts; must include the target. */
  readonly attractors: readonly PlanetId[];
  /** Launch time, ET (TDB seconds past J2000). */
  readonly launchEt: number;
  /** Hyperbolic excess velocity leaving Earth, ecliptic frame [km/s]. */
  readonly vInf: Vec3;
  readonly maxFlightDays: number;
  readonly requiredFlyby?: PlanetId;
}

/** Run the flight exactly as the game does. */
export function simulateShot(ephemeris: Ephemeris, shot: ShotRequest): SimulationResult {
  const attractors = shot.attractors.includes(shot.target) ? shot.attractors : [...shot.attractors, shot.target];
  const start = departureState(ephemeris, shot.launchEt, shot.vInf);
  return simulate({
    ephemeris,
    attractors,
    t0: shot.launchEt,
    r0: start.r,
    v0: start.v,
    duration: shot.maxFlightDays * DAY,
    stopAtSoiOf: shot.target,
    departFrom: "earth",
    ...SIM_SETTINGS,
  });
}

export interface Flyby {
  readonly body: PlanetId;
  readonly t: number;
  readonly distanceKm: number;
  readonly relativeSpeedKmS: number;
}

export interface ShotAnalysis {
  /** Reached the target's sphere of influence (or hit its surface). */
  readonly hit: boolean;
  readonly termination: Termination;
  readonly terminatedBy?: string;
  readonly launchEt: number;
  /** Time the flight ends (capture, impact, loss or time-out), ET. */
  readonly endEt: number;
  readonly flightDays: number;
  /** Target sphere-of-influence ("capture zone") radius [km]. */
  readonly targetSoiKm: number;
  readonly targetRadiusKm: number;
  /** Closest approach to the target centre [km] and when; for a hit, the predicted periapsis. */
  readonly closestKm: number;
  readonly closestEt: number;
  /** Patched-conic periapsis of the arrival hyperbola, for hits [km]. */
  readonly periapsisKm?: number;
  /** Speed relative to the target on arrival, for hits [km/s]. */
  readonly arrivalSpeedKmS?: number;
  readonly bullseye: boolean;
  /** Passes inside another planet's sphere of influence before the flight ends. */
  readonly flybys: readonly Flyby[];
  readonly requiredFlybyDone: boolean;
  readonly vInfKmS: number;
  readonly deltaVKmS: number;
  readonly c3: number;
}

/** Periapsis [km] of the two-body orbit with relative state (r, v) about a body of GM mu. */
export function periapsisKm(r: Vec3, v: Vec3, mu: number): number {
  const h = norm(cross(r, v));
  const energy = dot(v, v) / 2 - mu / norm(r);
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (mu * mu)));
  return (h * h) / mu / (1 + e);
}

/** Summarise a simulated shot for the HUD, scoring and tests. */
export function analyzeShot(ephemeris: Ephemeris, shot: ShotRequest, result: SimulationResult): ShotAnalysis {
  const target = shot.target;
  const last = result.samples[result.samples.length - 1]!;
  const endEt = last.t;
  const targetSoiKm = ephemeris.soiKm(target, shot.launchEt);
  const targetRadiusKm = BODIES[target].radiusKm;
  const hit =
    (result.termination === "soi-reached" || result.termination === "impact") && result.terminatedBy === target;

  let closestKm: number;
  let closestEt: number;
  let periapsis: number | undefined;
  let arrivalSpeed: number | undefined;
  if (hit) {
    const s = ephemeris.state(target, endEt);
    const rRel = sub(last.r, s.r);
    const vRel = sub(last.v, s.v);
    arrivalSpeed = norm(vRel);
    periapsis = result.termination === "impact" ? 0 : periapsisKm(rRel, vRel, BODIES[target].gm);
    closestKm = periapsis;
    closestEt = endEt;
  } else {
    const c = result.closest[target];
    closestKm = c?.distanceKm ?? Infinity;
    closestEt = c?.t ?? endEt;
    // The minimum may sit at the very end of the flight (still closing in).
    const s = ephemeris.state(target, endEt);
    const dEnd = norm(sub(last.r, s.r));
    if (dEnd < closestKm) {
      closestKm = dEnd;
      closestEt = endEt;
    }
  }

  const flybys: Flyby[] = [];
  for (const e of result.encounters) {
    if (!e.insideSoi || e.body === target || e.body === "sun" || e.t > endEt) continue;
    flybys.push({ body: e.body, t: e.t, distanceKm: e.distanceKm, relativeSpeedKmS: e.relativeSpeedKmS });
  }
  const vInfKmS = norm(shot.vInf);
  return {
    hit,
    termination: result.termination,
    terminatedBy: result.terminatedBy,
    launchEt: shot.launchEt,
    endEt,
    flightDays: (endEt - shot.launchEt) / DAY,
    targetSoiKm,
    targetRadiusKm,
    closestKm,
    closestEt,
    periapsisKm: periapsis,
    arrivalSpeedKmS: arrivalSpeed,
    bullseye: hit && closestKm < BULLSEYE_RADII * targetRadiusKm,
    flybys,
    requiredFlybyDone: shot.requiredFlyby !== undefined && flybys.some((f) => f.body === shot.requiredFlyby),
    vInfKmS,
    deltaVKmS: deltaVFromLeo(vInfKmS),
    c3: c3(vInfKmS),
  };
}

// ---------------------------------------------------------------------------
// Aim <-> vInf, and the launch-date grid

/** The player's aim: launch direction in the ecliptic plane and departure excess speed. */
export interface Aim {
  /** Direction of travel, degrees counter-clockwise from the vernal equinox (+x), [0, 360). */
  readonly angleDeg: number;
  readonly speedKmS: number;
}

const DEG = Math.PI / 180;

export const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

export function vInfFromAim(aim: Aim): Vec3 {
  const a = aim.angleDeg * DEG;
  return [aim.speedKmS * Math.cos(a), aim.speedKmS * Math.sin(a), 0];
}

export function aimFromVInf(v: Vec3): Aim {
  return { angleDeg: normalizeDeg(Math.atan2(v[1], v[0]) / DEG), speedKmS: Math.hypot(v[0], v[1]) };
}

/** "2026-11-05" plus n whole days, as an ISO date (UTC). */
export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from one ISO date to another (UTC). */
export function daysBetweenIso(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / (DAY * 1000));
}

/** Launches happen at 00:00 UTC on whole days of the window: day k is startIso + k days. */
export const launchEtForDay = (startIso: string, day: number): number => etFromIso(addDaysIso(startIso, day));
