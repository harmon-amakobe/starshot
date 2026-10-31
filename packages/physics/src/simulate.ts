import {
  AU_KM,
  BODIES,
  type BodyId,
  type Ephemeris,
  type PlanetId,
  type Vec3,
} from "@starshot/ephemeris";
import { Dopri5, type State6 } from "./dopri5.js";
import { acceleration } from "./gravity.js";
import { hermite, type Knot } from "./hermite.js";

export interface SimulationConfig {
  readonly ephemeris: Ephemeris;
  /** Planets whose gravity acts on the probe (the Sun always does). Default: all planets. */
  readonly attractors?: readonly BodyId[];
  /** Start time, ET (TDB seconds past J2000). */
  readonly t0: number;
  /** Heliocentric start state [km, km/s]. */
  readonly r0: Vec3;
  readonly v0: Vec3;
  /** Maximum flight time [s]. */
  readonly duration: number;
  /** Stop as soon as the probe enters this body's sphere of influence. */
  readonly stopAtSoiOf?: BodyId;
  /**
   * Patched-conic departure: the probe starts at this body's centre with the
   * hyperbolic excess velocity already added, and this body's gravity is
   * ignored until the probe is two spheres of influence away (see launch.ts).
   */
  readonly departFrom?: BodyId;
  readonly rtol?: number;
  /** Position tolerance [km]. */
  readonly atolKm?: number;
  /** Largest allowed step [s]. Default 5 days. */
  readonly maxStep?: number;
  /** Hard cap on accepted steps. Default 20,000. */
  readonly maxSteps?: number;
  /** Probe is lost inside this distance from the Sun [km]. Default 10 solar radii. */
  readonly sunDiveRadiusKm?: number;
  /** Probe has left the play area beyond this distance [km]. Default 60 au. */
  readonly escapeRadiusKm?: number;
}

export interface TrajectorySample extends Knot {}

export interface Encounter {
  readonly body: BodyId;
  /** time of closest approach, ET */
  readonly t: number;
  /** closest-approach distance from the body's centre [km] */
  readonly distanceKm: number;
  /** relative speed at closest approach [km/s] */
  readonly relativeSpeedKmS: number;
  readonly insideSoi: boolean;
  readonly impact: boolean;
}

export type Termination = "duration" | "impact" | "sun" | "escape" | "soi-reached" | "max-steps";

export interface SimulationResult {
  readonly samples: readonly TrajectorySample[];
  /** Local distance minima, in time order, for approaches closer than 20 SOI radii. */
  readonly encounters: readonly Encounter[];
  /** Overall closest approach to each attractor. */
  readonly closest: Readonly<Partial<Record<BodyId, Encounter>>>;
  readonly termination: Termination;
  readonly terminatedBy?: BodyId;
  readonly endTime: number;
  readonly steps: number;
}

const DAY = 86400;

/** Distance [km] and its rate [km/s] between the probe and a body at time t. */
function relative(eph: Ephemeris, id: BodyId, t: number, r: Vec3, v: Vec3) {
  const s = eph.state(id, t);
  const dx = r[0] - s.r[0], dy = r[1] - s.r[1], dz = r[2] - s.r[2];
  const ux = v[0] - s.v[0], uy = v[1] - s.v[1], uz = v[2] - s.v[2];
  const d = Math.hypot(dx, dy, dz);
  return { d, rate: (dx * ux + dy * uy + dz * uz) / d, speed: Math.hypot(ux, uy, uz) };
}

/** Golden-section search for the distance minimum to `id` inside one step. */
function refineMinimum(eph: Ephemeris, id: BodyId, a: Knot, b: Knot) {
  const g = (Math.sqrt(5) - 1) / 2;
  let lo = a.t, hi = b.t;
  const dist = (t: number) => {
    const p = hermite(a, b, t);
    return relative(eph, id, t, p.r, p.v);
  };
  let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo);
  let f1 = dist(x1).d, f2 = dist(x2).d;
  for (let k = 0; k < 40 && hi - lo > 1; k++) {
    if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = dist(x1).d; }
    else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = dist(x2).d; }
  }
  const t = (lo + hi) / 2;
  return { t, ...dist(t) };
}

