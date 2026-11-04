/** Messages between the UI thread and the physics worker (sim.worker.ts). */
import type { Hint } from "./hint.js";
import type { ShotAnalysis, ShotRequest } from "./shot.js";
import type { FlightRequest, FlightResult, FlightHintQuery } from './flight-request';

/** "preview" while aiming, "launch" for the real flight: both run the identical simulation. */
export type ShotPurpose = "preview" | "launch";

export type SimRequest =
  | { readonly kind: "shot"; readonly id: number; readonly purpose: ShotPurpose; readonly shot: FlightRequest }
  | { readonly kind: "hint"; readonly id: number; readonly query: FlightHintQuery };

export interface ShotResponse<S extends FlightRequest = ShotRequest> {
  readonly kind: "shot";
  readonly id: number;
  readonly purpose: ShotPurpose;
  readonly shot: S;
  readonly result: FlightResult<S>;
  readonly analysis: ShotAnalysis;
  /** Wall time spent in simulate + analysis inside the worker [ms]. */
  readonly ms: number;
}

export interface HintResponse {
  readonly kind: "hint";
  readonly id: number;
  readonly hint: Hint | null;
  readonly ms: number;
  /** Moon guides only, even with no route: the strategy, the grid and the flights it took. */
  readonly strategy?: "reference" | "search";
  readonly grid?: "moon-grid/1";
  readonly simulations?: number;
}

export interface ErrorResponse {
  readonly kind: "error";
  readonly id: number;
  readonly message: string;
}

export type FlightResponse = ShotResponse<FlightRequest>;
export type SimResponse = FlightResponse | HintResponse | ErrorResponse;
