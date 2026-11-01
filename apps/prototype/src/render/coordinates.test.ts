import { expect, it } from 'vitest';
import rail from '../../public/lunar/moon-rail.json';
import { LunarModel, LAUNCH_ET } from '../lunar/model';
import { requestFor, simulateLunar } from '../lunar/flight';
import { frameGeometry } from './coordinates';
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
