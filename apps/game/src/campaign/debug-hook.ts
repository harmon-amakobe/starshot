import { dateFromEt } from '@starshot/ephemeris';
import type { Inspection } from '@starshot/presentation/vehicle';
import { useEffect, type RefObject } from 'react';
import type { MissionBody as BodyId } from '../missions';
import { shotKey } from '../sim/preview';
import type { PilotController } from './profiles';
import type { SceneFrame } from './scene-types';
import type { CampaignController } from './use-campaign';
import { summaryOf } from './use-campaign';
export function useDebugHook(
  live: RefObject<{
    c: CampaignController;
    pilots: PilotController;
    home: boolean;
    map: boolean;
    focus: BodyId | null;
    inspection: Inspection | null;
  }>,
  frameRef: RefObject<SceneFrame>,
  measuredDeck: RefObject<number>,
) {
  useEffect(() => {
    Object.defineProperty(window, '__starshotCampaign', {
      configurable: true,
      get: () => {
        const l = live.current,
          s = l.c.store.snapshot(),
          f = l.c.view.flight,
          frame = frameRef.current;
        return structuredClone({
          levelId: s.levelId,
          target: s.target,
          day: s.day,
          launchIso: dateFromEt(l.c.store.shot.launchEt).toISOString(),
          aim: s.aim,
          shot: l.c.store.shot,
          shotKey: shotKey(l.c.store.shot),
          previewReady: !!l.c.view.preview,
          pendingRelease: l.c.release.pending,
          release: l.c.release.releaseOwner.pending,
          previewSummary: summaryOf(l.c.view.preview),
          flightSummary: summaryOf(f),
          previewShot: l.c.view.preview?.shot,
          flightShot: f?.shot,
          previewId: l.c.view.preview?.id,
          flightId: f?.id,
          phase: s.phase,
          et: s.et,
          parking: s.parking,
          fullPath: frame.ready ? l.c.view.active?.result.samples.length : 0,
          endEt: f?.analysis.endEt,
          paused: s.paused,
          hit: l.c.view.active?.analysis.hit,
          requiredFlyby: l.c.view.active?.analysis.requiredFlybyDone,
          hintUsed: s.hintUsed,
          stars: l.c.view.score?.stars,
          score: l.c.view.score,
          analysis: l.c.view.active?.analysis,
          owner: l.c.owner,
          profileId: l.pilots.pilot.id,
          hydrating: l.c.hydrating,
          visit: l.c.identity.visit,
          entryPhase: l.home ? 'menu' : 'playing',
          map: l.map,
          focus: l.focus,
          inspection: l.inspection,
          preferences: s.preferences,
          camera: s.preferences.camera,
          workerIdentity: l.c.identity.worker,
          rendererIdentity: frame.identity,
          renderer: frame.renderer,
          physicalCraft: frame.physicalCraft,
          displayCraft: frame.craft,
          renderedForward: frame.forward,
          heightKm: frame.heightKm,
          centre: frame.centre,
          snapping: l.c.release.snapping,
          projectedOrigin: frame.bodies.find((b) => b.id === 'earth')?.point,
          projectedTarget: frame.target,
          grip: frame.grip,
          travel: frame.travel,
          deckHeight: measuredDeck.current,
        });
      },
    });
    return () => {
      delete (window as unknown as Record<string, unknown>).__starshotCampaign;
    };
  }, []);
}
