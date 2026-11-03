import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FlightRequest } from '../sim/flight-request';
import { shotKey } from '../sim/preview';
import type { FlightResponse as ShotResponse } from '../sim/protocol';
import { matchesRestore } from './contracts';
import { copySession, type Session } from './session';

import type { SimulationApi } from '../sim/useSimulation';
import type { FlightClock } from './flight-clock';
import type { SessionStore } from './session-store';
import type { ResultState } from './use-result';
type Simulation = SimulationApi<FlightRequest>;

export function useHydration(owner: string) {
  const [hydrating, setHydrating] = useState(true),
    restoring = useRef(true);
  const [restoreRevision, setRestoreRevision] = useState(0),
    visit = useRef(0),
    token = useRef(owner);
  return { hydrating, setHydrating, restoring, restoreRevision, setRestoreRevision, visit, token };
}
export type Hydration = ReturnType<typeof useHydration>;
export function useRestorePreview(
  store: SessionStore,
  clock: FlightClock,
  result: ResultState,
  hydration: Hydration,
  sim: Simulation,
  preview: ShotResponse | null,
  setNotice: (text: string) => void,
) {
  const { current, change, launchEt, shot } = store;
  const { setFlight, flightRef, time, setClock } = clock;
  const { marked, finish } = result;
  const { restoring, setHydrating, restoreRevision } = hydration;
  useEffect(() => {
    if (!restoring.current || !preview) return;
    const currentSave = current.current;
    if (!matchesRestore(preview.shot, currentSave)) return;
    restoring.current = false;
    setHydrating(false);
    const saved = current.current;
    if (saved.phase !== 'aim') {
      setFlight(preview);
      flightRef.current = preview;
      time.current = Math.max(preview.shot.launchEt, Math.min(saved.et, preview.analysis.endEt));
      setClock(time.current);
      if (saved.phase === 'result') {
        marked.current = true;
        finish(preview, saved);
      }
    } else {
      time.current = launchEt;
      setClock(launchEt);
    }
  }, [preview, launchEt, restoreRevision]);
  useEffect(() => {
    if (restoring.current && sim.answeredKey === shotKey(shot) && !preview) {
      restoring.current = false;
      setHydrating(false);
      change((s) => ({ ...s, phase: 'aim', et: launchEt }));
      setNotice(
        'This saved path could not be computed. Adjust the aim or choose a mission to retry.',
      );
    }
  }, [sim.answeredKey, preview, shot, launchEt, change, restoreRevision]);
}
export function useRestore(input: {
  initial: Session;
  owner: string;
  store: SessionStore;
  clock: FlightClock;
  result: ResultState;
  hydration: Hydration;
  cancel: () => void;
  resetHint: () => void;
  setNotice: (text: string) => void;
}) {
  const { initial, owner, cancel, resetHint, setNotice } = input;
  const { change } = input.store,
    { setFlight, flightRef, time, setClock } = input.clock;
  const { marked, setScore } = input.result;
  const { token, visit, restoring, setHydrating, setRestoreRevision } = input.hydration;
  function restore(save: Session) {
    cancel();
    visit.current++;
    marked.current = false;
    resetHint();
    setScore(null);
    setFlight(null);
    flightRef.current = null;
    restoring.current = true;
    setHydrating(true);
    setRestoreRevision((n) => n + 1);
    time.current = save.et;
    setClock(save.et);
    change(() => copySession(save));
    setNotice('');
  }
  useLayoutEffect(() => {
    token.current = owner;
    restore(initial);
  }, [owner]);
  return restore;
}
