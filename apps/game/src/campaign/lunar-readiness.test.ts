import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { LunarModel } from '@starshot/physics/lunar';
import { CAMPAIGN } from '../levels';
import { MISSIONS, MOONSHOT, type Mission } from '../missions';
import { AimHandle } from './AimHandle';
import { finalRequest } from './contracts';
import { DeckPages } from './DeckPages';
import { FlightDeck, MoonLoadPanel } from './FlightDeck';
import { useGestures } from './gestures';
import { lunarLoadRun, lunarReadiness, ownedCallback, READY, type Readiness } from './lunar-readiness';
import { MissionDeck } from './MissionDeck';
import { fly, harness, REFERENCE } from './owner-harness.test-support';
import { EMPTY_FRAME } from './scene-types';
import { copySession, freshSession } from './session';
import { useCameraViews } from './use-camera-views';
import { restoreActions } from './use-restore';

// The rule asks only whether a model is present, so any object stands in for the loaded one.
const model = {} as LunarModel;
const loading = lunarReadiness(MOONSHOT, null, false);

describe('lunar readiness', () => {
  it('readies every planetary level at once, with no Moon model, even after a failed load', () => {
    for (const level of MISSIONS.slice(1)) for (const failed of [false, true])
      expect(lunarReadiness(level, null, failed), level.id).toBe(READY);
  });
  it('holds a Moon level, with a visible reason for loading or failure, until its model is present', () => {
    expect(loading).toEqual({ scene: false, reason: 'Loading the Moon.' });
    expect(lunarReadiness(MOONSHOT, null, true)).toEqual({ scene: false, reason: 'The Moon could not load.' });
    for (const failed of [false, true]) expect(lunarReadiness(MOONSHOT, model, failed)).toBe(READY);
  });
  it('shows the reason over the empty sky, with Retry only after a failure', () => {
    const retry = vi.fn(), panel = (failed: boolean) => renderToStaticMarkup(createElement(MoonLoadPanel,
      { readiness: lunarReadiness(MOONSHOT, null, failed), failed, retry }));
    expect(MoonLoadPanel({ readiness: READY, failed: true, retry })).toBeNull();
    expect(panel(false)).toBe('<section class="c-moon-load" aria-label="Moon data" tabindex="-1"><p>Loading the Moon.</p></section>');
    expect(panel(true)).toContain('<p>The Moon could not load.</p><button class="pill" aria-label="Retry loading the Moon">Retry</button>');
  });
});

describe('the launch guard every launch path goes through', () => {
  it('starts no launch from Launch, Enter or a YOLO release without the Moon model', () => {
    for (const yolo of [false, true]) {
      const h = harness();
      h.session.current.preferences.releaseMode = yolo ? 'hail-mary' : 'plan';
      h.readiness.current = loading;
      if (yolo) h.render().releasePull(REFERENCE, 'hail-mary', 'pilot-a');
      else h.render().launch(REFERENCE);
      expect(h.flags.pending).toBe(false);
      expect(h.releaseOwner.current.pending).toBeNull();
      expect(h.log.previews).toEqual([]);
    }
  });
  it('launches from a coasting orbit, and commits only on the preview of the captured request', () => {
    const h = harness();
    expect(h.session.current.paused).toBe(false);
    h.render().launch(REFERENCE);
    const task = h.releaseOwner.current.pending!;
    const other = finalRequest(h.session.current, { angleDeg: 1, speedKmS: 3.24 }).shot;
    // Not awaited: a commit that launched would wait on the held flight, so the log shows it at once.
    for (const preview of [null, fly(other, 'preview')]) void h.render(preview).commit();
    expect(h.log.launches).toEqual([]);
    void h.render(fly(task.shot, 'preview')).commit();
    expect(h.log.launches).toEqual([task.shot]);
  });
});

