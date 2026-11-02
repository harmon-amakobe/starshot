import { useEffect, useRef, useState, type RefObject } from 'react';
import { launchGate } from '../sim/preview';
import type { ShotResponse } from '../sim/protocol';
import { launchEtForDay, normalizeDeg, type Aim } from '../sim/shot';
import type { SimulationApi } from '../sim/useSimulation';
import { finalRequest, summaryOf } from './contracts';
import type { FlightClock } from './flight-clock';
import { prefersReducedMotion } from './reduced-motion';
import { ReleaseOwner } from './release';
import { RELEASE_SNAP_MS } from './scene-types';
import { missionFor } from './session';
import type { SessionStore } from './session-store';
import type { Result } from './use-result';

/**
 * Release ownership (D6). A release captures the final aim as a canonical request, waits
 * for the worker's preview of exactly that request, launches it, and refuses a response
 * whose summary differs from the preview. Every aim or day edit cancels a pending
 * release, and the generation, visit epoch and owner token stop late work from landing.
 */
export function useRelease(input: {
  sim: Pick<SimulationApi, 'launch' | 'requestPreview' | 'answeredKey'>;
  store: Pick<SessionStore, 'current' | 'change'>;
  clock: Pick<FlightClock, 'show' | 'jump' | 'time'>;
  result: Pick<Result, 'arm' | 'clear'>;
  preview: ShotResponse | null;
  visit: { epoch: RefObject<number>; token: RefObject<string>; restoring: RefObject<boolean> };
  announce: (text: string) => void;
}) {
  const { sim, store, clock, result, preview, visit, announce } = input;
  const { current, change } = store;
  const releaseOwner = useRef(new ReleaseOwner()),
    launching = useRef(false),
    snapUntil = useRef(0);
  const [pending, setPending] = useState(false),
    [snapping, setSnapping] = useState(false);
  function cancel() {
    releaseOwner.current.cancel();
    launching.current = false;
    setPending(false);
    setSnapping(false);
    snapUntil.current = 0;
  }
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
    const epoch = visit.epoch.current,
      identity = visit.token.current;
    sim
      .launch(task.shot)
      .then((response) => {
        if (
          visit.epoch.current !== epoch ||
          visit.token.current !== identity ||
          !releaseOwner.current.accepts(task.generation, response.shot)
        )
          return;
        if (summaryOf(response) !== summaryOf(preview)) {
          cancel();
          announce('The launch did not match its preview. Try again.');
          return;
        }
        launching.current = false;
        setPending(false);
        result.arm();
        clock.show(response);
        clock.jump(response.shot.launchEt);
        change((s) => ({
          ...s,
          phase: 'flight',
          et: clock.time.current,
          paused: false,
          entered: true,
        }));
        setSnapping(true);
        snapUntil.current = performance.now() + (prefersReducedMotion() ? 0 : RELEASE_SNAP_MS);
        announce('Launched.');
      })
      .catch(() => {
        if (
          visit.epoch.current === epoch &&
          visit.token.current === identity &&
          releaseOwner.current.accepts(task.generation, task.shot)
        ) {
          cancel();
          announce('The shot could not be computed. Adjust your aim and try again.');
        }
      });
  }, [preview, pending, sim.launch, change]);
  useEffect(() => {
    const task = releaseOwner.current.pending;
    if (pending && task && sim.answeredKey === task.key && !preview) {
      cancel();
      announce('The current path could not be computed.');
    }
  }, [pending, preview, sim.answeredKey]);
  function aim(value: Aim) {
    if (current.current.phase !== 'aim' || snapping) return;
    cancel();
    result.clear();
    const cap = missionFor(current.current).vInfMaxKmS;
    change((s) => ({
      ...s,
      aim: {
        angleDeg: normalizeDeg(value.angleDeg),
        speedKmS: Math.max(0, Math.min(cap, value.speedKmS)),
      },
    }));
  }
  function day(value: number) {
    if (current.current.phase !== 'aim') return;
    cancel();
    const l = missionFor(current.current),
      next = Math.max(0, Math.min(l.window.days, Math.round(value)));
    clock.jump(launchEtForDay(l.window.startIso, next));
    change((s) => ({ ...s, day: next, et: clock.time.current }));
  }
  return {
    pending,
    snapping,
    owner: releaseOwner.current,
    aim,
    day,
    launch(finalAim = current.current.aim) {
      if (current.current.phase !== 'aim' || visit.restoring.current || pending || snapping) return;
      const { aim: final, shot: request } = finalRequest(current.current, finalAim);
      change((s) => ({ ...s, aim: final, entered: true }));
      releaseOwner.current.request(request);
      sim.requestPreview(request);
      setPending(true);
      announce('Computing the released path…');
    },
    cancel,
    /** True while the ring snaps back; the first frame after it clears the snap. */
    holdsSnap(now: number) {
      if (!snapUntil.current) return false;
      if (now < snapUntil.current) return true;
      snapUntil.current = 0;
      setSnapping(false);
      return false;
    },
  };
}
export type Release = ReturnType<typeof useRelease>;
