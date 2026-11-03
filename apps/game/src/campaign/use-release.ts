import { useRef, useState } from 'react';
import type { FlightRequest } from '../sim/flight-request';
import { shotKey } from '../sim/preview';
import type { FlightResponse as ShotResponse } from '../sim/protocol';
import { ReleaseOwner } from './release';

import type { SimulationApi } from '../sim/useSimulation';
import type { FlightClock } from './flight-clock';
import type { SessionStore } from './session-store';
import type { Hydration } from './use-restore';
import type { ResultState } from './use-result';
type Simulation = SimulationApi<FlightRequest>;

import { aimActions } from './aim-actions';
import { useLaunchCommit } from './use-launch-commit';
export const summaryOf = (res: ShotResponse | null) =>
  res
    ? `${shotKey(res.shot)}|${res.analysis.hit}|${res.analysis.endEt}|${res.analysis.closestKm}|${res.analysis.flybys.map((f) => `${f.body}@${f.t}`).join(',')}`
    : null;
export function useRelease(input: {
  store: SessionStore;
  clock: FlightClock;
  result: ResultState;
  hydration: Hydration;
  sim: Simulation;
  preview: ShotResponse | null;
  setNotice: (text: string) => void;
}) {
  const [pending, setPending] = useState(false),
    [snapping, setSnapping] = useState(false);
  const launching = useRef(false),
    releaseOwner = useRef(new ReleaseOwner()),
    snapUntil = useRef(0);
  function cancel() {
    releaseOwner.current.cancel();
    launching.current = false;
    setPending(false);
    setSnapping(false);
    snapUntil.current = 0;
  }
  const state = {
    pending,
    setPending,
    snapping,
    setSnapping,
    launching,
    releaseOwner,
    snapUntil,
    cancel,
  };
  useLaunchCommit({ ...input, state });
  const actions = aimActions({ ...input, state });
  return {
    pending,
    snapping,
    releaseOwner: releaseOwner.current,
    cancel,
    actions,
    holdsSnap(now: number) {
      if (snapUntil.current) {
        if (now < snapUntil.current) return true;
        snapUntil.current = 0;
        setSnapping(false);
      }
      return false;
    },
  };
}
export type Release = ReturnType<typeof useRelease>;
export interface ReleaseState {
  pending: boolean;
  setPending: React.Dispatch<React.SetStateAction<boolean>>;
  snapping: boolean;
  setSnapping: React.Dispatch<React.SetStateAction<boolean>>;
  launching: React.RefObject<boolean>;
  releaseOwner: React.RefObject<ReleaseOwner>;
  snapUntil: React.RefObject<number>;
  cancel: () => void;
}
