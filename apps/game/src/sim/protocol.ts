/** Messages between the UI thread and the physics worker (sim.worker.ts). */
import type { SimulationResult } from "@starshot/physics";
import type { Hint, HintQuery } from "./hint.js";
import type { ShotAnalysis, ShotRequest } from "./shot.js";

/** "preview" while aiming, "launch" for the real flight: both run the identical simulation. */
export type ShotPurpose = "preview" | "launch";

export type SimRequest =
  | { readonly kind: "shot"; readonly id: number; readonly purpose: ShotPurpose; readonly shot: ShotRequest }
  | { readonly kind: "hint"; readonly id: number; readonly query: HintQuery };

export interface ShotResponse {
  readonly kind: "shot";
  readonly id: number;
  readonly purpose: ShotPurpose;
  readonly shot: ShotRequest;
  readonly result: SimulationResult;
  readonly analysis: ShotAnalysis;
  /** Wall time spent in simulate + analysis inside the worker [ms]. */
  readonly ms: number;
}

export interface HintResponse {
  readonly kind: "hint";
  readonly id: number;
  readonly hint: Hint | null;
  readonly ms: number;
}

export interface ErrorResponse {
  readonly kind: "error";
  readonly id: number;
  readonly message: string;
}

export type SimResponse = ShotResponse | HintResponse | ErrorResponse;
