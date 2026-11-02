import { useEffect, useState } from 'react';
import type { Level } from '../levels';
import type { CloudController } from './cloud';
import { useEscape } from './escape';
import type { Gestures } from './gestures';
import { useMissionHeader } from './mission-header';
import type { PilotController } from './profiles';
import { freshSession } from './session';
import { systemView, type CameraViews } from './use-camera-views';
import type { CampaignController } from './use-campaign';
import type { HangarState } from './use-hangar';

export type MenuPanel = 'home' | 'levels' | 'profiles' | 'settings' | 'signin' | 'stores' | 'help';

/**
 * Where the player is: the main menu and its panels, play, or play with the UI hidden,
 * plus the mission deck. Returning to the menu and picking a mission save at once,
 * outside the autosave guard. A pilot switch closes every view, and Escape backs out
 * one step at a time.
 */
export function useMenu(input: {
  owner: string;
  game: Pick<CampaignController, 'store' | 'release' | 'hints' | 'restore'>;
  pilots: Pick<PilotController, 'stash'>;
  cloud: Pick<CloudController, 'sync'>;
  gestures: Pick<Gestures, 'cancel' | 'isDragging' | 'pulling'>;
  views: Pick<CameraViews, 'map' | 'focus' | 'selected' | 'select' | 'leave'>;
  hangar: Pick<HangarState, 'part' | 'select' | 'back'>;
}) {
  const { game, pilots, gestures, views, hangar } = input;
  const [home, setHome] = useState(true),
    [panel, setPanel] = useState<MenuPanel>('home'),
    [hidden, setHidden] = useState(false);
  const mission = useMissionHeader({
    owner: input.owner,
    store: game.store,
    pulling: gestures.pulling,
    map: views.map,
    guide: game.hints.guide,
  });
  function open() {
    gestures.cancel();
    pilots.stash(game.store.snapshot());
    input.cloud.sync();
    setHome(true);
    setPanel('home');
    setHidden(false);
  }
  useEffect(() => {
    gestures.cancel();
    views.leave();
    views.select(null);
    hangar.select(null);
    mission.close();
  }, [input.owner]);
  useEscape({
    isDragging: gestures.isDragging,
    pending: game.release.pending,
    inspecting: !!hangar.part,
    focused: !!views.focus.id,
    selected: !!views.selected,
    home,
    cancel: gestures.cancel,
    back: hangar.back,
    closeFocus: views.focus.close,
    clearSelection: () => views.select(null),
    menu: open,
  });
  return {
    home,
    panel,
    hidden,
    setPanel,
    play() {
      game.store.enter();
      setHome(false);
      setHidden(false);
    },
    open,
    pick(level: Level) {
      gestures.cancel();
      const save = freshSession(level, { ...game.store.session.preferences, ...systemView() });
      game.restore(save);
      pilots.stash(save);
      views.leave();
      hangar.select(null);
    },
    hide() {
      setHome(false);
      setHidden(true);
    },
    show() {
      setHidden(false);
    },
    mission,
  };
}
export type Menu = ReturnType<typeof useMenu>;
