import { describe, expect, it } from 'vitest';
import { norm, sub } from '@starshot/ephemeris';
import { parkingState, LAUNCH_ET, MOON_SOI_KM } from '@starshot/physics/lunar';
import { CAMPAIGN } from '../levels';
import { MOONSHOT, MISSIONS, nextMission } from '../missions';
import { scoreShot } from '../scoring';
import { lunarHint, lunarModel, runLunar } from '../sim/lunar';
import { isLunar, type LunarShotRequest } from '../sim/flight-request';
import { shotKey, launchGate } from '../sim/preview';
import type { FlightResponse, ShotResponse } from '../sim/protocol';
import { freshSession, copySession, validSession, togglePauseAt } from './session';
import { finalRequest, matchesRestore } from './contracts';
import { parsePilots, earnedFor, recordResult, type Pilot } from './profiles';
import { geometry } from './scene-geometry';
import { makeFrame } from './frame';
import { zoomAt } from './zoom';
import type { SceneState } from './scene-types';
import { impactBody, completionNotice } from './outcome';
import { ReleaseOwner } from './release';
import { summaryOf } from './use-release';

const launch = (speed = 3.24, angle = 0): ShotResponse<LunarShotRequest> => {
  const save = freshSession(); save.aim = { angleDeg: angle, speedKmS: speed };
  const shot = finalRequest(save).shot;
  if (!isLunar(shot)) throw Error('Expected Moonshot');
  return { kind: 'shot', id: 1, purpose: 'preview', shot, ...runLunar(shot), ms: 0 };
};
const frameState = (response: FlightResponse | null = null): SceneState => {
  const s = freshSession(); return { level: MOONSHOT, parking: s.parking, launchEt: s.et, et: s.et,
    response, aim: s.aim, aiming: true, charge: 0, firing: false, snap: 0, home: 0, map: false,
    focus: null, inspection: null, demoCharge: 0, showMoons: false, reduced: true, visualTime: 0,
    preferences: s.preferences, deckHeight: 220, lock: null };
};
describe('Moonshot uses one canonical request', () => {
  it('starts new pilots at Moonshot and keeps stable planetary identities and order', () => {
    expect(freshSession().levelId).toBe('moonshot');
    expect(MISSIONS.map(l => l.id)).toEqual(['moonshot', ...CAMPAIGN.map(l => l.id)]);
    expect(nextMission('moonshot')?.id).toBe('first-light'); expect(nextMission('grand-tour')).toBeUndefined();
  });
  it('measures a hit, miss and Earth impact with the actual game request builder', () => {
    const hit = launch(), miss = launch(3.24, 20), impact = launch(3.24, -20);
    expect(hit.analysis.hit).toBe(true); expect(hit.analysis.deltaVKmS).toBe(3.24);
    expect(hit.analysis.bullseye).toBe(true); expect(hit.result.endTime).toBe(hit.analysis.endEt);
    expect(miss.analysis.hit).toBe(false); expect(miss.analysis.closestKm).toBeGreaterThan(100000);
    expect(impact.analysis.terminatedBy).toBe('earth'); expect(impact.analysis.hit).toBe(false);
    expect(impactBody(impact)).toBe('Earth'); expect(completionNotice(impact, 0)).toBe('Impact with Earth. 0 stars.');
    expect(impactBody(hit)).toBeNull(); expect(impactBody(miss)).toBeNull();
    const moonImpact: FlightResponse = { ...impact, result: { ...impact.result, terminatedBy: 'moon' } };
    expect(impactBody(moonImpact)).toBe('Moon'); expect(completionNotice(moonImpact, 0)).toBe('Impact with Moon. 0 stars.');
  });
  it('applies exact guide time, phase and rounded burn, then refuses a stale phase or time', () => {
    const hint = lunarHint(), save = freshSession();
    save.et = hint.launchEt; save.parking = hint.parking; save.aim = hint.aim; save.paused = true;
    const shot = finalRequest(save).shot, response = launch();
    expect(hint.hits).toBe(true); expect(hint.simulations).toBeLessThanOrEqual(240);
    expect(shotKey(shot)).toBe(shotKey(response.shot));
    expect(launchGate(true, response, shot).ready).toBe(true);
    save.et += 1; expect(launchGate(true, response, finalRequest(save).shot).ready).toBe(false);
    save.et -= 1; save.parking = { ...save.parking!, phaseDeg: 226 };
    expect(launchGate(true, response, finalRequest(save).shot).ready).toBe(false);
  });
  it('flies the real-SOI grazing burn through the canonical game builder', () => {
    const response = launch(3.24, 17.33167459468716);
    const last = response.result.samples.at(-1)!;
    expect(response.shot.launchEt).toBe(LAUNCH_ET);
    expect(response.shot.parking).toEqual({ frameEt: LAUNCH_ET, epochEt: LAUNCH_ET, phaseDeg: 225, radiusKm: 6571 });
    expect(response.shot.approachRadiusKm).toBe(MOON_SOI_KM);
    expect(response.analysis.hit).toBe(true);
    expect(response.result.termination).toBe('soi-reached');
    expect(last.t).toBe(response.analysis.endEt);
    expect(Math.abs(norm(sub(last.r, lunarModel.bodies(last.t).moon.r)) - MOON_SOI_KM)).toBeLessThan(.01);
  });
  it('pauses at the exact render clock between UI updates and resumes without moving the departure', () => {
    const previous = freshSession(), renderEt = previous.et + 8.004;
    const stopped = togglePauseAt(previous, renderEt), shot = finalRequest(stopped).shot;
    expect(stopped.paused).toBe(true); expect(shot.launchEt).toBe(renderEt);
    expect(shotKey(shot)).not.toBe(shotKey(finalRequest(previous).shot));
    const displayed = parkingState(lunarModel, previous.parking!, renderEt);
    expect(parkingState(lunarModel, stopped.parking!, shot.launchEt)).toEqual(displayed);
    const resumed = togglePauseAt(stopped, renderEt);
    expect(resumed.paused).toBe(false); expect(resumed.et).toBe(renderEt);
    expect(shotKey(finalRequest(resumed).shot)).toBe(shotKey(shot));
  });
  it('flies one captured sub-day request identically as its preview and its launch', () => {
    const save = freshSession();
    save.et += 8.004;
    save.paused = true;
    save.aim = { angleDeg: 0, speedKmS: 3.24 };
    const owner = new ReleaseOwner();
    const task = owner.request(finalRequest(save).shot);
    // Each worker post is a structured clone of the one owned request.
    const answer = (purpose: 'preview' | 'launch') => {
      const shot = structuredClone(task.shot);
      if (!isLunar(shot)) throw Error('Expected Moonshot');
      return { kind: 'shot' as const, id: 1, purpose, shot, ...runLunar(shot), ms: 0 };
    };
    const preview = answer('preview');
    const launched = answer('launch');
    const gate = launchGate(true, preview, task.shot);
    expect(preview.shot.launchEt).toBe(LAUNCH_ET + 8.004);
    expect(gate.ready).toBe(true);
    expect(gate.shot).toBe(preview.shot);
    expect(owner.accepts(task.generation, launched.shot)).toBe(true);
    expect(launched.result).toEqual(preview.result);
    expect(launched.analysis).toEqual(preview.analysis);
    expect(summaryOf(launched)).toBe(summaryOf(preview));
  });
  it('preserves sub-day time, orbit and departure ET through aiming and flight saves', () => {
    const save = freshSession(); save.et += 321; save.paused = true;
    const shot = finalRequest(save).shot, copied = copySession(save);
    expect(validSession(copied)).toBe(true); expect(matchesRestore(shot, copied)).toBe(true);
    copied.launchEt = copied.et; copied.phase = 'flight'; copied.et += 1000;
    expect(validSession(copied)).toBe(true); expect(matchesRestore(shot, copySession(copied))).toBe(true);
    expect(validSession({ ...copied, launchEt: NaN })).toBe(false);
    expect(validSession({ ...copied, parking: { ...copied.parking!, frameEt: LAUNCH_ET + 1 } })).toBe(false);
    const miss = launch(3.24, 20);
    copied.et = miss.analysis.endEt; copied.launchEt = miss.shot.launchEt;
    expect(validSession(copied)).toBe(true);
    copied.phase = 'aim'; copied.et = LAUNCH_ET + 8 * 86400;
    expect(validSession(copied)).toBe(true);
  });
});
describe('pilot migration preserves access without recording playtest achievements', () => {
  const pilot: Pilot = { id: 'old', name: 'Old pilot', session: freshSession(CAMPAIGN[0]!), progress: { version: 1, levels: { 'first-light': { stars: 3 } } } };
  it('imports v1 stars and session and grants every previously unlocked mission', () => {
    const parsed = parsePilots(JSON.stringify({ version: 1, selected: 'old', playtest: true, profiles: [pilot] }))!;
    expect(parsed.version).toBe(2); expect(parsed.profiles[0]!.progress).toEqual(pilot.progress);
    expect(parsed.profiles[0]!.session).toEqual(pilot.session);
    expect(earnedFor(parsed.profiles[0]!)).toEqual(['moonshot', 'first-light', 'morning-star']);
    expect(parsePilots(JSON.stringify(parsed))?.profiles).toEqual(parsed.profiles);
  });
  it('drops one corrupt pilot with a notice count while retaining valid pilots', () => {
    const parsed = parsePilots(JSON.stringify({ version: 1, selected: 'bad', playtest: false, profiles: [{ ...pilot, id: 'bad', session: null }, pilot] }))!;
    expect(parsed.dropped).toBe(1); expect(parsed.selected).toBe('old'); expect(parsed.profiles).toHaveLength(1);
  });
  it('records earned hits and next access, but never stars for an unearned playtest mission', () => {
    const fresh: Pilot = { ...pilot, session: freshSession(), progress: { version: 1, levels: {} }, earned: ['moonshot'] };
    const score = scoreShot({ parDeltaVKmS: 3.24 }, { hit: true, deltaVKmS: 3.24, bullseye: true, requiredFlybyDone: false, hintUsed: false });
    const unearned = recordResult(fresh, freshSession(CAMPAIGN[0]!), score, 3.24);
    expect(unearned.progress).toEqual(fresh.progress); expect(unearned.earned).toEqual(['moonshot']);
    const earned = recordResult(fresh, fresh.session, score, 3.24);
    expect(earned.progress.levels.moonshot?.stars).toBe(3); expect(earned.earned).toEqual(['moonshot', 'first-light']);
  });
});
describe('orbital views retain physical coordinates', () => {
  it('keeps overview symbols small and separated without moving physical body centres', () => {
    for (const lunar of [true, false]) {
      const state = frameState(lunar ? launch() : null);
      if (!lunar) { const s = freshSession(CAMPAIGN[0]!); Object.assign(state, { level: CAMPAIGN[0]!, parking: undefined, launchEt: s.et, et: s.et, aim: s.aim, preferences: s.preferences }); }
      state.preferences.camera = 'system'; state.deckHeight = 455;
      const symbolic = makeFrame(state, 390, 844, null, 1, 'test').frame;
      state.preferences.trueSize = true;
      const physical = makeFrame(state, 390, 844, null, 1, 'test').frame;
      expect(symbolic.bodies.map(b => b.point)).toEqual(physical.bodies.map(b => b.point));
      const bodies = symbolic.bodies.filter(b => ['earth', state.level.target, ...(lunar ? [] : ['sun'])].includes(b.id));
      for (const a of bodies) {
        expect(a.radius).toBeLessThanOrEqual(8);
        for (const b of bodies) if (a !== b) expect(a.radius + b.radius).toBeLessThan(Math.hypot(a.point[0] - b.point[0], a.point[1] - b.point[1]));
      }
    }
  });
  it('fits the complete parking ring and complete computed path on phone, landscape and desktop', () => {
    const weak = launch(.2), hit = launch();
    for (const [w, h, deck] of [[390, 844, 280], [844, 390, 200], [1440, 900, 280]]) {
      for (const response of [null, weak, hit]) {
        const state = frameState(response); state.deckHeight = deck!;
        const g = makeFrame(state, w!, h!, null, 1, 'test');
        for (const p of [...g.g.parking, ...g.g.path]) {
          const point = g.projectPlane(p);
          expect(point[0]).toBeGreaterThanOrEqual(g.g.rect.left - 1e-5);
          expect(point[0]).toBeLessThanOrEqual(g.g.rect.right + 1e-5);
          expect(point[1]).toBeGreaterThanOrEqual(g.g.rect.top - 1e-5);
          expect(point[1]).toBeLessThanOrEqual(g.g.rect.bottom + 1e-5);
        }
      }
    }
  });
  it('uses the same live parking position for the scene and an unburned departure', () => {
    const state = frameState(); state.et += 100;
    const g = geometry(state, 390, 844), world = parkingState(lunarModel, state.parking!, state.et);
    expect(norm(sub(g.current.r, world.r))).toBe(0);
    expect(g.craft[2]).toBeCloseTo(0, 5);
  });
  it('keeps the world point under the pointer during zoom, including a tilted free camera', () => {
    const f = { centre: [1000, 2000] as [number, number], heightKm: 50000, width: 390, height: 844 };
    for (const orbit of [[0, 0], [.7, -.8]] as [number, number][]) {
      const point: [number, number] = [90, 300], zoom = zoomAt(f, .5, point, orbit);
      const before = zoomAt(f, 0, point, orbit);
      const after = zoomAt({ ...f, centre: zoom.pan, heightKm: zoom.heightKm }, 0, point, orbit);
      expect(Math.hypot(before.pan[0] - after.pan[0], before.pan[1] - after.pan[1])).toBeLessThan(1e-8);
    }
  });
});
