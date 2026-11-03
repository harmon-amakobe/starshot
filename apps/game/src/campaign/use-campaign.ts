import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hintQueryFor, DEFAULT_PAR_TOLERANCE } from '../levels';
import { isLunarLevel } from '../missions';
import { parkingPeriod, parkingPhase } from '@starshot/physics/lunar';
import type { FlightRequest } from '../sim/flight-request';
import { scoreShot, type Score } from '../scoring';
import type { Hint } from '../sim/hint';
import { launchGate, previewForShot, shotKey } from '../sim/preview';
import type { FlightResponse as ShotResponse } from '../sim/protocol';
import { DAY, launchEtForDay, normalizeDeg, vInfFromAim, type Aim } from '../sim/shot';
import { useSimulation } from '../sim/useSimulation';
import {
  copySession,
  missionFor,
  unitOf,
  togglePauseAt,
  type Preferences,
  type Session,
  type ReleaseMode,
} from './session';
import { pullIntent, ReleaseOwner } from './release';
import { clockFor } from './playback';
import { finalRequest, matchesRestore } from './contracts';
import { completionNotice } from './outcome';

export const summaryOf = (res: ShotResponse | null) =>
  res
    ? `${shotKey(res.shot)}|${res.analysis.hit}|${res.analysis.endEt}|${res.analysis.closestKm}|${res.analysis.flybys.map((f) => `${f.body}@${f.t}`).join(',')}`
    : null;
let nextWorkerIdentity = 0;
export function useCampaign(
  initial: Session,
  owner: string,
  record: (score: Score, res: ShotResponse, session: Session) => void,
) {
  const sim = useSimulation<FlightRequest>(),
    [workerIdentity] = useState(() => ++nextWorkerIdentity);
  const [session, setSession] = useState(() => copySession(initial)),
    current = useRef(session);
  current.current = session;
  const [flight, setFlight] = useState<ShotResponse | null>(null),
    flightRef = useRef(flight);
  flightRef.current = flight;
  const [hydrating, setHydrating] = useState(true),
    restoring = useRef(true);
  const [pending, setPending] = useState(false),
    [snapping, setSnapping] = useState(false);
  const launching = useRef(false),
    [restoreRevision, setRestoreRevision] = useState(0);
  const [hint, setHint] = useState<Hint | null>(null),
    [hintBusy, setHintBusy] = useState(false);
  const [notice, setNotice] = useState(''),
    [score, setScore] = useState<Score | null>(null);
  const releaseOwner = useRef(new ReleaseOwner()),
    visit = useRef(0),
    snapUntil = useRef(0),
    token = useRef(owner);
  const time = useRef(session.et),
    lastPaint = useRef(0),
    marked = useRef(false),
    recordRef = useRef(record);
  recordRef.current = record;
  const [clock, setClock] = useState(session.et);
  const level = useMemo(
    () => missionFor(session),
    [session.levelId, session.target, session.windowStart],
  );
  const launchEt = isLunarLevel(level)
    ? session.phase === 'aim'
      ? session.et
      : session.launchEt!
    : launchEtForDay(level.window.startIso, session.day);
  const shot = useMemo(
    () => finalRequest(session).shot,
    [level, launchEt, session.aim, session.parking],
  );
  const preview = previewForShot(sim.preview, shot),
    active = session.phase === 'aim' ? preview : flight;
  const change = useCallback((fn: (s: Session) => Session) => {
    const next = fn(current.current);
    current.current = next;
    setSession(next);
  }, []);
  function cancel() {
    releaseOwner.current.cancel();
    launching.current = false;
    setPending(false);
    setSnapping(false);
    snapUntil.current = 0;
  }
  function restore(save: Session) {
    cancel();
    visit.current++;
    marked.current = false;
    setHint(null);
    setHintBusy(false);
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
  useEffect(() => {
    if (!session.parking || session.paused || restoring.current) sim.requestPreview(shot);
  }, [shot, sim.requestPreview, session.paused]);
  function finish(res: ShotResponse, save = current.current) {
    const mission = missionFor(save),
      result = scoreShot(
        {
          parDeltaVKmS: mission.par?.deltaVKmS,
          parTolerance: mission.parTolerance ?? DEFAULT_PAR_TOLERANCE,
          requiredFlyby: mission.requiredFlyby,
        },
        {
          hit: res.analysis.hit,
          deltaVKmS: res.analysis.deltaVKmS,
          bullseye: res.analysis.bullseye,
          requiredFlybyDone: res.analysis.requiredFlybyDone,
          hintUsed: save.hintUsed,
        },
      );
    setScore(result);
    change((s) => ({ ...s, phase: 'result', et: res.analysis.endEt, paused: true }));
    time.current = res.analysis.endEt;
    setClock(time.current);
    if (!marked.current) {
      marked.current = true;
      recordRef.current(result, res, { ...save, phase: 'result', et: time.current, paused: true });
    }
    setNotice(completionNotice(res, result.stars));
  }
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
    if (snapUntil.current) {
      if (now < snapUntil.current) return;
      snapUntil.current = 0;
      setSnapping(false);
    }
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
  function snapshot(): Session {
    return copySession({
      ...current.current,
      et:
        current.current.phase === 'aim' && !current.current.parking
          ? launchEtForDay(current.current.windowStart, current.current.day)
          : time.current,
    });
  }
  return {
    session,
    level,
    shot,
    preview,
    flight,
    active,
    clock,
    time,
    hydrating,
    pending,
    snapping,
    hint,
    hintBusy,
    notice,
    score,
    ready: !hydrating,
    workerIdentity,
    owner: token.current,
    visit: visit.current,
    releaseOwner: releaseOwner.current,
    aim,
    day,
    launch,
    cancel,
    restore,
    guide,
    applyGuide,
    retry,
    replay,
    seek,
    tick,
    preferences,
    snapshot,
    freezeParking,
    orbitPhase,
    cancelPull,
    releasePull,
    pause() {
      change((s) => togglePauseAt(s, time.current));
      setClock(time.current);
    },
    enter() {
      change((s) => ({ ...s, entered: true }));
    },
  };
}
export type CampaignController = ReturnType<typeof useCampaign>;
