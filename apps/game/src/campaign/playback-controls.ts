import { DAY, launchEtForDay } from '../sim/shot';
import { clockFor } from './playback';
import { togglePauseAt, unitOf, type Preferences } from './session';

import type { FlightClock } from './flight-clock';
import type { SessionStore } from './session-store';
import type { Release } from './use-release';
import type { Hydration } from './use-restore';
import type { ResultState } from './use-result';
export function playbackControls(input: {
  store: SessionStore;
  clock: FlightClock;
  result: ResultState;
  release: Release;
  hydration: Hydration;
}) {
  const { current, change, launchEt, level } = input.store;
  const { time, setClock, flightRef, setFlight, lastPaint } = input.clock;
  const { marked, setScore, finish } = input.result;
  const { cancel, pending } = input.release,
    { restoring } = input.hydration;
  function retry() {
    cancel();
    marked.current = false;
    setScore(null);
    flightRef.current = null;
    setFlight(null);
    time.current = launchEt;
    setClock(launchEt);
    change((s) => ({
      ...s,
      phase: 'aim',
      et: launchEt,
      paused: false,
      ...(s.parking ? { preferences: { ...s.preferences, rate: 0 } } : {}),
    }));
  }
  function replay() {
    if (!flightRef.current) return;
    cancel();
    time.current = flightRef.current.shot.launchEt;
    setClock(time.current);
    change((s) => ({ ...s, phase: 'flight', et: time.current, paused: false }));
  }
  function seek(et: number) {
    const f = flightRef.current;
    if (!f) return;
    time.current = Math.max(f.shot.launchEt, Math.min(f.analysis.endEt, et));
    setClock(time.current);
    change((s) => ({ ...s, phase: 'flight', et: time.current, paused: true }));
  }
  function tick(seconds: number, now: number, suspended: boolean) {
    if (input.release.holdsSnap(now)) return;
    const f = flightRef.current,
      s = current.current;
    if (
      s.phase === 'aim' &&
      s.parking &&
      !s.paused &&
      !suspended &&
      !restoring.current &&
      !pending
    ) {
      const end = launchEtForDay(level.window.startIso, level.window.days + 1) - 1;
      time.current = Math.min(end, time.current + seconds * (s.preferences.rate || 120));
      if (now - lastPaint.current > 100) {
        lastPaint.current = now;
        setClock(time.current);
        change((save) => ({ ...save, et: time.current, paused: time.current >= end }));
      }
      return;
    }
    if (!f || s.phase !== 'flight' || s.paused || suspended || restoring.current) return;
    const duration = f.analysis.endEt - f.shot.launchEt,
      p = s.preferences;
    const defaultRate = duration / Math.max(4, Math.min(9, 2.5 + f.analysis.flightDays / 200));
    const light = p.scientific && unitOf(p) === 'light',
      rate = light ? 1 : p.rate || defaultRate;
    const close = f.analysis.flybys.some((e) => Math.abs(e.t - time.current) < 4 * DAY);
    if (light && p.lightRate > 0) {
      const clock = clockFor(f);
      time.current = clock.etAtDistance(
        clock.distanceAt(time.current) + seconds * p.lightRate * 299792.458,
      );
    } else
      time.current = Math.min(
        f.analysis.endEt,
        time.current + seconds * rate * (p.rate === 0 && !p.scientific && close ? 0.28 : 1),
      );
    if (time.current >= f.analysis.endEt) {
      finish(f);
      return;
    }
    if (now - lastPaint.current > 80) {
      lastPaint.current = now;
      setClock(time.current);
    }
  }
  function preferences(value: Partial<Preferences>) {
    if (value.releaseMode !== undefined) cancel();
    change((s) => ({ ...s, preferences: { ...s.preferences, ...value } }));
  }
  return {
    retry,
    replay,
    seek,
    tick,
    preferences,
    pause() {
      change((s) => togglePauseAt(s, time.current));
      setClock(time.current);
    },
  };
}