describe('the aim handle and the flight deck on a coasting Moon orbit', () => {
  function press(readiness: Readiness) {
    const actions = { aim: vi.fn(), launch: vi.fn() };
    const c = { release: { pending: false, actions }, hydrating: false, store: { session: { aim: REFERENCE } } };
    const props = { c, gestures: { ring: {}, cancel() {} }, frame: { grip: [0, 0], craft: [0, 0] }, readiness };
    // The component uses no hooks, so calling it returns the button it renders.
    const button = AimHandle(props as unknown as Parameters<typeof AimHandle>[0]).props.children[0];
    for (const key of ['ArrowUp', 'Enter']) button.props.onKeyDown({ key, preventDefault() {} });
    return { props: button.props, aims: actions.aim.mock.calls.length, launches: actions.launch.mock.calls.length };
  }
  /** The deck's markup for a fresh Moonshot, whose orbit coasts with the deck collapsed. */
  function deck(readiness: Readiness) {
    const session = freshSession();
    const c = { store: { session, level: MOONSHOT }, view: { active: null, clock: session.et, score: null },
      release: { pending: false, actions: {} }, hints: { hintBusy: false }, hydrating: false, playback: {} };
    const html = renderToStaticMarkup(createElement(FlightDeck, { c, readiness } as unknown as Parameters<typeof FlightDeck>[0]));
    const buttons = [/<button class="primary"[^>]*>/, /<button class="pill" aria-label="Guide"[^>]*>/];
    return { html, buttons: buttons.map((tag) => html.match(tag)?.[0]) };
  }
  it('aims and launches by key with the model, and waits with a description without it', () => {
    expect(press(READY)).toMatchObject({ aims: 1, launches: 1, props: { disabled: false } });
    expect(press(READY).props['aria-describedby']).toBeUndefined();
    const waiting = { aims: 0, launches: 0, props: { disabled: true, 'aria-describedby': 'c-launch-wait' } };
    expect(press(loading)).toMatchObject(waiting);
  });
  it('keeps Launch and Guide usable with the model, and holds them with a visible reason without it', () => {
    expect(freshSession().paused, 'a fresh Moonshot coasts').toBe(false);
    const ready = deck(READY), held = deck(loading);
    expect(ready.buttons).toEqual(['<button class="primary">', '<button class="pill" aria-label="Guide">']);
    expect(ready.html).not.toContain('c-launch-wait');
    const described = 'disabled="" aria-describedby="c-launch-wait">';
    expect(held.buttons).toEqual([`<button class="primary" ${described}`, `<button class="pill" aria-label="Guide" ${described}`]);
    expect(held.html).toContain('<p id="c-launch-wait" class="c-wait">Loading the Moon.</p>');
  });
});

describe('a late callback', () => {
  function scope() {
    const s = { token: { current: 'pilot-a' }, visit: { current: 0 }, level: 'moonshot', disposed: { current: false } };
    return { s, owner: { ...s, mission: () => s.level } };
  }
  type Scope = ReturnType<typeof scope>['s'];
  it('runs only for the pilot, visit and mission it was captured for, before disposal', () => {
    const changes: Record<string, (s: Scope) => void> = {
      none: () => {},
      disposal: (s) => void (s.disposed.current = true),
      owner: (s) => void (s.token.current = 'pilot-b'),
      visit: (s) => void s.visit.current++,
      mission: (s) => void (s.level = 'first-light'),
    };
    for (const [name, change] of Object.entries(changes)) {
      const { s, owner } = scope();
      const run = vi.fn();
      const late = ownedCallback(owner, run);
      change(s);
      expect(late(model), name).toBe(name === 'none');
      expect(run.mock.calls, name).toEqual(name === 'none' ? [[model]] : []);
    }
  });
  it('is rejected after the production pilot switch and mission pick', () => {
    for (const pick of [false, true]) {
      const h = harness();
      const late = ownedCallback({ ...h.hydration, mission: () => h.session.current.levelId, disposed: { current: false } }, () => {});
      const r = h.render();
      const hydration = { ...r.input.hydration, setHydrating() {}, setRestoreRevision() {} };
      const initial = copySession(h.session.current);
      const actions = restoreActions({ ...r.input, hydration, initial, owner: 'pilot-b', cancel: r.cancel, resetHint() {} });
      if (pick) actions.restore(freshSession(CAMPAIGN[0]!));
      else actions.select();
      expect(late()).toBe(false);
    }
  });
});

