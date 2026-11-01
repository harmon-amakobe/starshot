import { describe, expect, it } from 'vitest';
import { createEphemeris, add, scale, sub, norm } from '@starshot/ephemeris';
import rail from '../../public/lunar/moon-rail.json';
import { LunarModel, EARTH_GM, MOON_GM, LAUNCH_ET, DAY } from './model';
import { requestFor, simulateLunar, sampleFlight } from './flight';
import { shotReducer, type ShotState } from './shot-state';

const model = new LunarModel(rail);
describe('Lunar prototype physics', () => {
  it('returns a bounded, computed Earth orbit for weak pulls', () => {
    for (const dv of [0, .05, .2, .5]) {
      const request = requestFor(dv, 0), flight = simulateLunar(model, request);
      expect(request.scope).toBe('local');
      expect(request.durationSeconds).toBeLessThanOrEqual(DAY);
      expect(flight.steps).toBeLessThan(1500);
      expect(flight.entryEt).toBeNull();
      expect(flight.endEt).toBeCloseTo(LAUNCH_ET + request.durationSeconds, 5);
    }
    expect(() => simulateLunar(model, { ...requestFor(3.24, 0), launchEt: NaN })).toThrow();
  });
  it('agrees with independent geocentric JPL probes and preserves the EMB', () => {
    const ephemeris = createEphemeris({ flatten: false }), fraction = MOON_GM / (EARTH_GM + MOON_GM);
    for (const probe of rail.probes) {
      const state = model.relative(probe[0]!);
      expect(norm(sub(state.r, [probe[1]!, probe[2]!, probe[3]!]))).toBeLessThan(.1);
      expect(norm(sub(state.v, [probe[4]!, probe[5]!, probe[6]!]))).toBeLessThan(.000011);
    }
    for (let i = 0; i <= 100; i++) {
      const et = LAUNCH_ET + 7 * DAY * i / 100, bodies = model.bodies(et), emb = ephemeris.state('earth', et);
      expect(norm(sub(add(scale(bodies.earth.r, 1 - fraction), scale(bodies.moon.r, fraction)), emb.r))).toBeLessThan(1e-6);
      expect(norm(sub(add(scale(bodies.earth.v, 1 - fraction), scale(bodies.moon.v, fraction)), emb.v))).toBeLessThan(1e-12);
    }
    expect(() => model.relative(rail.knots[0]! - 1)).toThrow();
  });
  it('flies a measured success, miss and Earth impact with one frozen request', () => {
    const request = requestFor(3.24, 0), hit = simulateLunar(model, request);
    expect(hit.entryEt).not.toBeNull();
    expect((hit.entryEt! - LAUNCH_ET) / DAY).toBeCloseTo(1.582776944585, 7);
    expect(hit.impact).toBeNull();
    expect(hit.closestKm).toBeLessThan(8100);
    expect(simulateLunar(model, request).samples).toEqual(hit.samples);
    const miss = simulateLunar(model, requestFor(3.24, 20));
    expect(miss.entryEt).toBeNull();
    expect(miss.closestKm).toBeGreaterThan(100000);
    const impact = simulateLunar(model, requestFor(3.24, -20));
    expect(impact.impact).toBe('earth');
    expect(impact.entryEt).toBeNull();
  });
  it('converges under tighter tolerances without changing the approach result', () => {
    const request = requestFor(3.24, 0), normal = simulateLunar(model, request);
    const tight = simulateLunar(model, { ...request, settings: { ...request.settings,
      rtol: 1e-12, atolPos: .0001, atolVel: 1e-10, maxStep: 600 } });
    expect(Math.abs(normal.entryEt! - tight.entryEt!)).toBeLessThan(.01);
    for (let i = 0; i <= 200; i++) {
      const et = LAUNCH_ET + 7 * DAY * i / 200;
      expect(norm(sub(sampleFlight(normal.samples, et).r, sampleFlight(tight.samples, et).r))).toBeLessThan(.05);
    }
  });
  it('detects a grazing approach between accepted knots', () => {
    const flight = simulateLunar(model, requestFor(3.24, 17.210867496829703));
    expect(flight.entryEt).not.toBeNull();
    const atEntry = sampleFlight(flight.samples, flight.entryEt!);
    expect(norm(sub(atEntry.r, model.bodies(flight.entryEt!).moon.r))).toBeCloseTo(65000, 1);
  });
});

describe('Preview and launch ownership', () => {
  const request = requestFor(3.24, 0), flight = simulateLunar(model, request);
  const initial: ShotState = { id: 1, request, preview: null, launch: null, pendingRelease: false, phase: 'aim', error: null };
  it('ignores a stale answer and launches the exact current answer after release', () => {
    let state = shotReducer(initial, { type: 'release' });
    state = shotReducer(state, { type: 'ready', id: 0, flight });
    expect(state.phase).toBe('aim');
    state = shotReducer(state, { type: 'ready', id: 1, flight });
    expect(state.phase).toBe('snap');
    expect(state.launch).toBe(flight);
    state = shotReducer(state, { type: 'complete-snap' });
    expect(state.phase).toBe('flight');
    expect(state.launch).toBe(flight);
  });
  it('cancels a queued release and a new aim invalidates the old preview', () => {
    let state = shotReducer(initial, { type: 'release' });
    state = shotReducer(state, { type: 'cancel' });
    state = shotReducer(state, { type: 'ready', id: 1, flight });
    expect(state.phase).toBe('aim');
    state = shotReducer(state, { type: 'aim', request: requestFor(3.24, 20) });
    state = shotReducer(state, { type: 'ready', id: 1, flight });
    expect(state.preview).toBeNull();
    expect(state.pendingRelease).toBe(false);
  });
  it('invalidates a pending snap on cancel or restart', () => {
    const ready = shotReducer(initial, { type: 'ready', id: 1, flight });
    const snapping = shotReducer(ready, { type: 'release' });
    const cancelled = shotReducer(snapping, { type: 'cancel' });
    expect(shotReducer(cancelled, { type: 'complete-snap' }).phase).toBe('aim');
    expect(cancelled.launch).toBeNull();
    const restarted = shotReducer(snapping, { type: 'restart', request: requestFor(0, 0) });
    expect(shotReducer(restarted, { type: 'ready', id: 1, flight })).toBe(restarted);
    expect(shotReducer(restarted, { type: 'complete-snap' }).phase).toBe('aim');
    expect(restarted.request.deltaVKmS).toBe(0);
  });
});
