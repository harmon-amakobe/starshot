import type { FlightRequest as ShotRequest } from '../sim/flight-request';
import { shotKey } from '../sim/preview';
import type { ReleaseMode, Session } from './session';
/** A changed pilot, mode or phase invalidates the pointer's captured intent. */
export function pullIntent(mode: ReleaseMode, owner: string, currentMode: ReleaseMode, currentOwner: string, phase: Session['phase']) {
  return owner === currentOwner && mode === currentMode && phase === 'aim' ? mode : null;
}
/** Async completion belongs to both a canonical shot and its current pilot/level visit. */
export class ReleaseOwner {
  generation = 0;
  pending: { generation: number; key: string; shot: ShotRequest } | null = null;
  cancel() { this.generation++; this.pending = null; }
  request(shot: ShotRequest) { this.cancel(); this.pending = { generation: this.generation, key: shotKey(shot), shot }; return this.pending; }
  accepts(generation: number, shot: ShotRequest) { return this.pending?.generation === generation && this.generation === generation && this.pending.key === shotKey(shot); }
}
