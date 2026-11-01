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
  type BodyId,
  type Ephemeris,
  type PlanetId,
  type State,
  type Vec3,
} from "@starshot/ephemeris";
import {
  c3,
  deltaVFromLeo,
  departureState,
  hermite,
  simulate,
  type Encounter,
  type SimulationResult,
  type Termination,
} from "@starshot/physics";

export const DAY = 86400;

/** Integrator settings for one level. A level's preview and launch use the same object (D6). */
export interface SimSettings {
  readonly rtol: number;
  /** Position tolerance [km]. */
  readonly atolKm: number;
  /** Largest step [s]. */
  readonly maxStep: number;
  readonly maxSteps: number;
}

/**
 * Settings for the campaign and the inner-planet sandbox; the level tests fly
 * every known solution, par shot and hint with them. Time per preview over 432
 * aims per level (Node 22, the same V8 as Chromium, cached ephemeris): median
 * 2 ms (max 9-16) on the Mars and Venus levels, median 8 ms (max 17-20) on
 * Big Game and the Grand Tour, median 7-8 ms (max 25-27) in the Mars sandbox.
 */
export const SIM_SETTINGS: SimSettings = Object.freeze({
  rtol: 1e-10,
  atolKm: 1,
  maxStep: 2 * DAY,
  maxSteps: 20000,
});

/**
 * Settings for sandbox targets beyond Mars (5-14 year flights to capture zones
 * 48-87 million km in radius), used with the sandbox's shorter attractor list.
 * Against the previous sandbox setup (SIM_SETTINGS, every planet but Mercury)
 * on 864 shots, no hit turned into a miss or back, and the closest approach
 * moved by a median 0.06-0.12% of the zone radius (90th percentile 0.4-1.4%).
 * Sun-only energy drift over 13.7 years: 8e-5 on a transfer to the outer
 * planets, 3e-3 on an orbit that grazes the Sun (0.06 au) every few months.
 * That Sun-grazer is the slowest preview: ~150-220 ms before, ~30-45 ms now.
 * Measured numbers: apps/game/README.md.
 */
export const OUTER_SIM_SETTINGS: SimSettings = Object.freeze({
  rtol: 1e-9,
  atolKm: 300,
  maxStep: 10 * DAY,
  maxSteps: 20000,
});

/** Closest approach under this many target radii earns the "bullseye" star. */
export const BULLSEYE_RADII = 10;

/** Last date of the JPL approximate-elements table (valid 1800-2050). */
export const EPHEMERIS_VALID_UNTIL_ISO = "2050-01-01";
const EPHEMERIS_VALID_UNTIL_ET = etFromIso(EPHEMERIS_VALID_UNTIL_ISO);

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
  /** The level's integrator settings (identical for its preview and its launch, D6). */
  readonly sim: SimSettings;
  /**
   * Capture-zone radius as a multiple of the target's real sphere of influence.
   * 1 (the default) everywhere except the training level. Must be at least 1:
   * the integrator stops at the real sphere, so a smaller zone would be scored
   * as a hit the probe never reached; simulateShot throws a RangeError instead.
   */
  readonly captureZoneScale?: number;
}

/** Everything about a level's shot except the launch time and the aim. */
export type ShotTemplate = Omit<ShotRequest, "launchEt" | "vInf">;

/**
 * The flattened ephemeris the game uses, with a small exact cache: the
 * integrator asks for the same planet at the same instant several times per
 * step (the last two Dormand-Prince stages, the encounter check and the next
 * step's size cap). Returned states are identical to the plain ephemeris's,
 * value for value, so results do not change; callers must not mutate them.
 */
export function cachedEphemeris(base: Ephemeris): Ephemeris {
  const SLOTS = 4;
  const slots = new Map<BodyId, { t: Float64Array; s: Array<State | null>; next: number }>();
  for (const id of base.bodies) slots.set(id, { t: new Float64Array(SLOTS).fill(NaN), s: new Array<State | null>(SLOTS).fill(null), next: 0 });
  return {
    bodies: base.bodies,
    flattened: base.flattened,
    soiKm: (id, et) => base.soiKm(id, et),
    state(id, et) {
      const c = slots.get(id);
      if (!c) return base.state(id, et);
      for (let k = 0; k < SLOTS; k++) if (c.t[k] === et) return c.s[k]!;
      const s = base.state(id, et);
      c.t[c.next] = et;
      c.s[c.next] = s;
      c.next = (c.next + 1) % SLOTS;
      return s;
    },
  };
}

/** Capture-zone radius [km] the shot is scored against. */
export const captureZoneKm = (ephemeris: Ephemeris, shot: ShotRequest): number =>
  ephemeris.soiKm(shot.target, shot.launchEt) * (shot.captureZoneScale ?? 1);

