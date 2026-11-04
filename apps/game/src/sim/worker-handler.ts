/**
 * The physics worker's request handler, apart from `self`, so tests drive the code the
 * worker runs. Every reply carries its request's id; a throw becomes the error reply.
 */
import type { Ephemeris } from '@starshot/ephemeris';
import { isLunar } from './flight-request';
import { findHint } from './hint.js';
import type { SimRequest, SimResponse } from './protocol.js';
import { analyzeShot, simulateShot } from './shot.js';

/** A real macrotask, so a message queued during a search is answered before the next flight. */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function handle(ephemeris: Ephemeris, req: SimRequest): Promise<SimResponse> {
  const start = performance.now();
  if (req.kind === "shot") {
    if (isLunar(req.shot)) {
      const { runLunar } = await import('./lunar');
      return { kind: 'shot', id: req.id, purpose: req.purpose, shot: req.shot, ...runLunar(req.shot), ms: performance.now() - start };
    }
    const result = simulateShot(ephemeris, req.shot);
    const analysis = analyzeShot(ephemeris, req.shot, result);
    return { kind: "shot", id: req.id, purpose: req.purpose, shot: req.shot, result, analysis, ms: performance.now() - start };
  }
  if ('kind' in req.query) {
    const { findLunarHint, LUNAR_GRID } = await import('./lunar-hint');
    // Search core calls afterFlight once per flight, so this counts real flights, hit or not.
    let simulations = 0;
    const hint = await findLunarHint(req.query, () => {
      simulations++;
      return nextTask();
    });
    // findLunarHint has rejected anything else, so only an absent strategy reaches the default.
    const strategy = req.query.strategy ?? 'reference';
    const ms = performance.now() - start;
    return { kind: 'hint', id: req.id, hint, ms, strategy, grid: LUNAR_GRID, simulations };
  }
  const hint = findHint(ephemeris, req.query);
  return { kind: "hint", id: req.id, hint, ms: performance.now() - start };
}

export async function respond(ephemeris: Ephemeris, req: SimRequest): Promise<SimResponse> {
  try {
    return await handle(ephemeris, req);
  } catch (err) {
    return { kind: "error", id: req.id, message: err instanceof Error ? err.message : String(err) };
  }
}
