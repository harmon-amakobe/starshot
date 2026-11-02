import { expect, it } from 'vitest';
import rail from '@starshot/ephemeris/moon-rail.json';
import { LunarModel, LAUNCH_ET } from '../lunar/model';
import { requestFor, simulateLunar, sampleFlight } from '../lunar/flight';
import { elapsedForEt, makeMapPayload, missionClock, validCheckpoint, type MapPreferences } from './observatory-session';
const preferences: MapPreferences = { science: false, trueSize: false, sizeLinked: true, camera: 'system', unitPreferences: { simple: 'light', science: 'metric' }, rate: 0, lightRate: 1 };
const model = new LunarModel(rail), flight = simulateLunar(model, requestFor(3.24, 0));
it('copies only the visible path for handoff without changing the original flight', () => {
  const before = JSON.stringify(flight), payload = makeMapPayload(model, flight, 4, 'flight', LAUNCH_ET, true, preferences);
  expect(payload.flight.samples.at(-1)!.t).toBe(flight.endEt);
  expect(payload.flight.samples.at(-1)!.r).toEqual(sampleFlight(flight.samples, flight.endEt).r);
  expect(payload.flight.samples.every(k => k.t <= flight.endEt)).toBe(true);
  expect(JSON.stringify(flight)).toBe(before);
  const clock = missionClock(model, flight);
  expect(clock.totalKm).toBeGreaterThan(330000); expect(clock.totalKm).toBeLessThan(350000);
  const next = clock.advance({ ...preferences, science: true, unitPreferences: { ...preferences.unitPreferences, science: 'light' }, progress: 0 }, 1);
  expect(clock.distanceAt(LAUNCH_ET + next * (flight.endEt - LAUNCH_ET))).toBeCloseTo(299792.458, 3);
});
it('restores exact ET after the level phase clock is reset', () => {
  for (const p of [0, .1, .4, .9, 1]) {
    const elapsed = elapsedForEt(LAUNCH_ET + (flight.endEt - LAUNCH_ET) * p, LAUNCH_ET, flight.endEt), u = elapsed / 7;
    expect(u * u * (3 - 2 * u)).toBeCloseTo(p, 10);
  }
});
it('rejects invalid or out-of-flight checkpoints', () => {
  const valid = { et: LAUNCH_ET, playing: true, cameraChanged: false, seq: 1, preferences };
  expect(validCheckpoint(valid, LAUNCH_ET, flight.endEt)).toBe(true);
  for (const bad of [{ ...valid, et: NaN }, { ...valid, et: flight.endEt + 1 }, { ...valid, seq: -1 }, { ...valid, preferences: { ...preferences, rate: Infinity } }]) {
    expect(validCheckpoint(bad, LAUNCH_ET, flight.endEt)).toBe(false);
  }
});
