import { useRef, type RefObject } from 'react';
import type { Playback } from './flight-clock';
import type { SceneFrame, SceneState } from './scene-types';
import type { SessionStore } from './session-store';
import type { CameraViews } from './use-camera-views';
import type { FlightView } from './use-campaign';
import type { HangarState } from './use-hangar';
import type { Release } from './use-release';
import { useView } from './use-view';

/**
 * The scene's input for this render and the mounted view that draws it. `rendered` is
 * the frame as of this render: gestures and the debug hook measure against it, not
 * against the newer frame the render loop may already have drawn.
 */
export function useSceneView(input: {
  game: {
    store: Pick<SessionStore, 'session' | 'level' | 'shot'>;
    view: Pick<FlightView, 'active' | 'time'>;
    release: Pick<Release, 'snapping'>;
    playback: Pick<Playback, 'tick'>;
  };
  views: { map: boolean; focus: Pick<CameraViews['focus'], 'id' | 'moons'> };
  hangar: Pick<HangarState, 'part' | 'charge'>;
  home: boolean;
  lock: SceneState['lock'];
  reduced: boolean;
  rendered: RefObject<SceneFrame>;
}) {
  const { store, view: shown, release, playback } = input.game;
  const s = store.session,
    measuredDeck = useRef(200);
  const state: Omit<SceneState, 'et' | 'visualTime' | 'home'> = {
    level: store.level,
    launchEt: store.shot.launchEt,
    response: shown.active,
    aim: s.aim,
    aiming: s.phase === 'aim',
    charge: s.phase === 'aim' ? s.aim.speedKmS / store.level.vInfMaxKmS : 0,
    firing: s.phase === 'flight',
    snap: release.snapping ? 1 : 0,
    map: input.views.map,
    focus: input.views.focus.id,
    inspection: input.hangar.part,
    demoCharge: input.hangar.charge,
    showMoons: input.views.focus.moons,
    reduced: input.reduced,
    preferences: s.preferences,
    // Read before this render's measurement, so the scene sees the deck one render late.
    deckHeight: measuredDeck.current,
    lock: input.lock,
  };
  const view = useView(
    { tick: playback.tick, shot: store.shot, time: shown.time },
    state,
    input.home,
    input.home || !!input.hangar.part,
  );
  input.rendered.current = view.frameRef.current;
  measuredDeck.current = view.deckHeight;
  return { ...view, measuredDeck };
}