describe('a pull on the Moon', () => {
  // Starts a pull through the real gesture hook and counts the parking freezes it makes.
  function pullWith(readiness: Readiness) {
    const freezeParking = vi.fn();
    const c = { release: { pending: false, readiness: { current: readiness }, actions: { freezeParking } },
      hydrating: false, store: { session: { phase: 'aim', aim: { angleDeg: 0, speedKmS: 0 }, paused: false,
        preferences: { camera: 'system', orbit: [0, 0], releaseMode: 'plan' } }, level: MOONSHOT } };
    const frame = { current: { height: 800, width: 400, craft: [0, 0], grip: [0, 0], travel: 1, rotation: 0,
      orbit: [0, 0], centre: [0, 0], heightKm: 1, prograde: 0 } };
    let ring: ReturnType<typeof useGestures>['ring'] | undefined;
    function Probe() {
      ring = useGestures(c as unknown as Parameters<typeof useGestures>[0],
        frame as unknown as Parameters<typeof useGestures>[1], false, () => {}, () => {}).ring;
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    const event = { button: 0, pointerId: 1, clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {},
      currentTarget: { setPointerCapture() {} } };
    ring!.onPointerDown(event as unknown as Parameters<ReturnType<typeof useGestures>['ring']['onPointerDown']>[0]);
    return freezeParking.mock.calls.length;
  }
  it('starts only once the Moon model is present', () => {
    expect(pullWith(READY)).toBe(1);
    expect(pullWith(loading)).toBe(0);
  });
});

describe('a Moon focus and the guide controls without the model', () => {
  function camera(level: Mission, frame = EMPTY_FRAME) {
    const preferences = vi.fn(), session = { preferences: { camera: 'system', orbit: [0, 0] } };
    const c = { store: { level, session }, playback: { preferences }, release: { pending: false } };
    let views: ReturnType<typeof useCameraViews> | undefined, gestures: ReturnType<typeof useGestures> | undefined;
    function Probe() {
      views = useCameraViews(c as unknown as Parameters<typeof useCameraViews>[0], () => frame, () => {});
      gestures = useGestures(c as unknown as Parameters<typeof useGestures>[0],
        { current: frame } as unknown as Parameters<typeof useGestures>[1], false, () => {}, () => {});
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    return { actions: views!.actions, gestures: gestures!, preferences };
  }
  it('moves no camera, zoom or pan from a frame that was never drawn', () => {
    for (const ready of [false, true]) {
      const view = camera(MOONSHOT, { ...EMPTY_FRAME, ready });
      const point = { button: 0, pointerId: 1, clientX: 0, clientY: 0, currentTarget: { setPointerCapture() {} } };
      view.actions.camera('orbit');
      view.gestures.zoom(0.65);
      view.gestures.world.onPointerDown(point as unknown as Parameters<typeof view.gestures.world.onPointerDown>[0]);
      view.gestures.world.onPointerMove({ ...point, clientX: 30 } as unknown as Parameters<typeof view.gestures.world.onPointerMove>[0]);
      expect(view.preferences, String(ready)).toHaveBeenCalledTimes(ready ? 3 : 0);
    }
  });
  it('refuses a Moon focus on a planetary level before any focus state is written', () => {
    const planet = camera(MISSIONS[1]!);
    planet.actions.inspectBody('moon');
    // A focus return written before the refusal would make closing the focus restore the camera.
    planet.actions.closeFocus();
    expect(planet.preferences).not.toHaveBeenCalled();
    for (const [level, body] of [[MISSIONS[1]!, 'earth'], [MOONSHOT, 'moon']] as const) {
      const view = camera(level);
      view.actions.inspectBody(body);
      expect(view.preferences, body).toHaveBeenCalledTimes(1);
    }
  });
  it('holds Apply guide and both fine-aim inputs until the Moon model is present', () => {
    const session = freshSession();
    const c = { store: { session, level: MOONSHOT }, hints: { hint: { hits: true, aim: REFERENCE } },
      release: { pending: false, actions: {} }, view: { active: null } };
    const tags = (readiness: Readiness) => [
      renderToStaticMarkup(createElement(MissionDeck, { c, open: true, toggle() {}, readiness } as unknown as Parameters<typeof MissionDeck>[0])),
      renderToStaticMarkup(createElement(DeckPages, { c, frame: EMPTY_FRAME, page: 1, metrics: {}, readiness } as unknown as Parameters<typeof DeckPages>[0])),
    ].join('').match(/<button class="primary"[^>]*>Apply guide|<input aria-label="(?:Aim angle|Departure speed)[^>]*>/g)!;
    expect(tags(READY).map((tag) => tag.includes('disabled'))).toEqual([false, false, false]);
    expect(tags(loading).map((tag) => tag.includes('disabled'))).toEqual([true, true, true]);
  });
});

describe('a view load run', () => {
  /** One run on a loader whose single pending load the test settles, as the memo shares it. */
  function start(loader = deferredLoader(), level: Mission = MOONSHOT) {
    const s = { token: { current: 'pilot-a' }, visit: { current: 0 }, level: 'moonshot' as string };
    const log: unknown[] = [];
    const run = lunarLoadRun(level, { token: s.token, visit: s.visit, mission: () => s.level },
      { model: (next) => log.push(next), status: (status) => log.push(status) }, loader);
    return { s, log, run, loader };
  }
  function deferredLoader() {
    let settle = { resolve(_: LunarModel) {}, reject(_: Error) {} };
    const pending = () => new Promise<LunarModel>((resolve, reject) => { settle = { resolve, reject }; });
    let current = pending();
    const load = vi.fn(() => current);
    return { model: null, load, settle: () => settle, again: () => void (current = pending()) };
  }
  const flush = () => new Promise((done) => setTimeout(done));
  it('starts no load on a planetary level', () => {
    for (const level of MISSIONS.slice(1)) {
      const r = start(deferredLoader(), level);
      expect(r.run, level.id).toBeNull();
      expect(r.loader.load).not.toHaveBeenCalled();
    }
  });
  it('drops a late success or failure after disposal, or a change of pilot, visit or mission', async () => {
    const changes: Record<string, (r: ReturnType<typeof start>) => void> = {
      none: () => {},
      disposal: (r) => r.run!.dispose(),
      owner: (r) => void (r.s.token.current = 'pilot-b'),
      visit: (r) => void r.s.visit.current++,
      mission: (r) => void (r.s.level = 'first-light'),
    };
    for (const success of [true, false]) for (const [name, change] of Object.entries(changes)) {
      const r = start();
      change(r);
      if (success) r.loader.settle().resolve(model);
      else r.loader.settle().reject(new Error('offline'));
      await flush();
      const settled = name === 'none' ? (success ? [model, 'ready'] : ['failed']) : [];
      expect(r.log, `${name} ${success}`).toEqual(['loading', ...settled]);
    }
  });
  it('gives each run its own disposal, so the first of the two runs StrictMode makes stays quiet', async () => {
    const first = start(), second = start(first.loader);
    first.run!.dispose();
    first.loader.settle().resolve(model);
    await flush();
    expect(first.log).toEqual(['loading']);
    expect(second.log).toEqual(['loading', model, 'ready']);
  });
  it('retries a failed load through the same owned settle', async () => {
    const r = start();
    r.loader.settle().reject(new Error('offline'));
    await flush();
    r.loader.again();
    r.run!.retry();
    expect(r.loader.load).toHaveBeenCalledTimes(2);
    r.loader.settle().resolve(model);
    await flush();
    expect(r.log).toEqual(['loading', 'failed', 'loading', model, 'ready']);
  });
});
