import { useRef } from 'react';
import { withResult } from '../progress';
import { ownerOf, useAutosave } from './autosave';
import { useCloud, type CloudController } from './cloud';
import { usePilots, type PilotController } from './profiles';
import { useCampaign, type CampaignController } from './use-campaign';

/**
 * Binds the selected pilot to the controller: the pilot's session seeds it, a finished
 * flight writes the pilot's stars, and autosave keeps the session. Sandbox flights
 * earn no stars.
 */
export function usePilotSession(): {
  pilots: PilotController;
  game: CampaignController;
  cloud: CloudController;
  owner: string;
} {
  const pilots = usePilots(),
    latest = useRef(pilots);
  latest.current = pilots;
  const owner = ownerOf(pilots);
  const game = useCampaign(pilots.pilot.session, owner, (score, res, save) => {
    const p = latest.current;
    p.stash(
      save,
      save.levelId === 'sandbox'
        ? p.pilot.progress
        : withResult(
            p.pilot.progress,
            save.levelId,
            score.stars,
            score.hit,
            res.analysis.deltaVKmS,
          ),
    );
  });
  const cloud = useCloud(pilots, game.store.snapshot, game.hydrating);
  useAutosave(pilots, game);
  return { pilots, game, cloud, owner };
}
