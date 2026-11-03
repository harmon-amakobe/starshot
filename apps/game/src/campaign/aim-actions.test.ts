import { describe, expect, it, vi } from 'vitest';
import { LAUNCH_ET } from '@starshot/physics/lunar';
import { CAMPAIGN } from '../levels';
import { lunarHint } from '../sim/lunar';
import type { Hint } from '../sim/hint';
import { shotKey } from '../sim/preview';
import { finalRequest } from './contracts';
import { copySession, freshSession, type Session } from './session';
import { applyHint } from './use-hints';
import { restoreActions } from './use-restore';
import {
  fly,
  harness,
  REFERENCE,
  reply,
  type Harness,
  type Render,
} from './owner-harness.test-support';

// Node has no matchMedia; the commit reads it only to time the snap after launch.
vi.stubGlobal('matchMedia', () => ({ matches: true }));
/** Applies a guide through the production applyHint with one render's collaborators. */
function guide(h: Harness, hint: Hint) {
  const r = h.render();
  applyHint(hint, { ...r.input, release: r.release });
}
/** Selects another pilot through the production restoreActions with one render's collaborators. */
function switchPilot(h: Harness, owner: string, initial: Session) {
  const r = h.render();
  const hydration = { ...r.input.hydration, setHydrating() {}, setRestoreRevision() {} };
  const input = { ...r.input, hydration, initial, owner, cancel: r.cancel, resetHint() {} };
  restoreActions(input).select();
}

