import { describe, expect, it } from 'vitest';
import { add, sub, scale, norm, createEphemeris } from '@starshot/ephemeris';
import rail from '@starshot/ephemeris/moon-rail.json';
import { LunarModel, LAUNCH_ET, DAY, EARTH_GM, MOON_GM, MOON_SOI_KM,
  parkingState, parkingPhase, parkingPeriod, requestFor, simulateLunar, sampleFlight } from '../src/lunar/index';

const model = new LunarModel(rail);
const parking = { frameEt: LAUNCH_ET, epochEt: LAUNCH_ET, phaseDeg: 225, radiusKm: 6571 };
const relativeParking = (orbit = parking, et = LAUNCH_ET) => {
  const craft = parkingState(model, orbit, et), earth = model.bodies(et).earth;
  return { r: sub(craft.r, earth.r), v: sub(craft.v, earth.v) };
};
describe('shared lunar model and parking state', () => {
  it('retains the independent Horizons probes and the Earth-Moon barycentre', () => {
    for (const p of rail.probes) {
      const state = model.relative(p[0]!);
      expect(norm(sub(state.r, p.slice(1, 4) as [number, number, number]))).toBeLessThan(.1);
      expect(norm(sub(state.v, p.slice(4, 7) as [number, number, number]))).toBeLessThan(.000011);
    }
    const eph = createEphemeris({ flatten: false }), fraction = MOON_GM / (EARTH_GM + MOON_GM);
    for (const et of [LAUNCH_ET, LAUNCH_ET + 27 * DAY]) {
      const b = model.bodies(et);
      expect(norm(sub(add(scale(b.earth.r, 1 - fraction), scale(b.moon.r, fraction)), eph.state('earth', et).r))).toBeLessThan(1e-6);
    }
  });
  it('closes a complete circular parking orbit without counting the Moon basis motion twice', () => {
    const period = parkingPeriod(parking.radiusKm), start = relativeParking();
    const end = relativeParking(parking, LAUNCH_ET + period);
    expect(norm(sub(start.r, end.r))).toBeLessThan(.00001);
    for (const part of [0, .25, .5, .75, 1]) {
      const state = relativeParking(parking, LAUNCH_ET + part * period);
      expect(norm(state.r)).toBeCloseTo(parking.radiusKm, 5);
      expect(norm(state.v)).toBeCloseTo(Math.sqrt(EARTH_GM / parking.radiusKm), 10);
    }
  });
  it('changes launch date without changing Earth-relative craft position or velocity', () => {
    const frozen = LAUNCH_ET + 321, later = frozen + 8 * DAY;
    const next = { ...parking, epochEt: later, phaseDeg: parkingPhase(parking, frozen) };
    const before = relativeParking(parking, frozen), after = relativeParking(next, later);
    expect(norm(sub(before.r, after.r))).toBeLessThan(1e-7);
    expect(norm(sub(before.v, after.v))).toBeLessThan(1e-12);
    expect(norm(sub(model.relative(frozen).r, model.relative(later).r))).toBeGreaterThan(100000);
    expect(norm(sub(after.r, relativeParking(next, later + parkingPeriod(next.radiusKm) / 4).r))).toBeGreaterThan(9000);
  });
  it('launches from the displayed shared initial state and stops at the first real SOI entry', () => {
    const request = { ...requestFor(3.24, 0), parking, approachRadiusKm: MOON_SOI_KM, stopAtEntry: true };
    const flight = simulateLunar(model, request), start = parkingState(model, parking, LAUNCH_ET), last = flight.samples.at(-1)!;
    expect(flight.samples[0]!.r).toEqual(start.r);
    expect(flight.entryEt).not.toBeNull(); expect(last.t).toBe(flight.entryEt);
    expect(norm(sub(last.r, model.bodies(last.t).moon.r))).toBeCloseTo(MOON_SOI_KM, 2);
    expect(flight.samples.slice(0, -1).every(k => norm(sub(k.r, model.bodies(k.t).moon.r)) >= MOON_SOI_KM)).toBe(true);
    expect(simulateLunar(model, request).samples).toEqual(flight.samples);
  });
  it('rejects a horizon beyond the rail rather than returning an extrapolated path', () => {
    const last = rail.knots.at(-7)!;
    expect(() => simulateLunar(model, { ...requestFor(3.24, 0), launchEt: last - DAY })).toThrow('Outside the lunar rail dates');
  });
  it('finds a real SOI graze even when every accepted diagnostic knot is outside', () => {
    const request = {
      ...requestFor(3.24, 17.33167459468716), parking,
      approachRadiusKm: MOON_SOI_KM, stopAtEntry: true,
    };
    const diagnostic = simulateLunar(model, { ...request, stopAtEntry: false });
    const stopped = simulateLunar(model, request);
    const distance = (et: number) => norm(sub(sampleFlight(diagnostic.samples, et).r, model.bodies(et).moon.r));
    expect(diagnostic.samples.every(k => distance(k.t) > MOON_SOI_KM)).toBe(true);
    expect(diagnostic.entryEt).not.toBeNull();
    const entry = diagnostic.entryEt!;
    const index = diagnostic.samples.findIndex(k => k.t > entry);
    expect(index).toBeGreaterThan(0);
    expect(diagnostic.samples[index - 1]!.t).toBeLessThan(entry);
    expect(diagnostic.samples[index]!.t).toBeGreaterThan(entry);
    expect(diagnostic.closestEt).toBeGreaterThan(entry);
    expect(diagnostic.closestEt).toBeLessThan(diagnostic.samples[index]!.t);
    expect(distance(diagnostic.closestEt)).toBeLessThan(MOON_SOI_KM);
    expect(distance(entry - .01)).toBeGreaterThan(MOON_SOI_KM);
    expect(stopped.entryEt).toBe(entry);
    const last = stopped.samples.at(-1)!;
    expect(last.t).toBe(entry);
    expect(stopped.samples.every(k => k.t <= entry)).toBe(true);
    expect(Math.abs(norm(sub(last.r, model.bodies(entry).moon.r)) - MOON_SOI_KM)).toBeLessThan(.01);
  });
});
