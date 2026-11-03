import type { Inspection } from '@starshot/presentation/vehicle';
import { useRef, useState } from 'react';
import { type Preferences } from './session';
import type { CampaignController } from './use-campaign';
export function useHangar(
  c: CampaignController,
  reduced: boolean,
  sound: (kind: 'pull' | 'launch' | 'arrive', value?: number) => void,
) {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [demoCharge, setDemoCharge] = useState(0);
  const demoDrag = useRef<{ x: number; charge: number } | null>(null);
  const hangarReturn = useRef<Preferences | null>(null);
  function backFromHangar() {
    setInspection(null);
    if (hangarReturn.current) c.playback.preferences(hangarReturn.current);
  }
  function releaseDemo() {
    sound('launch', demoCharge);
    const start = performance.now(),
      charge = demoCharge;
    const animate = (t: number) => {
      const u = Math.min(1, (t - start) / (reduced ? 1 : 180));
      setDemoCharge(charge * (1 - u) ** 3);
      if (u < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
  return {
    inspection,
    setInspection,
    demoCharge,
    setDemoCharge,
    demoDrag,
    hangarReturn,
    backFromHangar,
    releaseDemo,
  };
}