describe('production release actions own one captured request', () => {
  it('captures the render clock between UI updates and commits that one request', async () => {
    const h = harness();
    const renderEt = LAUNCH_ET + 8.004;
    // The render loop moved on; the session last saw LAUNCH_ET.
    h.time.current = renderEt;
    h.render().launch(REFERENCE);
    const task = h.releaseOwner.current.pending!;
    expect(task.shot.launchEt).toBe(renderEt);
    expect(h.session.current).toMatchObject({ et: renderEt, paused: true, aim: REFERENCE });
    expect(h.log.previews).toHaveLength(1);
    expect(h.log.previews[0]).toBe(task.shot);
    const done = h.render(fly(task.shot, 'preview')).commit();
    expect(h.log.launches).toHaveLength(1);
    expect(h.log.launches[0]).toBe(task.shot);
    const launched = fly(task.shot, 'launch');
    h.held[0]!.resolve(launched);
    await done;
    expect(h.flightRef.current).toBe(launched);
    expect(h.log.notices.at(-1)).toBe('Launched.');
    expect(h.session.current).toMatchObject({ phase: 'flight', launchEt: renderEt, et: renderEt });
  });
  it('pauses a Plan pull and launches a YOLO pull at the captured render clock', () => {
    for (const mode of ['plan', 'hail-mary'] as const) {
      const h = harness();
      const renderEt = LAUNCH_ET + 8.004;
      h.session.current.preferences.releaseMode = mode;
      h.time.current = renderEt;
      h.render().releasePull(REFERENCE, mode, 'pilot-a');
      // A pointer cancel captured for another pilot must not undo this pilot's release.
      h.render().cancelPull({ angleDeg: 5, speedKmS: 1 }, false, 'pilot-b');
      expect(h.session.current).toMatchObject({ et: renderEt, paused: true, aim: REFERENCE });
      expect(h.log.previews.map((s) => s.launchEt)).toEqual(mode === 'plan' ? [] : [renderEt]);
      expect(h.flags.pending).toBe(mode === 'hail-mary');
    }
  });
  it('rejects old launch success and failure after cancel, date, aim and mode edits', async () => {
    const edits: Record<string, (r: Render) => void> = {
      cancel: (r) => r.cancelPull(REFERENCE, false, 'pilot-a'),
      date: (r) => r.day(1),
      aim: (r) => r.aim({ angleDeg: 1, speedKmS: 3.24 }),
      mode: (r) => r.playback.preferences({ releaseMode: 'hail-mary' }),
    };
    for (const [name, edit] of Object.entries(edits)) {
      for (const fails of [false, true]) {
        const h = harness();
        h.render().launch(REFERENCE);
        const task = h.releaseOwner.current.pending!;
        const done = h.render(fly(task.shot, 'preview')).commit();
        edit(h.render());
        const view = () =>
          structuredClone({
            session: h.session.current,
            notices: h.log.notices,
            pending: h.flags.pending,
            generation: h.releaseOwner.current.generation,
            flight: h.flightRef.current,
          });
        const edited = view();
        reply(h, task.shot, fails);
        await done;
        expect(edited.generation, name).toBeGreaterThan(task.generation);
        expect(edited.pending, name).toBe(false);
        expect(view(), name).toEqual(edited);
      }
    }
  });
  it('refuses phase edits while pending and lets no old preview act after edits', async () => {
    const edits = [
      (r: Render) => r.day(1),
      (r: Render) => r.orbitPhase(10),
      (r: Render) => r.aim({ angleDeg: 1, speedKmS: 3.24 }),
    ];
    for (const edit of edits) {
      const h = harness();
      h.render().launch(REFERENCE);
      const task = h.releaseOwner.current.pending!;
      const old = fly(task.shot, 'preview');
      h.render().orbitPhase(10);
      expect(h.releaseOwner.current.pending).toBe(task);
      expect(shotKey(finalRequest(h.session.current).shot)).toBe(task.key);
      h.render().cancel();
      edit(h.render());
      h.render().launch();
      expect(h.releaseOwner.current.pending!.key).not.toBe(task.key);
      await h.render(old).commit();
      h.sim.answeredKey = task.key;
      h.render().failPreview();
      expect(h.log.launches).toEqual([]);
      expect(h.flags.pending).toBe(true);
      h.sim.answeredKey = h.releaseOwner.current.pending!.key;
      h.render().failPreview();
      expect(h.flags.pending).toBe(false);
      expect(h.log.notices.at(-1)).toBe('The current path could not be computed.');
    }
  });
  it('lets no old answer touch the release after restoring an identical shot', async () => {
    for (const fails of [false, true]) {
      const h = harness();
      h.render().launch(REFERENCE);
      const old = h.releaseOwner.current.pending!;
      const done = h.render(fly(old.shot, 'preview')).commit();
      // The worker answers what was posted.
      const answer = fly(old.shot, 'launch');
      switchPilot(h, 'pilot-b', copySession(h.session.current));
      expect(h.hydration.visit.current).toBe(1);
      expect(h.hydration.token.current).toBe('pilot-b');
      // useRestorePreview ends hydration once the restored shot's preview arrives.
      h.hydration.restoring.current = false;
      h.render().launch(REFERENCE);
      const owned = h.releaseOwner.current.pending!;
      const notices = [...h.log.notices];
      expect(owned).not.toBe(old);
      expect(owned.key).toBe(old.key);
      if (fails) h.held[0]!.reject(Error('worker failed'));
      else h.held[0]!.resolve(answer);
      await done;
      expect(h.releaseOwner.current.pending).toBe(owned);
      expect(h.flags.pending).toBe(true);
      expect(h.session.current.phase).toBe('aim');
      expect(h.log.notices).toEqual(notices);
    }
  });
  it('keeps a captured request when the caller edits its aim, parking or ET in place', () => {
    for (const save of [freshSession(), freshSession(CAMPAIGN[0]!)]) {
      const h = harness(save);
      h.render().launch();
      const task = h.releaseOwner.current.pending!;
      const s = h.session.current;
      Object.assign(s.aim, { angleDeg: 2, speedKmS: 1 });
      s.et += 1;
      s.day += 1;
      if (s.parking) Object.assign(s.parking, { phaseDeg: 1, epochEt: s.et });
      expect(shotKey(task.shot)).toBe(task.key);
    }
  });
  it('applies the reference guide by value, so later hint edits change nothing applied', () => {
    const hint = lunarHint();
    const flying = harness();
    flying.session.current.phase = 'flight';
    guide(flying, hint);
    expect(flying.session.current.hintUsed).toBe(false);
    const h = harness();
    guide(h, hint);
    h.render().launch();
    const task = h.releaseOwner.current.pending!;
    const applied = structuredClone(h.session.current);
    expect(applied).toMatchObject({
      et: hint.launchEt,
      parking: hint.parking,
      aim: hint.aim,
      hintUsed: true,
      paused: true,
    });
    Object.assign(hint.parking!, { phaseDeg: 1 });
    Object.assign(hint.aim, { speedKmS: 1 });
    Object.assign(hint, { launchEt: hint.launchEt + 5, day: 3 });
    expect(h.session.current).toEqual(applied);
    expect(shotKey(task.shot)).toBe(task.key);
  });
});
