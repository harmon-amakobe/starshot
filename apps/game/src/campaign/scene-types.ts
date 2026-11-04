import type { Vec3 } from '@starshot/ephemeris';
import type { ParkingOrbit } from '@starshot/physics/lunar';
import type { Inspection } from '@starshot/presentation/vehicle';
import type { Mission as Level, MissionBody } from '../missions';
import type { FlightResponse as ShotResponse } from '../sim/protocol';
import type { Aim } from '../sim/shot';
import type { Preferences } from './session';
export interface SceneState {
  level: Level; launchEt: number; et: number; response: ShotResponse | null; aim: Aim;
  parking?: ParkingOrbit;
  aiming: boolean; charge: number; firing: boolean; snap: number; home: number; map: boolean;
  focus: MissionBody | null; inspection: Inspection | null; demoCharge: number; showMoons: boolean;
  reduced: boolean; visualTime: number; preferences: Preferences; deckHeight: number;
  safeTop?: number;
  safeRect?: { left: number; right: number; top: number; bottom: number };
  lock: { heightKm: number; centre: [number, number]; anchor: [number, number]; travel: number } | null;
}
export interface BodyMarker { id: string; name: string; point: [number, number]; radius: number; }
export interface SceneFrame {
  ready: boolean; renderer: string; identity: number; width: number; height: number; heightKm: number;
  centre: [number, number]; rotation: number; craft: [number, number]; physicalCraft: [number, number];
  heading: number; forward: [number, number]; velocity: Vec3; grip: [number, number]; travel: number;
  /** Height of the free room the ring moves in [CSS px]; below zero, the room has inverted. */
  ringRoom: number;
  prograde: number;
  visibleRect: { left: number; right: number; top: number; bottom: number };
  bodies: BodyMarker[]; target: [number, number]; targetRadius: number; targetDistance: number;
  intercept: [number, number] | null; interceptEt: number | null; interceptHit: boolean;
  approachCraft: [number, number] | null; captureRadius: number;
  scaleKm: number; demoGrip: [number, number]; moonsAvailable: boolean; moonCount: number;
}
export const EMPTY_FRAME: SceneFrame = { ready: false, renderer: '', identity: 0, width: 1, height: 1, heightKm: 5e8,
  centre: [0, 0], rotation: 0, craft: [0, 0], physicalCraft: [0, 0], heading: 0, forward: [1, 0], velocity: [0, 0, 0],
  grip: [0, 0], travel: 60, ringRoom: 0, prograde: 0, visibleRect: { left: 0, right: 1, top: 0, bottom: 1 }, bodies: [], target: [0, 0], targetRadius: 0, targetDistance: 0, intercept: null, approachCraft: null, captureRadius: 0,
  interceptEt: null, interceptHit: false, scaleKm: 0, demoGrip: [0, 0], moonsAvailable: false, moonCount: 0 };
