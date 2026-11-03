import { useState } from 'react';
import type { CloudController } from './cloud';
import type { MenuPanel } from './HomeMenu';
import type { PilotController } from './profiles';
import type { CampaignController } from './use-campaign';
export function useMenu(
  c: CampaignController,
  pilots: PilotController,
  cloud: CloudController,
  cancelGesture: () => void,
) {
  const [home, setHome] = useState(true);
  const [panel, setPanel] = useState<MenuPanel>('home');
  const [hidden, setHidden] = useState(false);
  function play() {
    c.store.enter();
    setHome(false);
    setHidden(false);
  }
  function menu() {
    cancelGesture();
    pilots.stash(c.store.snapshot());
    cloud.sync();
    setHome(true);
    setPanel('home');
    setHidden(false);
  }
  return { home, setHome, panel, setPanel, hidden, setHidden, play, menu };
}
