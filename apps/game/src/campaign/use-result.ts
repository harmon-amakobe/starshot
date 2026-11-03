import { useRef, useState } from 'react';
import { DEFAULT_PAR_TOLERANCE } from '../levels';
import { scoreShot, type Score } from '../scoring';
import type { FlightResponse as ShotResponse } from '../sim/protocol';
import { completionNotice } from './outcome';
import { missionFor, type Session } from './session';

import type { FlightClock } from './flight-clock';
import type { SessionStore } from './session-store';

export type RecordResult = (score: Score, res: ShotResponse, session: Session) => void;
export function useResult(
  store: SessionStore,
  clock: FlightClock,
  record: RecordResult,
  setNotice: (text: string) => void,
) {
  const { current, change } = store,
    { time, setClock } = clock;
  const [score, setScore] = useState<Score | null>(null);
  const marked = useRef(false),
    recordRef = useRef(record);
  recordRef.current = record;
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
  return { score, setScore, marked, finish };
}
export type ResultState = ReturnType<typeof useResult>;
