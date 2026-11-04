import { Icon } from '@starshot/presentation/icons';
import { useRef, useState, type Ref } from 'react';
import { deckMetrics } from './deck-metrics';
import { ModeButtons, UnitButton } from './DeckControls';
import { DeckPages } from './DeckPages';
import { LaunchPlanning } from './LaunchPlanning';
import type { Readiness } from './lunar-readiness';
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
  readiness,
}: {
  c: CampaignController;
  frame: SceneFrame;
  deck: Ref<HTMLElement>;
  camera: (mode: CameraMode) => void;
  map: boolean;
  openMap: () => void;
  guide: () => void;
  readiness: Readiness;
}) {
  const [page, setPage] = useState(0),
    swipe = useRef(0),
    p = c.store.session.preferences,
    aim = c.store.session.phase === 'aim';
  const metrics = deckMetrics(c),
    { fuel, impact, compactStatus } = metrics;
  // Launch and Guide say in visible text why they wait, so the cue is not the dimmed colour alone.
  // The line takes its own row above them: placed out of flow, it covered the orbit slider.
  const wait = aim && !readiness.scene ? 'c-launch-wait' : undefined;
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
          readiness={readiness}
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
          {wait && (
            <p id={wait} className="c-wait">
              {readiness.reason}
            </p>
          )}
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
                // Busy, it stays focusable for a keyboard pilot; aria-disabled and the handler hold it.
                disabled={c.release.pending || !readiness.scene}
                aria-disabled={c.hints.hintBusy || undefined}
                aria-describedby={wait}
                onClick={c.hints.hintBusy ? undefined : guide}
              >
                <Icon name="guide" />
                <span>{c.hints.hintBusy ? 'Finding…' : 'Guide'}</span>
              </button>
              <button
                className="primary"
                disabled={c.release.pending || c.hydrating || !readiness.scene}
                aria-describedby={wait}
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

/**
 * Where the Moon model is, over the blank sky that waits for it, with Retry after a failure. The
 * polite live region in `CampaignApp` announces the same reason, so this panel is not one.
 */
export function MoonLoadPanel({ readiness, failed, retry }: { readiness: Readiness; failed: boolean; retry: () => void }) {
  if (readiness.scene) return null;
  return (
    <section className="c-moon-load" aria-label="Moon data" tabIndex={-1}>
      <p>{readiness.reason}</p>
      {failed && (
        <button className="pill" aria-label="Retry loading the Moon" onClick={retry}>
          Retry
        </button>
      )}
    </section>
  );
}
