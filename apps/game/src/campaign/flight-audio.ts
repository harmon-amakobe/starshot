import { FlightAudio } from '@starshot/presentation/audio';
import { useEffect, useRef } from 'react';
import type { CampaignController } from './use-campaign';
export function useFlightAudio(c: CampaignController) {
  const audio = useRef(new FlightAudio());
  const sound = (kind: 'pull' | 'launch' | 'arrive', value?: number) => {
    audio.current.enabled = c.store.session.preferences.sound;
    audio.current.play(kind, value);
  };
  return { audio, sound };
}
export function useArrivalSound(phase: string, sound: (kind: 'arrive') => void) {
  useEffect(() => {
    if (phase === 'result') sound('arrive');
  }, [phase]);
}
