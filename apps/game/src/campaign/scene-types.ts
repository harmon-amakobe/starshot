import type { BodyId, Vec3 } from '@starshot/ephemeris';
import type { Inspection } from '@starshot/presentation/vehicle';
import type { Level } from '../levels';
import type { ShotResponse } from '../sim/protocol';
import type { Aim } from '../sim/shot';
import type { Preferences } from './session';
/** How long the ring snaps back after a release (`SceneState.snap`); the clock waits it out. */
export const RELEASE_SNAP_MS = 180;
export interface SceneState {
  level: Level;
  launchEt: number;
  et: number;
  response: ShotResponse | null;
  aim: Aim;
  aiming: boolean;
  charge: number;
  firing: boolean;
  snap: number;
  home: number;
  map: boolean;
  focus: BodyId | null;
  inspection: Inspection | null;
  demoCharge: number;
  showMoons: boolean;
  reduced: boolean;
  visualTime: number;
  preferences: Preferences;
  deckHeight: number;
  safeTop?: number;
  lock: {
    heightKm: number;
    centre: [number, number];
    anchor: [number, number];
    travel: number;
  } | null;
}
export interface BodyMarker {
  id: string;
  name: string;
  point: [number, number];
  radius: number;
}
export interface SceneFrame {
  ready: boolean;
  renderer: string;
  identity: number;
  width: number;
  height: number;
  heightKm: number;
  centre: [number, number];
  rotation: number;
  craft: [number, number];
  physicalCraft: [number, number];
  heading: number;
  forward: [number, number];
  velocity: Vec3;
  grip: [number, number];
  travel: number;
  bodies: BodyMarker[];
  target: [number, number];
  targetRadius: number;
  targetDistance: number;
  intercept: [number, number] | null;
  interceptEt: number | null;
  interceptHit: boolean;
  scaleKm: number;
  demoGrip: [number, number];
  moonsAvailable: boolean;
  moonCount: number;
}
export const EMPTY_FRAME: SceneFrame = {
  ready: false,
  renderer: '',
  identity: 0,
  width: 1,
  height: 1,
  heightKm: 5e8,
  centre: [0, 0],
  rotation: 0,
  craft: [0, 0],
  physicalCraft: [0, 0],
  heading: 0,
  forward: [1, 0],
  velocity: [0, 0, 0],
  grip: [0, 0],
  travel: 60,
  bodies: [],
  target: [0, 0],
  targetRadius: 0,
  targetDistance: 0,
  intercept: null,
  interceptEt: null,
  interceptHit: false,
  scaleKm: 0,
  demoGrip: [0, 0],
  moonsAvailable: false,
  moonCount: 0,
};
