import { BODIES, type BodyId } from '@starshot/ephemeris';
import { SETTINGS, FUEL_BUDGET, MOON_RADIUS } from '@starshot/physics/lunar';
import { CAMPAIGN, type Level, type LevelId } from './levels';

export interface LunarLevel extends Omit<Level, 'id' | 'target' | 'sim'> {
  readonly id: 'moonshot';
  readonly kind: 'lunar';
  readonly target: 'moon';
  readonly sim: typeof SETTINGS;
}
export type Mission = Level | LunarLevel;
export type MissionId = LevelId | 'moonshot';
export type MissionBody = BodyId | 'moon';
export const MOONSHOT: LunarLevel = Object.freeze({ id: 'moonshot', kind: 'lunar', number: 1, title: 'Moonshot',
  blurb: 'Burn from a 200 km Earth orbit to reach the Moon. An encounter, not lunar orbit.',
  window: { startIso: '2026-11-02', days: 27 }, defaultLaunchIso: '2026-11-02', target: 'moon',
  maxFlightDays: 7, vInfMaxKmS: FUEL_BUDGET, attractors: ['earth'] as const, sim: SETTINGS,
  par: { deltaVKmS: 3.24, source: 'Measured study reference: 3.240 km/s prograde on 2026-11-02 at 01:00 UTC, phase 225 degrees. Not a claimed optimum.' } });
export const MISSIONS: readonly Mission[] = [MOONSHOT, ...CAMPAIGN.map((level, i) => ({ ...level, number: i + 2 }))];
export const nextMission = (id: MissionId) => MISSIONS[MISSIONS.findIndex(level => level.id === id) + 1];
export const isLunarLevel = (level: Mission): level is LunarLevel => level.id === 'moonshot';
export const bodyName = (id: MissionBody) => id === 'moon' ? 'Moon' : BODIES[id].name;
export const bodyRadius = (id: MissionBody) => id === 'moon' ? MOON_RADIUS : BODIES[id].radiusKm;
