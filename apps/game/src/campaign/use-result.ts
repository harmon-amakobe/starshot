import { useRef, useState } from 'react';
import { parToleranceOf } from '../levels';
import { scoreShot, type Score } from '../scoring';
import type { ShotResponse } from '../sim/protocol';
import type { FlightClock } from './flight-clock';
import { missionFor, type Session } from './session';
import type { SessionStore } from './session-store';

export type RecordResult = (score: Score, res: ShotResponse, session: Session) => void;

function scoreFor(save: Session, res: ShotResponse) {
  const mission = missionFor(save);
  return scoreShot(
    {
      parDeltaVKmS: mission.par?.deltaVKmS,
      parTolerance: parToleranceOf(mission),
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
}

/**
 * The score of a finished flight. `marked` makes each flight record its stars once: a
 * launch or retry clears it, and a result restored from a save is marked before it is
 * finished, because it was recorded when it was first flown.
 */
export function useResult(
  store: Pick<SessionStore, 'current' | 'change'>,
  clock: Pick<FlightClock, 'time' | 'jump'>,
  record: RecordResult,
  announce: (text: string) => void,
) {
  const [score, setScore] = useState<Score | null>(null),
    marked = useRef(false),
    recordRef = useRef(record);
  recordRef.current = record;
  function finish(res: ShotResponse, save = store.current.current) {
    const result = scoreFor(save, res);
    setScore(result);
    store.change((s) => ({ ...s, phase: 'result', et: res.analysis.endEt, paused: true }));
    clock.jump(res.analysis.endEt);
    if (!marked.current) {
      marked.current = true;
      recordRef.current(result, res, {
        ...save,
        phase: 'result',
        et: clock.time.current,
        paused: true,
      });
    }
    announce(`${res.analysis.hit ? 'Target reached' : 'Shot complete'}. ${result.stars} stars.`);
  }
  return {
    score,
    finish,
    finishRestored(res: ShotResponse, save: Session) {
      marked.current = true;
      finish(res, save);
    },
    /** A new flight may record once. */
    arm() {
      marked.current = false;
    },
    clear() {
      setScore(null);
    },
    reset() {
      marked.current = false;
      setScore(null);
    },
  };
}
export type Result = ReturnType<typeof useResult>;
