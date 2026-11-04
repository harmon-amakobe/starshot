import { useRef, useState } from 'react';
import { loadProgress, isUnlocked, withResult, type Progress } from '../progress';
import { CAMPAIGN } from '../levels';
import { MISSIONS, nextMission, type MissionId } from '../missions';
import type { Score } from '../scoring';
import { copySession, freshSession, validSession, type Session } from './session';
export const LEGACY_PILOTS_KEY = 'starshot.campaign.profiles.v1';
export const PILOTS_KEY = 'starshot.campaign.profiles.v2';
export interface Pilot { id: string; name: string; session: Session; progress: Progress; earned?: MissionId[]; }
export interface Pilots { version: 2; selected: string; profiles: Pilot[]; playtest: boolean; dropped?: number; }
export function validProgress(value: unknown): value is Progress {
  if (!value || typeof value !== 'object') return false;
  const p = value as Progress;
  return p.version === 1 && !!p.levels && typeof p.levels === 'object' && !Array.isArray(p.levels)
    && Object.values(p.levels).every(v => v && Number.isInteger(v.stars) && v.stars >= 0 && v.stars <= 3
      && (v.bestDeltaVKmS === undefined || typeof v.bestDeltaVKmS === 'number' && Number.isFinite(v.bestDeltaVKmS) && v.bestDeltaVKmS >= 0));
}
export function earnedFor(pilot: Pilot): MissionId[] {
  return pilot.earned ?? ['moonshot', ...CAMPAIGN.filter((_, index) => isUnlocked(CAMPAIGN.map(l => l.id), index, pilot.progress)).map(l => l.id)];
}
export function recordResult(pilot: Pilot, save: Session, score: Score, deltaVKmS: number): Pilot {
  const earned = earnedFor(pilot);
  if (save.levelId === 'sandbox' || !earned.includes(save.levelId)) return { ...pilot, session: copySession(save) };
  const next = score.hit ? nextMission(save.levelId) : undefined;
  return { ...pilot, session: copySession(save), progress: withResult(pilot.progress, save.levelId, score.stars, score.hit, deltaVKmS),
    earned: next && !earned.includes(next.id) ? [...earned, next.id] : earned };
}
export function parsePilots(raw: string): Pilots | null {
  try {
    const value = JSON.parse(raw) as Omit<Pilots, 'version'> & { version: number };
    if (![1, 2].includes(value.version) || typeof value.playtest !== 'boolean' || !Array.isArray(value.profiles) || value.profiles.length > 16) return null;
    const profiles = value.profiles.filter(p => p && typeof p.id === 'string' && /^[\w-]{1,80}$/.test(p.id) && typeof p.name === 'string' && p.name.length <= 24 && p.name.trim() && validSession(p.session) && validProgress(p.progress)
      && (value.version === 1 || Array.isArray(p.earned) && p.earned.every(id => MISSIONS.some(level => level.id === id))));
    if (!profiles.length || new Set(profiles.map(p => p.id)).size !== profiles.length) return null;
    return { version: 2, selected: profiles.some(p => p.id === value.selected) ? value.selected : profiles[0]!.id, playtest: value.playtest,
      dropped: value.profiles.length - profiles.length,
      profiles: profiles.map(p => ({ id: p.id, name: p.name, session: copySession(p.session), progress: structuredClone(p.progress), earned: [...earnedFor(p)] })) };
  } catch { return null; }
}
/** The first pilot of a browser: Moonshot only, or the access and stars of a legacy progress save. */
export const freshPilots = (): Pilots => {
  const progress = loadProgress(), hasLegacy = Object.keys(progress.levels).length > 0;
  const pilot: Pilot = { id: 'pilot-1', name: 'Pilot 1', session: freshSession(), progress, earned: ['moonshot'] };
  if (hasLegacy) pilot.earned = earnedFor({ ...pilot, earned: undefined });
  return { version: 2, selected: pilot.id, playtest: false, profiles: [pilot] };
};
export function usePilots() {
  const [notice, setNotice] = useState('');
  const [data, setData] = useState<Pilots>(() => {
    try { const raw = localStorage.getItem(PILOTS_KEY) ?? localStorage.getItem(LEGACY_PILOTS_KEY); if (!raw) return freshPilots(); const saved = parsePilots(raw); if (saved) { if (saved.dropped) setTimeout(() => setNotice('Some saved pilots could not be read. Other pilots are preserved.'), 0); return saved; } setTimeout(() => setNotice('The saved pilots could not be read. A fresh local pilot is ready.'), 0); }
    catch { setTimeout(() => setNotice('Storage is unavailable. You can play for this visit.'), 0); }
    return freshPilots();
  });
  const current = useRef(data); current.current = data;
  const [revision, setRevision] = useState(0);
  function write(next: Pilots) {
    current.current = next; setData(next);
    try { localStorage.setItem(PILOTS_KEY, JSON.stringify(next)); } catch { setNotice('Saved for this visit. Browser storage is unavailable.'); }
  }
  function stash(session: Session, progress?: Progress, owner = current.current.selected) {
    if (!validSession(session)) return;
    write({ ...current.current, profiles: current.current.profiles.map(p => p.id === owner ? { ...p, session: copySession(session), progress: progress ?? p.progress } : p) });
  }
  function select(id: string) {
    if (!current.current.profiles.some(p => p.id === id)) return;
    write({ ...current.current, selected: id }); setRevision(n => n + 1);
  }
  function create(name: string) {
    if (!name.trim() || current.current.profiles.filter(p => !p.id.startsWith('demo-')).length >= 8) return;
    const id = `pilot-${crypto.randomUUID()}`;
    write({ ...current.current, selected: id, profiles: [...current.current.profiles, { id, name: name.trim().slice(0, 24), session: freshSession(), progress: { version: 1, levels: {} }, earned: ['moonshot'] }] });
    setRevision(n => n + 1);
  }
  function restore(pilot: Pilot) {
    if (!validSession(pilot.session) || !validProgress(pilot.progress)) return;
    pilot = { ...pilot, earned: [...earnedFor(pilot)] };
    const exists = current.current.profiles.some(p => p.id === pilot.id);
    write({ ...current.current, selected: pilot.id, profiles: exists ? current.current.profiles.map(p => p.id === pilot.id ? structuredClone(pilot) : p) : [...current.current.profiles, structuredClone(pilot)] });
    setRevision(n => n + 1);
  }
  return { data, revision, notice, hasAccess: (id: MissionId) => earnedFor(data.profiles.find(p => p.id === data.selected)!).includes(id),
    record(save: Session, score: Score, deltaVKmS: number) { write({ ...current.current, profiles: current.current.profiles.map(p => p.id === current.current.selected ? recordResult(p, save, score, deltaVKmS) : p) }); },
    pilot: data.profiles.find(p => p.id === data.selected)!, stash, select, create, restore,
    rename(name: string) { if (name.trim()) write({ ...current.current, profiles: current.current.profiles.map(p => p.id === current.current.selected ? { ...p, name: name.trim().slice(0, 24) } : p) }); },
    togglePlaytest() { write({ ...current.current, playtest: !current.current.playtest }); } };
}
export type PilotController = ReturnType<typeof usePilots>;
