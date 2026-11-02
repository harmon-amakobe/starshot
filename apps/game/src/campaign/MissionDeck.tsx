import { BODIES, dateFromEt } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { DAY, daysBetweenIso } from '../sim/shot';
import type { SessionStore } from './session-store';
import type { Hints } from './use-hints';
import type { Release } from './use-release';
/** The mission's route and brief, its launch date, and the guide once one is found. */
export function MissionDeck({
  c,
  open,
  toggle,
}: {
  c: {
    store: Pick<SessionStore, 'session' | 'level' | 'shot'>;
    release: Pick<Release, 'pending' | 'day'>;
    hints: Pick<Hints, 'hint' | 'apply'>;
  };
  open: boolean;
  toggle: () => void;
}) {
  return (
    <section className={`c-mission ${open ? 'open' : ''}`} aria-label="Mission deck">
      <button className="pill c-mission-toggle" aria-expanded={open} onClick={toggle}>
        <span className="c-earth-dot" />
        <span className="c-mission-label">
          <b className="c-mission-short-title">{c.store.level.title}</b>
          <span className="c-mission-route">
            Earth <span>→</span>
            {c.store.level.requiredFlyby && (
              <>
                {BODIES[c.store.level.requiredFlyby].name}
                <span>→</span>
              </>
            )}
            {BODIES[c.store.level.target].name}
          </span>
        </span>
        <Icon name="down" />
      </button>
      {open && (
        <div className="c-mission-body">
          <div>
            <span className="eyebrow">
              {c.store.level.sandbox ? 'Open Solar System' : `Mission ${c.store.level.number}`}
            </span>
            <b>{c.store.level.title}</b>
            <p>{c.store.level.blurb}</p>
            <p>
              {c.store.level.captureZoneScale && c.store.level.captureZoneScale > 1
                ? 'Training zone: 3× the real sphere of influence. Later missions use the real capture zone.'
                : c.store.level.requiredFlyby
                  ? `A ${BODIES[c.store.level.requiredFlyby].name} flyby earns the skill star. Aim for the final target.`
                  : 'Reach the target, save fuel and aim for a close approach.'}
            </p>
          </div>
          <label>
            Launch date (UTC)
            <input
              aria-label="Launch date (UTC)"
              type="date"
              min={c.store.level.window.startIso}
              max={dateFromEt(
                c.store.shot.launchEt + (c.store.level.window.days - c.store.session.day) * DAY,
              )
                .toISOString()
                .slice(0, 10)}
              value={dateFromEt(c.store.shot.launchEt).toISOString().slice(0, 10)}
              disabled={c.store.session.phase !== 'aim' || c.release.pending}
              onChange={(e) => {
                if (e.target.value)
                  c.release.day(daysBetweenIso(c.store.level.window.startIso, e.target.value));
              }}
            />
            <span>
              Day {c.store.session.day + 1} of {c.store.level.window.days + 1}
            </span>
          </label>
          {c.hints.hint && (
            <div className="c-guide">
              <b>{c.hints.hint.hits ? 'Guide ready' : 'Closest guide'}</b>
              <span>
                {c.hints.hint.aim.angleDeg.toFixed(2)}° · {c.hints.hint.aim.speedKmS.toFixed(3)}{' '}
                km/s
              </span>
              <button
                className="primary"
                disabled={c.store.session.phase !== 'aim' || c.release.pending}
                onClick={c.hints.apply}
              >
                Apply guide
              </button>
              <small>
                Applying a guide limits this attempt to 2 stars. Retry keeps this limit.
              </small>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
