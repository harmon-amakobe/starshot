import type { Inspection } from '@starshot/presentation/vehicle';
import type { MissionBody as BodyId } from '../missions';
import type { SceneState } from './scene-types';
import type { CampaignController } from './use-campaign';
export function sceneView(
  c: CampaignController,
  map: boolean,
  focus: BodyId | null,
  inspection: Inspection | null,
  demoCharge: number,
  moons: boolean,
  reduced: boolean,
  lock: SceneState['lock'],
) {
  const state: Omit<SceneState, 'et' | 'visualTime' | 'home'> = {
    level: c.store.level,
    parking: c.store.session.parking,
    launchEt: c.store.shot.launchEt,
    response: c.view.active,
    aim: c.store.session.aim,
    aiming: c.store.session.phase === 'aim',
    charge:
      c.store.session.phase === 'aim' ? c.store.session.aim.speedKmS / c.store.level.vInfMaxKmS : 0,
    firing: c.store.session.phase === 'flight',
    snap: c.release.snapping ? 1 : 0,
    map,
    focus,
    inspection,
    demoCharge,
    showMoons: moons,
    reduced,
    preferences: c.store.session.preferences,
    deckHeight: 200,
    lock: lock,
  };
  return state;
}
