import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { shotKey } from '../sim/preview';
import type { ShotResponse } from '../sim/protocol';
import type { SimulationApi } from '../sim/useSimulation';
import { matchesRestore } from './contracts';
import type { FlightClock } from './flight-clock';
import { copySession, type Session } from './session';
import type { SessionStore } from './session-store';
import type { Hints } from './use-hints';
import type { Release } from './use-release';
import type { Result } from './use-result';

/**
 * A visit is one restored session for one owner. Async work captures `epoch` and `token`
 * when it starts and lands only if both still match. Until the worker answers the
 * restored shot, `restoring` blocks launch and playback; then reconciliation rebuilds
 * the flight or the result from that preview, or falls back to aiming if it failed.
 */
export function useHydration(input: {
  owner: string;
  answeredKey: SimulationApi['answeredKey'];
  store: Pick<SessionStore, 'current' | 'change' | 'launchEt' | 'shot'>;
  clock: Pick<FlightClock, 'show' | 'jump' | 'time'>;
  result: Pick<Result, 'finishRestored'>;
  preview: ShotResponse | null;
  announce: (text: string) => void;
}) {
  const { store, clock, result, preview, announce } = input;
  const { current, change, launchEt, shot } = store;
  const [hydrating, setHydrating] = useState(true),
    restoring = useRef(true),
    [restoreRevision, setRestoreRevision] = useState(0);
  const epoch = useRef(0),
    token = useRef(input.owner);
  // The revision reruns both effects when a save is restored over an unchanged preview.
  useEffect(() => {
    if (!restoring.current || !preview) return;
    const currentSave = current.current;
    if (!matchesRestore(preview.shot, currentSave)) return;
    restoring.current = false;
    setHydrating(false);
    const saved = current.current;
    if (saved.phase !== 'aim') {
      clock.show(preview);
      clock.jump(Math.max(preview.shot.launchEt, Math.min(saved.et, preview.analysis.endEt)));
      if (saved.phase === 'result') result.finishRestored(preview, saved);
    } else clock.jump(launchEt);
  }, [preview, launchEt, restoreRevision]);
  useEffect(() => {
    if (restoring.current && input.answeredKey === shotKey(shot) && !preview) {
      restoring.current = false;
      setHydrating(false);
      change((s) => ({ ...s, phase: 'aim', et: launchEt }));
      announce(
        'This saved path could not be computed. Adjust the aim or choose a mission to retry.',
      );
    }
  }, [input.answeredKey, preview, shot, launchEt, change, restoreRevision]);
  return {
    hydrating,
    restoring,
    epoch,
    token,
    /** Starts a new visit: async work from the last one is ignored when it lands. */
    begin() {
      epoch.current++;
      restoring.current = true;
      setHydrating(true);
      setRestoreRevision((n) => n + 1);
    },
  };
}
export type Hydration = ReturnType<typeof useHydration>;

/**
 * `restore` replaces the session with a save and starts a new visit. A pilot switch
 * claims the owner token in a layout effect, before the browser paints the new pilot,
 * so work started for the previous pilot is refused from that frame on.
 */
export function useRestore(input: {
  owner: string;
  initial: Session;
  hydration: Pick<Hydration, 'begin' | 'token'>;
  store: Pick<SessionStore, 'change'>;
  clock: Pick<FlightClock, 'show' | 'jump'>;
  release: Pick<Release, 'cancel'>;
  result: Pick<Result, 'reset'>;
  hints: Pick<Hints, 'reset'>;
  announce: (text: string) => void;
}) {
  function restore(save: Session) {
    input.release.cancel();
    input.hydration.begin();
    input.result.reset();
    input.hints.reset();
    input.clock.show(null);
    input.clock.jump(save.et);
    input.store.change(() => copySession(save));
    input.announce('');
  }
  useLayoutEffect(() => {
    input.hydration.token.current = input.owner;
    restore(input.initial);
  }, [input.owner]);
  return restore;
}
