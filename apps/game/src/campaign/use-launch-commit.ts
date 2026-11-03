import { useEffect } from 'react';
import type { FlightRequest } from '../sim/flight-request';
import { launchGate } from '../sim/preview';
import type { FlightResponse as ShotResponse } from '../sim/protocol';

import type { SimulationApi } from '../sim/useSimulation';
import type { FlightClock } from './flight-clock';
import type { SessionStore } from './session-store';
import type { ReleaseState } from './use-release';
import { summaryOf } from './use-release';
import type { Hydration } from './use-restore';
import type { ResultState } from './use-result';
type Simulation = SimulationApi<FlightRequest>;
export function useLaunchCommit(input: {
  store: SessionStore;
  clock: FlightClock;
  result: ResultState;
  hydration: Hydration;
  sim: Simulation;
  preview: ShotResponse | null;
  state: ReleaseState;
  setNotice: (text: string) => void;
}) {
  const { sim, preview, setNotice } = input;
  const { change } = input.store;
  const { time, setClock, flightRef, setFlight } = input.clock;
  const { marked } = input.result;
  const { visit, token } = input.hydration;
  const { pending, setPending, setSnapping, launching, releaseOwner, snapUntil, cancel } =
    input.state;
  useEffect(() => {
    const task = releaseOwner.current.pending;
    if (
      !pending ||
      launching.current ||
      !task ||
      !preview ||
      !launchGate(true, preview, task.shot).ready ||
      !releaseOwner.current.accepts(task.generation, preview.shot)
    )
      return;
    launching.current = true;
    const epoch = visit.current,
      identity = token.current;
    sim
      .launch(task.shot)
      .then((response) => {
        if (
          visit.current !== epoch ||
          token.current !== identity ||
          !releaseOwner.current.accepts(task.generation, response.shot)
        )
          return;
        if (summaryOf(response) !== summaryOf(preview)) {
          cancel();
          setNotice('The launch did not match its preview. Try again.');
          return;
        }
        launching.current = false;
        setPending(false);
        marked.current = false;
        flightRef.current = response;
        setFlight(response);
        time.current = response.shot.launchEt;
        setClock(time.current);
        change((s) => ({
          ...s,
          phase: 'flight',
          et: time.current,
          ...(s.parking
            ? { launchEt: response.shot.launchEt, preferences: { ...s.preferences, rate: 0 } }
            : {}),
          paused: false,
          entered: true,
        }));
        setSnapping(true);
        snapUntil.current =
          performance.now() + (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
        setNotice('Launched.');
      })
      .catch(() => {
        if (
          visit.current === epoch &&
          token.current === identity &&
          releaseOwner.current.accepts(task.generation, task.shot)
        ) {
          cancel();
          setNotice('The shot could not be computed. Adjust your aim and try again.');
        }
      });
  }, [preview, pending, sim.launch, change]);
  useEffect(() => {
    const task = releaseOwner.current.pending;
    if (pending && task && sim.answeredKey === task.key && !preview) {
      cancel();
      setNotice('The current path could not be computed.');
    }
  }, [pending, preview, sim.answeredKey]);
}
