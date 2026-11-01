import { useRef, useState, type Ref } from 'react';
import { BODIES, dateFromEt, norm } from '@starshot/ephemeris';
import { deltaVFromLeo, sampleAt } from '@starshot/physics';
import { Icon } from '@starshot/presentation/icons';
import type { CampaignController } from './use-campaign';
import { distanceText, unitOf, type CameraMode } from './session';
import type { SceneFrame } from './scene-types';
import { stepRate } from './playback';
export function UnitButton({ c }: { c: CampaignController }) {
  const p = c.session.preferences,
    unit = unitOf(p),
    names = { light: 'Light-time', metric: 'Metric', imperial: 'Imperial' };
  return (
    <button
      className="pill c-units"
      aria-label={`Units: ${names[unit]}. Change units`}
      onClick={() => {
        const order = ['light', 'metric', 'imperial'] as const;
        c.preferences({
          units: {
            ...p.units,
            [p.scientific ? 'science' : 'simple']: order[(order.indexOf(unit) + 1) % 3]!,
          },
        });
      }}
    >
      {unit === 'light' ? (
        <Icon name="wave" />
      ) : (
        <b className="unit-symbol">{unit === 'metric' ? 'km' : 'mi'}</b>
      )}
      <span>{names[unit]}</span>
    </button>
  );
}
export function ModeButtons({ c }: { c: CampaignController }) {
  const p = c.session.preferences;
  return (
    <div className="c-modes" role="group" aria-label="Instrument detail">
      {[false, true].map((scientific) => (
        <button
          key={String(scientific)}
          className={`${p.scientific === scientific ? 'selected' : ''} ${p.expanded && p.scientific === scientific ? 'pill' : 'icon-only'}`}
          aria-label={scientific ? 'Scientific' : 'Simplified'}
          aria-pressed={p.scientific === scientific}
          title={scientific ? 'Scientific' : 'Simplified'}
          onClick={() =>
            c.preferences({ scientific, ...(p.sizeLinked ? { trueSize: scientific } : {}) })
          }
        >
          <Icon name={scientific ? 'orbit' : 'face'} />
          {p.expanded && p.scientific === scientific && (
            <span>{scientific ? 'Scientific' : 'Simplified'}</span>
          )}
        </button>
      ))}
    </div>
  );
}
export function SpeedPill({ c }: { c: CampaignController }) {
  const p = c.session.preferences,
    f = c.active,
    base = f
      ? (f.analysis.endEt - f.shot.launchEt) /
        Math.max(4, Math.min(9, 2.5 + f.analysis.flightDays / 200))
      : 86400;
  const light = p.scientific && unitOf(p) === 'light';
  const steps = light
    ? [0, 0.25, 0.5, 0.75, 1, 2, 5, 10, 25, 100, 300]
    : p.scientific
      ? [1, 60, 3600, 86400, 864000, 8640000, 86400000, 1e9]
      : [1, base, base * 2, base * 3, base * 5, base * 10];
  const value = light ? p.lightRate : p.rate,
    effective = light ? value : value || base,
    multiple = effective / base;
  const label = light
    ? value === 0
      ? 'Real time'
      : `${value}c`
    : value === 1
      ? 'Real time'
      : p.scientific
        ? `${(effective / 86400).toPrecision(3)} day/s`
        : `${multiple < 0.01 ? multiple.toPrecision(2) : Number(multiple.toFixed(2))}x`;
  const step = (direction: number) => {
    const next = stepRate(effective, steps, direction);
    c.preferences(light ? { lightRate: next } : { rate: next === base ? 0 : next });
  };
  return (
    <div
      className="pill c-speed"
      aria-label="Trip speed"
      title="Double-click for real time"
      onDoubleClick={() => c.preferences({ rate: 1, lightRate: 0 })}
    >
      <button aria-label="Decrease trip speed" onClick={() => step(-1)}>
        <span aria-hidden="true">◂</span>
      </button>
      <output>{label}</output>
      <button aria-label="Increase trip speed" onClick={() => step(1)}>
        <span aria-hidden="true">▸▸</span>
      </button>
    </div>
  );
}
export function FlightDeck({
  c,
  frame,
  deck,
  camera,
  map,
  openMap,
  guide,
}: {
  c: CampaignController;
  frame: SceneFrame;
  deck: Ref<HTMLElement>;
  camera: (mode: CameraMode) => void;
  map: boolean;
  openMap: () => void;
  guide: () => void;
}) {
  const [page, setPage] = useState(0),
    swipe = useRef(0),
    p = c.session.preferences,
    aim = c.session.phase === 'aim',
    response = c.active;
  const dv = deltaVFromLeo(c.session.aim.speedKmS),
    fuel = (dv / deltaVFromLeo(c.level.vInfMaxKmS)) * 100;
  const status = c.pending
    ? 'Preparing launch'
    : !response
      ? 'Updating path'
      : response.analysis.hit
        ? `${BODIES[c.level.target].name} approach lined up`
        : `This path misses ${BODIES[c.level.target].name}`;
  const compactStatus = c.pending
    ? 'Wait'
    : c.session.phase === 'result'
      ? `${c.score?.stars ?? 0} ★`
      : aim
        ? response
          ? response.analysis.hit
            ? 'Ready'
            : 'Miss'
          : 'Updating'
        : c.session.paused
          ? 'Paused'
          : 'Flying';
  const speed = response ? norm(sampleAt(response.result, c.clock).v) : 0;
  return (
    <section
      ref={deck}
      className={`c-deck ${p.expanded ? 'expanded' : 'collapsed'}`}
      aria-label="Flight deck"
      data-expanded={p.expanded}
    >
      <header className="c-deck-heading">
        <button
          className="c-deck-title"
          aria-label={p.expanded ? 'Collapse flight deck' : 'Expand flight deck'}
          aria-expanded={p.expanded}
          onClick={() => c.preferences({ expanded: !p.expanded })}
        >
          <Icon name="down" />
          <span>Flight deck</span>
        </button>
        {!p.expanded && (
          <div
            className="c-compact"
            aria-label={`Shot fuel ${Math.round(fuel)} percent, angle ${c.session.aim.angleDeg.toFixed(1)} degrees, ${compactStatus}`}
          >
            <div>
              <span>
                Fuel <b>{Math.round(fuel)}%</b>
              </span>
              <meter min={0} max={100} value={fuel} />
            </div>
            <span className="c-mini-angle">↗ {c.session.aim.angleDeg.toFixed(1)}°</span>
            <b className="c-mini-status">{compactStatus}</b>
          </div>
        )}
        <div className="c-deck-preferences">
          <UnitButton c={c} />
          <ModeButtons c={c} />
        </div>
      </header>
      {p.expanded && (
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
                    {Math.round((c.session.aim.speedKmS / c.level.vInfMaxKmS) * 100)}% engine charge
                  </small>
                </div>
                <div className="c-prediction">
                  <Icon name={response?.analysis.hit ? 'guide' : 'orbit'} />
                  <div>
                    <b>{status}</b>
                    <span>
                      {aim
                        ? `${c.session.aim.angleDeg.toFixed(2)}° · ${response ? `${response.analysis.flightDays.toFixed(0)} days` : 'Computing'}`
                        : `${dateFromEt(c.clock).toISOString().slice(0, 10)} · ${c.session.paused ? 'Paused' : 'In flight'}`}
                    </span>
                    <span>
                      {distanceText(frame.targetDistance, unitOf(p))} to{' '}
                      {BODIES[c.level.target].name}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {page === 1 && (
              <div className="c-fine">
                <label>
                  Direction <span>Heliocentric · 0 to 360°</span>
                  <input
                    aria-label="Aim angle (degrees)"
                    type="number"
                    min="0"
                    max="360"
                    step="0.01"
                    value={Number(c.session.aim.angleDeg.toFixed(2))}
                    disabled={!aim || c.pending}
                    onChange={(e) => {
                      if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber))
                        c.aim({ ...c.session.aim, angleDeg: e.target.valueAsNumber });
                    }}
                  />
                </label>
                <label>
                  Departure speed <span>Excess speed · km/s</span>
                  <input
                    aria-label="Departure speed (km/s)"
                    type="number"
                    min="0"
                    max={c.level.vInfMaxKmS}
                    step="0.001"
                    value={Number(c.session.aim.speedKmS.toFixed(3))}
                    disabled={!aim || c.pending}
                    onChange={(e) => {
                      if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber))
                        c.aim({ ...c.session.aim, speedKmS: e.target.valueAsNumber });
                    }}
                  />
                </label>
                <p>
                  Fuel includes the Earth escape burn, even at zero excess speed. Pulling the ring
                  adds energy to that departure.
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
                    {c.level.requiredFlyby
                      ? `${BODIES[c.level.requiredFlyby].name} flyby`
                      : 'Guide'}
                  </span>
                  <strong>
                    {c.level.requiredFlyby
                      ? response?.analysis.requiredFlybyDone
                        ? 'On course'
                        : 'Not yet'
                      : c.session.hintUsed
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
          {c.session.phase !== 'aim' && c.flight && (
            <label className="c-timeline">
              <span>Journey</span>
              <input
                aria-label="Flight timeline"
                type="range"
                min={c.flight.shot.launchEt}
                max={c.flight.analysis.endEt}
                step={1}
                value={c.clock}
                onChange={(e) => c.seek(Number(e.target.value))}
              />
              <output>
                {Math.round(
                  ((c.clock - c.flight.shot.launchEt) /
                    Math.max(1, c.flight.analysis.endEt - c.flight.shot.launchEt)) *
                    100,
                )}
                %
              </output>
            </label>
          )}
        </>
      )}
      <footer className="c-deck-footer">
        <div className="c-cameras" role="group" aria-label="Camera">
          {(['follow', 'system', 'free'] as const).map((mode) => (
            <button
              key={mode}
              aria-label={`${mode[0]!.toUpperCase() + mode.slice(1)} camera`}
              aria-pressed={p.camera === mode}
              className={p.camera === mode ? 'selected' : ''}
              onClick={() => camera(mode)}
            >
              <Icon name={mode} />
              <span>{mode[0]!.toUpperCase() + mode.slice(1)}</span>
            </button>
          ))}
        </div>
        <div className="c-actions">
          <button
            className="pill"
            aria-label={map ? 'Return to flight' : 'Launch window'}
            onClick={openMap}
          >
            <Icon name="system" />
            <span>{map ? 'Return to flight' : 'Launch window'}</span>
          </button>
          {aim ? (
            <>
              <button
                className="pill"
                aria-label={c.hintBusy ? 'Finding guide' : 'Guide'}
                disabled={c.hintBusy || c.pending}
                onClick={guide}
              >
                <Icon name="guide" />
                <span>{c.hintBusy ? 'Finding…' : 'Guide'}</span>
              </button>
              <button
                className="primary"
                disabled={c.pending || c.hydrating}
                onClick={() => c.launch()}
              >
                {c.pending ? 'Preparing…' : 'Launch'}
                <Icon name="play" />
              </button>
            </>
          ) : (
            <button className="primary" onClick={c.session.phase === 'result' ? c.retry : c.pause}>
              <Icon
                name={c.session.phase === 'result' ? 'retry' : c.session.paused ? 'play' : 'pause'}
              />
              {c.session.phase === 'result' ? 'Try again' : c.session.paused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
