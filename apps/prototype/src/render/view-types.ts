import type { Flight } from '../lunar/flight';
import type { Inspection } from './vehicle';
import type { CameraLock, PullStage } from '../ui/pull-pose';
export type CameraMode = 'follow' | 'system' | 'free';
export interface ViewState {
  flight: Flight | null; et: number; mode: CameraMode; heightKm: number;
  pan: [number, number]; inspection: Inspection | null; orbit: [number, number];
  angle: number; pulling: boolean; reducedMotion: boolean;
  deckHeight?: number; simplified?: boolean; gestureOffset?: [number, number]; charge?: number; aiming?: boolean;
  poseStage?: PullStage; snapProgress?: number; cameraLock?: CameraLock | null; previewUpdating?: boolean;
  flightActive?: boolean; visualTime?: number;
  engineTravel?: number | null;
  demoCharge?: number;
}
export interface FrameReadout {
  craft: [number, number]; moon: [number, number]; moonDistance: number;
  scaleKm: number; heightKm: number; renderer: string;
  centre: [number, number];
  physicalCraft: [number, number]; controlAnchor: [number, number]; earth: [number, number];
  earthRadiusPx: number; moonRadiusPx: number; worldsEnlarged: boolean;
  worldRect: { left: number; top: number; right: number; bottom: number };
  poseStage: PullStage; charge: number; snapProgress: number;
  headingRad: number; renderedForward: [number, number]; tangent: [number, number]; enginePulse: number; sleeveLengthPx: number;
  progradeHeadingRad: number; futureMoon: [number, number] | null; approachPoint: [number, number] | null; approachEt: number | null;
  orbitCue: [number, number]; orbitDirection: number;
  approachRadiusPx: number;
  engineFront: [number, number]; engineGrip: [number, number]; engineExtensionPx: number; maxEngineExtensionPx: number;
  aimSign: number;
  demoCharge: number; demoGrip: [number, number]; demoFront: [number, number]; demoTravelPx: number;
}
export interface SceneView { update(state: ViewState): FrameReadout; dispose(): void; }
