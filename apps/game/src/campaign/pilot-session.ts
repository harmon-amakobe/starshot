import { useRef } from 'react';
import { useCloud, type CloudController } from './cloud';
import { usePilots, type PilotController } from './profiles';
import { useCampaign, type CampaignController } from './use-campaign';
export function usePilotSession(): {
  pilots: PilotController;
  owner: string;
  c: CampaignController;
  cloud: CloudController;
} {
  const pilots = usePilots(),
    pilotLive = useRef(pilots);
  pilotLive.current = pilots;
  const owner = `${pilots.pilot.id}:${pilots.revision}`;
  const c = useCampaign(pilots.pilot.session, owner, (score, res, save) => {
    const p = pilotLive.current;
    p.record(save, score, res.analysis.deltaVKmS);
  });
  const cloud = useCloud(pilots, c.store.snapshot, c.hydrating);
  return { pilots, owner, c, cloud };
}
