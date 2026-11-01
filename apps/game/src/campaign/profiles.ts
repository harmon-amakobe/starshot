import { useRef, useState } from 'react';
import { loadProgress, type Progress } from '../progress';
import { copySession, freshSession, validSession, type Session } from './session';
export const PILOTS_KEY = 'starshot.campaign.profiles.v1';
export interface Pilot {
  id: string;
  name: string;
  session: Session;
  progress: Progress;
}
export interface Pilots {
  version: 1;
  selected: string;
  profiles: Pilot[];
  playtest: boolean;
}
export function validProgress(value: unknown): value is Progress {
  if (!value || typeof value !== 'object') return false;
  const p = value as Progress;
  return (
    p.version === 1 &&
    !!p.levels &&
    typeof p.levels === 'object' &&
    !Array.isArray(p.levels) &&
    Object.values(p.levels).every(
      (v) =>
        v &&
        Number.isInteger(v.stars) &&
        v.stars >= 0 &&
        v.stars <= 3 &&
        (v.bestDeltaVKmS === undefined ||
          (typeof v.bestDeltaVKmS === 'number' &&
            Number.isFinite(v.bestDeltaVKmS) &&
            v.bestDeltaVKmS >= 0)),
    )
  );
}
export function parsePilots(raw: string): Pilots | null {
  try {
    const value = JSON.parse(raw) as Pilots;
    if (
      value.version !== 1 ||
      typeof value.playtest !== 'boolean' ||
      !Array.isArray(value.profiles) ||
      value.profiles.length < 1 ||
      value.profiles.length > 16
    )
      return null;
    if (
      value.profiles.some(
        (p) =>
          !p ||
          typeof p.id !== 'string' ||
          !/^[\w-]{1,80}$/.test(p.id) ||
          typeof p.name !== 'string' ||
          p.name.length > 24 ||
          !p.name.trim() ||
          !validSession(p.session) ||
          !validProgress(p.progress),
      )
    )
      return null;
    if (
      new Set(value.profiles.map((p) => p.id)).size !== value.profiles.length ||
      !value.profiles.some((p) => p.id === value.selected)
    )
      return null;
    return {
      version: 1,
      selected: value.selected,
      playtest: value.playtest,
      profiles: value.profiles.map((p) => ({
        id: p.id,
        name: p.name,
        session: copySession(p.session),
        progress: structuredClone(p.progress),
      })),
    };
  } catch {
    return null;
  }
}
const fresh = (): Pilots => ({
  version: 1,
  selected: 'pilot-1',
  playtest: true,
  profiles: [{ id: 'pilot-1', name: 'Pilot 1', session: freshSession(), progress: loadProgress() }],
});
export function usePilots() {
  const [notice, setNotice] = useState('');
  const [data, setData] = useState<Pilots>(() => {
    try {
      const raw = localStorage.getItem(PILOTS_KEY);
      if (!raw) return fresh();
      const saved = parsePilots(raw);
      if (saved) return saved;
      setTimeout(
        () => setNotice('The saved pilots could not be read. A fresh local pilot is ready.'),
        0,
      );
    } catch {
      setTimeout(() => setNotice('Storage is unavailable. You can play for this visit.'), 0);
    }
    return fresh();
  });
  const current = useRef(data);
  current.current = data;
  const [revision, setRevision] = useState(0);
  function write(next: Pilots) {
    current.current = next;
    setData(next);
    try {
      localStorage.setItem(PILOTS_KEY, JSON.stringify(next));
    } catch {
      setNotice('Saved for this visit. Browser storage is unavailable.');
    }
  }
  function stash(session: Session, progress?: Progress, owner = current.current.selected) {
    if (!validSession(session)) return;
    write({
      ...current.current,
      profiles: current.current.profiles.map((p) =>
        p.id === owner
          ? { ...p, session: copySession(session), progress: progress ?? p.progress }
          : p,
      ),
    });
  }
  function select(id: string) {
    if (!current.current.profiles.some((p) => p.id === id)) return;
    write({ ...current.current, selected: id });
    setRevision((n) => n + 1);
  }
  function create(name: string) {
    if (
      !name.trim() ||
      current.current.profiles.filter((p) => !p.id.startsWith('demo-')).length >= 8
    )
      return;
    const id = `pilot-${crypto.randomUUID()}`;
    write({
      ...current.current,
      selected: id,
      profiles: [
        ...current.current.profiles,
        {
          id,
          name: name.trim().slice(0, 24),
          session: freshSession(),
          progress: { version: 1, levels: {} },
        },
      ],
    });
    setRevision((n) => n + 1);
  }
  function restore(pilot: Pilot) {
    if (!validSession(pilot.session) || !validProgress(pilot.progress)) return;
    const exists = current.current.profiles.some((p) => p.id === pilot.id);
    write({
      ...current.current,
      selected: pilot.id,
      profiles: exists
        ? current.current.profiles.map((p) => (p.id === pilot.id ? structuredClone(pilot) : p))
        : [...current.current.profiles, structuredClone(pilot)],
    });
    setRevision((n) => n + 1);
  }
  return {
    data,
    revision,
    notice,
    pilot: data.profiles.find((p) => p.id === data.selected)!,
    stash,
    select,
    create,
    restore,
    rename(name: string) {
      if (name.trim())
        write({
          ...current.current,
          profiles: current.current.profiles.map((p) =>
            p.id === current.current.selected ? { ...p, name: name.trim().slice(0, 24) } : p,
          ),
        });
    },
    togglePlaytest() {
      write({ ...current.current, playtest: !current.current.playtest });
    },
  };
}
export type PilotController = ReturnType<typeof usePilots>;