/** Integrate a probe trajectory under the Sun and planets. */
export function simulate(cfg: SimulationConfig): SimulationResult {
  const eph = cfg.ephemeris;
  const attractors: PlanetId[] = (cfg.attractors ?? eph.bodies).filter((b): b is PlanetId => b !== "sun");
  const maxStep = cfg.maxStep ?? 5 * DAY;
  const maxSteps = cfg.maxSteps ?? 20000;
  const sunDive = cfg.sunDiveRadiusKm ?? 10 * BODIES.sun.radiusKm;
  const escape = cfg.escapeRadiusKm ?? 60 * AU_KM;
  const tEnd = cfg.t0 + cfg.duration;

  const acc: [number, number, number] = [0, 0, 0];
  let active: PlanetId[] = cfg.departFrom ? attractors.filter((b) => b !== cfg.departFrom) : attractors;
  let departing = cfg.departFrom !== undefined && (attractors as readonly BodyId[]).includes(cfg.departFrom);
  const f = (t: number, y: State6, dy: State6) => {
    acceleration(eph, active, t, [y[0]!, y[1]!, y[2]!], acc);
    dy[0] = y[3]!; dy[1] = y[4]!; dy[2] = y[5]!;
    dy[3] = acc[0]; dy[4] = acc[1]; dy[5] = acc[2];
  };
  const solver = new Dopri5(f, { rtol: cfg.rtol ?? 1e-10, atolPos: cfg.atolKm ?? 1, atolVel: (cfg.atolKm ?? 1) * 1e-6 });

  let t = cfg.t0;
  const y = new Float64Array([...cfg.r0, ...cfg.v0]);
  const samples: TrajectorySample[] = [{ t, r: [...cfg.r0], v: [...cfg.v0] }];
  const encounters: Encounter[] = [];
  const closest: Partial<Record<BodyId, Encounter>> = {};
  const soi = new Map<BodyId, number>(attractors.map((id) => [id, eph.soiKm(id, cfg.t0)]));
  let prevRate = new Map<BodyId, number>(
    attractors.map((id) => [id, id === cfg.departFrom ? 1 : relative(eph, id, t, cfg.r0, cfg.v0).rate]),
  );
  let termination: Termination = "duration";
  let terminatedBy: BodyId | undefined;
  let h = Math.min(maxStep, DAY / 4);
  let steps = 0;

  const record = (id: BodyId, m: { t: number; d: number; speed: number }) => {
    const e: Encounter = {
      body: id,
      t: m.t,
      distanceKm: m.d,
      relativeSpeedKmS: m.speed,
      insideSoi: m.d < soi.get(id)!,
      impact: m.d < BODIES[id].radiusKm,
    };
    if (m.d < 20 * soi.get(id)!) encounters.push(e);
    const best = closest[id];
    if (!best || e.distanceKm < best.distanceKm) closest[id] = e;
    return e;
  };

  while (t < tEnd) {
    if (steps >= maxSteps) { termination = "max-steps"; break; }
    // Cap the step near planets so a flyby can never be stepped over.
    let cap = Math.min(maxStep, tEnd - t);
    const r: Vec3 = [y[0]!, y[1]!, y[2]!];
    const v: Vec3 = [y[3]!, y[4]!, y[5]!];
    for (const id of active) {
      const rel = relative(eph, id, t, r, v);
      if (rel.d < 5 * soi.get(id)!) cap = Math.min(cap, (0.02 * rel.d) / Math.max(rel.speed, 1e-3));
    }
    h = Math.min(h, cap);
    const err = solver.attempt(t, y, h);
    if (err > 1) { h = Dopri5.nextStep(h, err); continue; }

    const a = samples[samples.length - 1]!;
    const tNew = t + h;
    const b: TrajectorySample = {
      t: tNew,
      r: [solver.yNew[0]!, solver.yNew[1]!, solver.yNew[2]!],
      v: [solver.yNew[3]!, solver.yNew[4]!, solver.yNew[5]!],
    };
    solver.accept();
    y.set(solver.yNew);
    t = tNew;
    steps++;
    h = Dopri5.nextStep(h, err);

    // Closest approaches: distance rate turns from negative to positive.
    let stop: { at: number; why: Termination; body?: BodyId } | undefined;
    const nextRate = new Map<BodyId, number>();
    if (departing && cfg.departFrom) {
      const rel = relative(eph, cfg.departFrom, tNew, b.r, b.v);
      if (rel.d > 2 * soi.get(cfg.departFrom)!) {
        departing = false;
        active = attractors;
        solver.reset();
      }
    }
    for (const id of attractors) {
      const rel = relative(eph, id, tNew, b.r, b.v);
      nextRate.set(id, rel.rate);
      if (departing && id === cfg.departFrom) continue;
      if (prevRate.get(id)! < 0 && rel.rate >= 0) {
        const e = record(id, refineMinimum(eph, id, a, b));
        if (e.impact && (!stop || e.t < stop.at)) stop = { at: e.t, why: "impact", body: id };
      }
      if (cfg.stopAtSoiOf === id && rel.d < soi.get(id)! && (!stop || tNew < stop.at)) {
        stop = { at: tNew, why: "soi-reached", body: id };
      }
    }
    prevRate = nextRate;

    if (stop) {
      const end = hermite(a, b, stop.at);
      samples.push({ t: stop.at, r: end.r, v: end.v });
      termination = stop.why;
      terminatedBy = stop.body;
      if (stop.why === "soi-reached" && stop.body) {
        record(stop.body, { t: stop.at, ...relative(eph, stop.body, stop.at, end.r, end.v) });
      }
      break;
    }
    samples.push(b);
    const dist = Math.hypot(b.r[0], b.r[1], b.r[2]);
    if (dist < sunDive) { termination = "sun"; terminatedBy = "sun"; break; }
    if (dist > escape) { termination = "escape"; break; }
  }

  return { samples, encounters, closest, termination, terminatedBy, endTime: t, steps };
}

/** Probe state at any time inside a simulated trajectory (cubic Hermite between samples). */
export function sampleAt(result: SimulationResult, t: number): TrajectorySample {
  const s = result.samples;
  if (t <= s[0]!.t) return s[0]!;
  const last = s[s.length - 1]!;
  if (t >= last.t) return last;
  let lo = 0, hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid]!.t <= t) lo = mid; else hi = mid;
  }
  const p = hermite(s[lo]!, s[hi]!, t);
  return { t, r: p.r, v: p.v };
}
