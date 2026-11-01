import type { Flight } from '../lunar/flight';
import type { Inspection } from './vehicle';
export type CameraMode = 'follow' | 'system' | 'free';
export interface ViewState {
  flight: Flight | null; et: number; mode: CameraMode; heightKm: number;
  pan: [number, number]; inspection: Inspection | null; orbit: [number, number];
  angle: number; pulling: boolean; reducedMotion: boolean;
}
export interface FrameReadout {
  craft: [number, number]; moon: [number, number]; moonDistance: number;
  scaleKm: number; heightKm: number; renderer: string;
  centre: [number, number];
}
export interface SceneView { update(state: ViewState): FrameReadout; dispose(): void; }
