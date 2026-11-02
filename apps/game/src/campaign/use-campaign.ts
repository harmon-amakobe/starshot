import { useEffect, useState } from 'react';
import { previewForShot } from '../sim/preview';
import { useSimulation } from '../sim/useSimulation';
import { playbackControls, useFlightClock } from './flight-clock';
import type { Session } from './session';
import { useSessionStore } from './session-store';
import { useHints } from './use-hints';
import { useRelease } from './use-release';
import { useHydration, useRestore } from './use-restore';
import { useResult, type RecordResult } from './use-result';

// Counts mounted controllers, so the debug hook can show that a remount made a new worker.
let nextWorkerIdentity = 0;

/**
 * The campaign controller: one worker, one session and one flight clock for the mounted
 * shell. Each part is a focused hook; shared refs pass between them as arguments.
 */
export function useCampaign(initial: Session, owner: string, record: RecordResult) {
  const sim = useSimulation(),
    [workerIdentity] = useState(() => ++nextWorkerIdentity),
    [notice, announce] = useState('');
  const clock = useFlightClock(initial.et);
  const store = useSessionStore(initial, clock.time);
  const result = useResult(store, clock, record, announce);
  const preview = previewForShot(sim.preview, store.shot);
  // Effect order is behaviour, so these calls keep it: the preview request, restore
  // reconciliation and its fallback (useHydration), then the launch commit and the launch
  // failure (useRelease). useRestore's layout effect runs before all of them.
  useEffect(() => {
    sim.requestPreview(store.shot);
  }, [store.shot, sim.requestPreview]);
  const visit = useHydration({
    owner,
    answeredKey: sim.answeredKey,
    store,
    clock,
    result,
    preview,
    announce,
  });
  const release = useRelease({ sim, store, clock, result, preview, visit, announce });
  const hints = useHints({ sim, store, release, visit, announce });
  const restore = useRestore({
    owner,
    initial,
    hydration: visit,
    store,
    clock,
    release,
    result,
    hints,
    announce,
  });
  const playback = playbackControls({ store, clock, release, result, restoring: visit.restoring });
  return {
    store,
    view: {
      preview,
      active: store.session.phase === 'aim' ? preview : clock.flight,
      flight: clock.flight,
      clock: clock.clock,
      time: clock.time,
      score: result.score,
    },
    release,
    hints,
    playback,
    hydrating: visit.hydrating,
    restore,
    notice,
    // The token as it stood at render. On the render where the pilot changes, the layout
    // effect has not claimed the new owner yet, so this still names the old pilot and the
    // autosave guard rejects that render. The `owner` argument would let autosave write
    // the old pilot's session into the new pilot.
    owner: visit.token.current,
    identity: { worker: workerIdentity, visit: visit.epoch.current },
  };
}
export type CampaignController = ReturnType<typeof useCampaign>;
export type FlightView = CampaignController['view'];
