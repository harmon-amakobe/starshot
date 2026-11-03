import { describe, expect, it, vi } from 'vitest';
import { finalRequest } from './contracts';
import {
  fly,
  harness,
  outcome,
  REFERENCE,
  reply,
  type Harness,
} from './owner-harness.test-support';

// Node has no matchMedia; the commit reads it only to time the snap after launch.
vi.stubGlobal('matchMedia', () => ({ matches: true }));
const DRIFTED = 'The captured shot changed before launch. Aim again.';
const FAILED = 'The shot could not be computed. Adjust your aim and try again.';
const UNLIKE = 'The launch did not match its preview. Try again.';

describe('the production launch commit acts only for its own release', () => {
  it('posts one launch per release and ignores repeats in flight or after the commit', async () => {
    const h = harness();
    h.render().launch(REFERENCE);
    const task = h.releaseOwner.current.pending!;
    const preview = fly(task.shot, 'preview');
    // The worker answered this key with a path, so its preview is no failure.
    h.sim.answeredKey = task.key;
    h.render(preview).failPreview();
    expect(h.flags.pending).toBe(true);
    const done = h.render(preview).commit();
    void h.render(preview).commit();
    expect(h.log.launches).toHaveLength(1);
    const launched = fly(task.shot, 'launch');
    // Stale values the commit must overwrite, so each of its writes is observed.
    h.time.current = Number.NaN;
    h.shown.clock = Number.NaN;
    h.result.marked.current = true;
    h.session.current.entered = false;
    h.session.current.et = Number.NaN;
    h.session.current.preferences.rate = 60;
    h.held[0]!.resolve(launched);
    await done;
    expect(h.session.current).toMatchObject({
      phase: 'flight',
      launchEt: task.shot.launchEt,
      et: task.shot.launchEt,
      paused: false,
      entered: true,
      preferences: { rate: 0 },
    });
    expect(h.flightRef.current).toBe(launched);
    expect(h.shown.flight).toBe(launched);
    expect(h.launching.current).toBe(false);
    expect(h.time.current).toBe(task.shot.launchEt);
    expect(h.shown.clock).toBe(task.shot.launchEt);
    expect(h.result.marked.current).toBe(false);
    expect(h.snapUntil.current).toBeGreaterThan(0);
    void h.render(preview).commit();
    h.render().failPreview();
    expect(h.log.launches).toHaveLength(1);
    expect(h.log.notices.at(-1)).toBe('Launched.');
    expect(h.flags.snapping).toBe(true);
    h.render().cancel();
    expect(h.flags.snapping).toBe(false);
    expect(h.snapUntil.current).toBe(0);
  });
  it('launches nothing from a real preview for an older aim', async () => {
    const h = harness();
    h.render().launch(REFERENCE);
    const older = fly(h.releaseOwner.current.pending!.shot, 'preview');
    h.render().aim({ angleDeg: 1, speedKmS: 3.24 });
    h.render().launch();
    const notices = [...h.log.notices];
    await h.render(older).commit();
    expect(h.log.launches).toEqual([]);
    expect(h.flags.pending).toBe(true);
    expect(h.log.notices).toEqual(notices);
  });
  it('ends a release only on a preview failure for its own key', () => {
    const h = harness();
    h.render().launch(REFERENCE);
    const old = h.releaseOwner.current.pending!;
    h.render().aim({ angleDeg: 1, speedKmS: 3.24 });
    h.render().launch();
    h.sim.answeredKey = old.key;
    h.render().failPreview();
    expect(h.flags.pending).toBe(true);
    h.sim.answeredKey = h.releaseOwner.current.pending!.key;
    h.render().failPreview();
    expect(h.flags.pending).toBe(false);
    expect(h.log.notices.at(-1)).toBe('The current path could not be computed.');
  });
  it('lets an old generation reply leave a newer drifted request alone', async () => {
    for (const fails of [false, true]) {
      const h = harness();
      h.render().launch(REFERENCE);
      const old = h.releaseOwner.current.pending!;
      const done = h.render(fly(old.shot, 'preview')).commit();
      h.render().aim({ angleDeg: 1, speedKmS: 3.24 });
      h.render().launch();
      const newer = h.releaseOwner.current.pending!;
      Object.assign(newer.shot, { launchEt: newer.shot.launchEt + 1 });
      const notices = [...h.log.notices];
      reply(h, old.shot, fails);
      await done;
      expect(h.releaseOwner.current.pending).toBe(newer);
      expect(h.flags.pending).toBe(true);
      expect(h.log.notices).toEqual(notices);
    }
  });
  it('lets no answer commit or cancel after the visit or the pilot changed', async () => {
    // Only restore() also cancels, so these cases leave each check alone in the way.
    const switches: Record<string, (h: Harness) => void> = {
      visit: (h) => {
        h.hydration.visit.current++;
      },
      token: (h) => {
        h.hydration.token.current = 'pilot-b';
      },
    };
    for (const [name, change] of Object.entries(switches)) {
      for (const fails of [false, true]) {
        for (const drifted of [false, true]) {
          const label = `${name}${drifted ? ' drifted' : ''}${fails ? ' failure' : ' success'}`;
          const h = harness();
          h.render().launch(REFERENCE);
          const old = h.releaseOwner.current.pending!;
          const done = h.render(fly(old.shot, 'preview')).commit();
          // The worker answers what was posted, before any later drift.
          const answer = fly(old.shot, 'launch');
          change(h);
          if (drifted) Object.assign(old.shot, { launchEt: old.shot.launchEt + 1 });
          const owned = h.releaseOwner.current.pending!;
          const notices = [...h.log.notices];
          expect(owned.key, label).toBe(old.key);
          if (fails) h.held[0]!.reject(Error('worker failed'));
          else h.held[0]!.resolve(answer);
          await done;
          expect(h.releaseOwner.current.pending, label).toBe(owned);
          expect(h.flags.pending, label).toBe(true);
          expect(h.session.current.phase, label).toBe('aim');
          expect(h.log.notices, label).toEqual(notices);
        }
      }
    }
  });
  it('returns to aim after drift, failure or a reply unlike its preview', async () => {
    const cases = [
      ['gate drift', DRIFTED],
      ['success drift', DRIFTED],
      ['failure drift', DRIFTED],
      ['failure', FAILED],
      ['changed reply', UNLIKE],
    ] as const;
    for (const [stage, notice] of cases) {
      const h = harness();
      h.render().launch(REFERENCE);
      const task = h.releaseOwner.current.pending!;
      const preview = fly(task.shot, 'preview');
      const drift = () => Object.assign(task.shot, { launchEt: task.shot.launchEt + 1 });
      if (stage === 'gate drift') drift();
      const done = h.render(preview).commit();
      if (stage !== 'gate drift') {
        const launched = fly(task.shot, 'launch');
        if (stage === 'success drift' || stage === 'failure drift') drift();
        if (stage === 'success drift') h.held[0]!.resolve(launched);
        else if (stage === 'changed reply') {
          // A real reply with one analysis value altered: the commit must refuse it.
          const changed = structuredClone(launched);
          Object.assign(changed.analysis, { endEt: changed.analysis.endEt + 1 });
          h.held[0]!.resolve(changed);
        } else h.held[0]!.reject(Error('worker failed'));
      }
      await done;
      expect(h.log.launches, stage).toHaveLength(stage === 'gate drift' ? 0 : 1);
      expect(outcome(h), stage).toEqual({
        phase: 'aim',
        pending: false,
        launching: false,
        owned: null,
        notice,
      });
    }
  });
  it('keeps the base behaviour and waits when a launch reply names another shot', async () => {
    const h = harness();
    h.render().launch(REFERENCE);
    const task = h.releaseOwner.current.pending!;
    const done = h.render(fly(task.shot, 'preview')).commit();
    const other = finalRequest(h.session.current, { angleDeg: 1, speedKmS: 3.24 }).shot;
    const before = outcome(h);
    h.held[0]!.resolve(fly(other, 'launch'));
    await done;
    expect(outcome(h)).toEqual(before);
    expect(before).toMatchObject({ pending: true, launching: true, owned: task });
  });
});
