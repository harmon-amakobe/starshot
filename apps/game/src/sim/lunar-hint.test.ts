import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { dateFromEt } from '@starshot/ephemeris';
import { DAY, FUEL_BUDGET, LAUNCH_ET, simulateLunar } from '@starshot/physics/lunar';
import { finalRequest } from '../campaign/contracts';
import { freshSession } from '../campaign/session';
import { MOONSHOT } from '../missions';
import { isLunar, type LunarHintQuery, type LunarShotRequest } from './flight-request';
import type { Hint } from './hint';
import { lunarHint, runLunar } from './lunar';
import { byCost, findLunarHint, refinementOf, seedsOf, type Route } from './lunar-hint';
import { shotKey } from './preview';

// Counts come from this wrapper of the production runner, never from the code under test.
vi.mock('./lunar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lunar')>();
  return { ...actual, runLunar: vi.fn(actual.runLunar) };
});
// Every integration is also counted below runLunar, so a flight that bypasses it is still seen.
vi.mock('@starshot/physics/lunar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@starshot/physics/lunar')>();
  return { ...actual, simulateLunar: vi.fn(actual.simulateLunar) };
});
const runner = vi.mocked(runLunar);
const integrator = vi.mocked(simulateLunar);
const key = (day: number, burn: number, angle: number) => `${day}|${burn}|${angle}`;
/** A flown request read back as its integer tuple. */
const tupleOf = (shot: LunarShotRequest) => {
  const day = (shot.launchEt - LAUNCH_ET) / DAY;
  return key(day, Math.round(shot.deltaVKmS * 1000), Math.round(shot.burnAngleDeg * 100));
};
const routeOf = (hint: Hint | null) => {
  if (!hint) return null;
  return key(hint.day, Math.round(hint.aim.speedKmS * 1000), Math.round(hint.aim.angleDeg * 100));
};
const days = Array.from({ length: 28 }, (_, day) => day);
const coarse = days.flatMap((day) =>
  [3150, 3240].flatMap((burn) => [-2000, 0, 2000].map((angle) => key(day, burn, angle))),
);
// Measured: the coarse hits seed days 0, 25, 26 and 27, each at 3.150 km/s and 0 degrees.
const refined = [0, 25, 26, 27].flatMap((day) =>
  [3100, 3110, 3120, 3130, 3140, 3150].flatMap((burn) =>
    [-500, 0, 500].map((angle) => key(day, burn, angle)),
  ),
);
/** Every tuple in flight order: the reference, the coarse grid, then refinement, once each. */
const ORDER = [...new Set([key(0, 3240, 0), ...coarse, ...refined])];

/** Runs a search and returns what the production runner received and returned. */
async function flown(query: Partial<LunarHintQuery>, afterFlight?: () => unknown) {
  runner.mockClear();
  integrator.mockClear();
  const hint = await findLunarHint({ kind: 'lunar', strategy: 'search', ...query }, afterFlight);
  const shots = runner.mock.calls.map(([shot]) => shot);
  const analyses = runner.mock.results.map((result) => result.value.analysis);
  return { hint, shots, analyses, integrations: integrator.mock.calls.length };
}
let full: Awaited<ReturnType<typeof flown>>;
const yields: number[][] = [];
/** Yields a macrotask as a worker would, and records the flight count on each side of it. */
async function yieldTask() {
  const before = runner.mock.calls.length;
  await new Promise((resolve) => setTimeout(resolve, 0));
  yields.push([before, runner.mock.calls.length]);
}
// One default-budget search, shared by the tests that only read its flights.
beforeAll(async () => {
  full = await flown({}, yieldTask);
}, 60_000);

