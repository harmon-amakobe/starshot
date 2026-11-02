/**
 * Which preview may be launched. The worker answers previews asynchronously and
 * "latest request wins", so the last finished preview can describe an older
 * aim than the one on screen. Launch is allowed only when the finished preview
 * is for exactly the current shot, and then that preview's shot is what flies
 * (decision D6: what you see is what you get).
 */
import type { ShotResponse } from "./protocol.js";
import type { FlightRequest } from './flight-request';

/**
 * Canonical identity of a shot: the whole request as JSON with the keys of
 * every object sorted, so key order does not matter, and a field added to
 * ShotRequest or SimSettings later joins the launch gate without anyone having
 * to list it here. Numbers print as their shortest round-trip form, so equal
 * keys mean bit-identical inputs. An absent optional field and an explicit
 * default give different keys, which can only keep Launch closed, never open it
 * for a different shot.
 */
export function shotKey(s: FlightRequest): string {
  return stableJson(s);
}

function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v !== null && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`).join(",")}}`;
  }
  // undefined inside an array prints as JSON does it there.
  return JSON.stringify(v) ?? "null";
}

/** The finished preview if it is for exactly this shot, otherwise null (still computing). */
export function previewForShot<S extends FlightRequest>(preview: ShotResponse<S> | null, shot: S): ShotResponse<S> | null {
  return preview !== null && shotKey(preview.shot) === shotKey(shot) ? preview : null;
}

export interface LaunchGate<S extends FlightRequest = FlightRequest> {
  /** Launch is enabled and would fly exactly the preview on screen. */
  readonly ready: boolean;
  /** The preview on screen is for an older aim (or there is none yet): show "busy". */
  readonly stale: boolean;
  /** The shot to launch when ready: the matching preview's own request. */
  readonly shot: S | null;
}

export function launchGate<S extends FlightRequest>(aiming: boolean, preview: ShotResponse<S> | null, shot: S): LaunchGate<S> {
  const current = previewForShot(preview, shot);
  return { ready: aiming && current !== null, stale: current === null, shot: current?.shot ?? null };
}
