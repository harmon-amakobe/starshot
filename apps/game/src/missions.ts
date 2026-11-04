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
/** The campaign order (D33). Mission numbers and the next mission come from it, never from a list position. */
export const MISSION_ORDER: readonly MissionId[] = Object.freeze(['moonshot', 'first-light', 'morning-star', 'big-game', 'grand-tour']);
/** A mission's place in the order, from 1; 0 for the sandbox, which is outside it. */
export const missionNumber = (id: MissionId) => MISSION_ORDER.indexOf(id) + 1;
export const MOONSHOT: LunarLevel = Object.freeze({ id: 'moonshot', kind: 'lunar', title: 'Moonshot',
  blurb: 'Burn from a 200 km Earth orbit to reach the Moon. An encounter, not lunar orbit.',
  window: { startIso: '2026-11-02', days: 27 }, defaultLaunchIso: '2026-11-02', target: 'moon',
  maxFlightDays: 7, vInfMaxKmS: FUEL_BUDGET, attractors: ['earth'] as const, sim: SETTINGS,
  par: { deltaVKmS: 3.24, source: 'Measured study reference: 3.240 km/s prograde on 2026-11-02 at 01:00 UTC, phase 225 degrees. Not a claimed optimum.' } });
const planetary = new Map(CAMPAIGN.map(level => [level.id, level]));
export const MISSIONS: readonly Mission[] = MISSION_ORDER.map(id => id === 'moonshot' ? MOONSHOT : planetary.get(id)!);
/** The mission after this one in the order; none after the last, for the sandbox or for an unknown id. */
export const nextMission = (id: MissionId): Mission | undefined => {
  const index = MISSION_ORDER.indexOf(id);
  return index < 0 ? undefined : MISSIONS[index + 1];
};
export const isLunarLevel = (level: Mission): level is LunarLevel => level.id === 'moonshot';
export const bodyName = (id: MissionBody) => id === 'moon' ? 'Moon' : BODIES[id].name;
export const bodyRadius = (id: MissionBody) => id === 'moon' ? MOON_RADIUS : BODIES[id].radiusKm;
