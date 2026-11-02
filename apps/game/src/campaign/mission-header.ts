import { useEffect, useState } from 'react';
import type { SessionStore } from './session-store';

// Below this width the open mission deck and the expanded flight deck cannot both fit.
const NARROW_SCREEN_PX = 900;
const narrow = () => innerWidth < NARROW_SCREEN_PX;

/**
 * The mission deck at the top of play, and the intro caption under it. The caption
 * fades for good after the first pull, until the pilot or the mission changes.
 */
export function useMissionHeader(input: {
  owner: string;
  store: Pick<SessionStore, 'session' | 'level' | 'preferences'>;
  pulling: boolean;
  map: boolean;
  guide: () => void;
}) {
  const { store } = input;
  const [open, setOpen] = useState(false),
    [introDismissed, setIntroDismissed] = useState(false);
  useEffect(() => {
    setIntroDismissed(false);
  }, [input.owner, store.level.id, store.level.window.startIso]);
  useEffect(() => {
    if (input.pulling) setIntroDismissed(true);
  }, [input.pulling]);
  useEffect(() => {
    if (store.session.preferences.expanded && open && narrow()) setOpen(false);
  }, [store.session.preferences.expanded]);
  return {
    open,
    captionFaded:
      input.pulling || introDismissed || store.session.phase !== 'aim' || input.map || open,
    toggle() {
      if (!open && narrow()) store.preferences({ expanded: false });
      setOpen(!open);
    },
    /** Asks for a guide and opens the deck where it appears. */
    guide() {
      if (narrow()) store.preferences({ expanded: false });
      setOpen(true);
      input.guide();
    },
    close() {
      setOpen(false);
    },
  };
}
export type MissionHeader = ReturnType<typeof useMissionHeader>;
