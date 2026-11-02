/// <reference lib="webworker" />
/**
 * Physics worker: runs every trajectory off the UI thread. Preview and launch
 * requests go through the same simulateShot (decision D6).
 */
import { createEphemeris } from "@starshot/ephemeris";
import { findHint } from "./hint.js";
import type { SimRequest, SimResponse } from "./protocol.js";
import { analyzeShot, cachedEphemeris, simulateShot } from "./shot.js";
import { isLunar } from './flight-request';

const ephemeris = cachedEphemeris(createEphemeris({ flatten: true }));
const scope = self as unknown as DedicatedWorkerGlobalScope;

async function handle(req: SimRequest): Promise<SimResponse> {
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
  const hint = 'kind' in req.query ? (await import('./lunar')).lunarHint() : findHint(ephemeris, req.query);
  return { kind: "hint", id: req.id, hint, ms: performance.now() - start };
}

scope.onmessage = async (event: MessageEvent<SimRequest>) => {
  const req = event.data;
  let res: SimResponse;
  try {
    res = await handle(req);
  } catch (err) {
    res = { kind: "error", id: req.id, message: err instanceof Error ? err.message : String(err) };
  }
  scope.postMessage(res);
};
