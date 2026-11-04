/**
 * The physics worker's request handler, apart from `self`, so tests drive the code the
 * worker runs. Every reply carries its request's id; a throw becomes the error reply.
 */
import type { Ephemeris } from '@starshot/ephemeris';
import { isLunar } from './flight-request';
import { findHint } from './hint.js';
import type { SimRequest, SimResponse } from './protocol.js';
import { analyzeShot, simulateShot } from './shot.js';

/**
 * A real macrotask, so a message queued during a search is answered before the next flight.
 * A channel message, not a zero-delay timer: nested timers wait at least 4 ms past the fifth
 * level (HTML timers), which cost about a second over a 240-flight search. Each yield has its
 * own channel and closes it, so no open port keeps a test run or a worker alive.
 */
export function channelTask(): Promise<void> {
  // An engine without MessageChannel still gets a macrotask, at the timer's slower pace.
  if (typeof MessageChannel !== 'function') return new Promise((resolve) => setTimeout(resolve, 0));
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => {
      port1.close();
      resolve();
    };
    port2.postMessage(null);
  });
}
/** The yield after each search flight; a seam so tests hold each yield and order replies. */
export const scheduler = { nextTask: channelTask };

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
      return scheduler.nextTask();
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
