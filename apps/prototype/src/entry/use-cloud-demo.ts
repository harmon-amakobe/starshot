import { useEffect, useRef, useState } from 'react';
import { CLOUD_DEMO_KEY, freshCloudDemo, parseCloudDemo, pilotDraft, syncDemo, sampleSave, type CloudDemoState } from './cloud-demo';
import { copySession, profileName, type SavedSession } from './profiles';
interface Options {
  profileId: string; hydrating: boolean; capture: () => SavedSession;
  activate: (id: string, name: string, session: SavedSession) => boolean; restoreGuest: (id: string) => void;
}
export function useCloudDemo(options: Options) {
  const [state, setState] = useState(() => { try { const raw = localStorage.getItem(CLOUD_DEMO_KEY); return raw ? parseCloudDemo(raw) ?? freshCloudDemo() : freshCloudDemo(); } catch { return freshCloudDemo(); } });
  const [notice, setNotice] = useState(''), latest = useRef(options), current = useRef(state); latest.current = options;
  const signature = useRef('');
  const ownsPilot = () => !latest.current.hydrating && latest.current.profileId === `demo-${current.current.selected}`;
  function commit(next: CloudDemoState) {
    current.current = next; setState(next);
    try { localStorage.setItem(CLOUD_DEMO_KEY, JSON.stringify(next)); } catch { setNotice('Demo saves are in memory for this session.'); }
  }
  function signIn(provider: 'google' | 'email') {
    commit({ ...current.current, provider, guestId: latest.current.profileId.startsWith('demo-') ? current.current.guestId : latest.current.profileId,
      selected: null, status: 'choose-pilot', queued: null });
  }
  function choose(id: string, discardLocal = false) {
    if (!discardLocal && ownsPilot()) sync();
    const pilot = current.current.pilots.find(p => p.id === id); if (!pilot || latest.current.hydrating) return;
    const draft = pilotDraft(current.current, id), save = draft?.save ?? pilot.save;
    if (!latest.current.activate(`demo-${pilot.id}`, `Demo ${pilot.name}`, save)) { setNotice('No local profile slot is available for this demo pilot.'); return; }
    signature.current = JSON.stringify(save);
    const next: CloudDemoState = { ...current.current, selected: id, status: 'saved', baseRevision: draft?.baseRevision ?? pilot.revision, queued: null };
    commit(draft ? syncDemo(next, draft.save) : next);
  }
  function create(name: string) {
    const clean = profileName(name); if (!clean || current.current.pilots.length >= 6 || latest.current.hydrating) return;
    const save = sampleSave(); save.dv = 0; save.phase = 'aim'; save.et -= 38880;
    const id = crypto.randomUUID(); commit({ ...current.current, pilots: [...current.current.pilots, { id, name: clean, revision: 1, save }] }); choose(id);
  }
  function sync() {
    if (!ownsPilot()) return;
    const save = latest.current.capture(); signature.current = JSON.stringify(save); commit(syncDemo(current.current, save));
  }
  function connectivity() {
    const next = { ...current.current, online: !current.current.online };
    commit(next.online && next.queued ? syncDemo(next, next.queued) : next);
  }
  function secondDevice() {
    if (!ownsPilot()) return;
    const selected = current.current.selected; if (!selected) return;
    const remote = sampleSave(); remote.phase = 'aim'; remote.et -= 38880; remote.angle = 20;
    const next = { ...current.current, pilots: current.current.pilots.map(p => p.id === selected ? { ...p, revision: p.revision + 1, save: remote } : p) };
    commit(syncDemo(next, latest.current.capture()));
  }
  function resolve(choice: 'local' | 'cloud') {
    if (!ownsPilot()) return;
    const pilot = current.current.pilots.find(p => p.id === current.current.selected); if (!pilot) return;
    if (choice === 'cloud') { const drafts = { ...current.current.drafts }; delete drafts[pilot.id]; commit({ ...current.current, drafts }); choose(pilot.id, true); }
    else commit(syncDemo({ ...current.current, baseRevision: pilot.revision }, current.current.queued ?? latest.current.capture()));
  }
  function signOut() {
    if (latest.current.hydrating) return;
    if (ownsPilot()) sync();
    const guest = current.current.guestId;
    commit({ ...current.current, provider: null, selected: null, status: 'signed-out', queued: null });
    latest.current.restoreGuest(guest);
  }
  function chooseAnother() {
    if (latest.current.hydrating) return;
    if (ownsPilot()) sync();
    commit({ ...current.current, selected: null, status: 'choose-pilot', queued: null });
  }
  function download() {
    const pilot = current.current.pilots.find(p => p.id === current.current.selected); if (!pilot) return;
    const blob = new Blob([JSON.stringify({ demo: true, version: 1, pilot: { ...pilot, save: copySession(pilot.save) } }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'starshot-demo-save.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  useEffect(() => {
    const timer = setInterval(() => {
      if (!current.current.provider || !current.current.selected || latest.current.hydrating || latest.current.profileId !== `demo-${current.current.selected}` || current.current.status === 'conflict') return;
      const save = latest.current.capture(), next = JSON.stringify(save);
      if (next !== signature.current) { signature.current = next; commit(syncDemo(current.current, save)); }
    }, 1500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    Object.defineProperty(window, '__starshotCloudDemo', { configurable: true, get: () => structuredClone({ ...current.current, account: 'pilot@example.com', simulated: true }) });
    return () => { Reflect.deleteProperty(window, '__starshotCloudDemo'); };
  }, []);
  return { state, notice, ownsPilot: options.profileId === `demo-${state.selected}` && !options.hydrating, signIn, choose, create, sync, connectivity, secondDevice, resolve, signOut, chooseAnother, download };
}
export type CloudDemoController = ReturnType<typeof useCloudDemo>;
