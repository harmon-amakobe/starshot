import { useState, type RefObject } from 'react';
import { hintQueryFor } from '../levels';
import type { Hint } from '../sim/hint';
import type { SimulationApi } from '../sim/useSimulation';
import { missionFor } from './session';
import type { SessionStore } from './session-store';
import type { Release } from './use-release';

/**
 * The measured guide for the current window. A guide that arrives after the pilot or the
 * visit changed is dropped. Applying one cancels any release, then sets the day and the
 * aim in one turn, which relies on `change` updating the session ref synchronously.
 */
export function useHints(input: {
  sim: Pick<SimulationApi, 'hint'>;
  store: Pick<SessionStore, 'current' | 'change'>;
  release: Pick<Release, 'cancel' | 'day' | 'aim'>;
  visit: { epoch: RefObject<number>; token: RefObject<string> };
  announce: (text: string) => void;
}) {
  const { sim, store, release, visit, announce } = input;
  const [hint, setHint] = useState<Hint | null>(null),
    [busy, setBusy] = useState(false);
  return {
    hint,
    busy,
    guide() {
      if (busy || store.current.current.phase !== 'aim') return;
      const epoch = visit.epoch.current,
        identity = visit.token.current;
      setBusy(true);
      announce('Finding a measured guide…');
      sim
        .hint(hintQueryFor(missionFor(store.current.current)))
        .then((res) => {
          if (epoch !== visit.epoch.current || identity !== visit.token.current) return;
          setHint(res.hint);
          setBusy(false);
          announce(
            res.hint
              ? 'Guide ready. Apply it to set the date and aim. Guided shots earn at most 2 stars.'
              : 'No guide was found for this window.',
          );
        })
        .catch(() => {
          if (epoch === visit.epoch.current) {
            setBusy(false);
            announce('The guide could not be computed.');
          }
        });
    },
    apply() {
      if (!hint || store.current.current.phase !== 'aim') return;
      release.cancel();
      release.day(hint.day);
      release.aim(hint.aim);
      store.change((s) => ({ ...s, hintUsed: true }));
      announce(
        hint.hits
          ? 'Guide applied. Target approach lined up.'
          : 'Closest guide applied. This shot still misses.',
      );
    },
    reset() {
      setHint(null);
      setBusy(false);
    },
  };
}
export type Hints = ReturnType<typeof useHints>;
