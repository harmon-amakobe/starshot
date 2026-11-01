/**
 * Which preview may be launched. The worker answers previews asynchronously and
 * "latest request wins", so the last finished preview can describe an older
 * aim than the one on screen. Launch is allowed only when the finished preview
 * is for exactly the current shot, and then that preview's shot is what flies
 * (decision D6: what you see is what you get).
 */
import type { ShotResponse } from "./protocol.js";
import type { ShotRequest } from "./shot.js";

/**
 * Canonical identity of a shot: every field that changes the flight, in a fixed
 * order (so key order in the object does not matter). Numbers print as their
 * shortest round-trip form, so equal keys mean bit-identical inputs.
 */
export function shotKey(s: ShotRequest): string {
  return [
    s.target,
    s.attractors.join(","),
    s.launchEt,
    s.vInf.join(","),
    s.maxFlightDays,
    s.requiredFlyby ?? "",
    s.sim.rtol,
    s.sim.atolKm,
    s.sim.maxStep,
    s.sim.maxSteps,
    s.captureZoneScale ?? 1,
  ].join("|");
}

/** The finished preview if it is for exactly this shot, otherwise null (still computing). */
export function previewForShot(preview: ShotResponse | null, shot: ShotRequest): ShotResponse | null {
  return preview !== null && shotKey(preview.shot) === shotKey(shot) ? preview : null;
}

export interface LaunchGate {
  /** Launch is enabled and would fly exactly the preview on screen. */
  readonly ready: boolean;
  /** The preview on screen is for an older aim (or there is none yet): show "busy". */
  readonly stale: boolean;
  /** The shot to launch when ready: the matching preview's own request. */
  readonly shot: ShotRequest | null;
}

export function launchGate(aiming: boolean, preview: ShotResponse | null, shot: ShotRequest): LaunchGate {
  const current = previewForShot(preview, shot);
  return { ready: aiming && current !== null, stale: current === null, shot: current?.shot ?? null };
}
