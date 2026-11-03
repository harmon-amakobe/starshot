import { useEffect, useState } from 'react';
import type { CampaignController } from './use-campaign';
export function useMissionHeader(c: CampaignController, owner: string, pulling: boolean) {
  const [mission, setMission] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);
  useEffect(() => {
    setIntroDismissed(false);
  }, [owner, c.store.level.id, c.store.level.window.startIso]);
  useEffect(() => {
    if (pulling) setIntroDismissed(true);
  }, [pulling]);
  function openMission() {
    if (!mission && innerWidth < 900) c.playback.preferences({ expanded: false });
    setMission(!mission);
  }
  function openGuide() {
    if (innerWidth < 900) c.playback.preferences({ expanded: false });
    setMission(true);
    c.hints.guide();
  }
  return { mission, setMission, introDismissed, openMission, openGuide };
}
