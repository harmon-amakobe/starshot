import { useEffect, useRef } from 'react';
import { FlightAudio } from '@starshot/presentation/audio';
import type { Session } from './session';

export type Sound = (kind: 'pull' | 'launch' | 'arrive', value?: number) => void;

/** Flight sounds follow the pilot's sound preference at the moment they play. */
export function useFlightAudio(session: Session): Sound {
  const audio = useRef(new FlightAudio());
  const sound: Sound = (kind, value) => {
    audio.current.enabled = session.preferences.sound;
    audio.current.play(kind, value);
  };
  useEffect(() => () => audio.current.dispose(), []);
  useEffect(() => {
    if (session.phase === 'result') sound('arrive');
  }, [session.phase]);
  return sound;
}
