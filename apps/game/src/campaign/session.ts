import { BODIES, createEphemeris, type PlanetId } from '@starshot/ephemeris';
import { SANDBOX_TARGETS, sandboxLevel } from '../levels';
import { MISSIONS, isLunarLevel, bodyName, type Mission, type MissionId } from '../missions';
import { EARTH_RADIUS, LAUNCH_ET, type ParkingOrbit } from '@starshot/physics/lunar';
import { daysBetweenIso, launchEtForDay, normalizeDeg, type Aim } from '../sim/shot';
export type Units = 'light' | 'metric' | 'imperial';
export type CameraMode = 'follow' | 'orbit' | 'system' | 'free';
export type ReleaseMode = 'plan' | 'hail-mary';
export interface Preferences {
  scientific: boolean; trueSize: boolean; sizeLinked: boolean; units: { simple: Units; science: Units };
  camera: CameraMode; heightKm: number; pan: [number, number]; orbit: [number, number];
  expanded: boolean; sound: boolean; rate: number; lightRate: number; releaseMode: ReleaseMode;
}
export interface Session {
  levelId: MissionId; target: PlanetId | 'moon'; windowStart: string; day: number; aim: Aim;
  parking?: ParkingOrbit;
  launchEt?: number;
  phase: 'aim' | 'flight' | 'result'; et: number; paused: boolean; hintUsed: boolean; entered: boolean;
  preferences: Preferences;
}
/** Commit the render clock as well as the pause flag between throttled UI updates. */
export const togglePauseAt = (session: Session, et: number): Session => ({ ...session, et, paused: !session.paused });
export const freshPreferences = (): Preferences => ({ scientific: false, trueSize: false, sizeLinked: true,
  units: { simple: 'light', science: 'metric' }, camera: 'system', heightKm: 5e8, pan: [0, 0], orbit: [0, 0],
  expanded: true, sound: false, rate: 0, lightRate: 1, releaseMode: 'plan' });
