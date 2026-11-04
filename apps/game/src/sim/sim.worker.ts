/// <reference lib="webworker" />
/**
 * Physics worker: runs every trajectory off the UI thread. Preview and launch
 * requests go through the same simulateShot (decision D6).
 */
import { createEphemeris } from "@starshot/ephemeris";
import type { SimRequest } from "./protocol.js";
import { cachedEphemeris } from "./shot.js";
import { respond } from './worker-handler';

const ephemeris = cachedEphemeris(createEphemeris({ flatten: true }));
const scope = self as unknown as DedicatedWorkerGlobalScope;

// Each message is handled as it arrives: a Moon search yields between flights, so a
// preview posted during it is answered before the search ends.
scope.onmessage = async (event: MessageEvent<SimRequest>) => {
  scope.postMessage(await respond(ephemeris, event.data));
};
