import { LAUNCH_ET } from '../lunar/model';
import type { MapPreferences } from '../ui/observatory-session';
export const PROFILE_KEY = 'starshot.prototype.profiles.v1';
export interface SavedSession {
  level: 'first-leap'; dv: number; angle: number; phase: 'aim' | 'flight' | 'result';
  et: number; paused: boolean; preferences: MapPreferences; expanded: boolean; sound: boolean;
  height: number; pan: [number, number]; cameraLock: { heightKm: number; centre: [number, number] } | null;
  clock: 'smooth' | 'rate';
}
export interface LocalProfile { id: string; name: string; session: SavedSession | null; }
export interface ProfileSave { version: 1; active: string; profiles: LocalProfile[]; }
const number = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const pair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(n => number(n, -2e9, 2e9));
const units = (v: unknown) => typeof v === 'string' && ['metric', 'imperial', 'light'].includes(v);
export const profileName = (name: string) => name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24);
export function validSession(value: unknown): value is SavedSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as SavedSession, p = s.preferences;
  return s.level === 'first-leap' && number(s.dv, 0, 3.55) && number(s.angle, -35, 35)
    && ['aim', 'flight', 'result'].includes(s.phase) && number(s.et, LAUNCH_ET, LAUNCH_ET + 604800)
    && (s.phase !== 'aim' || s.et === LAUNCH_ET) && typeof s.paused === 'boolean' && typeof s.expanded === 'boolean'
    && typeof s.sound === 'boolean' && ['smooth', 'rate'].includes(s.clock) && number(s.height, 180, 2e7) && pair(s.pan)
    && (s.cameraLock === null || !!s.cameraLock && number(s.cameraLock.heightKm, 180, 2e7) && pair(s.cameraLock.centre))
    && !!p && typeof p.science === 'boolean' && typeof p.trueSize === 'boolean' && typeof p.sizeLinked === 'boolean'
    && ['follow', 'system', 'free'].includes(p.camera) && units(p.unitPreferences?.simple) && units(p.unitPreferences?.science)
    && number(p.rate, 0, 1e9) && number(p.lightRate, 0, 300);
}
export function parseProfiles(raw: string): ProfileSave | null {
  try {
    if (raw.length > 100000) return null;
    const data = JSON.parse(raw) as ProfileSave;
    if (data.version !== 1 || !Array.isArray(data.profiles) || !data.profiles.length || data.profiles.length > 8) return null;
    const ids = new Set<string>();
    for (const p of data.profiles) {
      if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(p.id) || ids.has(p.id)
        || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 24 || /[\u0000-\u001f]/.test(p.name)
        || p.session !== null && !validSession(p.session)) return null;
      ids.add(p.id);
    }
    return ids.has(data.active) ? { version: 1, active: data.active, profiles: data.profiles.map(p => ({ id: p.id, name: p.name, session: p.session ? copySession(p.session) : null })) } : null;
  } catch { return null; }
}
export const freshProfiles = (): ProfileSave => ({ version: 1, active: 'pilot-1', profiles: [{ id: 'pilot-1', name: 'Pilot 1', session: null }] });
export function copySession(s: SavedSession): SavedSession {
  return { level: 'first-leap', dv: s.dv, angle: s.angle, phase: s.phase, et: s.et, paused: s.paused, expanded: s.expanded, sound: s.sound,
    height: s.height, pan: [...s.pan], cameraLock: s.cameraLock ? { heightKm: s.cameraLock.heightKm, centre: [...s.cameraLock.centre] } : null,
    clock: s.clock, preferences: { science: s.preferences.science, trueSize: s.preferences.trueSize, sizeLinked: s.preferences.sizeLinked,
      camera: s.preferences.camera, rate: s.preferences.rate, lightRate: s.preferences.lightRate,
      unitPreferences: { simple: s.preferences.unitPreferences.simple, science: s.preferences.unitPreferences.science } } };
}
export function loadProfiles(storage?: Pick<Storage, 'getItem'>) {
  try {
    const raw = (storage ?? localStorage).getItem(PROFILE_KEY);
    if (raw === null) return { data: freshProfiles(), notice: '' };
    const parsed = parseProfiles(raw);
    return { data: parsed ?? freshProfiles(), notice: parsed ? '' : 'This save could not be read. You can still play a fresh session.' };
  } catch { return { data: freshProfiles(), notice: 'Storage is unavailable. This session will stay in memory.' }; }
}
export function writeProfiles(data: ProfileSave, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? localStorage).setItem(PROFILE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
