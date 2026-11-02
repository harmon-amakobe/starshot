import { useRef, useState, type Ref } from 'react';
import { BODIES } from '@starshot/ephemeris';
import { deltaVFromLeo } from '@starshot/physics';
import { Icon } from '@starshot/presentation/icons';
import { ModeButtons, UnitButton } from './DeckControls';
import { FineAimPage, OverviewPage, TelemetryPage } from './DeckPages';
import type { Playback } from './flight-clock';
import type { CameraMode } from './session';
import type { SessionStore } from './session-store';
import type { FlightView } from './use-campaign';
import type { Hints } from './use-hints';
import type { Release } from './use-release';

/** The parts of the controller the deck reads and drives. */
export interface DeckGame {
  store: Pick<SessionStore, 'session' | 'level' | 'preferences' | 'pause'>;
  view: Pick<FlightView, 'active' | 'flight' | 'clock' | 'score'>;
  release: Pick<Release, 'pending' | 'aim' | 'launch'>;
  playback: Pick<Playback, 'retry' | 'seek'>;
  hints: Pick<Hints, 'busy'>;
  hydrating: boolean;
}

/** The bottom sheet: compact status, three swipeable pages, the timeline and the actions. */
export function FlightDeck({
  c,
  targetDistance,
  deck,
  camera,
  map,
  openMap,
  guide,
}: {
  c: DeckGame;
  targetDistance: number;
  deck: Ref<HTMLElement>;
  camera: (mode: CameraMode) => void;
  map: boolean;
  openMap: () => void;
  guide: () => void;
}) {
  const [page, setPage] = useState(0),
    swipe = useRef(0),
    p = c.store.session.preferences,
    aim = c.store.session.phase === 'aim',
    response = c.view.active;
  const dv = deltaVFromLeo(c.store.session.aim.speedKmS),
    fuel = (dv / deltaVFromLeo(c.store.level.vInfMaxKmS)) * 100;
  const status = c.release.pending
    ? 'Preparing launch'
    : !response
      ? 'Updating path'
      : response.analysis.hit
        ? `${BODIES[c.store.level.target].name} approach lined up`
        : `This path misses ${BODIES[c.store.level.target].name}`;
  const compactStatus = c.release.pending
    ? 'Wait'
    : c.store.session.phase === 'result'
      ? `${c.view.score?.stars ?? 0} ★`
      : aim
        ? response
          ? response.analysis.hit
            ? 'Ready'
            : 'Miss'
          : 'Updating'
        : c.store.session.paused
          ? 'Paused'
          : 'Flying';
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
          onClick={() => c.store.preferences({ expanded: !p.expanded })}
        >
          <Icon name="down" />
          <span>Flight deck</span>
        </button>
        {!p.expanded && (
          <div
            className="c-compact"
            aria-label={`Shot fuel ${Math.round(fuel)} percent, angle ${c.store.session.aim.angleDeg.toFixed(1)} degrees, ${compactStatus}`}
          >
            <div>
              <span>
                Fuel <b>{Math.round(fuel)}%</b>
              </span>
              <meter min={0} max={100} value={fuel} />
            </div>
            <span className="c-mini-angle">↗ {c.store.session.aim.angleDeg.toFixed(1)}°</span>
            <b className="c-mini-status">{compactStatus}</b>
          </div>
        )}
        <div className="c-deck-preferences">
          <UnitButton store={c.store} />
          <ModeButtons store={c.store} />
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
              <OverviewPage
                c={c}
                dv={dv}
                fuel={fuel}
                status={status}
                targetDistance={targetDistance}
              />
            )}
            {page === 1 && <FineAimPage c={c} />}
            {page === 2 && <TelemetryPage c={c} />}
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
                aria-label={c.hints.busy ? 'Finding guide' : 'Guide'}
                disabled={c.hints.busy || c.release.pending}
                onClick={guide}
              >
                <Icon name="guide" />
                <span>{c.hints.busy ? 'Finding…' : 'Guide'}</span>
              </button>
              <button
                className="primary"
                disabled={c.release.pending || c.hydrating}
                onClick={() => c.release.launch()}
              >
                {c.release.pending ? 'Preparing…' : 'Launch'}
                <Icon name="play" />
              </button>
            </>
          ) : (
            <button
              className="primary"
              onClick={c.store.session.phase === 'result' ? c.playback.retry : c.store.pause}
            >
              <Icon
                name={
                  c.store.session.phase === 'result'
                    ? 'retry'
                    : c.store.session.paused
                      ? 'play'
                      : 'pause'
                }
              />
              {c.store.session.phase === 'result'
                ? 'Try again'
                : c.store.session.paused
                  ? 'Resume'
                  : 'Pause'}
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