describe('the bounded Moon route search', () => {
  it('flies one fixed order and selects the same route every time', async () => {
    const again = await flown({ budget: 240 });
    expect(ORDER).toHaveLength(236);
    expect(full.shots.map(tupleOf)).toEqual(ORDER);
    expect(again.shots).toEqual(full.shots);
    expect(again.analyses).toEqual(full.analyses);
    expect(again.hint).toEqual(full.hint);
    // Measured: 3.120 km/s prograde on day 0. The 3.240 km/s par stays the reference.
    expect(routeOf(full.hint)).toBe(key(0, 3120, 0));
    expect(full.hint?.simulations).toBe(236);
  }, 60_000);
  it('converts each integer once, so every flown value is exactly its label', () => {
    for (const shot of full.shots) {
      const [, burn, angle] = tupleOf(shot).split('|').map(Number);
      expect(shot.deltaVKmS).toBe(burn! / 1000);
      expect(shot.burnAngleDeg).toBe(angle! / 100);
      // requestFor clamps a burn above the fuel budget without saying so.
      expect(shot.deltaVKmS).toBeLessThan(FUEL_BUDGET);
    }
    expect(full.hint?.aim).toEqual({ angleDeg: 0, speedKmS: 3.12 });
  });
  it('departs at 01:00 UTC on each day, in the parking plane fixed at LAUNCH_ET', () => {
    for (const shot of full.shots) {
      const parking = { frameEt: LAUNCH_ET, epochEt: shot.launchEt, phaseDeg: 225, radiusKm: 6571 };
      expect(shot.parking).toEqual(parking);
    }
    const last = full.shots.find((shot) => tupleOf(shot).startsWith('27|'));
    // Whole days after LAUNCH_ET, not the 00:00 UTC that launchEtForDay gives.
    expect(dateFromEt(last!.launchEt).toISOString()).toBe('2026-11-29T01:00:00.000Z');
  });
  it('re-flies the selected route through the production request to the same hit', () => {
    const hint = full.hint!;
    const save = freshSession();
    save.et = hint.launchEt;
    save.parking = hint.parking;
    save.aim = hint.aim;
    save.paused = true;
    const shot = finalRequest(save).shot;
    if (!isLunar(shot)) throw Error('Expected Moonshot');
    const index = full.shots.findIndex((searched) => shotKey(searched) === shotKey(shot));
    expect(full.shots[index]).toEqual(shot);
    const replay = runLunar(shot).analysis;
    expect(replay).toEqual(full.analyses[index]);
    expect(replay.hit).toBe(true);
    expect(replay.closestKm).toBe(hint.closestKm);
  });
  it('keeps the reference strategy and par, and flies the reference first', async () => {
    const reference = lunarHint();
    expect(reference).toMatchObject({ day: 0, launchEt: LAUNCH_ET, source: 'curated' });
    expect(MOONSHOT.par?.deltaVKmS).toBe(3.24);
    // A budget bounds only the search: a reference query flies the reference once, even at 0.
    const queries: Partial<LunarHintQuery>[] = [
      {},
      { strategy: 'reference' },
      { strategy: 'reference', budget: 0 },
    ];
    for (const query of queries) {
      integrator.mockClear();
      expect(await findLunarHint({ kind: 'lunar', ...query })).toEqual(reference);
      expect(integrator).toHaveBeenCalledTimes(1);
    }
    const one = await flown({ budget: 1 });
    expect(one.hint).toEqual({ ...reference, source: 'lunar-grid' });
    expect(one.integrations).toBe(1);
  });
  it('counts every real simulation at each budget, failed searches included', async () => {
    const runs = [];
    for (const budget of [0, 1, 2, 167, 168, 169, 235, 239, 240]) {
      runs.push(await flown({ budget }));
    }
    for (const run of runs) {
      expect(run.shots.map(tupleOf)).toEqual(ORDER.slice(0, run.shots.length));
    }
    const counts = runs.map((run) => run.shots.length);
    expect(counts).toEqual([0, 1, 2, 167, 168, 169, 235, 236, 236]);
    expect(runs.map((run) => run.hint?.simulations ?? 0)).toEqual(counts);
    expect(runs.map((run) => run.integrations)).toEqual(counts);
    const reference = key(0, 3240, 0);
    const seed = key(0, 3150, 0);
    const refined = key(0, 3120, 0);
    const routes = [null, reference, reference, seed, seed, seed, refined, refined, refined];
    expect(runs.map((run) => routeOf(run.hint))).toEqual(routes);
    expect(runs[7]!.hint).toEqual(runs[8]!.hint);
  }, 120_000);
  it('rejects invalid budgets and unknown strategies before any flight', async () => {
    const after = vi.fn();
    integrator.mockClear();
    const queries: unknown[] = [
      ...[-1, 241, 1.5, NaN, Infinity, null, '1'].map((budget) => ({ kind: 'lunar', budget })),
      ...['fast', '', 'Search', null].map((strategy) => ({ kind: 'lunar', strategy })),
      { kind: 'lunar', strategy: 'search', budget: -1 },
    ];
    for (const query of queries) {
      await expect(findLunarHint(query as LunarHintQuery, after)).rejects.toThrow(RangeError);
    }
    expect(integrator).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });
  it('awaits afterFlight once after each flight, with no flight while it waits', async () => {
    expect(yields).toEqual(full.shots.map((_, i) => [i + 1, i + 1]));
    const reference = vi.fn();
    await findLunarHint({ kind: 'lunar' }, reference);
    expect(reference).toHaveBeenCalledTimes(1);
    const none = vi.fn();
    await findLunarHint({ kind: 'lunar', strategy: 'search', budget: 0 }, none);
    expect(none).not.toHaveBeenCalled();
  });
  it('runs afterFlight after the flight and settles only once it resolves', async () => {
    for (const strategy of ['reference', 'search'] as const) {
      integrator.mockClear();
      let release = () => {};
      let flownBefore = 0;
      const hook = () => {
        flownBefore = integrator.mock.calls.length;
        return new Promise<void>((resolve) => (release = resolve));
      };
      let settled = false;
      const done = findLunarHint({ kind: 'lunar', strategy, budget: 1 }, hook);
      void done.then(() => (settled = true));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(settled).toBe(false);
      release();
      await done;
      expect(settled).toBe(true);
      // The hook runs after the one flight, never before it.
      expect(flownBefore).toBe(1);
    }
  });
  it('builds the hint from the selected tuple, here off day 0 and off prograde', async () => {
    // A controlled runner: only day 26 at 3.240 km/s and -20 degrees hits, so no field defaults.
    onTestFinished(() => void runner.mockReset());
    runner.mockImplementation((shot) => {
      const hit = tupleOf(shot) === key(26, 3240, -2000);
      return { result: {} as never, analysis: { hit, closestKm: 1234 } as never };
    });
    const hint = await findLunarHint({ kind: 'lunar', strategy: 'search', budget: 240 });
    const launchEt = LAUNCH_ET + 26 * DAY;
    const parking = { frameEt: LAUNCH_ET, epochEt: launchEt, phaseDeg: 225, radiusKm: 6571 };
    const aim = { angleDeg: -20, speedKmS: 3.24 };
    const route = { day: 26, launchEt, aim, parking, hits: true, closestKm: 1234 };
    // One reference, 167 coarse and 17 refinement flights: the seed itself is not flown again.
    expect(hint).toEqual({ ...route, source: 'lunar-grid', simulations: 185 });
  });
});

