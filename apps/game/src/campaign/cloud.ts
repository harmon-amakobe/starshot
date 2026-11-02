import { useEffect, useRef, useState } from 'react';
import { validProgress, type Pilot, type PilotController } from './profiles';
import { copySession, freshSession, validSession, type Session } from './session';
import { launchEtForDay } from '../sim/shot';
const KEY = 'starshot.campaign.cloud-demo.v1';
interface Remote { pilot: Pilot; revision: number; }
interface Cloud { version: 1; provider: 'google' | 'email' | null; selected: string | null; guest: string; online: boolean; base: number; pilots: Remote[]; drafts: Record<string, { pilot: Pilot; base: number }>; }
const fresh = (): Cloud => ({ version: 1, provider: null, selected: null, guest: 'pilot-1', online: true, base: 0, drafts: {}, pilots: [{ revision: 1, pilot: { id: 'demo-orbit', name: 'Orbit pilot', session: freshSession(), progress: { version: 1, levels: {} }, earned: ['moonshot'] } }] });
const validPilot = (p: Pilot) => p && typeof p.id === 'string' && /^demo-[\w-]{1,70}$/.test(p.id) && typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 24 && validSession(p.session) && validProgress(p.progress);
/** A second device edits the same departure, not the craft's in-flight clock. */
export function secondDeviceSession(saved: Session): Session {
  const next = copySession(saved), lunar = next.levelId === 'moonshot';
  if (next.phase !== 'aim') next.et = lunar ? next.launchEt! : launchEtForDay(next.windowStart, next.day);
  next.phase = 'aim'; next.paused = true;
  next.aim = { ...next.aim, angleDeg: lunar ? next.aim.angleDeg > 15 ? next.aim.angleDeg - 20 : next.aim.angleDeg + 20 : (next.aim.angleDeg + 20) % 360 };
  return next;
}
export function parseCloud(raw: string): Cloud | null {
  try { const s = JSON.parse(raw) as Cloud;
    if (s.version !== 1 || ![null, 'google', 'email'].includes(s.provider) || typeof s.online !== 'boolean' || typeof s.guest !== 'string' || !Number.isInteger(s.base) || !Array.isArray(s.pilots) || s.pilots.length > 6 || !s.pilots.every(p => validPilot(p.pilot) && Number.isInteger(p.revision) && p.revision >= 1) || !s.drafts || typeof s.drafts !== 'object' || !Object.values(s.drafts).every(d => validPilot(d.pilot) && Number.isInteger(d.base))) return null;
    if (s.selected !== null && !s.pilots.some(p => p.pilot.id === s.selected)) return null;
    return { ...s, pilots: s.pilots.map(p => ({ revision: p.revision, pilot: { ...p.pilot, session: copySession(p.pilot.session) } })) };
  } catch { return null; }
}
export function useCloud(pilots: PilotController, capture: () => Session, hydrating: boolean) {
  const [state, setState] = useState(() => { try { return parseCloud(localStorage.getItem(KEY) || '') ?? fresh(); } catch { return fresh(); } });
  const [notice, setNotice] = useState(''), current = useRef(state), live = useRef({ pilots, capture, hydrating }); live.current = { pilots, capture, hydrating };
  const currentPilot = () => { const l = live.current; return { ...l.pilots.pilot, session: l.capture() }; };
  const owns = () => !live.current.hydrating && current.current.selected === live.current.pilots.pilot.id;
  function write(s: Cloud) { current.current = s; setState(s); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { setNotice('Demo saves are kept for this visit.'); } }
  function sync() {
    if (!owns()) return; const s = current.current, remote = s.pilots.find(p => p.pilot.id === s.selected)!; const pilot = currentPilot();
    const draft = { pilot, base: s.drafts[pilot.id]?.base ?? s.base };
    if (!s.online || remote.revision !== draft.base) { write({ ...s, drafts: { ...s.drafts, [pilot.id]: draft } }); return; }
    if (JSON.stringify(remote.pilot) === JSON.stringify(pilot)) return;
    const drafts = { ...s.drafts }; delete drafts[pilot.id]; write({ ...s, base: remote.revision + 1, drafts, pilots: s.pilots.map(p => p.pilot.id === pilot.id ? { pilot, revision: p.revision + 1 } : p) });
  }
  function choose(id: string, remoteOnly = false) {
    if (live.current.hydrating) return; if (owns() && !remoteOnly) sync();
    const s = current.current, remote = s.pilots.find(p => p.pilot.id === id); if (!remote) return;
    const draft = remoteOnly ? undefined : s.drafts[id], next = draft?.pilot ?? remote.pilot;
    if (!validPilot(next)) { setNotice('This demo save could not be read. Your current pilot is preserved.'); return; }
    live.current.pilots.stash(live.current.capture()); live.current.pilots.restore(next);
    const drafts = { ...s.drafts }; if (remoteOnly) delete drafts[id]; write({ ...s, selected: id, base: draft?.base ?? remote.revision, drafts });
  }
  useEffect(() => { const timer = setInterval(() => { if (current.current.provider && owns()) sync(); }, 1800); return () => clearInterval(timer); }, []);
  const remote = state.pilots.find(p => p.pilot.id === state.selected), draft = state.selected ? state.drafts[state.selected] : undefined;
  const status = draft ? remote && draft.base !== remote.revision ? 'conflict' : 'queued' : 'saved';
  return { state, notice, remote, draft, status, ownsPilot: owns(), sync, choose,
    signIn(provider: 'google' | 'email') { write({ ...current.current, provider, selected: null, guest: live.current.pilots.pilot.id.startsWith('demo-') ? current.current.guest : live.current.pilots.pilot.id }); },
    create(name: string) { if (!name.trim() || current.current.pilots.length >= 6) return; const id = `demo-${crypto.randomUUID()}`; write({ ...current.current, pilots: [...current.current.pilots, { revision: 1, pilot: { id, name: name.trim().slice(0, 24), session: freshSession(), progress: { version: 1, levels: {} }, earned: ['moonshot'] } }] }); choose(id); },
    another() { sync(); write({ ...current.current, selected: null }); },
    signOut() { if (live.current.hydrating) return; sync(); const guest = current.current.guest; write({ ...current.current, provider: null, selected: null }); live.current.pilots.select(guest); },
    connectivity() { write({ ...current.current, online: !current.current.online }); if (current.current.online) sync(); },
    secondDevice() { if (!owns()) return; const s = current.current; write({ ...s, pilots: s.pilots.map(p => p.pilot.id === s.selected ? { revision: p.revision + 1, pilot: { ...p.pilot, session: secondDeviceSession(p.pilot.session) } } : p) }); sync(); },
    resolve(choice: 'local' | 'cloud') { if (!owns() || !current.current.selected) return; if (choice === 'cloud') choose(current.current.selected, true); else { const s = current.current, id = s.selected!, remote = s.pilots.find(p => p.pilot.id === id)!; const drafts = { ...s.drafts }; delete drafts[id]; write({ ...s, base: remote.revision, drafts }); sync(); } },
    download() { const pilot = owns() ? currentPilot() : remote?.pilot; if (!pilot) return; const blob = new Blob([JSON.stringify({ demo: true, version: 1, pilot }, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'starshot-demo-save.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); },
  };
}
export type CloudController = ReturnType<typeof useCloud>;
