import { BODIES, dateFromEt, norm } from '@starshot/ephemeris';
import { sampleAt } from '@starshot/physics';
import { Icon } from '@starshot/presentation/icons';
import { distanceText, unitOf } from './session';
import type { SessionStore } from './session-store';
import type { FlightView } from './use-campaign';
import type { Release } from './use-release';

type DeckStore = Pick<SessionStore, 'session' | 'level'>;

/** Fuel, engine charge and the predicted path, or the date in flight. */
export function OverviewPage({
  c,
  dv,
  fuel,
  status,
  targetDistance,
}: {
  c: { store: DeckStore; view: Pick<FlightView, 'active' | 'clock'> };
  dv: number;
  fuel: number;
  status: string;
  targetDistance: number;
}) {
  const p = c.store.session.preferences,
    aim = c.store.session.phase === 'aim',
    response = c.view.active;
  return (
    <div className="c-instruments">
      <div className="c-fuel">
        <span>{p.scientific ? 'Departure Δv' : 'Shot fuel'}</span>
        <strong>
          {p.scientific ? dv.toFixed(3) : Math.round(fuel)}
          <small>{p.scientific ? 'km/s' : '%'}</small>
        </strong>
        <meter min={0} max={100} value={fuel} />
        <small>
          {Math.round((c.store.session.aim.speedKmS / c.store.level.vInfMaxKmS) * 100)}% engine
          charge
        </small>
      </div>
      <div className="c-prediction">
        <Icon name={response?.analysis.hit ? 'guide' : 'orbit'} />
        <div>
          <b>{status}</b>
          <span>
            {aim
              ? `${c.store.session.aim.angleDeg.toFixed(2)}° · ${response ? `${response.analysis.flightDays.toFixed(0)} days` : 'Computing'}`
              : `${dateFromEt(c.view.clock).toISOString().slice(0, 10)} · ${c.store.session.paused ? 'Paused' : 'In flight'}`}
          </span>
          <span>
            {distanceText(targetDistance, unitOf(p))} to {BODIES[c.store.level.target].name}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Number inputs for the aim: the keyboard and screen-reader path to the same shot. */
export function FineAimPage({
  c,
}: {
  c: { store: DeckStore; release: Pick<Release, 'pending' | 'aim'> };
}) {
  const aim = c.store.session.phase === 'aim';
  return (
    <div className="c-fine">
      <label>
        Direction <span>Heliocentric · 0 to 360°</span>
        <input
          aria-label="Aim angle (degrees)"
          type="number"
          min="0"
          max="360"
          step="0.01"
          value={Number(c.store.session.aim.angleDeg.toFixed(2))}
          disabled={!aim || c.release.pending}
          onChange={(e) => {
            if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber))
              c.release.aim({ ...c.store.session.aim, angleDeg: e.target.valueAsNumber });
          }}
        />
      </label>
      <label>
        Departure speed <span>Excess speed · km/s</span>
        <input
          aria-label="Departure speed (km/s)"
          type="number"
          min="0"
          max={c.store.level.vInfMaxKmS}
          step="0.001"
          value={Number(c.store.session.aim.speedKmS.toFixed(3))}
          disabled={!aim || c.release.pending}
          onChange={(e) => {
            if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber))
              c.release.aim({ ...c.store.session.aim, speedKmS: e.target.valueAsNumber });
          }}
        />
      </label>
      <p>
        Fuel includes the Earth escape burn, even at zero excess speed. Pulling the ring adds energy
        to that departure.
      </p>
    </div>
  );
}

/** Travel speed, closest approach, and the flyby or guide status. */
export function TelemetryPage({
  c,
}: {
  c: { store: DeckStore; view: Pick<FlightView, 'active' | 'clock'> };
}) {
  const p = c.store.session.preferences,
    response = c.view.active;
  const speed = response ? norm(sampleAt(response.result, c.view.clock).v) : 0;
  return (
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
  );
}
