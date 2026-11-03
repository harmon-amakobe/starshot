import { useEffect, useState } from 'react';
import type { CampaignController } from './use-campaign';
export function useReducedMotionState() {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  return { reduced, setReduced };
}
export function useReducedParking(c: CampaignController, owner: string, reduced: boolean) {
  useEffect(() => {
    if (reduced && c.store.session.parking) c.release.actions.freezeParking();
  }, [owner, c.store.level.id, reduced]);
}
