/**
 * The aiming hint: the cheapest direct (Lambert) transfer over the level's
 * launch window, nudged with the game's own simulator until it really reaches
 * the capture zone (the two-body Lambert aim ignores the other planets, so it
 * can miss by a little). Levels whose answer is not a direct transfer (gravity
 * assists) ship a curated, test-verified shot.
 *
 * Deterministic: the search is bounded by a number of simulations, never by
 * wall-clock time, so a level gives the same hint on every device. The hint's
 * aim is rounded to the grid the controls show and can set (0.01 degree,
 * 0.001 km/s) before it is simulated, so "Use hint" applies exactly the aim the
 * label shows and the simulator checked.
 */
import type { Ephemeris, Vec3 } from "@starshot/ephemeris";
import type { ParkingOrbit } from '@starshot/physics/lunar';
import { bestDirectTransfer } from "@starshot/physics";
import {
  DAY,
  aimFromVInf,
  analyzeShot,
  daysBetweenIso,
  launchEtForDay,
  roundAim,
  simulateShot,
  vInfFromAim,
  type Aim,
  type ShotAnalysis,
  type ShotRequest,
  type ShotTemplate,
} from "./shot.js";

export interface KnownShot {
  /** Launch date (00:00 UTC), inside the level window. */
  readonly launchIso: string;
  /** Departure excess velocity, ecliptic frame [km/s]. */
  readonly vInf: Vec3;
}

export interface HintQuery {
  /** The level's shot: target, attractors, flight limit, integrator settings, capture zone. */
  readonly shot: ShotTemplate;
  readonly windowStartIso: string;
  readonly windowDays: number;
  readonly vInfMaxKmS: number;
  readonly curated?: KnownShot;
  /** Most game simulations the search may run; the closest miss is returned when they run out. */
  readonly maxSimulations?: number;
}

export interface Hint {
  readonly parking?: ParkingOrbit;
  /** Day index in the launch window. */
  readonly day: number;
  readonly launchEt: number;
  /** On the controls' grid (0.01 degree, 0.001 km/s): exactly what "Use hint" applies. */
  readonly aim: Aim;
  /** The game simulation of exactly this aim reaches the capture zone (and makes any required flyby). */
  readonly hits: boolean;
  /** Closest approach of exactly this aim to the target's centre [km]. */
  readonly closestKm: number;
  readonly source: "lambert" | "curated";
  readonly simulations: number;
}

/** Default simulation budget for the nudging search (Lambert grid solves are not counted). */
export const HINT_MAX_SIMULATIONS = 240;

const range = (from: number, to: number, step: number): number[] => {
  const out: number[] = [];
  for (let k = 0; from + k * step <= to + 1e-9; k++) out.push(from + k * step);
  return out;
};