describe('the search cost order, seeds and refinement', () => {
  const route = (day: number, burn: number, angle: number): Route => ({ day, burn, angle });
  it('sorts by burn, then day, then absolute angle, then signed angle', () => {
    const routes = [route(0, 3240, 0), route(0, 3150, 0), route(2, 3100, 0),
      route(1, 3100, -2000), route(1, 3100, 500), route(1, 3100, -500)];
    const sorted = [route(1, 3100, -500), route(1, 3100, 500), route(1, 3100, -2000),
      route(2, 3100, 0), route(0, 3150, 0), route(0, 3240, 0)];
    expect([...routes].sort(byCost)).toEqual(sorted);
  });
  it('seeds the cheapest hit of each day, for at most four days', () => {
    const hits = [route(3, 3150, 0), route(0, 3240, 0), route(0, 3150, 500), route(1, 3150, 0),
      route(2, 3150, 0), route(4, 3100, 0), route(0, 3150, 0)];
    const seeds = [route(4, 3100, 0), route(0, 3150, 0), route(1, 3150, 0), route(2, 3150, 0)];
    expect(seedsOf(hits)).toEqual(seeds);
    expect(seedsOf(hits.slice(1, 3))).toEqual([route(0, 3150, 500)]);
  });
  it('refines below the seed burn and either side of the seed angle', () => {
    const routes = refinementOf(route(5, 3240, -2000)).map((r) => key(r.day, r.burn, r.angle));
    const burns = [3190, 3200, 3210, 3220, 3230, 3240];
    const angles = [-2500, -2000, -1500];
    expect(routes).toEqual(burns.flatMap((burn) => angles.map((angle) => key(5, burn, angle))));
  });
});