export function missionFor(save: Pick<Session, 'levelId' | 'target' | 'windowStart'>): Mission {
  return save.levelId === 'sandbox' ? sandboxLevel(save.target === 'moon' ? 'mars' : save.target, new Date(`${save.windowStart}T00:00:00Z`))
    : MISSIONS.find(level => level.id === save.levelId) ?? MISSIONS[0]!;
}
export function freshSession(level: Mission = MISSIONS[0]!, preferences = freshPreferences()): Session {
  const day = daysBetweenIso(level.window.startIso, level.defaultLaunchIso);
  const et = isLunarLevel(level) ? LAUNCH_ET : launchEtForDay(level.window.startIso, day), velocity = createEphemeris({ flatten: true }).state('earth', et).v;
  const inner = level.target === 'mercury' || level.target === 'venus';
  return { levelId: level.id, target: level.target, windowStart: level.window.startIso, day,
    ...(isLunarLevel(level) ? { parking: { frameEt: et, epochEt: et, phaseDeg: 225, radiusKm: EARTH_RADIUS + 200 } } : {}),
    aim: isLunarLevel(level) ? { angleDeg: 0, speedKmS: 0 } : { angleDeg: normalizeDeg(Math.atan2(velocity[1], velocity[0]) * 180 / Math.PI + (inner ? 180 : 0)), speedKmS: level.vInfMaxKmS * .3 },
    phase: 'aim', et, paused: false, hintUsed: false, entered: false, preferences: { ...structuredClone(preferences), ...(isLunarLevel(level) ? { camera: 'orbit', expanded: false, rate: 0 } : {}) } };
}
const finite = (n: unknown, lo: number, hi: number): n is number => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
const pair = (v: unknown, limit: number): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(n => finite(n, -limit, limit));
export function validSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const s = value as Session;
  if (![...MISSIONS.map(l => l.id), 'sandbox'].includes(s.levelId) || !(s.target === 'moon' || SANDBOX_TARGETS.includes(s.target))
    || typeof s.windowStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.windowStart)) return false;
  const date = new Date(`${s.windowStart}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== s.windowStart || s.windowStart < '1800-01-01' || s.windowStart > '2048-01-01') return false;
  const level = missionFor(s), p = s.preferences;
  if (level.target !== s.target || level.window.startIso !== s.windowStart || !Number.isInteger(s.day) || !finite(s.day, 0, level.window.days)
    || !s.aim || !finite(s.aim.angleDeg, isLunarLevel(level) ? -35 : 0, isLunarLevel(level) ? 35 : 360) || !finite(s.aim.speedKmS, 0, level.vInfMaxKmS)
    || !['aim', 'flight', 'result'].includes(s.phase) || ![s.paused, s.hintUsed, s.entered].every(v => typeof v === 'boolean')) return false;
  if (isLunarLevel(level) && (!s.parking || !finite(s.parking.epochEt, launchEtForDay(level.window.startIso, 0), launchEtForDay(level.window.startIso, level.window.days + 1))
    || s.parking.frameEt !== LAUNCH_ET || !finite(s.parking.phaseDeg, 0, 360) || s.parking.radiusKm !== EARTH_RADIUS + 200)) return false;
  const start = launchEtForDay(level.window.startIso, s.day);
  if (isLunarLevel(level) && s.phase !== 'aim' && !finite(s.launchEt, launchEtForDay(level.window.startIso, 0), launchEtForDay(level.window.startIso, level.window.days + 1))) return false;
  const lowerEt = isLunarLevel(level) ? s.phase === 'aim' ? launchEtForDay(level.window.startIso, 0) : s.launchEt! : start;
  const upperEt = isLunarLevel(level) && s.phase === 'aim' ? launchEtForDay(level.window.startIso, level.window.days + 1) - 1 : (isLunarLevel(level) ? s.launchEt! : start) + level.maxFlightDays * 86400;
  return finite(s.et, lowerEt, upperEt) && !!p
    && [p.scientific, p.trueSize, p.sizeLinked, p.expanded, p.sound].every(v => typeof v === 'boolean')
    && ['follow', 'orbit', 'system', 'free'].includes(p.camera) && ['light', 'metric', 'imperial'].includes(p.units?.simple)
    && ['light', 'metric', 'imperial'].includes(p.units?.science) && finite(p.heightKm, 1000, 2e11)
    && pair(p.pan, 1e12) && pair(p.orbit, 1.2) && finite(p.rate, 0, 1e9) && finite(p.lightRate, 0, 300)
    && (p.releaseMode === undefined || p.releaseMode === 'plan' || p.releaseMode === 'hail-mary');
}
export function copySession(s: Session): Session {
  return { levelId: s.levelId, target: s.target, windowStart: s.windowStart, day: s.day,
    aim: { angleDeg: s.aim.angleDeg, speedKmS: s.aim.speedKmS }, phase: s.phase, et: s.et,
    ...(s.parking ? { parking: { ...s.parking }, ...(s.launchEt !== undefined ? { launchEt: s.launchEt } : {}) } : {}),
    paused: s.paused, hintUsed: s.hintUsed, entered: s.entered,
    preferences: { scientific: s.preferences.scientific, trueSize: s.preferences.trueSize, sizeLinked: s.preferences.sizeLinked,
      units: { simple: s.preferences.units.simple, science: s.preferences.units.science }, camera: s.preferences.camera, heightKm: s.preferences.heightKm,
      pan: [...s.preferences.pan], orbit: [...s.preferences.orbit], expanded: s.preferences.expanded, sound: s.preferences.sound, rate: s.preferences.rate, lightRate: s.preferences.lightRate, releaseMode: s.preferences.releaseMode ?? 'plan' } };
}
export const unitOf = (p: Preferences): Units => p.units[p.scientific ? 'science' : 'simple'];
export function distanceText(km: number, units: Units) {
  if (units === 'light') {
    const seconds = km / 299792.458;
    return seconds < 60 ? `${seconds.toFixed(2)} light-s` : seconds < 3600 ? `${(seconds / 60).toFixed(1)} light-min` : `${(seconds / 3600).toFixed(2)} light-h`;
  }
  const distance = units === 'imperial' ? km / 1.609344 : km;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: distance < 10 ? 2 : 0 }).format(distance)} ${units === 'imperial' ? 'mi' : 'km'}`;
}
export const missionName = (s: Session) => s.levelId === 'sandbox' ? `Earth to ${bodyName(s.target)}` : missionFor(s).title;
