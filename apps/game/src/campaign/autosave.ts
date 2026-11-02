import { useEffect, useRef } from 'react';
import type { PilotController } from './profiles';
import type { Session } from './session';

/** The owner string the controller is keyed by: a pilot switch or reload changes it. */
export const ownerOf = (pilots: Pick<PilotController, 'pilot' | 'revision'>) =>
  `${pilots.pilot.id}:${pilots.revision}`;

/** Autosave only a settled session that still belongs to the selected pilot. */
export const shouldAutosave = (hydrating: boolean, controllerOwner: string, pilotOwner: string) =>
  !hydrating && controllerOwner === pilotOwner;

/**
 * Saves every 1.2 s and when the page is hidden. Saves from the menu, a mission pick and
 * the profile actions write directly and do not pass this guard.
 */
export function useAutosave(
  pilots: PilotController,
  game: { hydrating: boolean; owner: string; store: { snapshot(): Session } },
) {
  const live = useRef({ pilots, game });
  live.current = { pilots, game };
  useEffect(() => {
    const save = () => {
      const l = live.current;
      if (shouldAutosave(l.game.hydrating, l.game.owner, ownerOf(l.pilots)))
        l.pilots.stash(l.game.store.snapshot());
    };
    const timer = setInterval(save, 1200);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', save);
    };
  }, []);
}
