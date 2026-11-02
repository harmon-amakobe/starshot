import { describe, expect, it } from 'vitest';
import { BODIES } from '@starshot/ephemeris';
import { deltaVFromLeo } from '@starshot/physics';
import { CAMPAIGN, sandboxLevel, SANDBOX_TARGETS } from '../levels';
import { shotKey } from '../sim/preview';
import { isLunar } from '../sim/flight-request';
import { freshSession, validSession, copySession } from './session';
import { parsePilots } from './profiles';
import { pullIntent, ReleaseOwner } from './release';
import { aimFromPull, chargeFromPull, depthRange, finalRequest, matchesRestore } from './contracts';
import { makeFrame } from './frame';
import { replayClock, stepRate } from './playback';
import type { SceneState } from './scene-types';

describe('campaign release and restore boundaries', () => {
  it('defaults old saves to planning and persists either mode without accepting an unknown mode', () => {
    const session = freshSession(); expect(session.preferences.releaseMode).toBe('plan');
    const old = JSON.parse(JSON.stringify(session)); delete old.preferences.releaseMode;
    expect(validSession(old)).toBe(true); expect(copySession(old).preferences.releaseMode).toBe('plan');
    session.preferences.releaseMode = 'hail-mary'; expect(copySession(session).preferences.releaseMode).toBe('hail-mary');
    old.preferences.releaseMode = 'surprise'; expect(validSession(old)).toBe(false);
  });
  it('uses captured release intent only for the same pilot, mode and aiming phase', () => {
    expect(pullIntent('plan', 'pilot-a', 'plan', 'pilot-a', 'aim')).toBe('plan');
    expect(pullIntent('hail-mary', 'pilot-a', 'hail-mary', 'pilot-a', 'aim')).toBe('hail-mary');
    expect(pullIntent('plan', 'pilot-a', 'hail-mary', 'pilot-a', 'aim')).toBeNull();
    expect(pullIntent('hail-mary', 'pilot-a', 'plan', 'pilot-a', 'aim')).toBeNull();
    expect(pullIntent('hail-mary', 'pilot-a', 'hail-mary', 'pilot-b', 'aim')).toBeNull();
    expect(pullIntent('hail-mary', 'pilot-a', 'hail-mary', 'pilot-a', 'flight')).toBeNull();
  });
  it('captures the final pointer request rather than an older rendered aim', () => {
    for (const level of [...CAMPAIGN, ...SANDBOX_TARGETS.map(id => sandboxLevel(id, new Date('2026-11-02T00:00:00Z')))]) {
      const save = freshSession(level), old = finalRequest(save), released = finalRequest(save, { angleDeg: 359.75, speedKmS: level.vInfMaxKmS });
      const owner = new ReleaseOwner(), task = owner.request(released.shot);
      expect(owner.accepts(task.generation, old.shot)).toBe(false);
      expect(owner.accepts(task.generation, released.shot)).toBe(true);
      if (isLunar(released.shot)) throw new Error('Planetary request changed kind');
      expect(released.shot.sim).toBe(level.sim); expect(Math.hypot(...released.shot.vInf)).toBeCloseTo(level.vInfMaxKmS, 12);
      expect(deltaVFromLeo(0)).toBeGreaterThan(0);
    }
  });
  it('rejects old success and failure ownership after cancellation, including identical-shot profile switches', async () => {
    const owner = new ReleaseOwner(), shot = finalRequest(freshSession()).shot, a = owner.request(shot);
    let rejectA!: () => void; const promise = new Promise<void>((_, reject) => { rejectA = () => reject(Error('old failure')); });
    const caught = promise.catch(() => { if (owner.accepts(a.generation, a.shot)) owner.cancel(); });
    owner.cancel(); const b = owner.request(shot); rejectA(); await caught;
    expect(owner.accepts(a.generation, shot)).toBe(false); expect(owner.accepts(b.generation, shot)).toBe(true);
  });
  it('can hydrate another pilot with an identical cached shot, but cannot hydrate a different day or aim', () => {
    const first = freshSession(CAMPAIGN[0]!), same = copySession(first), cached = finalRequest(first).shot;
    expect(matchesRestore(cached, same)).toBe(true);
    same.day++; expect(matchesRestore(cached, same)).toBe(false);
    same.day--; same.aim = { ...same.aim, angleDeg: same.aim.angleDeg + 1 }; expect(matchesRestore(cached, same)).toBe(false);
  });
  it('restores a sandbox window and hinted flight without accepting serialized simulation settings', () => {
    const session = freshSession(sandboxLevel('neptune', new Date('2026-10-01T00:00:00Z'))); session.day = 400; session.et = finalRequest(session).shot.launchEt + 1000; session.phase = 'flight'; session.hintUsed = true;
    const before = finalRequest(session).shot;
    const wire = { version: 1, playtest: true, selected: 'pilot-1', profiles: [{ id: 'pilot-1', name: 'Pilot', progress: { version: 1, levels: {} }, session: { ...session, sim: { maxStep: 1 }, trajectory: [1, 2], preferences: { ...session.preferences, arbitrary: true } } }] };
    const parsed = parsePilots(JSON.stringify(wire))!, save = parsed.profiles[0]!.session;
    expect(save.windowStart).toBe('2026-10-01'); expect(save.hintUsed).toBe(true); expect(save.phase).toBe('flight'); expect(save.et).toBe(session.et);
    expect(shotKey(finalRequest(save).shot)).toBe(shotKey(before)); expect('sim' in save).toBe(false); expect('trajectory' in save).toBe(false); expect('arbitrary' in save.preferences).toBe(false);
    expect(validSession({ ...save, day: 731 })).toBe(false); expect(validSession({ ...save, target: 'earth' })).toBe(false); expect(validSession({ ...save, et: NaN })).toBe(false);
  });
});
function state(level = CAMPAIGN[0]!): SceneState {
  const s = freshSession(level); return { level, launchEt: s.et, et: s.et, response: null, aim: s.aim, aiming: true, charge: .5, firing: false, snap: 0, home: 0, map: false, focus: null, inspection: null, demoCharge: 0, showMoons: false, reduced: true, visualTime: 0, preferences: s.preferences, deckHeight: 240, lock: null };
}
describe('camera and controls use the same projected frame', () => {
  it('inverts the free camera projection for all directions without changing the held aim', () => {
    const s = state(); s.preferences.camera = 'free'; s.preferences.orbit = [1.2, 1.2];
    for (let angle = 0; angle < 360; angle += 5) { s.aim = { ...s.aim, angleDeg: angle }; const f = makeFrame(s, 390, 664, null, 1, 'test').frame;
      const restored = aimFromPull(f.grip[0] - f.craft[0], f.grip[1] - f.craft[1], f.rotation, s.preferences.orbit);
      expect(Math.min(Math.abs(restored - angle), 360 - Math.abs(restored - angle))).toBeLessThan(1e-8);
    }
  });
  it('keeps all 56 pixels of the ring target clear at rest, half and full extension', () => {
    for (const level of CAMPAIGN) for (const [w, h, deck] of [[1440, 900, 280], [390, 664, 240], [844, 390, 166]]) for (const charge of [0, .5, 1]) for (let angle = 0; angle < 360; angle += 15) {
      const s = state(level); s.deckHeight = deck!; s.charge = charge; s.aim = { ...s.aim, angleDeg: angle };
      const f = makeFrame(s, w!, h!, null, 1, 'test').frame;
      const landscape = h! < 500;
      // The short landscape deck is beside the world, not below it.
      expect(f.grip[0] - 28).toBeGreaterThanOrEqual(8 - 1e-7);
      expect(f.grip[0] + 28).toBeLessThanOrEqual((landscape ? w! - Math.min(390, w! * .46) - 4 : w! - 8) + 1e-7);
      expect(f.grip[1] - 28).toBeGreaterThanOrEqual((landscape ? 112 : 104) - 1e-7);
      expect(f.grip[1] + 28).toBeLessThanOrEqual((landscape ? h! - 48 : h! - deck! - 20) + 1e-7);
    }
  });
  it('keeps a precise input range even when the drawn sleeve has little clearance', () => {
    for (const travel of [1, 23, 115]) {
      expect(chargeFromPull(.4, 40, 40, travel)).toBe(.4);
      expect(chargeFromPull(.4, 40, 41, travel) - .4).toBeCloseTo(1 / 160, 12);
      expect(chargeFromPull(.4, 40, 136, travel)).toBe(1);
    }
  });
  it('has a continuous first step from a saved tilted free view to the live menu', () => {
    const s = state(); s.preferences.camera = 'free'; s.preferences.orbit = [1.2, 1.2];
    const a = makeFrame(s, 390, 664, null, 1, 'test').frame; s.home = 1e-9; const b = makeFrame(s, 390, 664, null, 1, 'test').frame;
    for (let i = 0; i < a.bodies.length; i++) expect(Math.hypot(a.bodies[i]!.point[0] - b.bodies[i]!.point[0], a.bodies[i]!.point[1] - b.bodies[i]!.point[1])).toBeLessThan(.01);
    expect(Math.hypot(a.craft[0] - b.craft[0], a.craft[1] - b.craft[1])).toBeLessThan(.01);
  });
  it('includes front and back surfaces of Sol and giant planets at 1000 km zoom', () => {
    for (const id of ['sun', 'jupiter', 'saturn', 'neptune'] as const) { const radius = BODIES[id].radiusKm * 4, d = depthRange([{ centre: 0, radius }]); expect(d.distance - radius).toBeGreaterThan(d.near); expect(d.distance + radius).toBeLessThan(d.far); }
  });
  it('advances c pacing by Hermite arc length even across a rapid turn', () => {
    const samples = [{ t: 0, r: [0, 0, 0], v: [0, 8, 0] }, { t: 1000, r: [1000, 1000, 0], v: [8, 0, 0] }, { t: 2000, r: [12000, 1000, 0], v: [12, 0, 0] }] as const;
    const clock = replayClock({ samples } as never, 0, 2000), start = 700, distance = 3500;
    const next = clock.etAtDistance(clock.distanceAt(start) + distance); expect(clock.distanceAt(next) - clock.distanceAt(start)).toBeCloseTo(distance, 5);
  });
  it('steps monotonically from a default or custom rate between preset stops', () => {
    const steps = [1, 60, 3600, 86400, 864000, 8640000, 86400000];
    expect(stepRate(7680000, steps, 1)).toBe(8640000); expect(stepRate(7680000, steps, -1)).toBe(864000);
    expect(stepRate(60, [1, 7680000, 15360000], 1)).toBe(7680000);
  });
});