/** Run the flight exactly as the game does. */
export function simulateShot(ephemeris: Ephemeris, shot: ShotRequest): SimulationResult {
  const scale = shot.captureZoneScale ?? 1;
  if (!(scale >= 1)) {
    throw new RangeError(
      `captureZoneScale must be at least 1 (got ${scale}): the flight stops at the target's real sphere of influence, so a smaller capture zone cannot be scored`,
    );
  }
  const attractors = shot.attractors.includes(shot.target) ? shot.attractors : [...shot.attractors, shot.target];
  const start = departureState(ephemeris, shot.launchEt, shot.vInf);
  const result = simulate({
    ephemeris,
    attractors,
    t0: shot.launchEt,
    r0: start.r,
    v0: start.v,
    duration: shot.maxFlightDays * DAY,
    stopAtSoiOf: shot.target,
    departFrom: "earth",
    rtol: shot.sim.rtol,
    atolKm: shot.sim.atolKm,
    maxStep: shot.sim.maxStep,
    maxSteps: shot.sim.maxSteps,
  });
  return scale > 1 ? stopAtCaptureZone(ephemeris, result, shot.target, captureZoneKm(ephemeris, shot)) : result;
}

/**
 * A training capture zone is larger than the sphere of influence the
 * integrator stops at, so the flight is cut where it first crosses the larger
 * radius (bisection on the same Hermite interpolant the integrator uses for its
 * own sphere-of-influence stop). The probe always crosses it before the real
 * sphere, so everything up to the cut is the untouched simulation.
 */
export function stopAtCaptureZone(
  ephemeris: Ephemeris,
  result: SimulationResult,
  target: PlanetId,
  radiusKm: number,
): SimulationResult {
  const s = result.samples;
  const distance = (t: number, r: Vec3): number => norm(sub(r, ephemeris.state(target, t).r));
  let tInside = Infinity;
  for (let i = 1; i < s.length; i++) {
    if (distance(s[i]!.t, s[i]!.r) < radiusKm) {
      tInside = s[i]!.t;
      break;
    }
  }
  // A dip inside between two samples shows up as a refined closest approach.
  for (const e of result.encounters) {
    if (e.body === target && e.distanceKm < radiusKm && e.t < tInside) tInside = e.t;
  }
  if (!Number.isFinite(tInside)) return result;
  let i = 1;
  while (i < s.length - 1 && s[i]!.t < tInside) i++;
  const a = s[i - 1]!;
  const b = s[i]!;
  let lo = a.t;
  let hi = tInside;
  for (let k = 0; k < 60 && hi - lo > 1e-3; k++) {
    const mid = (lo + hi) / 2;
    if (distance(mid, hermite(a, b, mid).r) < radiusKm) hi = mid;
    else lo = mid;
  }
  const end = hermite(a, b, hi);
  const tgt = ephemeris.state(target, hi);
  const rel = sub(end.r, tgt.r);
  const vRel = sub(end.v, tgt.v);
  const d = norm(rel);
  const entry: Encounter = {
    body: target,
    t: hi,
    distanceKm: d,
    relativeSpeedKmS: norm(vRel),
    insideSoi: d < ephemeris.soiKm(target, s[0]!.t),
    impact: d < BODIES[target].radiusKm,
  };
  const encounters = [...result.encounters.filter((e) => e.t <= hi), entry];
  const closest: Partial<Record<BodyId, Encounter>> = {};
  for (const e of encounters) {
    const best = closest[e.body];
    if (!best || e.distanceKm < best.distanceKm) closest[e.body] = e;
  }
  return {
    samples: [...s.slice(0, i), { t: hi, r: end.r, v: end.v }],
    encounters,
    closest,
    termination: "soi-reached",
    terminatedBy: target,
    endTime: hi,
    steps: result.steps,
  };
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
  /** Target's real sphere-of-influence radius [km]. */
  readonly targetSoiKm: number;
  /** Capture-zone radius the shot is scored against [km]: the sphere of influence times captureZoneScale. */
  readonly captureZoneKm: number;
  /** 1 for the real sphere of influence; larger on the training level. */
  readonly captureZoneScale: number;
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
  /** The flight runs past the JPL table's validity (2050): planet positions there are extrapolated. */
  readonly beyondEphemerisRange: boolean;
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
  const captureZoneScale = shot.captureZoneScale ?? 1;
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
    captureZoneKm: targetSoiKm * captureZoneScale,
    captureZoneScale,
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
    beyondEphemerisRange: endEt > EPHEMERIS_VALID_UNTIL_ET,
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

/**
 * An aim on the finest grid the controls show and can set (the Fine buttons'
 * smallest steps): 0.01 degree and 0.001 km/s, angle in [0, 360).
 */
export function roundAim(aim: Aim): Aim {
  // Integer hundredths / thousandths, divided once: the same double as typing "75.93".
  const hundredths = Math.round(normalizeDeg(aim.angleDeg) * 100) % 36000;
  return { angleDeg: hundredths / 100, speedKmS: Math.round(aim.speedKmS * 1000) / 1000 };
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
