// Types for the verifier's pure functions, so the game's typecheck covers the test that
// imports them (`apps/game/src/verify-lunar-loading.test.ts`).
export type BuildFiles = ReadonlyMap<string, string | Uint8Array>;
/** The files a graph reaches, and each edge to a file the build lacks. */
export interface Graph { paths: string[]; missing: string[] }
export interface Graphs {
  entry: Graph;
  workers: number;
  worker: Graph;
  workerDynamic: Graph;
  moonPath: string | null;
  moon: Graph;
}
export interface Cost { files: number; raw: number; gzip: number }
export type Row =
  | ({ label: string; paths: string[]; rail: string[] } & Cost)
  | { label: string; paths: null; why: string };
export const RAIL_TOKENS: readonly string[];
export function inventory(sw: string): string[] | null;
export function graphs(files: BuildFiles): Graphs;
export function findings(files: BuildFiles, tokens?: readonly string[]): string[];
export function cost(files: BuildFiles, paths: readonly string[]): Cost;
export function measure(files: BuildFiles, tokens?: readonly string[]): Row[];
