// Test support shared by the ownership tests. The name keeps vitest from collecting it, and no
// app code imports it, so it never reaches the build.
import { runLunar } from '../sim/lunar';
import { isLunar, type FlightRequest } from '../sim/flight-request';
import type { FlightResponse } from '../sim/protocol';
import { aimActions } from './aim-actions';
import { playbackControls } from './playback-controls';
import { ReleaseOwner } from './release';
import { freshSession, type Session } from './session';
import { commitLaunch, failPreview, type LaunchInput } from './use-launch-commit';
import { releaseState, type Release } from './use-release';

export const REFERENCE = { angleDeg: 0, speedKmS: 3.24 };

/** The worker's answer: the real runLunar on a structured clone of the posted request. */
export function fly(shot: FlightRequest, purpose: 'preview' | 'launch'): FlightResponse {
  const posted = structuredClone(shot);
  if (!isLunar(posted)) throw Error('Expected Moonshot');
  return { kind: 'shot', id: 1, purpose, shot: posted, ...runLunar(posted), ms: 0 };
}

/**
 * Production actions, commit and playback over plain collaborators. React state is a
 * plain value here, and render() rebuilds the actions from it as a React render would.
 */
export function harness(save = freshSession()) {
  const session = { current: save };
  const time = { current: save.et };
  const flightRef = { current: null as FlightResponse | null };
  const releaseOwner = { current: new ReleaseOwner() };
  const launching = { current: false };
  const snapUntil = { current: 0 };
  const hydration = {
    token: { current: 'pilot-a' },
    visit: { current: 0 },
    restoring: { current: false },
  };
  const log = {
    previews: [] as FlightRequest[],
    launches: [] as FlightRequest[],
    notices: [] as string[],
  };
  const held: Array<{ resolve: (r: FlightResponse) => void; reject: (e: Error) => void }> = [];
  const flags = { pending: false, snapping: false };
  const set = (key: keyof typeof flags) => (v: boolean | ((p: boolean) => boolean)) => {
    flags[key] = typeof v === 'function' ? v(flags[key]) : v;
  };
  const sim = {
    answeredKey: '',
    requestPreview(shot: FlightRequest) {
      log.previews.push(shot);
    },
    launch(shot: FlightRequest) {
      log.launches.push(shot);
      return new Promise<FlightResponse>((resolve, reject) => held.push({ resolve, reject }));
    },
  };
  const store = {
    current: session,
    change(fn: (s: Session) => Session) {
      session.current = fn(session.current);
    },
  };
  // What the React flight and clock state would hold after each set call.
  const shown = { flight: null as FlightResponse | null, clock: save.et };
  const clock = {
    time,
    flightRef,
    setClock(et: number) {
      shown.clock = et;
    },
    setFlight(flight: FlightResponse | null) {
      shown.flight = flight;
    },
  };
  const result = { setScore() {}, marked: { current: false } };
  const setNotice = (text: string) => {
    log.notices.push(text);
  };
  function render(preview: FlightResponse | null = null) {
    const state = releaseState({
      ...flags,
      setPending: set('pending'),
      setSnapping: set('snapping'),
      launching,
      releaseOwner,
      snapUntil,
    });
    // The collaborators carry only the members these functions read, so the full types are cast.
    const parts = { store, clock, result, hydration, sim, preview, state, setNotice };
    const input = parts as unknown as LaunchInput;
    const release = { ...state, actions: aimActions(input) } as unknown as Release;
    return {
      ...release.actions,
      input,
      release,
      cancel: state.cancel,
      commit: () => commitLaunch(input),
      failPreview: () => failPreview(input),
      playback: playbackControls({ ...input, release }),
    };
  }
  return {
    session,
    time,
    hydration,
    sim,
    releaseOwner,
    launching,
    snapUntil,
    log,
    held,
    flags,
    flightRef,
    shown,
    result,
    render,
  };
}
export type Harness = ReturnType<typeof harness>;
export type Render = ReturnType<Harness['render']>;
export const reply = (h: Harness, shot: FlightRequest, fails: boolean) =>
  fails ? h.held[0]!.reject(Error('worker failed')) : h.held[0]!.resolve(fly(shot, 'launch'));
export const outcome = (h: Harness) => ({
  phase: h.session.current.phase,
  pending: h.flags.pending,
  launching: h.launching.current,
  owned: h.releaseOwner.current.pending,
  notice: h.log.notices.at(-1),
});
