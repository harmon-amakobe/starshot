import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DAY } from '@starshot/physics/lunar';
import type { FlightHintQuery } from '../sim/flight-request';
import type { Hint } from '../sim/hint';
import { lunarHint } from '../sim/lunar';
import type { HintResponse } from '../sim/protocol';
import { MOONSHOT } from '../missions';
import { FlightDeck } from './FlightDeck';
import { READY } from './lunar-readiness';
import { MissionDeck } from './MissionDeck';
import { harness, type Harness } from './owner-harness.test-support';
import { freshSession } from './session';
import { restoreActions } from './use-restore';
import { EMPTY_SLOT, hintActions, type HintInput, type HintSlot, type HintSlots, type HintStrategy } from './use-hints';

const reference = lunarHint();
/** A searched route unlike the reference in every applied value: day 3 at 3.120 km/s, 2 degrees off. */
const searched = (): Hint => {
  const launchEt = reference.launchEt + 3 * DAY;
  const parking = { ...reference.parking!, epochEt: launchEt };
  const aim = { angleDeg: 2, speedKmS: 3.12 };
  return { ...reference, day: 3, launchEt, parking, aim, source: 'lunar-grid', simulations: 236 };
};
const reply = (hint: Hint | null, strategy: HintStrategy): HintResponse => ({
  kind: 'hint', id: 1, hint, ms: 0, strategy, grid: 'moon-grid/1', simulations: strategy === 'search' ? 236 : 1,
});

/**
 * The production hint actions over the owner harness. React state is a plain value here: each
 * render() rebuilds the actions from the slots as a React render would, and the worker's answers
 * wait in `asked` until a test settles them.
 */
function hints(h: Harness = harness()) {
  const slots: HintSlots = { reference: EMPTY_SLOT, search: EMPTY_SLOT };
  const asked: { query: FlightHintQuery; settle: (r: HintResponse | Error) => Promise<void> }[] = [];
  const sim = {
    hint: (query: FlightHintQuery) =>
      new Promise<HintResponse>((resolve, reject) => {
        // Settling waits a macrotask, so the reply's then or catch has run when it returns.
        const settle = (r: HintResponse | Error) => {
          if (r instanceof Error) reject(r);
          else resolve(r);
          return new Promise<void>((done) => setImmediate(done));
        };
        asked.push({ query, settle });
      }),
  };
  const set = (strategy: HintStrategy) => (update: (slot: HintSlot) => HintSlot) => {
    slots[strategy] = update(slots[strategy]);
  };
  const render = () => {
    const r = h.render();
    const input = { ...r.input, release: r.release, sim } as unknown as HintInput;
    return hintActions(input, { ...slots }, { reference: set('reference'), search: set('search') });
  };
  return { h, slots, asked, render };
}

