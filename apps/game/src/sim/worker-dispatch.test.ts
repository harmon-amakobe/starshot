import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { createEphemeris } from '@starshot/ephemeris';
import { LAUNCH_ET, simulateLunar } from '@starshot/physics/lunar';
import { CAMPAIGN, hintQueryFor, shotRequestFor } from '../levels';
import type { LunarHintQuery } from './flight-request';
import { findHint } from './hint';
import { lunarHint, runLunar } from './lunar';
import { lunarRequest } from './lunar-request';
import type { SimRequest, SimResponse } from './protocol';
import { analyzeShot, cachedEphemeris, simulateShot, vInfFromAim } from './shot';
import { channelTask, respond, scheduler } from './worker-handler';

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
/** One real macrotask; while held, the handler's yields wait for the test. */
const flush = () => new Promise((resolve) => setImmediate(resolve));
const grid = 'moon-grid/1';
/** A controlled scheduler: each yield the handler takes waits here until the test runs it. */
function holdYields() {
  const held: (() => void)[] = [];
  const hold = () => new Promise<void>((resolve) => held.push(resolve));
  const yields = vi.spyOn(scheduler, 'nextTask').mockImplementation(hold);
  onTestFinished(() => yields.mockRestore());
  return { held, yields };
}

describe('the worker handler', () => {
  it('answers a preview queued during a search first, each reply with its own id', async () => {
    // Loads the Moon modules first, so no import wait can pass for a yield.
    await respond(ephemeris, search(1, 0));
    const { held, yields } = holdYields();
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
    // One yield per flight, and none for the preview.
    expect(yields).toHaveBeenCalledTimes(4);
    expect(replies.map((reply) => reply.id)).toEqual([42, 41]);
    expect(replies[1]).toMatchObject({ strategy: 'search', grid, simulations: 3 });
    // The preview answered mid-search equals the same request flown alone, and its launch.
    expect(replies[0]).toEqual({ ...preview, ...runLunar(shot), ms: expect.any(Number) });
    const launch = { ...preview, id: 43, purpose: 'launch' } as const;
    const flown = { ...replies[0], ...launch, ms: expect.any(Number) };
    expect(await respond(ephemeris, launch)).toEqual(flown);
  });
  it('yields in production on a channel message, a macrotask after every queued microtask', async () => {
    expect(scheduler.nextTask).toBe(channelTask);
    const timers = [vi.spyOn(globalThis, 'setTimeout'), vi.spyOn(globalThis, 'setImmediate')];
    onTestFinished(() => timers.forEach((timer) => timer.mockRestore()));
    const order: string[] = [];
    let depth = 0;
    const chain = (): Promise<void> =>
      Promise.resolve().then(() => (++depth < 100 ? chain() : void order.push('microtasks')));
    void chain();
    await scheduler.nextTask().then(() => order.push('yield'));
    expect(order).toEqual(['microtasks', 'yield']);
    // A zero-delay timer waits at least 4 ms once nested, about a second per full search.
    for (const timer of timers) expect(timer).not.toHaveBeenCalled();
  });
  it('falls back to a zero-delay timer where MessageChannel is missing, for the reference and a search', async () => {
    vi.stubGlobal('MessageChannel', undefined);
    onTestFinished(() => void vi.unstubAllGlobals());
    const timers = vi.spyOn(globalThis, 'setTimeout');
    onTestFinished(() => timers.mockRestore());
    const reference = await respond(ephemeris, lunar(60, {}));
    const searched = await respond(ephemeris, search(61, 2));
    expect(reference).toMatchObject({ kind: 'hint', id: 60, strategy: 'reference', simulations: 1, hint: { hits: true } });
    expect(searched).toMatchObject({ kind: 'hint', id: 61, strategy: 'search', simulations: 2, hint: { hits: true } });
    // One timer per flight: the reference's one and the search's two.
    expect(timers.mock.calls.map((call) => call[1])).toEqual([0, 0, 0]);
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
    const { held } = holdYields();
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
