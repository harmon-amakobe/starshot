import { parkingPeriod, parkingPhase } from '@starshot/physics/lunar';
import type { FlightRequest } from '../sim/flight-request';
import { launchEtForDay, normalizeDeg, type Aim } from '../sim/shot';
import { finalRequest } from './contracts';
import { pullIntent } from './release';
import { missionFor, type ReleaseMode } from './session';

import type { SimulationApi } from '../sim/useSimulation';
import type { FlightClock } from './flight-clock';
import type { SessionStore } from './session-store';
import type { ReleaseState } from './use-release';
import type { Hydration } from './use-restore';
import type { ResultState } from './use-result';
type Simulation = SimulationApi<FlightRequest>;

export function aimActions(input: {
  store: SessionStore;
  clock: FlightClock;
  result: ResultState;
  hydration: Hydration;
  sim: Simulation;
  state: ReleaseState;
  setNotice: (text: string) => void;
}) {
  const { sim, setNotice } = input;
  const { current, change } = input.store;
  const { time, setClock } = input.clock;
  const { setScore } = input.result;
  const { token, restoring } = input.hydration;
  const { pending, setPending, snapping, releaseOwner, cancel } = input.state;
  function aim(value: Aim) {
    if (current.current.phase !== 'aim' || snapping) return;
    cancel();
    freezeParking();
    setScore(null);
    const cap = missionFor(current.current).vInfMaxKmS;
    change((s) => ({
      ...s,
      aim: {
        angleDeg: s.parking
          ? Math.max(-35, Math.min(35, value.angleDeg))
          : normalizeDeg(value.angleDeg),
        speedKmS: Math.max(0, Math.min(cap, value.speedKmS)),
      },
    }));
  }
  function freezeParking() {
    if (
      !current.current.parking ||
      current.current.phase !== 'aim' ||
      (current.current.paused && current.current.et === time.current)
    )
      return;
    change((s) => ({ ...s, et: time.current, paused: true }));
    setClock(time.current);
  }
  function cancelPull(previousAim: Aim, wasPaused: boolean, expectedOwner: string) {
    if (token.current !== expectedOwner || current.current.phase !== 'aim') return;
    cancel();
    aim(previousAim);
    if (current.current.parking) change((s) => ({ ...s, paused: wasPaused }));
  }
  function releasePull(finalAim: Aim, mode: ReleaseMode, expectedOwner: string) {
    const intent = pullIntent(
      mode,
      expectedOwner,
      current.current.preferences.releaseMode,
      token.current,
      current.current.phase,
    );
    if (!intent) return;
    aim(finalAim);
    if (intent === 'hail-mary') launch(finalAim);
    else {
      change((s) => ({ ...s, paused: true }));
      setNotice('Aim set. Inspect the path, adjust it, then press Launch.');
    }
  }
  function orbitPhase(value: number) {
    if (
      !Number.isFinite(value) ||
      !current.current.parking ||
      current.current.phase !== 'aim' ||
      pending
    )
      return;
    cancel();
    freezeParking();
    change((s) => ({
      ...s,
      parking: {
        ...s.parking!,
        phaseDeg: normalizeDeg(
          value - ((s.et - s.parking!.epochEt) / parkingPeriod(s.parking!.radiusKm)) * 360,
        ),
      },
    }));
  }
  function day(value: number) {
    if (current.current.phase !== 'aim') return;
    cancel();
    const l = missionFor(current.current),
      next = Math.max(0, Math.min(l.window.days, Math.round(value)));
    const phase = current.current.parking ? parkingPhase(current.current.parking, time.current) : 0;
    time.current = launchEtForDay(l.window.startIso, next);
    setClock(time.current);
    change((s) => ({
      ...s,
      day: next,
      et: time.current,
      ...(s.parking
        ? { parking: { ...s.parking, epochEt: time.current, phaseDeg: phase }, paused: true }
        : {}),
    }));
  }
  function launch(finalAim = current.current.aim) {
    if (current.current.phase !== 'aim' || restoring.current || pending || snapping) return;
    freezeParking();
    const { aim: final, shot: request } = finalRequest(current.current, finalAim);
    change((s) => ({ ...s, aim: final, entered: true }));
    releaseOwner.current.request(request);
    sim.requestPreview(request);
    setPending(true);
    setNotice('Computing the released path…');
  }
  return { aim, freezeParking, cancelPull, releasePull, orbitPhase, day, launch };
}
