import { expect, it } from 'vitest';
import { copySession, freshProfiles, loadProfiles, parseProfiles, profileName, validSession, writeProfiles } from './profiles';
import { freshCloudDemo, parseCloudDemo, pilotDraft, sampleSave, syncDemo } from './cloud-demo';
import { EntryPresentation } from './presentation';
import { shotReducer, type ShotState } from '../lunar/shot-state';
import { requestFor, simulateLunar } from '../lunar/flight';
import { LunarModel, LAUNCH_ET } from '../lunar/model';
import rail from '../../public/lunar/moon-rail.json';

it('validates canonical saves and rejects nonfinite, unsupported or coerced preferences', () => {
  const save = sampleSave(); expect(validSession(save)).toBe(true);
  for (const changed of [{ ...save, dv: 4 }, { ...save, et: Infinity }, { ...save, level: 'mars' },
    { ...save, preferences: { ...save.preferences, unitPreferences: { simple: ['light'], science: 'metric' } } },
    { ...save, pan: [0, NaN] }, { ...save, cameraLock: { heightKm: 0, centre: [0, 0] } }]) expect(validSession(changed)).toBe(false);
  const data = freshProfiles(); data.profiles[0]!.session = save;
  expect(parseProfiles(JSON.stringify(data))?.profiles[0]?.session).toEqual(save);
  expect(parseProfiles(JSON.stringify({ ...data, version: 2 }))).toBeNull();
  expect(parseProfiles(JSON.stringify({ ...data, active: 'missing' }))).toBeNull();
  expect(parseProfiles(JSON.stringify({ ...data, profiles: [...data.profiles, ...data.profiles] }))).toBeNull();
});

it('keeps storage failure playable and profile copies independent', () => {
  expect(loadProfiles({ getItem() { throw new Error('blocked'); } }).data).toEqual(freshProfiles());
  expect(writeProfiles(freshProfiles(), { setItem() { throw new Error('full'); } })).toBe(false);
  expect(loadProfiles({ getItem() { return '{broken'; } }).notice).toMatch(/could not be read/);
  const a = sampleSave(), b = copySession(a); b.pan[0] = 25; b.preferences.unitPreferences.simple = 'imperial';
  expect(a.pan[0]).toBe(0); expect(a.preferences.unitPreferences.simple).toBe('light');
  expect(profileName('  Nova\u0000\n  ')).toBe('Nova');
});

it('restores only a current computed request and keeps older profile replies out', () => {
  const request = requestFor(3.24, 0), model = new LunarModel(rail), flight = simulateLunar(model, request);
  const state: ShotState = { id: 10, request, preview: flight, launch: null, phase: 'aim', pendingRelease: false, error: null };
  const switched = shotReducer(state, { type: 'restart', request: requestFor(0, 0) });
  expect(switched.id).toBe(11); expect(switched.preview).toBeNull();
  expect(shotReducer(switched, { type: 'ready', id: 10, flight })).toBe(switched);
  expect(shotReducer(switched, { type: 'hydrate-flight', id: 10, result: false })).toBe(switched);
  const restored = shotReducer(state, { type: 'hydrate-flight', id: 10, result: false });
  expect(restored.launch).toBe(flight); expect(restored.preview).toBe(flight); expect(restored.phase).toBe('flight');
});

it('holds an offline draft across signout and reload without replacing the remote flight', () => {
  const initial = freshCloudDemo(); initial.provider = 'google'; initial.selected = 'selene'; initial.baseRevision = 1; initial.online = false;
  const local = sampleSave(); local.phase = 'aim'; local.et = LAUNCH_ET; local.angle = 12;
  const queued = syncDemo(initial, local);
  expect(queued.pilots[0]!.save.angle).toBe(0); expect(queued.drafts.selene!.save.angle).toBe(12);
  const signedOut = { ...queued, provider: null, selected: null, status: 'signed-out', queued: null };
  const reloaded = parseCloudDemo(JSON.stringify(signedOut))!;
  expect(reloaded.drafts.selene!.save.angle).toBe(12);
  const synced = syncDemo({ ...reloaded, provider: 'email', selected: 'selene', baseRevision: 1, online: true }, reloaded.drafts.selene!.save);
  expect(synced.status).toBe('saved'); expect(synced.pilots[0]!.save.angle).toBe(12); expect(synced.drafts.selene).toBeUndefined();
});

it('requires a save-version choice when another device changes the remote revision', () => {
  const state = freshCloudDemo(); state.provider = 'google'; state.selected = 'selene'; state.baseRevision = 1; state.pilots[0]!.revision = 2;
  const local = sampleSave(); local.angle = -7;
  const conflict = syncDemo(state, local);
  expect(conflict.status).toBe('conflict'); expect(conflict.pilots[0]!.save.angle).toBe(0); expect(conflict.queued!.angle).toBe(-7);
  const chosen = syncDemo({ ...conflict, baseRevision: 2 }, conflict.queued!);
  expect(chosen.status).toBe('saved'); expect(chosen.pilots[0]!.save.angle).toBe(-7); expect(chosen.pilots[0]!.revision).toBe(3);
});

it('does not treat inherited object names as saved cloud drafts', () => {
  for (const id of ['constructor', 'toString']) {
    const state = freshCloudDemo(); state.pilots[0]!.id = id;
    const parsed = parseCloudDemo(JSON.stringify(state))!;
    expect(pilotDraft(parsed, id)).toBeUndefined();
    parsed.provider = 'google'; parsed.selected = id; parsed.online = false;
    const queued = syncDemo(parsed, sampleSave());
    expect(pilotDraft(queued, id)?.save).toEqual(sampleSave());
  }
});

it('cuts reduced-motion entry directly and reverses an in-progress camera handoff continuously', () => {
  const entry = new EntryPresentation(); entry.setHome(false, 0, false);
  expect(entry.sample(550)).toBeCloseTo(.5); const before = entry.amount;
  entry.setHome(true, 550, false); expect(entry.sample(550)).toBe(before); expect(entry.sample(1200)).toBe(1);
  entry.setHome(false, 1300, true); expect(entry.sample(1300)).toBe(0);
});
