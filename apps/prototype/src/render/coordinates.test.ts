import { expect, it } from 'vitest';
import rail from '../../public/lunar/moon-rail.json';
import { LunarModel, LAUNCH_ET } from '../lunar/model';
import { requestFor, simulateLunar } from '../lunar/flight';
import { frameGeometry, frameReadout, local } from './coordinates';
import { sub } from '@starshot/ephemeris';
import { sampleFlight } from '../lunar/flight';
import type { ViewState } from './view-types';
it('keeps the reduced-motion system camera fixed throughout a flight', () => {
  const model = new LunarModel(rail), flight = simulateLunar(model, requestFor(3.24, 0));
  const state: ViewState = { flight, et: LAUNCH_ET, mode: 'system', heightKm: 2200,
    pan: [0, 0], inspection: null, orbit: [0, 0], angle: 0, pulling: false, reducedMotion: true };
  const start = frameGeometry(model, state, 390 / 844);
  for (const fraction of [.1, .4, .7, 1]) {
    const frame = frameGeometry(model, { ...state, et: LAUNCH_ET + (flight.endEt - LAUNCH_ET) * fraction }, 390 / 844);
    expect(frame.centre).toEqual(start.centre);
    expect(frame.height).toBe(start.height);
  }
});

it('keeps initial bodies above the deck and clear of the top controls across viewport shapes', () => {
  const model = new LunarModel(rail), flight = simulateLunar(model, requestFor(0, 0));
  for (const [width, height, deckHeight] of [[360, 640, 226], [390, 664, 226], [390, 844, 230], [791, 833, 230], [1440, 900, 230], [844, 390, 118]] as const) {
    const state: ViewState = { flight, et: LAUNCH_ET, mode: 'system', heightKm: 2200, pan: [0, 0], inspection: null,
      orbit: [0, 0], angle: 0, pulling: false, reducedMotion: false, aiming: true, simplified: true, deckHeight };
    const frame = frameGeometry(model, state, width / height, { width, height });
    const display = frameReadout(frame, state, width, height, 'test');
    expect(display.earth[0]).toBeLessThan(display.moon[0]);
    expect(display.earth[1]).toBeCloseTo(display.moon[1], 8);
    for (const [centre, radius] of [[display.earth, display.earthRadiusPx], [display.moon, display.moonRadiusPx]] as const) {
      expect(centre[1] - radius).toBeGreaterThanOrEqual(display.worldRect.top - .01);
      expect(centre[1] + radius).toBeLessThan(height - deckHeight - 12);
    }
    expect(display.craft[1] - 43).toBeGreaterThan(65);
    const pulled = frameReadout(frame, { ...state, charge: 1 }, width, height, 'test');
    expect(pulled.physicalCraft).toEqual(display.physicalCraft);
    expect(pulled.earth).toEqual(display.earth);
    expect(pulled.moon).toEqual(display.moon);
    expect(pulled.craft).toEqual(display.craft);
    expect(pulled.engineExtensionPx).toBe(pulled.maxEngineExtensionPx);
    for (const angle of [-35, 0, 35]) {
      const charged = frameReadout(frame, { ...state, charge: 1, angle }, width, height, 'test');
      expect(charged.engineGrip[0]).toBeGreaterThanOrEqual(28);
      expect(charged.engineGrip[0]).toBeLessThanOrEqual(width - 28);
      expect(charged.engineGrip[1]).toBeGreaterThanOrEqual(80);
      expect(charged.engineGrip[1]).toBeLessThanOrEqual(height - deckHeight - 40);
    }
  }
});

it('faces the Earth-relative path tangent and freezes the engine pulse with its visual clock', () => {
  const model = new LunarModel(rail), flight = simulateLunar(model, requestFor(3.24, 0));
  for (const fraction of [.05, .3, .8]) {
    const et = LAUNCH_ET + (flight.endEt - LAUNCH_ET) * fraction;
    const state: ViewState = { flight, et, mode: 'system', heightKm: 2200, pan: [0, 0], inspection: null,
      orbit: [0, 0], angle: 30, pulling: false, reducedMotion: false, flightActive: true, visualTime: 2 };
    const frame = frameGeometry(model, state, 1.6), display = frameReadout(frame, state, 1440, 900, 'test');
    const position = (time: number) => sub(sampleFlight(flight.samples, time).r, model.bodies(time).earth.r);
    const tangent = local(sub(position(et + .1), position(et - .1)), frame.basis);
    const expected = Math.atan2(tangent[1], tangent[0]);
    expect(Math.cos(display.headingRad - expected)).toBeGreaterThan(.999999);
    expect(frameReadout(frame, state, 1440, 900, 'test').enginePulse).toBe(display.enginePulse);
    const steady = frameReadout(frame, { ...state, reducedMotion: true, visualTime: 5 }, 1440, 900, 'test');
    expect(steady.enginePulse).toBe(.8);
  }
});

it('keeps the enlarged control symbol continuous while a local orbit crosses the rear bearing', () => {
  const model = new LunarModel(rail), flight = simulateLunar(model, requestFor(0, 0));
  const state: ViewState = { flight, et: 846863870.133, mode: 'follow', heightKm: 10000,
    pan: [0, 0], inspection: null, orbit: [0, 0], angle: 0, pulling: false, reducedMotion: false, simplified: true };
  const sample = (et: number) => frameReadout(frameGeometry(model, { ...state, et }, 390 / 844, { width: 390, height: 844 }), state, 390, 844, 'test');
  const a = sample(state.et), b = sample(state.et + .53);
  expect(Math.hypot(b.craft[0] - a.craft[0], b.craft[1] - a.craft[1])).toBeLessThan(1);
});
