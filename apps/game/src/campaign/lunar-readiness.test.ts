import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { LunarModel } from '@starshot/physics/lunar';
import { CAMPAIGN } from '../levels';
import { MISSIONS, MOONSHOT } from '../missions';
import { AimHandle } from './AimHandle';
import { finalRequest } from './contracts';
import { FlightDeck } from './FlightDeck';
import { useGestures } from './gestures';
import { lunarReadiness, ownedCallback, READY, type Readiness } from './lunar-readiness';
import { fly, harness, REFERENCE } from './owner-harness.test-support';
import { copySession, freshSession } from './session';
import { restoreActions } from './use-restore';

// The rule asks only whether a model is present, so any object stands in for the loaded one.
const model = {} as LunarModel;
const loading = lunarReadiness(MOONSHOT, null);

describe('lunar readiness', () => {
  it('readies every planetary level at once, with no Moon model', () => {
    for (const level of MISSIONS.slice(1)) expect(lunarReadiness(level, null), level.id).toBe(READY);
  });
  it('holds a Moon level, with a visible reason, until its model is present', () => {
    expect(loading).toEqual({ scene: false, reason: 'Loading the Moon.' });
    expect(lunarReadiness(MOONSHOT, model)).toBe(READY);
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
