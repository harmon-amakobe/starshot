import type { Flight, ShotRequest } from './flight';
export interface ShotState {
  id: number; request: ShotRequest; preview: Flight | null; launch: Flight | null; previousPreview?: Flight | null;
  pendingRelease: boolean; phase: 'aim' | 'snap' | 'flight' | 'result'; error: string | null;
}
export type ShotAction = { type: 'aim'; request: ShotRequest } | { type: 'ready'; id: number; flight: Flight }
  | { type: 'restore-playback'; result: boolean }
  | { type: 'restart'; request: ShotRequest } | { type: 'error'; id: number; error: string }
  | { type: 'release' | 'cancel' | 'finish' | 'retry' | 'replay' | 'complete-snap' };
export function shotReducer(state: ShotState, action: ShotAction): ShotState {
  if (action.type === 'restore-playback') return state.launch ? { ...state, phase: action.result ? 'result' : 'flight' } : state;
  if (action.type === 'restart') return { id: state.id + 1, request: action.request, preview: null, previousPreview: null, launch: null, pendingRelease: false, phase: 'aim', error: null };
  if (action.type === 'aim') return state.phase !== 'aim' ? state : { ...state, id: state.id + 1, request: action.request, previousPreview: state.preview ?? state.previousPreview,
    preview: null, pendingRelease: false, error: null };
  if (action.type === 'ready') {
    if (action.id !== state.id || state.phase !== 'aim') return state;
    return { ...state, preview: action.flight, launch: state.pendingRelease ? action.flight : state.launch,
      phase: state.pendingRelease ? 'snap' : 'aim', pendingRelease: false, error: null };
  }
  if (action.type === 'error') return action.id === state.id && state.phase === 'aim' ? { ...state, error: action.error, pendingRelease: false } : state;
  if (action.type === 'release') {
    if (state.phase !== 'aim' || state.error) return state;
    return state.preview ? { ...state, launch: state.preview, phase: 'snap', pendingRelease: false } : { ...state, pendingRelease: true };
  }
  if (action.type === 'cancel') return { ...state, pendingRelease: false, phase: state.phase === 'snap' ? 'aim' : state.phase,
    launch: state.phase === 'snap' ? null : state.launch };
  if (action.type === 'complete-snap') return state.phase === 'snap' ? { ...state, phase: 'flight' } : state;
  if (action.type === 'finish') return { ...state, phase: 'result' };
  if (action.type === 'replay' && state.launch) return { ...state, phase: 'flight' };
  if (action.type === 'retry') return { ...state, phase: 'aim', launch: null, pendingRelease: false };
  return state;
}