describe('the reference and searched route slots', () => {
  it('asks the worker for the reference or the default bounded search, each into its own slot', async () => {
    const t = hints();
    t.render().guide();
    t.render().search();
    expect(t.asked.map((a) => a.query)).toEqual([{ kind: 'lunar' }, { kind: 'lunar', strategy: 'search' }]);
    expect(t.slots).toEqual({ reference: { hint: null, busy: true }, search: { hint: null, busy: true } });
    // A busy slot does not ask again.
    t.render().search();
    expect(t.asked).toHaveLength(2);
    const route = searched();
    await t.asked[1]!.settle(reply(route, 'search'));
    expect(t.slots).toEqual({ reference: { hint: null, busy: true }, search: { hint: route, busy: false } });
    await t.asked[0]!.settle(reply(reference, 'reference'));
    expect(t.slots).toEqual({ reference: { hint: reference, busy: false }, search: { hint: route, busy: false } });
    expect(t.h.log.notices.at(-2)).toBe('Searched route ready after 236 flights. Apply it to set the date and aim. Guided shots earn at most 2 stars.');
    expect(t.h.log.notices.at(-1)).toBe('Guide ready. Apply it to set the date and aim. Guided shots earn at most 2 stars.');
  });
  it('drops a reply for an earlier visit or another pilot in both slots', async () => {
    for (const strategy of ['reference', 'search'] as const)
      for (const change of ['visit', 'token'] as const)
        for (const fails of [false, true]) {
          const t = hints();
          const actions = t.render();
          if (strategy === 'search') actions.search();
          else actions.guide();
          if (change === 'visit') t.h.hydration.visit.current++;
          else t.h.hydration.token.current = 'pilot-b';
          const notices = t.h.log.notices.length;
          await t.asked[0]!.settle(fails ? Error('worker failed') : reply(searched(), strategy));
          const label = `${strategy} ${change} ${fails ? 'failure' : 'reply'}`;
          expect(t.slots[strategy].hint, label).toBeNull();
          // A failure clears busy for the same visit only, as the guide always did.
          const cleared = fails && change === 'token';
          expect(t.slots[strategy].busy, label).toBe(!cleared);
          expect(t.h.log.notices.length, label).toBe(notices + (cleared ? 1 : 0));
        }
  });
  it('changes neither the aim nor the guide cap when a search completes', async () => {
    const t = hints();
    const before = structuredClone(t.h.session.current);
    t.render().search();
    await t.asked[0]!.settle(reply(searched(), 'search'));
    expect(t.slots.search.hint).not.toBeNull();
    expect(t.h.session.current).toEqual(before);
    expect(t.h.session.current.hintUsed).toBe(false);
    expect(t.h.log.previews).toEqual([]);
  });
  it('applies the searched route as a copy and sets the 2-star guide cap', async () => {
    const t = hints();
    const route = searched();
    t.render().search();
    await t.asked[0]!.settle(reply(route, 'search'));
    t.render().applySearched();
    const applied = t.h.session.current;
    expect(applied).toMatchObject({ et: route.launchEt, parking: route.parking, aim: route.aim, hintUsed: true, paused: true });
    expect(t.h.log.notices.at(-1)).toBe('Searched route applied. Target approach lined up.');
    // The session holds copies: a later change to the slot's route rewrites nothing applied.
    Object.assign(route.aim, { speedKmS: 1 });
    Object.assign(route.parking!, { phaseDeg: 1 });
    expect(applied.aim).toEqual({ angleDeg: 2, speedKmS: 3.12 });
    expect(applied.parking!.phaseDeg).toBe(225);
    // The reference slot was never filled, so Apply guide does nothing.
    const notices = t.h.log.notices.length;
    t.render().applyGuide();
    expect(t.h.log.notices).toHaveLength(notices);
  });
  it('clears both slots on a restore, drops the reply still out, and offers no search on a planet', async () => {
    const t = hints();
    t.render().guide();
    t.render().search();
    await t.asked[1]!.settle(reply(searched(), 'search'));
    // The production restore, as a mission pick or pilot switch runs it: a new visit, then the reset.
    const r = t.h.render();
    const hydration = { ...r.input.hydration, setHydrating() {}, setRestoreRevision() {} };
    const restore = { ...r.input, hydration, initial: freshSession(), owner: 'pilot-a', cancel: r.cancel, resetHint: t.render().reset };
    restoreActions(restore).restore(freshSession());
    expect(t.slots).toEqual({ reference: EMPTY_SLOT, search: EMPTY_SLOT });
    const notices = [...t.h.log.notices];
    await t.asked[0]!.settle(reply(reference, 'reference'));
    expect(t.slots).toEqual({ reference: EMPTY_SLOT, search: EMPTY_SLOT });
    expect(t.h.log.notices).toEqual(notices);
    const planet = hints(harness());
    planet.h.session.current = { ...planet.h.session.current, levelId: 'first-light', parking: undefined };
    planet.render().search();
    expect(planet.asked).toEqual([]);
  });
  it('keeps a busy Guide and Search routes focusable, held by aria-disabled', () => {
    const session = freshSession();
    const c = { store: { session, level: MOONSHOT }, view: { active: null, clock: session.et, score: null }, hydrating: false,
      release: { pending: false, actions: {} }, hints: { hintBusy: true, searchBusy: true }, playback: {} };
    const props = { c, open: true, toggle() {}, readiness: READY };
    const html = renderToStaticMarkup(createElement(MissionDeck, props as unknown as Parameters<typeof MissionDeck>[0]))
      + renderToStaticMarkup(createElement(FlightDeck, props as unknown as Parameters<typeof FlightDeck>[0]));
    const busy = html.match(/<button class="pill"[^>]*(?:aria-label="Finding guide"[^>]*>|>Searching routes…)/g)!;
    expect(busy).toHaveLength(2);
    for (const tag of busy) expect([tag.includes('aria-disabled="true"'), tag.includes('disabled=""')]).toEqual([true, false]);
  });
});
