/// <reference lib="webworker" />
/**
 * Physics worker: runs every trajectory off the UI thread. Preview and launch
 * requests go through the same simulateShot (decision D6).
 */
import { createEphemeris } from "@starshot/ephemeris";
import { findHint } from "./hint.js";
import type { SimRequest, SimResponse } from "./protocol.js";
import { analyzeShot, simulateShot } from "./shot.js";

const ephemeris = createEphemeris({ flatten: true });
const scope = self as unknown as DedicatedWorkerGlobalScope;

function handle(req: SimRequest): SimResponse {
  const start = performance.now();
  if (req.kind === "shot") {
    const result = simulateShot(ephemeris, req.shot);
    const analysis = analyzeShot(ephemeris, req.shot, result);
    return { kind: "shot", id: req.id, purpose: req.purpose, shot: req.shot, result, analysis, ms: performance.now() - start };
  }
  const hint = findHint(ephemeris, req.query);
  return { kind: "hint", id: req.id, hint, ms: performance.now() - start };
}

scope.onmessage = (event: MessageEvent<SimRequest>) => {
  const req = event.data;
  let res: SimResponse;
  try {
    res = handle(req);
  } catch (err) {
    res = { kind: "error", id: req.id, message: err instanceof Error ? err.message : String(err) };
  }
  scope.postMessage(res);
};
