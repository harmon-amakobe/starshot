import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import { shotRequestFor } from '../levels';
import { launchEtForDay, vInfFromAim } from '../sim/shot';
import { copySession, missionFor, type Preferences, type Session } from './session';

/**
 * The pilot's session, its mission and the canonical shot for the current aim. `change`
 * writes the ref before React state, so several edits in one event each build on the
 * last: applying a guide sets the day, then the aim, then the hint flag in one turn.
 */
export function useSessionStore(initial: Session, time: RefObject<number>) {
  const [session, setSession] = useState(() => copySession(initial)),
    current = useRef(session);
  current.current = session;
  const level = useMemo(
    () => missionFor(session),
    [session.levelId, session.target, session.windowStart],
  );
  const launchEt = launchEtForDay(level.window.startIso, session.day);
  const shot = useMemo(
    () => shotRequestFor(level, launchEt, vInfFromAim(session.aim)),
    [level, launchEt, session.aim],
  );
  const change = useCallback((fn: (s: Session) => Session) => {
    const next = fn(current.current);
    current.current = next;
    setSession(next);
  }, []);
  return {
    session,
    current,
    level,
    launchEt,
    shot,
    change,
    preferences(value: Partial<Preferences>) {
      change((s) => ({ ...s, preferences: { ...s.preferences, ...value } }));
    },
    /** A save of the session as it stands, with the flight clock's exact ET. */
    snapshot(): Session {
      return copySession({
        ...current.current,
        et:
          current.current.phase === 'aim'
            ? launchEtForDay(current.current.windowStart, current.current.day)
            : time.current,
      });
    },
    pause() {
      change((s) => ({ ...s, paused: !s.paused }));
    },
    enter() {
      change((s) => ({ ...s, entered: true }));
    },
  };
}
export type SessionStore = ReturnType<typeof useSessionStore>;
