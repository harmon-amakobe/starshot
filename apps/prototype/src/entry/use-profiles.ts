import { useEffect, useRef, useState, type Dispatch } from 'react';
import { requestFor } from '../lunar/flight';
import { LAUNCH_ET } from '../lunar/model';
import type { ShotAction, ShotState } from '../lunar/shot-state';
import { loadProfiles, writeProfiles, profileName, copySession, type SavedSession, type ProfileSave } from './profiles';
interface Options {
  state: ShotState; dispatch: Dispatch<ShotAction>; capture: () => SavedSession;
  apply: (session: SavedSession | null, et?: number) => void;
  saveEnabled: boolean;
  sceneStamp: string; sceneReady: (et?: number) => boolean;
}
export function useProfiles(options: Options) {
  const [initial] = useState(loadProfiles), [data, setData] = useState(initial.data), [notice, setNotice] = useState(initial.notice);
  const [hydrating, setHydrating] = useState(!!initial.data.profiles.find(p => p.id === initial.data.active)?.session);
  const [restoreEpoch, setRestoreEpoch] = useState(0);
  const current = useRef(options); current.current = options;
  const store = useRef(data), owner = useRef(data.active), started = useRef(false);
  const pending = useRef<{ owner: string; requestId: number; session: SavedSession | null; stage: 'compute' | 'scene'; et?: number } | null>(null);
  function commit(next: ProfileSave) {
    store.current = next; setData(next);
    if (!writeProfiles(next)) setNotice('Storage is unavailable. This session will stay in memory.');
  }
  function save() {
    if (pending.current || !started.current || !current.current.state.preview || !current.current.sceneReady()) return;
    if (!current.current.saveEnabled && !store.current.profiles.find(p => p.id === owner.current)?.session) return;
    const session = current.current.capture();
    const next = { ...store.current, profiles: store.current.profiles.map(p => p.id === owner.current ? { ...p, session } : p) };
    commit(next);
  }
  function restore(profileId: string) {
    const profile = store.current.profiles.find(p => p.id === profileId)!;
    owner.current = profileId; setHydrating(true);
    const session = profile.session;
    pending.current = { owner: profileId, requestId: current.current.state.id + 1, session, stage: 'compute' };
    current.current.apply(session);
    current.current.dispatch({ type: 'restart', request: requestFor(session?.dv ?? 0, session?.angle ?? 0) });
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (initial.data.profiles.find(p => p.id === initial.data.active)?.session) restore(initial.data.active);
  }, []);
  useEffect(() => {
    const request = pending.current, state = options.state;
    if (!request || request.owner !== owner.current || request.requestId !== state.id || !state.preview) return;
    if (request.stage === 'scene') {
      if (options.sceneReady(request.et)) { pending.current = null; setHydrating(false); }
      return;
    }
    const et = request.session?.phase === 'result' ? state.preview.endEt : request.session ? Math.min(state.preview.endEt, Math.max(LAUNCH_ET, request.session.et)) : LAUNCH_ET;
    current.current.apply(request.session, et);
    if (request.session && request.session.phase !== 'aim') current.current.dispatch({ type: 'hydrate-flight', id: state.id, result: request.session.phase === 'result' || et >= state.preview.endEt });
    request.stage = 'scene'; request.et = et; setRestoreEpoch(value => value + 1);
  }, [options.state, options.sceneStamp, restoreEpoch]);
  useEffect(() => {
    const timer = setInterval(save, 800), flush = () => save();
    window.addEventListener('pagehide', flush);
    return () => { clearInterval(timer); window.removeEventListener('pagehide', flush); };
  }, []);
  function select(id: string) {
    if (id === owner.current || pending.current || !store.current.profiles.some(p => p.id === id)) return;
    save(); commit({ ...store.current, active: id }); restore(id);
  }
  function create(name: string) {
    const clean = profileName(name); if (!clean || store.current.profiles.length >= 8 || pending.current) return;
    save(); const id = crypto.randomUUID();
    commit({ ...store.current, active: id, profiles: [...store.current.profiles, { id, name: clean, session: null }] }); restore(id);
  }
  function rename(name: string) {
    const clean = profileName(name); if (!clean) return;
    commit({ ...store.current, profiles: store.current.profiles.map(p => p.id === owner.current ? { ...p, name: clean } : p) });
  }
  function fresh() { commit({ ...store.current, profiles: store.current.profiles.map(p => p.id === owner.current ? { ...p, session: null } : p) }); restore(owner.current); }
  function activateDemo(id: string, name: string, session: SavedSession) {
    if (pending.current) return false;
    const existing = store.current.profiles.some(p => p.id === id);
    if (!existing && store.current.profiles.length >= 8) { setNotice('All eight profile slots are in use. Choose an existing profile to continue.'); return false; }
    save(); const profile = { id, name: profileName(name), session: copySession(session) };
    commit({ ...store.current, active: id, profiles: existing ? store.current.profiles.map(p => p.id === id ? profile : p) : [...store.current.profiles, profile] });
    restore(id); return true;
  }
  return { data, notice, hydrating, save, select, create, rename, fresh, activateDemo, profile: data.profiles.find(p => p.id === data.active)! };
}
