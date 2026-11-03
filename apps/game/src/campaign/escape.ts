import type { Inspection } from '@starshot/presentation/vehicle';
import { useEffect } from 'react';
import type { MissionBody as BodyId } from '../missions';
import type { useGestures } from './gestures';
import type { CampaignController } from './use-campaign';
export function useEscape(
  c: CampaignController,
  gestures: ReturnType<typeof useGestures>,
  inspection: Inspection | null,
  focus: BodyId | null,
  selected: BodyId | null,
  home: boolean,
  backFromHangar: () => void,
  closeFocus: () => void,
  setSelected: (id: BodyId | null) => void,
  menu: () => void,
) {
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (gestures.isDragging() || c.release.pending) {
        e.preventDefault();
        gestures.cancel();
      } else if (inspection) backFromHangar();
      else if (focus) closeFocus();
      else if (selected) setSelected(null);
      else if (!home) menu();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  });
}
