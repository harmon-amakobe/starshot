import { useEffect, useRef, type RefObject } from 'react';
import { dateFromEt, type BodyId } from '@starshot/ephemeris';
import type { Inspection } from '@starshot/presentation/vehicle';
import { shotKey } from '../sim/preview';
import { summaryOf } from './contracts';
import type { PilotController } from './profiles';
import type { SceneFrame } from './scene-types';
import type { CampaignController } from './use-campaign';

export interface DebugSource {
  game: CampaignController;
  pilots: Pick<PilotController, 'pilot'>;
  home: boolean;
  map: boolean;
  focus: BodyId | null;
  inspection: Inspection | null;
  rendered: RefObject<SceneFrame>;
  measuredDeck: RefObject<number>;
}

/** A cloned, read-only record for browser verification; its keys are a contract. */
export function campaignDebugSnapshot(l: DebugSource) {
  const c = l.game,
    s = c.store.snapshot(),
    f = c.view.flight,
    frame = l.rendered.current;
  return structuredClone({
    levelId: s.levelId,
    target: s.target,
    day: s.day,
    launchIso: dateFromEt(c.store.shot.launchEt).toISOString(),
    aim: s.aim,
    shot: c.store.shot,
    shotKey: shotKey(c.store.shot),
    previewReady: !!c.view.preview,
    pendingRelease: c.release.pending,
    release: c.release.owner.pending,
    previewSummary: summaryOf(c.view.preview),
    flightSummary: summaryOf(f),
    previewShot: c.view.preview?.shot,
    flightShot: f?.shot,
    previewId: c.view.preview?.id,
    flightId: f?.id,
    phase: s.phase,
    et: s.et,
    endEt: f?.analysis.endEt,
    paused: s.paused,
    hit: c.view.active?.analysis.hit,
    requiredFlyby: c.view.active?.analysis.requiredFlybyDone,
    hintUsed: s.hintUsed,
    stars: c.view.score?.stars,
    score: c.view.score,
    analysis: c.view.active?.analysis,
    owner: c.owner,
    profileId: l.pilots.pilot.id,
    hydrating: c.hydrating,
    visit: c.identity.visit,
    entryPhase: l.home ? 'menu' : 'playing',
    map: l.map,
    focus: l.focus,
    inspection: l.inspection,
    preferences: s.preferences,
    camera: s.preferences.camera,
    workerIdentity: c.identity.worker,
    rendererIdentity: frame.identity,
    renderer: frame.renderer,
    physicalCraft: frame.physicalCraft,
    displayCraft: frame.craft,
    renderedForward: frame.forward,
    heightKm: frame.heightKm,
    centre: frame.centre,
    snapping: c.release.snapping,
    projectedOrigin: frame.bodies.find((b) => b.id === 'earth')?.point,
    projectedTarget: frame.target,
    grip: frame.grip,
    travel: frame.travel,
    deckHeight: l.measuredDeck.current,
  });
}

/** Installs `window.__starshotCampaign` for the life of the shell; each read is fresh. */
export function useDebugHook(source: DebugSource) {
  const live = useRef(source);
  live.current = source;
  useEffect(() => {
    Object.defineProperty(window, '__starshotCampaign', {
      configurable: true,
      get: () => campaignDebugSnapshot(live.current),
    });
    return () => {
      delete (window as unknown as Record<string, unknown>).__starshotCampaign;
    };
  }, []);
}
