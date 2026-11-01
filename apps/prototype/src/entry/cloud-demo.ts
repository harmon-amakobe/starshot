import { LAUNCH_ET } from '../lunar/model';
import { validSession, copySession, type SavedSession } from './profiles';
export const CLOUD_DEMO_KEY = 'starshot.prototype.cloud-demo.v1';
export interface DemoPilot { id: string; name: string; revision: number; save: SavedSession; }
export interface CloudDemoState {
  version: 1; provider: 'google' | 'email' | null; guestId: string; selected: string | null; online: boolean;
  status: 'signed-out' | 'choose-pilot' | 'saved' | 'queued' | 'conflict'; baseRevision: number; queued: SavedSession | null; pilots: DemoPilot[];
  drafts: Record<string, { save: SavedSession; baseRevision: number }>;
}
export function sampleSave(): SavedSession {
  return { level: 'first-leap', dv: 3.24, angle: 0, phase: 'flight', et: LAUNCH_ET + 38880, paused: true,
    preferences: { science: false, trueSize: false, sizeLinked: true, camera: 'system', unitPreferences: { simple: 'light', science: 'metric' }, rate: 0, lightRate: 1 },
    expanded: true, sound: false, height: 2200, pan: [0, 0], cameraLock: null, clock: 'smooth' };
}
export function freshCloudDemo(): CloudDemoState {
  return { version: 1, provider: null, guestId: 'pilot-1', selected: null, online: true, status: 'signed-out', baseRevision: 0, queued: null, drafts: {},
    pilots: [{ id: 'selene', name: 'Selene', revision: 1, save: sampleSave() }] };
}
export function pilotDraft(state: CloudDemoState, id: string) {
  return Object.hasOwn(state.drafts, id) ? state.drafts[id] : undefined;
}
export function parseCloudDemo(raw: string): CloudDemoState | null {
  try {
    if (raw.length > 100000) return null;
    const s = JSON.parse(raw) as CloudDemoState;
    if (s.version !== 1 || ![null, 'google', 'email'].includes(s.provider) || typeof s.guestId !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(s.guestId)
      || typeof s.online !== 'boolean' || !['signed-out', 'choose-pilot', 'saved', 'queued', 'conflict'].includes(s.status)
      || !Number.isInteger(s.baseRevision) || s.baseRevision < 0 || s.baseRevision > 1e9 || s.queued !== null && !validSession(s.queued)
      || !Array.isArray(s.pilots) || !s.pilots.length || s.pilots.length > 6) return null;
    const ids = new Set<string>();
    for (const p of s.pilots) {
      if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9-]{1,48}$/.test(p.id) || ids.has(p.id) || typeof p.name !== 'string'
        || !p.name.trim() || p.name.length > 24 || !Number.isInteger(p.revision) || p.revision < 1 || p.revision > 1e9 || !validSession(p.save)) return null;
      ids.add(p.id);
    }
    if (!s.drafts || typeof s.drafts !== 'object' || Array.isArray(s.drafts)) return null;
    for (const [id, draft] of Object.entries(s.drafts)) if (!ids.has(id) || !draft || !validSession(draft.save)
      || !Number.isInteger(draft.baseRevision) || draft.baseRevision < 0 || draft.baseRevision > 1e9) return null;
    return s.selected === null || ids.has(s.selected) ? s : null;
  } catch { return null; }
}
export function syncDemo(state: CloudDemoState, local: SavedSession): CloudDemoState {
  const pilot = state.pilots.find(p => p.id === state.selected);
  if (!state.provider || !pilot) return state;
  const drafts = { ...state.drafts, [pilot.id]: { save: copySession(local), baseRevision: state.baseRevision } };
  if (!state.online) return { ...state, status: 'queued', queued: copySession(local), drafts };
  if (pilot.revision !== state.baseRevision) return { ...state, status: 'conflict', queued: copySession(local), drafts };
  delete drafts[pilot.id];
  return { ...state, status: 'saved', queued: null, baseRevision: pilot.revision + 1,
    drafts,
    pilots: state.pilots.map(p => p.id === pilot.id ? { ...p, revision: p.revision + 1, save: copySession(local) } : p) };
}
