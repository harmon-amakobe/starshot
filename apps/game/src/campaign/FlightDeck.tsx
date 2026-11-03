import { Icon } from '@starshot/presentation/icons';
import { useRef, useState, type Ref } from 'react';
import { deckMetrics } from './deck-metrics';
import { ModeButtons, UnitButton } from './DeckControls';
import { DeckPages } from './DeckPages';
import { LaunchPlanning } from './LaunchPlanning';
import type { SceneFrame } from './scene-types';
import { type CameraMode } from './session';
import type { CampaignController } from './use-campaign';
export { SpeedPill } from './DeckControls';

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
    p = c.store.session.preferences,
    aim = c.store.session.phase === 'aim';
  const metrics = deckMetrics(c),
    { fuel, impact, compactStatus } = metrics;
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
          onClick={() => c.playback.preferences({ expanded: !p.expanded })}
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
          <UnitButton c={c} />
          <ModeButtons c={c} />
        </div>
      </header>
      {p.expanded && (
        <DeckPages
          c={c}
          frame={frame}
          page={page}
          setPage={setPage}
          swipe={swipe}
          metrics={metrics}
        />
      )}
      {aim && impact && (
        <p className="c-impact" role="status">
          This path hits {impact}.
        </p>
      )}
      {aim && <LaunchPlanning c={c} />}
      <footer className="c-deck-footer">
        <div className="c-cameras" role="group" aria-label="Camera">
          {(['follow', 'orbit', 'system'] as const).map((mode) => (
            <button
              key={mode}
              aria-label={`${mode === 'follow' ? 'Craft' : mode === 'orbit' ? 'Orbit' : 'System'} view`}
              aria-pressed={p.camera === mode}
              className={p.camera === mode ? 'selected' : ''}
              onClick={() => camera(mode)}
            >
              <Icon name={mode === 'orbit' ? 'orbit' : mode} />
              <span>{mode === 'follow' ? 'Craft' : mode === 'orbit' ? 'Orbit' : 'System'}</span>
            </button>
          ))}
        </div>
        <div className="c-actions">
          {!c.store.session.parking && (
            <button
              className="pill"
              aria-label={map ? 'Mission view' : 'Solar system'}
              onClick={openMap}
            >
              <Icon name="system" />
              <span>{map ? 'Mission view' : 'Solar system'}</span>
            </button>
          )}
          {aim ? (
            <>
              <button
                className="pill"
                aria-label={c.hints.hintBusy ? 'Finding guide' : 'Guide'}
                disabled={c.hints.hintBusy || c.release.pending}
                onClick={guide}
              >
                <Icon name="guide" />
                <span>{c.hints.hintBusy ? 'Finding…' : 'Guide'}</span>
              </button>
              <button
                className="primary"
                disabled={c.release.pending || c.hydrating}
                onClick={() => c.release.actions.launch()}
              >
                {c.release.pending ? 'Preparing…' : 'Launch'}
                <Icon name="play" />
              </button>
            </>
          ) : (
            <button
              className="primary"
              onClick={c.store.session.phase === 'result' ? c.playback.retry : c.playback.pause}
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
