import { useState } from 'react';
import { hintQueryFor } from '../levels';
import { isLunarLevel } from '../missions';
import type { FlightRequest } from '../sim/flight-request';
import type { Hint } from '../sim/hint';
import { missionFor } from './session';

import type { SimulationApi } from '../sim/useSimulation';
import type { FlightClock } from './flight-clock';
import type { SessionStore } from './session-store';
import type { Hydration } from './use-restore';
type Simulation = SimulationApi<FlightRequest>;

import type { Release } from './use-release';
export type HintInput = {
  store: SessionStore;
  clock: FlightClock;
  hydration: Hydration;
  release: Release;
  sim: Simulation;
  setNotice: (text: string) => void;
};
/** Applies a guide by copying its values, so a later hint change rewrites nothing applied. */
export function applyHint(
  hint: Hint,
  input: Pick<HintInput, 'store' | 'clock' | 'release' | 'setNotice'>,
  applied = hint.hits
    ? 'Guide applied. Target approach lined up.'
    : 'Closest guide applied. This shot still misses.',
) {
  const { current, change } = input.store,
    { time, setClock } = input.clock;
  const {
    cancel,
    actions: { day, aim },
  } = input.release;
  if (current.current.phase !== 'aim') return;
  cancel();
  day(hint.day);
  if (hint.parking) {
    time.current = hint.launchEt;
    setClock(time.current);
    change((s) => ({ ...s, et: hint.launchEt, parking: { ...hint.parking! }, paused: true }));
  }
  aim(hint.aim);
  change((s) => ({ ...s, hintUsed: true }));
  input.setNotice(applied);
}
/** One guide slot: the route it holds, and whether its request is still out. */
export interface HintSlot {
  readonly hint: Hint | null;
  readonly busy: boolean;
}
export const EMPTY_SLOT: HintSlot = { hint: null, busy: false };
/** The measured reference guide, or the bounded Moon route search; each fills its own slot. */
export type HintStrategy = 'reference' | 'search';
export type HintSlots = Record<HintStrategy, HintSlot>;
type SetSlot = (update: (slot: HintSlot) => HintSlot) => void;
const READY = 'Apply it to set the date and aim. Guided shots earn at most 2 stars.';

/**
 * The slots' actions over plain state, so tests drive the hook's own code. A reply fills only
 * its own slot, and only for the visit and pilot that asked. A reply never applies a route:
 * only the Apply controls change the aim and the 2-star cap (`scoring.ts`).
 */
export function hintActions(input: HintInput, slots: HintSlots, set: Record<HintStrategy, SetSlot>) {
  const { sim, setNotice } = input;
  const { current } = input.store;
  const { visit, token } = input.hydration;
  function ask(strategy: HintStrategy) {
    const mission = missionFor(current.current);
    const search = strategy === 'search';
    if (slots[strategy].busy || current.current.phase !== 'aim') return;
    // Only the Moon has a route search; a planetary guide is already a bounded search.
    if (search && !isLunarLevel(mission)) return;
    const epoch = visit.current,
      identity = token.current,
      update = set[strategy];
    update((slot) => ({ ...slot, busy: true }));
    setNotice(search ? 'Searching Moon routes…' : 'Finding a measured guide…');
    // The search takes the worker's default budget, so the 240-flight bound lives in one place.
    const lunar = search ? { kind: 'lunar', strategy } as const : { kind: 'lunar' } as const;
    sim
      .hint(isLunarLevel(mission) ? lunar : hintQueryFor(mission))
      .then((res) => {
        if (epoch !== visit.current || identity !== token.current) return;
        update(() => ({ hint: res.hint, busy: false }));
        if (search)
          setNotice(
            res.hint
              ? `Searched route ready after ${res.simulations} flights. ${READY}`
              : `The search flew ${res.simulations} routes and found no hit.`,
          );
        else setNotice(res.hint ? `Guide ready. ${READY}` : 'No guide was found for this window.');
      })
      .catch(() => {
        if (epoch === visit.current) {
          update((slot) => ({ ...slot, busy: false }));
          setNotice(search ? 'The route search could not finish.' : 'The guide could not be computed.');
        }
      });
  }
  const { reference, search } = slots;
  return {
    hint: reference.hint,
    hintBusy: reference.busy,
    searched: search.hint,
    searchBusy: search.busy,
    guide: () => ask('reference'),
    search: () => ask('search'),
    applyGuide() {
      if (reference.hint) applyHint(reference.hint, input);
    },
    applySearched() {
      if (search.hint) applyHint(search.hint, input, 'Searched route applied. Target approach lined up.');
    },
    reset() {
      set.reference(() => EMPTY_SLOT);
      set.search(() => EMPTY_SLOT);
    },
  };
}
export function useHints(input: HintInput) {
  const [reference, setReference] = useState(EMPTY_SLOT),
    [search, setSearch] = useState(EMPTY_SLOT);
  return hintActions(input, { reference, search }, { reference: setReference, search: setSearch });
}
