import { useEffect, type RefObject } from 'react';
import type { PilotController } from './profiles';
import type { CampaignController } from './use-campaign';
export function useAutosave(live: RefObject<{ c: CampaignController; pilots: PilotController }>) {
  useEffect(() => {
    const save = () => {
      const l = live.current;
      if (!l.c.hydrating && l.c.owner === `${l.pilots.pilot.id}:${l.pilots.revision}`)
        l.pilots.stash(l.c.store.snapshot());
    };
    const timer = setInterval(save, 1200);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', save);
    };
  }, []);
}
