import { describe, expect, it } from 'vitest';
import { BODIES } from '@starshot/ephemeris';
import type { ShotResponse } from '../sim/protocol';
import { DAY } from '../sim/shot';
import { ownerOf, shouldAutosave } from './autosave';
import { summaryOf } from './contracts';
import { escapeAction } from './escape';
import { fontFaceCss } from './fonts';
import { advanceEt, defaultRate } from './playback';
import { freshPreferences, type Preferences } from './session';
import { cameraOf, cameraPreferences, focusHeightKm, systemView } from './use-camera-views';
import { demoChargeFromDrag } from './use-hangar';

// These pin the shell's decisions as they were before the split into hooks.

const C = 299792.458;
const flight = (flightDays: number, flybys: number[] = [], samples: unknown[] = []) =>
  ({
    shot: { launchEt: 1000 },
    analysis: {
      endEt: 1000 + flightDays * DAY,
      flightDays,
      flybys: flybys.map((t) => ({ body: 'mars', t })),
    },
    result: { samples },
  }) as unknown as ShotResponse;
const prefs = (value: Partial<Preferences> = {}): Preferences => ({
  ...freshPreferences(),
  ...value,
});

describe('Escape', () => {
  const none = {
    dragging: false,
    pending: false,
    inspecting: false,
    focused: false,
    selected: false,
    home: false,
  };
  it('undoes the innermost thing first', () => {
    const all = { ...none, dragging: true, inspecting: true, focused: true, selected: true };
    expect(escapeAction(all)).toBe('cancel');
    expect(escapeAction({ ...all, dragging: false, pending: true })).toBe('cancel');
    expect(escapeAction({ ...all, dragging: false })).toBe('hangar');
    expect(escapeAction({ ...none, focused: true, selected: true })).toBe('focus');
    expect(escapeAction({ ...none, selected: true })).toBe('selection');
    expect(escapeAction(none)).toBe('menu');
  });
  it('does nothing on the menu unless something is still open', () => {
    expect(escapeAction({ ...none, home: true })).toBe(null);
    expect(escapeAction({ ...none, home: true, pending: true })).toBe('cancel');
    expect(escapeAction({ ...none, home: true, selected: true })).toBe('selection');
  });
});

describe('autosave guard', () => {
  it('keys the owner by pilot and revision', () => {
    expect(ownerOf({ pilot: { id: 'pilot-1' }, revision: 3 } as never)).toBe('pilot-1:3');
  });
  it('rejects a hydrating session and the render where the pilot changed', () => {
    expect(shouldAutosave(false, 'pilot-1:0', 'pilot-1:0')).toBe(true);
    expect(shouldAutosave(true, 'pilot-1:0', 'pilot-1:0')).toBe(false);
    expect(shouldAutosave(false, 'pilot-1:0', 'pilot-2:1')).toBe(false);
  });
});

describe('playback', () => {
  it('plays a flight at its default rate in 4 to 9 seconds', () => {
    for (const days of [50, 300, 1000, 1300, 2000]) {
      const f = flight(days),
        k = Math.max(4, Math.min(9, 2.5 + days / 200));
      expect(defaultRate(f)).toBe((days * DAY) / k);
    }
  });
  it('advances at the default rate and slows to 0.28 within four days of a flyby', () => {
    const f = flight(300, [1000 + 100 * DAY]),
      rate = defaultRate(f);
    expect(advanceEt(f, prefs(), 1000, 0.5)).toBe(1000 + 0.5 * rate);
    const near = 1000 + 97 * DAY;
    expect(advanceEt(f, prefs(), near, 0.5)).toBe(near + 0.5 * rate * 0.28);
  });
  it('keeps a chosen rate steady near a flyby and clamps to the end', () => {
    const f = flight(300, [1000 + 100 * DAY]),
      near = 1000 + 99 * DAY;
    expect(advanceEt(f, prefs({ rate: 3600 }), near, 2)).toBe(near + 7200);
    expect(advanceEt(f, prefs({ rate: 1e9 }), near, 1)).toBe(f.analysis.endEt);
  });
  it('runs Light-time at real time, or by path length at a multiple of c', () => {
    const light = { scientific: true, units: { simple: 'light', science: 'light' } } as const;
    expect(advanceEt(flight(300), prefs({ ...light, lightRate: 0 }), 5000, 2)).toBe(5002);
    // A path flown at the speed of light: 5c of path length per second is 5 s of ET.
    const straight = flight(
      1000 / DAY,
      [],
      [
        { t: 1000, r: [0, 0, 0], v: [C, 0, 0] },
        { t: 2000, r: [1000 * C, 0, 0], v: [C, 0, 0] },
      ],
    );
    expect(advanceEt(straight, prefs({ ...light, lightRate: 5 }), 1100, 2)).toBeCloseTo(1110, 6);
  });
});

describe('camera views', () => {
  it('frames a focus at six radii and its moons at ninety', () => {
    expect(focusHeightKm('earth')).toBe(BODIES.earth.radiusKm * 6);
    expect(focusHeightKm('saturn', true)).toBe(BODIES.saturn.radiusKm * 90);
  });
  it('starts a camera mode from the frame on screen', () => {
    const frame = { heightKm: 1e6, centre: [3, 4] as [number, number] };
    const follow = cameraPreferences('follow', frame);
    expect(follow).toEqual({ camera: 'follow', heightKm: 650000, pan: [3, 4], orbit: [0, 0] });
    expect(follow.pan).not.toBe(frame.centre);
    expect(cameraPreferences('follow', { ...frame, heightKm: 1e5 }).heightKm).toBe(2e5);
    expect(cameraPreferences('system', frame).heightKm).toBe(1e6);
  });
  it('resets to a fresh system view and returns to a saved camera', () => {
    const a = systemView(),
      b = systemView();
    expect(a).toEqual({ camera: 'system', orbit: [0, 0] });
    expect(a.orbit).not.toBe(b.orbit);
    const saved = prefs({ camera: 'free', heightKm: 7e7, pan: [1, 2], orbit: [0.5, -0.5] });
    expect(cameraOf(saved)).toEqual({
      camera: 'free',
      heightKm: 7e7,
      pan: [1, 2],
      orbit: [0.5, -0.5],
    });
  });
});

describe('hangar demo ring', () => {
  it('charges by dragging left, a quarter of the screen height for a full charge', () => {
    expect(demoChargeFromDrag({ x: 500, charge: 0 }, 400, 800)).toBe(0.5);
    expect(demoChargeFromDrag({ x: 500, charge: 0.5 }, 700, 800)).toBe(0);
    expect(demoChargeFromDrag({ x: 500, charge: 0.9 }, 300, 800)).toBe(1);
    expect(demoChargeFromDrag({ x: 500, charge: 0 }, 465, 100)).toBe(0.5);
  });
});

describe('shell records', () => {
  it('summarises a response for the preview and launch parity check', () => {
    expect(summaryOf(null)).toBe(null);
    const res = {
      shot: { launchEt: 1 },
      analysis: { hit: true, endEt: 2, closestKm: 3, flybys: [{ body: 'jupiter', t: 4 }] },
    } as unknown as ShotResponse;
    expect(summaryOf(res)).toBe('{"launchEt":1}|true|2|3|jupiter@4');
  });
  it('declares the three packaged Plex weights', () => {
    const css = fontFaceCss('https://example.test/observatory/');
    expect(css.match(/@font-face/g)).toHaveLength(3);
    expect(css).toContain(
      "src:url('https://example.test/observatory/ibm-plex-mono-500.woff2') format('woff2')",
    );
    expect(css).toContain('font-weight:700;font-display:swap');
  });
});