export function findHint(ephemeris: Ephemeris, q: HintQuery): Hint | null {
  const maxSimulations = q.maxSimulations ?? HINT_MAX_SIMULATIONS;
  const launchEtOf = (day: number) => launchEtForDay(q.windowStartIso, day);
  const shotFor = (day: number, aim: Aim): ShotRequest => ({ ...q.shot, launchEt: launchEtOf(day), vInf: vInfFromAim(aim) });
  /** Aims are put on the controls' grid, under the speed cap, before they are simulated. */
  const onGrid = (aim: Aim): Aim => {
    const r = roundAim(aim);
    return r.speedKmS > q.vInfMaxKmS ? roundAim({ ...r, speedKmS: Math.floor(q.vInfMaxKmS * 1000) / 1000 }) : r;
  };
  const success = (a: ShotAnalysis) => a.hit && (q.shot.requiredFlyby === undefined || a.requiredFlybyDone);

  let simulations = 0;
  const seen = new Map<string, ShotAnalysis>();
  const tryShot = (day: number, aim: Aim): ShotAnalysis => {
    const key = `${day}|${aim.angleDeg}|${aim.speedKmS}`;
    const known = seen.get(key);
    if (known) return known;
    simulations++;
    const shot = shotFor(day, aim);
    const a = analyzeShot(ephemeris, shot, simulateShot(ephemeris, shot));
    seen.set(key, a);
    return a;
  };
  const hintOf = (day: number, aim: Aim, a: ShotAnalysis, source: Hint["source"]): Hint => ({
    day,
    launchEt: launchEtOf(day),
    aim,
    hits: success(a),
    closestKm: a.closestKm,
    source,
    simulations,
  });

  if (q.curated) {
    const day = daysBetweenIso(q.windowStartIso, q.curated.launchIso);
    const aim = onGrid(aimFromVInf(q.curated.vInf));
    return hintOf(day, aim, tryShot(day, aim), "curated");
  }

  // Coarse Lambert grid (about 50 x 160 solves at most), then a fine grid around its best point.
  const maxFlightDays = q.shot.maxFlightDays;
  const dayStep = Math.max(2, Math.ceil(q.windowDays / 50));
  const tofStep = Math.max(5, Math.ceil(maxFlightDays / 160));
  const coarseDays = range(0, q.windowDays, dayStep);
  const tofs = range(40, maxFlightDays * 0.95, tofStep).map((d) => d * DAY);
  const coarse = bestDirectTransfer(ephemeris, "earth", q.shot.target, coarseDays.map(launchEtOf), tofs);
  if (!coarse) return null;
  const coarseDay = Math.round((coarse.launchEt - launchEtOf(0)) / DAY);
  const fineDays = range(Math.max(0, coarseDay - dayStep), Math.min(q.windowDays, coarseDay + dayStep), 1);
  const tofDays = coarse.tof / DAY;
  const fineTofs = range(Math.max(20, tofDays - 2 * tofStep), Math.min(maxFlightDays, tofDays + 2 * tofStep), Math.max(1, tofStep / 5));
  const best =
    bestDirectTransfer(ephemeris, "earth", q.shot.target, fineDays.map(launchEtOf), fineTofs.map((d) => d * DAY)) ?? coarse;
  const day = Math.round((best.launchEt - launchEtOf(0)) / DAY);
  const base = aimFromVInf(best.vInf);

  // Nudge the angle (then the speed) until the game simulator agrees, within the budget.
  let closest: { aim: Aim; a: ShotAnalysis } | null = null;
  const speedFactors = [1, 1.01, 0.99, 1.02, 0.98, 1.04];
  const angleOffsets = [0, ...range(0.05, 3, 0.05).flatMap((x) => [x, -x])];
  for (const f of speedFactors) {
    for (const da of angleOffsets) {
      if (simulations >= maxSimulations) break;
      const aim = onGrid({ angleDeg: base.angleDeg + da, speedKmS: base.speedKmS * f });
      const a = tryShot(day, aim);
      if (success(a)) {
        // Prefer the middle of the hitting band, if the budget allows finding it and it still hits.
        const centre = onGrid(centreOfBand(aim, (x) => simulations < maxSimulations && success(tryShot(day, onGrid(x)))));
        const c = tryShot(day, centre);
        return success(c) ? hintOf(day, centre, c, "lambert") : hintOf(day, aim, a, "lambert");
      }
      if (!closest || a.closestKm < closest.a.closestKm) closest = { aim, a };
    }
  }
  if (!closest) {
    const aim = onGrid(base);
    return hintOf(day, aim, tryShot(day, aim), "lambert");
  }
  return hintOf(day, closest.aim, closest.a, "lambert");
}

/** Middle of the run of hitting angles around a hitting aim (0.1 degree steps, up to 3 degrees each way). */
function centreOfBand(aim: Aim, hits: (aim: Aim) => boolean): Aim {
  const step = 0.1;
  let lo = 0;
  let hi = 0;
  while (hi < 3 && hits({ ...aim, angleDeg: aim.angleDeg + hi + step })) hi += step;
  while (lo < 3 && hits({ ...aim, angleDeg: aim.angleDeg - lo - step })) lo += step;
  return { ...aim, angleDeg: aim.angleDeg + (hi - lo) / 2 };
}
