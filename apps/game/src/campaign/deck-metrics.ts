import { norm } from '@starshot/ephemeris';
import { deltaVFromLeo, sampleAt } from '@starshot/physics';
import { bodyName } from '../missions';
import { impactBody } from './outcome';
import type { CampaignController } from './use-campaign';
export function deckMetrics(c: CampaignController) {
  const aim = c.store.session.phase === 'aim',
    response = c.view.active;
  const dv = c.store.session.parking
      ? c.store.session.aim.speedKmS
      : deltaVFromLeo(c.store.session.aim.speedKmS),
    fuel =
      (dv /
        (c.store.session.parking
          ? c.store.level.vInfMaxKmS
          : deltaVFromLeo(c.store.level.vInfMaxKmS))) *
      100;
  const impact = impactBody(response);
  const status =
    c.store.session.parking && aim && !c.store.session.paused
      ? 'Coasting in Earth orbit'
      : c.release.pending
        ? 'Preparing launch'
        : !response
          ? 'Updating path'
          : impact
            ? `This path hits ${impact}`
            : response.analysis.hit
              ? `${bodyName(c.store.level.target)} approach lined up`
              : `This path misses ${bodyName(c.store.level.target)}`;
  const compactStatus =
    c.store.session.parking && aim && !c.store.session.paused
      ? 'In orbit'
      : c.release.pending
        ? 'Wait'
        : c.store.session.phase === 'result'
          ? `${c.view.score?.stars ?? 0} ★`
          : aim
            ? impact
              ? `${impact} impact`
              : response
                ? response.analysis.hit
                  ? 'Ready'
                  : c.store.session.aim.speedKmS === 0
                    ? 'In orbit'
                    : 'Miss'
                : 'Updating'
            : c.store.session.paused
              ? 'Paused'
              : 'Flying';
  const speed = response ? norm(sampleAt(response.result, c.view.clock).v) : 0;
  return { dv, fuel, impact, status, compactStatus, speed };
}
