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
export function useHints(input: {
  store: SessionStore;
  clock: FlightClock;
  hydration: Hydration;
  release: Release;
  sim: Simulation;
  setNotice: (text: string) => void;
}) {
  const { sim, setNotice } = input;
  const { current, change } = input.store,
    { time, setClock } = input.clock;
  const { visit, token } = input.hydration;
  const {
    cancel,
    actions: { day, aim },
  } = input.release;
  const [hint, setHint] = useState<Hint | null>(null),
    [hintBusy, setHintBusy] = useState(false);
  function guide() {
    if (hintBusy || current.current.phase !== 'aim') return;
    const epoch = visit.current,
      identity = token.current;
    setHintBusy(true);
    setNotice('Finding a measured guide…');
    const mission = missionFor(current.current);
    sim
      .hint(isLunarLevel(mission) ? { kind: 'lunar' } : hintQueryFor(mission))
      .then((res) => {
        if (epoch !== visit.current || identity !== token.current) return;
        setHint(res.hint);
        setHintBusy(false);
        setNotice(
          res.hint
            ? 'Guide ready. Apply it to set the date and aim. Guided shots earn at most 2 stars.'
            : 'No guide was found for this window.',
        );
      })
      .catch(() => {
        if (epoch === visit.current) {
          setHintBusy(false);
          setNotice('The guide could not be computed.');
        }
      });
  }
  function applyGuide() {
    if (!hint || current.current.phase !== 'aim') return;
    cancel();
    day(hint.day);
    if (hint.parking) {
      time.current = hint.launchEt;
      setClock(time.current);
      change((s) => ({ ...s, et: hint.launchEt, parking: { ...hint.parking! }, paused: true }));
    }
    aim(hint.aim);
    change((s) => ({ ...s, hintUsed: true }));
    setNotice(
      hint.hits
        ? 'Guide applied. Target approach lined up.'
        : 'Closest guide applied. This shot still misses.',
    );
  }
  return {
    hint,
    hintBusy,
    guide,
    applyGuide,
    reset() {
      setHint(null);
      setHintBusy(false);
    },
  };
}
