import { useCallback, useMemo, useRef, useState } from 'react';
import { isLunarLevel } from '../missions';
import { launchEtForDay } from '../sim/shot';
import { finalRequest } from './contracts';
import { copySession, missionFor, type Session } from './session';

// Ref-first writes preserve sequential edits within a single pointer or guide event.
export function useSessionStore(initial: Session, time: React.RefObject<number>) {
  const [session, setSession] = useState(() => copySession(initial)),
    current = useRef(session);
  current.current = session;
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
  const change = useCallback((fn: (s: Session) => Session) => {
    const next = fn(current.current);
    current.current = next;
    setSession(next);
  }, []);
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
    current,
    level,
    launchEt,
    shot,
    change,
    snapshot,
    enter() {
      change((s) => ({ ...s, entered: true }));
    },
  };
}
export type SessionStore = ReturnType<typeof useSessionStore>;
