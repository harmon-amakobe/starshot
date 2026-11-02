import { sub } from '@starshot/ephemeris';
import { sampleFlight, type Flight } from '../lunar/flight';
import type { LunarModel } from '../lunar/model';
import { displayBasis, moonOrbit } from '../render/mission-geometry';
import type { CameraMode } from '../render/view-types';
import { createReplayClock } from '../../public/observatory/replay-clock.js';
export const BRIDGE_CHANNEL = 'starshot-lunar-observatory-v1';
export type Units = 'metric' | 'imperial' | 'light';
export interface MapPreferences {
  science: boolean; trueSize: boolean; sizeLinked: boolean; camera: CameraMode;
  unitPreferences: { simple: Units; science: Units }; rate: number; lightRate: number;
}
export interface MapCheckpoint {
  et: number; playing: boolean; preferences: MapPreferences; cameraChanged: boolean; seq: number;
}
export function elapsedForEt(et: number, start: number, end: number) {
  const p = Math.max(0, Math.min(1, (et - start) / (end - start)));
  return 7 * (.5 - Math.sin(Math.asin(1 - 2 * p) / 3));
}
export function makeMapPayload(model: LunarModel, flight: Flight, requestId: number, phase: string, et: number, playing: boolean, preferences: MapPreferences) {
  const samples = flight.samples.filter(knot => knot.t < flight.endEt).map(knot => ({ t: knot.t, r: [...knot.r], v: [...knot.v] }));
  const terminal = sampleFlight(flight.samples, flight.endEt);
  samples.push({ t: flight.endEt, r: [...terminal.r], v: [...terminal.v] });
  const clockSamples = samples.map(knot => {
    const earth = model.bodies(knot.t).earth;
    return { t: knot.t, r: sub(knot.r as [number, number, number], earth.r), v: sub(knot.v as [number, number, number], earth.v) };
  });
  const route = { startEt: flight.request.launchEt, endEt: flight.endEt, samples, analysis: { cost: flight.request.deltaVKmS }, playbackSeconds: 7 };
  return { requestId, phase, et: phase === 'aim' ? flight.request.launchEt : Math.max(flight.request.launchEt, Math.min(flight.endEt, et)), playing: phase === 'aim' ? false : playing, preferences,
    mission: { title: 'First leap', origin: 'earth', target: 'moon', approachRadiusKm: flight.request.approachRadiusKm,
      deltaVKmS: flight.request.deltaVKmS, parkingAltitudeKm: flight.request.parkingRadiusKm - 6371,
      burnAngleDeg: flight.request.burnAngleDeg, outcome: flight.entryEt ? 'approach' : flight.impact ? 'impact' : 'miss', closestKm: flight.closestKm },
    flight: route, clockFlight: { ...route, samples: clockSamples }, basis: displayBasis(model), lunarOrbit: moonOrbit(model) };
}
const clockCache = new WeakMap<Flight, ReturnType<typeof createReplayClock>>();
export function missionClock(model: LunarModel, flight: Flight) {
  let clock = clockCache.get(flight);
  if (!clock) {
    const preferences: MapPreferences = { science: false, trueSize: false, sizeLinked: true, camera: 'system', unitPreferences: { simple: 'light', science: 'metric' }, rate: 0, lightRate: 1 };
    clock = createReplayClock(makeMapPayload(model, flight, 0, 'flight', flight.request.launchEt, false, preferences).clockFlight);
    clockCache.set(flight, clock);
  }
  return clock;
}
export function validCheckpoint(value: unknown, start: number, end: number): value is MapCheckpoint {
  if (!value || typeof value !== 'object') return false;
  const v = value as MapCheckpoint, p = v.preferences;
  return Number.isInteger(v.seq) && v.seq >= 0 && Number.isFinite(v.et) && v.et >= start && v.et <= end
    && typeof v.playing === 'boolean' && typeof v.cameraChanged === 'boolean' && !!p
    && typeof p.science === 'boolean' && typeof p.trueSize === 'boolean' && typeof p.sizeLinked === 'boolean'
    && ['follow', 'system', 'free'].includes(p.camera) && ['metric', 'imperial', 'light'].includes(p.unitPreferences?.simple)
    && ['metric', 'imperial', 'light'].includes(p.unitPreferences?.science)
    && Number.isFinite(p.rate) && p.rate >= 0 && p.rate <= 1e9 && Number.isFinite(p.lightRate) && p.lightRate >= 0 && p.lightRate <= 300;
}
