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
export interface LaunchInput {
  store: SessionStore;
  clock: FlightClock;
  result: ResultState;
  hydration: Hydration;
  sim: Simulation;
  preview: ShotResponse | null;
  state: ReleaseState;
  setNotice: (text: string) => void;
}
/**
 * One render's launch gate and commit. It is the hook's effect body, kept outside the hook so
 * tests drive this boundary itself. Only the generation, pilot and visit that launched may
 * change state, and a drifted owned request resets to aim instead of staying pending forever.
 */
export function commitLaunch(input: LaunchInput) {
  const { sim, preview, setNotice } = input;
  const { change } = input.store;
  const { time, setClock, flightRef, setFlight } = input.clock;
  const { marked } = input.result;
  const { visit, token } = input.hydration;
  const { pending, setPending, setSnapping, launching, releaseOwner, snapUntil, cancel } =
    input.state;
  const task = releaseOwner.current.pending;
  if (!pending || launching.current || !task) return;
  const drifted = () => {
    cancel();
    setNotice('The captured shot changed before launch. Aim again.');
  };
  if (releaseOwner.current.verdict(task.generation, task.shot) === 'drift') return drifted();
  if (
    !preview ||
    !launchGate(true, preview, task.shot).ready ||
    !releaseOwner.current.accepts(task.generation, preview.shot)
  )
    return;
  launching.current = true;
  const epoch = visit.current,
    identity = token.current;
  // Another pilot or visit owns the state now, so even a drifted answer must leave it alone.
  const settle = (shot: FlightRequest) =>
    visit.current === epoch && token.current === identity
      ? releaseOwner.current.verdict(task.generation, shot)
      : 'stale';
  return sim
    .launch(task.shot)
    .then((response) => {
      const verdict = settle(response.shot);
      if (verdict === 'drift') return drifted();
      if (verdict !== 'accept') return;
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
      const verdict = settle(task.shot);
      if (verdict === 'drift') drifted();
      else if (verdict === 'accept') {
        cancel();
        setNotice('The shot could not be computed. Adjust your aim and try again.');
      }
    });
}
/** A preview answered without a path ends only the release waiting for that key. */
export function failPreview(input: LaunchInput) {
  const { pending, releaseOwner, cancel } = input.state;
  const task = releaseOwner.current.pending;
  if (pending && task && input.sim.answeredKey === task.key && !input.preview) {
    cancel();
    input.setNotice('The current path could not be computed.');
  }
}
export function useLaunchCommit(input: LaunchInput) {
  const { sim, preview } = input;
  const { change } = input.store;
  const { pending } = input.state;
  useEffect(() => {
    void commitLaunch(input);
  }, [preview, pending, sim.launch, change]);
  useEffect(() => failPreview(input), [pending, preview, sim.answeredKey]);
}
