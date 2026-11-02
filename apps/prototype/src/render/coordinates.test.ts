import { expect, it } from 'vitest';
import rail from '@starshot/ephemeris/moon-rail.json';
import { LunarModel, LAUNCH_ET } from '../lunar/model';
import { requestFor, simulateLunar } from '../lunar/flight';
import { frameGeometry, frameReadout, local } from './coordinates';
import { sub } from '@starshot/ephemeris';
import { sampleFlight } from '../lunar/flight';
import type { ViewState } from './view-types';
import { parkingOrbit } from './orbital-context';
import { EntryCamera } from './entry-camera';
import * as THREE from 'three';
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
  for (const [width, height, deckHeight, simplified = true] of [[360, 640, 226], [390, 664, 226], [390, 844, 230], [791, 833, 230], [1440, 900, 230], [844, 390, 118], [844, 390, 175, false]] as const) {
    const state: ViewState = { flight, et: LAUNCH_ET, mode: 'system', heightKm: 2200, pan: [0, 0], inspection: null,
      orbit: [0, 0], angle: 0, pulling: false, reducedMotion: false, aiming: true, simplified, deckHeight };
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
    for (const angle of [-35, 0, 35]) for (const charge of [0, .5, 1]) {
      const charged = frameReadout(frame, { ...state, charge, angle }, width, height, 'test');
      expect(charged.engineGrip[0]).toBeGreaterThanOrEqual(28);
      expect(charged.engineGrip[0]).toBeLessThanOrEqual(width - 28);
      expect(charged.engineGrip[1]).toBeGreaterThanOrEqual(100);
      expect(charged.engineGrip[1]).toBeLessThanOrEqual(height - deckHeight - 48);
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

it('keeps the enlarged symbol on the true radial bearing and moving visibly prograde', () => {
  const model = new LunarModel(rail), flight = simulateLunar(model, requestFor(0, 0));
  for (const point of parkingOrbit(model, flight.request.parkingRadiusKm)) expect(Math.hypot(...point)).toBeCloseTo(6571, 8);
  const read = (et: number) => {
    const state: ViewState = { flight, et, mode: 'free', heightKm: 100000, pan: [0, 0], inspection: null,
      orbit: [0, 0], angle: 0, pulling: false, reducedMotion: false, simplified: true };
    return frameReadout(frameGeometry(model, state, 390 / 844), state, 390, 844, 'test');
  };
  for (const t of [100, 2000, 4000, 7000, 10000]) {
    const a = read(LAUNCH_ET + t), b = read(LAUNCH_ET + t + .1);
    const radius = [a.craft[0] - a.earth[0], a.earth[1] - a.craft[1]], actual = [a.physicalCraft[0] - a.earth[0], a.earth[1] - a.physicalCraft[1]];
    expect(Math.abs(radius[0]! * actual[1]! - radius[1]! * actual[0]!)).toBeLessThan(1e-7);
    expect(radius[0]! * a.renderedForward[1] - radius[1]! * a.renderedForward[0]).toBeGreaterThan(0);
    expect((b.craft[0] - a.craft[0]) * a.renderedForward[0] - (b.craft[1] - a.craft[1]) * a.renderedForward[1]).toBeGreaterThan(0);
  }
});

it('keeps actual bodies inside the cinematic depth range even at maximum saved zoom', () => {
  const camera = new EntryCamera(), craft = new THREE.Vector3(-4.646, -4.646, 0), earth = new THREE.Vector3(), moon = new THREE.Vector3(384, 0, 0);
  for (const height of [2.2, 20000]) for (const amount of [1, .5, .01, .001, .0001]) {
    camera.update(amount, 390, 844, height, craft, earth, moon);
    for (const point of [craft, earth, moon]) {
      const projected = point.clone().project(camera.camera);
      expect(projected.z).toBeGreaterThan(-1); expect(projected.z).toBeLessThan(1);
    }
  }
});
