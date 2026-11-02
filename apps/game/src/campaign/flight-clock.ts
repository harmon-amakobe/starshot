import { useRef, useState, type RefObject } from 'react';
import type { ShotResponse } from '../sim/protocol';
import { advanceEt } from './playback';
import type { SessionStore } from './session-store';
import type { Release } from './use-release';
import type { Result } from './use-result';

/**
 * The flight on screen and its clock. `time` is the exact ET, advanced every animation
 * frame; `clock` is its render copy, published at most every 80 ms so React renders a
 * flight about twelve times a second rather than sixty.
 */
export function useFlightClock(initialEt: number) {
  const [flight, setFlight] = useState<ShotResponse | null>(null),
    flightRef = useRef(flight);
  flightRef.current = flight;
  const time = useRef(initialEt),
    lastPaint = useRef(0),
    [clock, setClock] = useState(initialEt);
  return {
    flight,
    flightRef,
    time,
    clock,
    /** The ref changes at once, so a tick or replay before the next render sees it. */
    show(next: ShotResponse | null) {
      flightRef.current = next;
      setFlight(next);
    },
    jump(et: number) {
      time.current = et;
      setClock(et);
    },
    paint(now: number) {
      if (now - lastPaint.current > 80) {
        lastPaint.current = now;
        setClock(time.current);
      }
    },
  };
}
export type FlightClock = ReturnType<typeof useFlightClock>;

/**
 * Tick, seek, replay and retry. The render loop in use-view.ts calls `tick`, so the
 * clock has no timer of its own and stops whenever the scene stops drawing.
 */
export function playbackControls(input: {
  store: Pick<SessionStore, 'current' | 'change' | 'launchEt'>;
  clock: FlightClock;
  release: Pick<Release, 'cancel' | 'holdsSnap'>;
  result: Pick<Result, 'finish' | 'reset'>;
  restoring: RefObject<boolean>;
}) {
  const { store, clock, release, result } = input;
  return {
    tick(seconds: number, now: number, suspended: boolean) {
      if (release.holdsSnap(now)) return;
      const f = clock.flightRef.current,
        s = store.current.current;
      if (!f || s.phase !== 'flight' || s.paused || suspended || input.restoring.current) return;
      clock.time.current = advanceEt(f, s.preferences, clock.time.current, seconds);
      if (clock.time.current >= f.analysis.endEt) {
        result.finish(f);
        return;
      }
      clock.paint(now);
    },
    seek(et: number) {
      const f = clock.flightRef.current;
      if (!f) return;
      clock.jump(Math.max(f.shot.launchEt, Math.min(f.analysis.endEt, et)));
      store.change((s) => ({ ...s, phase: 'flight', et: clock.time.current, paused: true }));
    },
    replay() {
      if (!clock.flightRef.current) return;
      release.cancel();
      clock.jump(clock.flightRef.current.shot.launchEt);
      store.change((s) => ({ ...s, phase: 'flight', et: clock.time.current, paused: false }));
    },
    retry() {
      release.cancel();
      result.reset();
      clock.show(null);
      clock.jump(store.launchEt);
      store.change((s) => ({ ...s, phase: 'aim', et: store.launchEt, paused: false }));
    },
  };
}
export type Playback = ReturnType<typeof playbackControls>;
