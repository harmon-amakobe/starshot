import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { createEphemeris } from '@starshot/ephemeris';
import { LAUNCH_ET, simulateLunar } from '@starshot/physics/lunar';
import { CAMPAIGN, hintQueryFor, shotRequestFor } from '../levels';
import type { LunarHintQuery } from './flight-request';
import { findHint } from './hint';
import { lunarHint, lunarRequest, runLunar } from './lunar';
import type { SimRequest, SimResponse } from './protocol';
import { analyzeShot, cachedEphemeris, simulateShot, vInfFromAim } from './shot';
import { respond } from './worker-handler';

// Flights are counted below the production runner, never by the handler.
vi.mock('./lunar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lunar')>();
  return { ...actual, runLunar: vi.fn(actual.runLunar) };
});
// lunarHint calls runLunar inside its module, so only this layer sees the reference flight.
vi.mock('@starshot/physics/lunar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@starshot/physics/lunar')>();
  return { ...actual, simulateLunar: vi.fn(actual.simulateLunar) };
});
const runner = vi.mocked(runLunar);
const integrator = vi.mocked(simulateLunar);
const ephemeris = cachedEphemeris(createEphemeris({ flatten: true }));
const lunar = (id: number, query: Partial<LunarHintQuery>): SimRequest => ({
  kind: 'hint',
  id,
  query: { kind: 'lunar', ...query },
});
const search = (id: number, budget: number) => lunar(id, { strategy: 'search', budget });
/** The reference route as a canonical Moon request, as a preview after the guide flies it. */
const parking = { frameEt: LAUNCH_ET, epochEt: LAUNCH_ET, phaseDeg: 225, radiusKm: 6571 };
const moonShot = () => lunarRequest(LAUNCH_ET, { angleDeg: 0, speedKmS: 3.24 }, parking);
/** One real macrotask; the held timers below are the handler's only setTimeout calls. */
const flush = () => new Promise((resolve) => setImmediate(resolve));
const grid = 'moon-grid/1';
/** A controlled scheduler: each timer the handler sets waits here until the test runs it. */
function holdTimers() {
  const held: (() => void)[] = [];
  const hold = (run: () => void) => held.push(run);
  const timers = vi.spyOn(globalThis, 'setTimeout').mockImplementation(hold as never);
  onTestFinished(() => timers.mockRestore());
  return { held, timers };
}

