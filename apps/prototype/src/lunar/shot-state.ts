import type { Flight, ShotRequest } from './flight';
export interface ShotState {
  id: number; request: ShotRequest; preview: Flight | null; launch: Flight | null;
  pendingRelease: boolean; phase: 'aim' | 'flight' | 'result'; error: string | null;
}
export type ShotAction = { type: 'aim'; request: ShotRequest } | { type: 'ready'; id: number; flight: Flight }
  | { type: 'error'; id: number; error: string } | { type: 'release' | 'cancel' | 'finish' | 'retry' | 'replay' };
export function shotReducer(state: ShotState, action: ShotAction): ShotState {
  if (action.type === 'aim') return { ...state, id: state.id + 1, request: action.request, preview: null, pendingRelease: false, error: null };
  if (action.type === 'ready') {
    if (action.id !== state.id || state.phase !== 'aim') return state;
    return { ...state, preview: action.flight, launch: state.pendingRelease ? action.flight : state.launch,
      phase: state.pendingRelease ? 'flight' : 'aim', pendingRelease: false, error: null };
  }
  if (action.type === 'error') return action.id === state.id ? { ...state, error: action.error, pendingRelease: false } : state;
  if (action.type === 'release') {
    if (state.phase !== 'aim' || state.error) return state;
    return state.preview ? { ...state, launch: state.preview, phase: 'flight', pendingRelease: false } : { ...state, pendingRelease: true };
  }
  if (action.type === 'cancel') return { ...state, pendingRelease: false };
  if (action.type === 'finish') return { ...state, phase: 'result' };
  if (action.type === 'replay' && state.launch) return { ...state, phase: 'flight' };
  if (action.type === 'retry') return { ...state, phase: 'aim', launch: null, pendingRelease: false };
  return state;
}
