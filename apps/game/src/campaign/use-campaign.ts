import { useEffect, useState } from 'react';
import type { FlightRequest } from '../sim/flight-request';
import { previewForShot } from '../sim/preview';
import { useSimulation } from '../sim/useSimulation';
import { useFlightClock } from './flight-clock';
import { playbackControls } from './playback-controls';
import type { Session } from './session';
import { useSessionStore } from './session-store';
import { useHints } from './use-hints';
import { useRelease } from './use-release';
import { useHydration, useRestore, useRestorePreview } from './use-restore';
import { useResult, type RecordResult } from './use-result';
export { summaryOf } from './use-release';
let nextWorkerIdentity = 0;
export function useCampaign(initial: Session, owner: string, record: RecordResult) {
  const sim = useSimulation<FlightRequest>(),
    [workerIdentity] = useState(() => ++nextWorkerIdentity);
  const [notice, setNotice] = useState('');
  const clock = useFlightClock(initial.et),
    store = useSessionStore(initial, clock.time);
  const result = useResult(store, clock, record, setNotice),
    hydration = useHydration(owner);
  const { session, shot } = store,
    { restoring } = hydration;
  const preview = previewForShot(sim.preview, shot);
  // Preserve passive effect order: request, restore reconciliation, then launch commit.
  useEffect(() => {
    if (!session.parking || session.paused || restoring.current) sim.requestPreview(shot);
  }, [shot, sim.requestPreview, session.paused]);
  useRestorePreview(store, clock, result, hydration, sim, preview, setNotice);
  const release = useRelease({ store, clock, result, hydration, sim, preview, setNotice });
  const hints = useHints({ store, clock, hydration, release, sim, setNotice });
  const restore = useRestore({
    initial,
    owner,
    store,
    clock,
    result,
    hydration,
    cancel: release.cancel,
    resetHint: hints.reset,
    setNotice,
  });
  const playback = playbackControls({ store, clock, result, release, hydration });
  return {
    store,
    view: {
      preview,
      active: session.phase === 'aim' ? preview : clock.flight,
      flight: clock.flight,
      clock: clock.clock,
      time: clock.time,
      score: result.score,
    },
    release,
    hints,
    playback,
    hydrating: hydration.hydrating,
    restore,
    notice,
    // Read the token before layout restore so autosave rejects a newly selected pilot's old render.
    owner: hydration.token.current,
    identity: { worker: workerIdentity, visit: hydration.visit.current },
  };
}
export type CampaignController = ReturnType<typeof useCampaign>;