describe('the worker handler', () => {
  it('answers a preview queued during a search first, each reply with its own id', async () => {
    // Loads the Moon modules first, so no import wait can pass for a yield.
    await respond(ephemeris, search(1, 0));
    const { held, timers } = holdTimers();
    integrator.mockClear();
    const replies: SimResponse[] = [];
    const searching = respond(ephemeris, search(41, 3)).then((reply) => replies.push(reply));
    await flush();
    // The search waits in a macrotask after its first flight.
    expect(integrator).toHaveBeenCalledTimes(1);
    expect(held).toHaveLength(1);
    const shot = moonShot();
    const preview = { kind: 'shot', id: 42, purpose: 'preview', shot } as const;
    replies.push(await respond(ephemeris, preview));
    for (const flights of [2, 3]) {
      held.shift()!();
      await flush();
      // One more search flight after the preview's, then the next yield.
      expect(integrator).toHaveBeenCalledTimes(flights + 1);
      expect(held).toHaveLength(1);
      expect(replies.map((reply) => reply.id)).toEqual([42]);
    }
    held.shift()!();
    await searching;
    expect(held).toHaveLength(0);
    // The reference flies once and yields once too.
    const reference = respond(ephemeris, lunar(44, {}));
    await flush();
    expect(held).toHaveLength(1);
    held.shift()!();
    expect(await reference).toMatchObject({ id: 44, strategy: 'reference', simulations: 1 });
    // One zero-delay timer per flight, and none for the preview.
    expect(timers.mock.calls.map((call) => call[1])).toEqual([0, 0, 0, 0]);
    expect(replies.map((reply) => reply.id)).toEqual([42, 41]);
    expect(replies[1]).toMatchObject({ strategy: 'search', grid, simulations: 3 });
    // The preview answered mid-search equals the same request flown alone, and its launch.
    expect(replies[0]).toEqual({ ...preview, ...runLunar(shot), ms: expect.any(Number) });
    const launch = { ...preview, id: 43, purpose: 'launch' } as const;
    const flown = { ...replies[0], ...launch, ms: expect.any(Number) };
    expect(await respond(ephemeris, launch)).toEqual(flown);
  });
  it('runs each worker message as it arrives, so a preview overtakes a search', async () => {
    // The real worker module, on a stub of the worker scope it reads at import.
    const postMessage = vi.fn();
    vi.stubGlobal('self', { postMessage });
    onTestFinished(() => void vi.unstubAllGlobals());
    await import('./sim.worker');
    type Scope = { onmessage: (event: { data: SimRequest }) => Promise<void> };
    const scope = self as unknown as Scope;
    const posted = () => postMessage.mock.calls.map(([reply]) => (reply as SimResponse).id);
    await scope.onmessage({ data: search(50, 0) });
    const { held } = holdTimers();
    const searching = scope.onmessage({ data: search(51, 3) });
    await flush();
    expect(held).toHaveLength(1);
    await scope.onmessage({ data: { kind: 'shot', id: 52, purpose: 'preview', shot: moonShot() } });
    expect(posted()).toEqual([50, 52]);
    while (held.length > 0) {
      held.shift()!();
      await flush();
    }
    await searching;
    expect(posted()).toEqual([50, 52, 51]);
    expect(postMessage.mock.calls[2]![0]).toMatchObject({ strategy: 'search', simulations: 3 });
  });
  it('reports the strategy, the grid and the real flight count, for no route too', async () => {
    const reference = lunarHint();
    const queries: [Partial<LunarHintQuery>, number][] = [
      [{}, 1],
      [{ strategy: 'reference', budget: 0 }, 1],
      [{ strategy: 'search', budget: 0 }, 0],
      [{ strategy: 'search', budget: 1 }, 1],
      [{ strategy: 'search', budget: 2 }, 2],
    ];
    const replies: SimResponse[] = [];
    for (const [index, [query, flights]] of queries.entries()) {
      runner.mockClear();
      integrator.mockClear();
      replies.push(await respond(ephemeris, lunar(index + 20, query)));
      expect(integrator).toHaveBeenCalledTimes(flights);
      const strategy = query.strategy ?? 'reference';
      const report = { kind: 'hint', id: index + 20, strategy, grid, simulations: flights };
      expect(replies[index]).toMatchObject(report);
    }
    expect(replies.map((reply) => reply.kind === 'hint' && reply.hint)).toEqual([
      reference,
      reference,
      null,
      { ...reference, source: 'lunar-grid' },
      { ...reference, source: 'lunar-grid', simulations: 2 },
    ]);
    // A positive budget flies the reference first.
    expect(runner.mock.calls[0]![0]).toEqual(moonShot());
  });
  it('counts the flights of a search that finds no route', async () => {
    // Real flights, each reported as a miss, so the search returns no route.
    const actual = runner.getMockImplementation()!;
    onTestFinished(() => void runner.mockImplementation(actual));
    runner.mockImplementation((shot) => {
      const flown = actual(shot);
      return { ...flown, analysis: { ...flown.analysis, hit: false } };
    });
    integrator.mockClear();
    const reply = await respond(ephemeris, search(30, 2));
    expect(integrator).toHaveBeenCalledTimes(2);
    const report = { kind: 'hint', id: 30, hint: null, strategy: 'search', grid, simulations: 2 };
    expect(reply).toMatchObject(report);
  });
  it('answers an invalid budget or an unknown strategy with the error reply', async () => {
    integrator.mockClear();
    const budget = await respond(ephemeris, lunar(7, { strategy: 'search', budget: 241 }));
    const strategy = await respond(ephemeris, lunar(8, { strategy: 'fast' as 'search' }));
    const budgetMessage = 'Moon guide budget must be an integer from 0 to 240';
    expect(budget).toEqual({ kind: 'error', id: 7, message: budgetMessage });
    const strategyMessage = 'Moon guide strategy must be reference or search';
    expect(strategy).toEqual({ kind: 'error', id: 8, message: strategyMessage });
    expect(integrator).not.toHaveBeenCalled();
  });
  it('leaves planetary hints and shots as they were', async () => {
    const level = CAMPAIGN.find((candidate) => candidate.id === 'morning-star')!;
    const query = hintQueryFor(level);
    const hint = findHint(ephemeris, query)!;
    const reply = await respond(ephemeris, { kind: 'hint', id: 9, query });
    // Strict: a planetary reply gains no Moon fields, not even undefined ones.
    expect(reply).toStrictEqual({ kind: 'hint', id: 9, hint, ms: expect.any(Number) });
    const shot = shotRequestFor(level, hint.launchEt, vInfFromAim(hint.aim));
    const result = simulateShot(ephemeris, shot);
    const analysis = analyzeShot(ephemeris, shot, result);
    for (const purpose of ['preview', 'launch'] as const) {
      const request = { kind: 'shot', id: 10, purpose, shot } as const;
      const flown = await respond(ephemeris, request);
      expect(flown).toStrictEqual({ ...request, result, analysis, ms: expect.any(Number) });
    }
  });
});
