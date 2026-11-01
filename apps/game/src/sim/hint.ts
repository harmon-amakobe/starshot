/**
 * The aiming hint: the cheapest direct (Lambert) transfer over the level's
 * launch window, nudged with the game's own simulator until it really reaches
 * the capture zone (the two-body Lambert aim ignores the other planets and the
 * patched-conic departure, so it can miss by a little). Levels whose answer is
 * not a direct transfer (gravity assists) ship a curated, test-verified shot.
 */
import type { Ephemeris, PlanetId, Vec3 } from "@starshot/ephemeris";
import { bestDirectTransfer } from "@starshot/physics";
import {
  DAY,
  aimFromVInf,
  analyzeShot,
  daysBetweenIso,
  launchEtForDay,
  simulateShot,
  vInfFromAim,
  type Aim,
  type ShotRequest,
} from "./shot.js";

export interface KnownShot {
  /** Launch date (00:00 UTC), inside the level window. */
  readonly launchIso: string;
  /** Departure excess velocity, ecliptic frame [km/s]. */
  readonly vInf: Vec3;
}

export interface HintQuery {
  readonly target: PlanetId;
  readonly attractors: readonly PlanetId[];
  readonly windowStartIso: string;
  readonly windowDays: number;
  readonly maxFlightDays: number;
  readonly vInfMaxKmS: number;
  readonly requiredFlyby?: PlanetId;
  readonly curated?: KnownShot;
  /** Wall-clock budget for the simulation nudging [ms]; the best miss so far is returned when it runs out. */
  readonly budgetMs?: number;
}

export interface Hint {
  /** Day index in the launch window. */
  readonly day: number;
  readonly launchEt: number;
  readonly aim: Aim;
  /** Whether the game simulation confirms the hint reaches the capture zone. */
  readonly hits: boolean;
  readonly source: "lambert" | "curated";
  readonly simulations: number;
}

const range = (from: number, to: number, step: number): number[] => {
  const out: number[] = [];
  for (let x = from; x <= to + 1e-9; x += step) out.push(x);
  return out;
};

export function findHint(ephemeris: Ephemeris, q: HintQuery): Hint | null {
  const shotFor = (day: number, aim: Aim): ShotRequest => ({
    target: q.target,
    attractors: q.attractors,
    launchEt: launchEtForDay(q.windowStartIso, day),
    vInf: vInfFromAim(aim),
    maxFlightDays: q.maxFlightDays,
    requiredFlyby: q.requiredFlyby,
  });
  let simulations = 0;
  const tryShot = (day: number, aim: Aim) => {
    simulations++;
    const shot = shotFor(day, aim);
    return analyzeShot(ephemeris, shot, simulateShot(ephemeris, shot));
  };

  if (q.curated) {
    const day = daysBetweenIso(q.windowStartIso, q.curated.launchIso);
    const aim = aimFromVInf(q.curated.vInf);
    const a = tryShot(day, aim);
    return { day, launchEt: launchEtForDay(q.windowStartIso, day), aim, hits: a.hit, source: "curated", simulations };
  }

  // Coarse grid (about 50 x 160 Lambert solves at most), then a fine grid around its best point.
  const dayStep = Math.max(2, Math.ceil(q.windowDays / 50));
  const tofStep = Math.max(5, Math.ceil(q.maxFlightDays / 160));
  const coarseDays = range(0, q.windowDays, dayStep);
  const tofs = range(40, q.maxFlightDays * 0.95, tofStep).map((d) => d * DAY);
  const coarse = bestDirectTransfer(
    ephemeris,
    "earth",
    q.target,
    coarseDays.map((d) => launchEtForDay(q.windowStartIso, d)),
    tofs,
  );
  if (!coarse) return null;
  const coarseDay = Math.round(daysBetweenEt(launchEtForDay(q.windowStartIso, 0), coarse.launchEt));
  const fineDays = range(Math.max(0, coarseDay - dayStep), Math.min(q.windowDays, coarseDay + dayStep), 1);
  const tofDays = coarse.tof / DAY;
  const fineTofs = range(Math.max(20, tofDays - 2 * tofStep), tofDays + 2 * tofStep, Math.max(1, tofStep / 5)).map((d) => d * DAY);
  const best =
    bestDirectTransfer(
      ephemeris,
      "earth",
      q.target,
      fineDays.map((d) => launchEtForDay(q.windowStartIso, d)),
      fineTofs,
    ) ?? coarse;
  const day = Math.round(daysBetweenEt(launchEtForDay(q.windowStartIso, 0), best.launchEt));
  const base = aimFromVInf(best.vInf);
  const capped = (aim: Aim): Aim => ({ ...aim, speedKmS: Math.min(aim.speedKmS, q.vInfMaxKmS) });

  // Nudge the angle (and then the speed) until the game simulator agrees.
  const deadline = performance.now() + (q.budgetMs ?? 2500);
  let bestAim = capped(base);
  let bestMiss = Infinity;
  const speedFactors = [1, 1.01, 0.99, 1.02, 0.98, 1.04];
  const angleOffsets = [0, ...range(0.05, 3, 0.05).flatMap((x) => [x, -x])];
  search: for (const f of speedFactors) {
    for (const da of angleOffsets) {
      if (simulations >= 400 || performance.now() > deadline) break search;
      const aim = capped({ angleDeg: base.angleDeg + da, speedKmS: base.speedKmS * f });
      const a = tryShot(day, aim);
      if (a.hit) {
        const centred = centreOfBand(aim, (x) => performance.now() < deadline && tryShot(day, x).hit);
        return { day, launchEt: launchEtForDay(q.windowStartIso, day), aim: centred, hits: true, source: "lambert", simulations };
      }
      if (a.closestKm < bestMiss) {
        bestMiss = a.closestKm;
        bestAim = aim;
      }
    }
  }
  return { day, launchEt: launchEtForDay(q.windowStartIso, day), aim: bestAim, hits: false, source: "lambert", simulations };
}

const daysBetweenEt = (a: number, b: number): number => (b - a) / DAY;

/** Middle of the run of hitting angles around a hitting aim (0.1 degree steps, up to 3 degrees each way). */
function centreOfBand(aim: Aim, hits: (aim: Aim) => boolean): Aim {
  const step = 0.1;
  let lo = 0;
  let hi = 0;
  while (hi < 3 && hits({ ...aim, angleDeg: aim.angleDeg + hi + step })) hi += step;
  while (lo < 3 && hits({ ...aim, angleDeg: aim.angleDeg - lo - step })) lo += step;
  return { ...aim, angleDeg: aim.angleDeg + (hi - lo) / 2 };
}
