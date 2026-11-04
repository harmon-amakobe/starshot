import { BODIES, dateFromEt } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { bodyName } from '../missions';
import type { deckMetrics } from './deck-metrics';
import type { Readiness } from './lunar-readiness';
import type { SceneFrame } from './scene-types';
import { distanceText, unitOf } from './session';
import type { CampaignController } from './use-campaign';
export function DeckPages({
  c,
  frame,
  page,
  setPage,
  swipe,
  metrics,
  readiness,
}: {
  c: CampaignController;
  frame: SceneFrame;
  page: number;
  setPage: (value: number) => void;
  swipe: React.RefObject<number>;
  metrics: ReturnType<typeof deckMetrics>;
  readiness: Readiness;
}) {
  const p = c.store.session.preferences,
    aim = c.store.session.phase === 'aim',
    response = c.view.active;
  const { dv, fuel, status, speed } = metrics;
  return (
    <>
      <div
        className="c-deck-page"
        onTouchStart={(e) => {
          swipe.current = e.touches[0]!.clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0]!.clientX - swipe.current;
          if (Math.abs(dx) > 60 && !(e.target instanceof HTMLInputElement))
            setPage(dx < 0 ? Math.min(2, page + 1) : Math.max(0, page - 1));
        }}
      >
        {page === 0 && (
          <div className="c-instruments">
            <div className="c-fuel">
              <span>{p.scientific ? 'Departure Δv' : 'Shot fuel'}</span>
              <strong>
                {p.scientific ? dv.toFixed(3) : Math.round(fuel)}
                <small>{p.scientific ? 'km/s' : '%'}</small>
              </strong>
              <meter min={0} max={100} value={fuel} />
              <small>
                {Math.round((c.store.session.aim.speedKmS / c.store.level.vInfMaxKmS) * 100)}%
                engine charge
              </small>
            </div>
            <div className="c-prediction">
              <Icon name={response?.analysis.hit ? 'guide' : 'orbit'} />
              <div>
                <b>{status}</b>
                <span>
                  {aim
                    ? `${c.store.session.aim.angleDeg.toFixed(2)}° · ${response ? `${response.analysis.flightDays.toFixed(c.store.session.parking ? 2 : 0)} days` : 'Computing'}`
                    : `${dateFromEt(c.view.clock).toISOString().slice(0, 10)} · ${c.store.session.paused ? 'Paused' : 'In flight'}`}
                </span>
                <span>
                  {distanceText(frame.targetDistance, unitOf(p))} to{' '}
                  {bodyName(c.store.level.target)}
                </span>
              </div>
            </div>
          </div>
        )}
        {page === 1 && (
          <div className="c-fine">
            <label>
              {c.store.session.parking ? 'Burn direction' : 'Direction'}{' '}
              <span>
                {c.store.session.parking
                  ? 'From prograde · −35 to 35°'
                  : 'Heliocentric · 0 to 360°'}
              </span>
              <input
                aria-label="Aim angle (degrees)"
                type="number"
                min={c.store.session.parking ? -35 : 0}
                max={c.store.session.parking ? 35 : 360}
                step="0.01"
                value={Number(c.store.session.aim.angleDeg.toFixed(2))}
                disabled={!aim || c.release.pending || !readiness.scene}
                onChange={(e) => {
                  if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber))
                    c.release.actions.aim({
                      ...c.store.session.aim,
                      angleDeg: e.target.valueAsNumber,
                    });
                }}
              />
            </label>
            <label>
              {c.store.session.parking ? 'Burn speed' : 'Departure speed'}{' '}
              <span>{c.store.session.parking ? 'Impulse · km/s' : 'Excess speed · km/s'}</span>
              <input
                aria-label="Departure speed (km/s)"
                type="number"
                min="0"
                max={c.store.level.vInfMaxKmS}
                step="0.001"
                value={Number(c.store.session.aim.speedKmS.toFixed(3))}
                disabled={!aim || c.release.pending || !readiness.scene}
                onChange={(e) => {
                  if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber))
                    c.release.actions.aim({
                      ...c.store.session.aim,
                      speedKmS: e.target.valueAsNumber,
                    });
                }}
              />
            </label>
            <p>
              {c.store.session.parking
                ? 'Zero burn stays in orbit. Pause to move the craft or choose a launch date.'
                : 'Fuel includes the Earth escape burn, even at zero excess speed. Pulling the ring adds energy to that departure.'}
            </p>
          </div>
        )}
        {page === 2 && (
          <div className="c-telemetry">
            <div>
              <span>Travel speed</span>
              <strong>
                {unitOf(p) === 'imperial' ? (speed / 1.609344).toFixed(2) : speed.toFixed(2)}{' '}
                <small>{unitOf(p) === 'imperial' ? 'mi/s' : 'km/s'}</small>
              </strong>
            </div>
            <div>
              <span>Closest approach</span>
              <strong>
                {response ? distanceText(response.analysis.closestKm, unitOf(p)) : 'Computing'}
              </strong>
            </div>
            <div>
              <span>
                {c.store.level.requiredFlyby
                  ? `${BODIES[c.store.level.requiredFlyby].name} flyby`
                  : 'Guide'}
              </span>
              <strong>
                {c.store.level.requiredFlyby
                  ? response?.analysis.requiredFlybyDone
                    ? 'On course'
                    : 'Not yet'
                  : c.store.session.hintUsed
                    ? 'Applied · 2 stars max'
                    : 'Unassisted'}
              </strong>
            </div>
          </div>
        )}
      </div>
      <nav className="c-page-tabs" aria-label="Flight deck pages">
        {['Overview', 'Fine aim', 'Telemetry'].map((title, i) => (
          <button
            key={title}
            aria-pressed={page === i}
            className={page === i ? 'selected' : ''}
            onClick={() => setPage(i)}
          >
            <i />
            {title}
          </button>
        ))}
      </nav>
      {c.store.session.phase !== 'aim' && c.view.flight && (
        <label className="c-timeline">
          <span>Journey</span>
          <input
            aria-label="Flight timeline"
            type="range"
            min={c.view.flight.shot.launchEt}
            max={c.view.flight.analysis.endEt}
            step={1}
            value={c.view.clock}
            onChange={(e) => c.playback.seek(Number(e.target.value))}
          />
          <output>
            {Math.round(
              ((c.view.clock - c.view.flight.shot.launchEt) /
                Math.max(1, c.view.flight.analysis.endEt - c.view.flight.shot.launchEt)) *
                100,
            )}
            %
          </output>
        </label>
      )}
    </>
  );
}
