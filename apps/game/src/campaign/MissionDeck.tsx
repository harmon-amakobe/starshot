import { BODIES, dateFromEt } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { DAY, daysBetweenIso } from '../sim/shot';
import type { CampaignController } from './use-campaign';
export function MissionDeck({
  c,
  open,
  toggle,
}: {
  c: CampaignController;
  open: boolean;
  toggle: () => void;
}) {
  return (
    <section className={`c-mission ${open ? 'open' : ''}`} aria-label="Mission deck">
      <button className="pill c-mission-toggle" aria-expanded={open} onClick={toggle}>
        <span className="c-earth-dot" />
        <span className="c-mission-label">
          <b className="c-mission-short-title">{c.level.title}</b>
          <span className="c-mission-route">
            Earth <span>→</span>
            {c.level.requiredFlyby && (
              <>
                {BODIES[c.level.requiredFlyby].name}
                <span>→</span>
              </>
            )}
            {BODIES[c.level.target].name}
          </span>
        </span>
        <Icon name="down" />
      </button>
      {open && (
        <div className="c-mission-body">
          <div>
            <span className="eyebrow">
              {c.level.sandbox ? 'Open Solar System' : `Mission ${c.level.number}`}
            </span>
            <b>{c.level.title}</b>
            <p>{c.level.blurb}</p>
            <p>
              {c.level.captureZoneScale && c.level.captureZoneScale > 1
                ? 'Training zone: 3× the real sphere of influence. Later missions use the real capture zone.'
                : c.level.requiredFlyby
                  ? `A ${BODIES[c.level.requiredFlyby].name} flyby earns the skill star. Aim for the final target.`
                  : 'Reach the target, save fuel and aim for a close approach.'}
            </p>
          </div>
          <label>
            Launch date (UTC)
            <input
              aria-label="Launch date (UTC)"
              type="date"
              min={c.level.window.startIso}
              max={dateFromEt(c.shot.launchEt + (c.level.window.days - c.session.day) * DAY)
                .toISOString()
                .slice(0, 10)}
              value={dateFromEt(c.shot.launchEt).toISOString().slice(0, 10)}
              disabled={c.session.phase !== 'aim' || c.pending}
              onChange={(e) => {
                if (e.target.value) c.day(daysBetweenIso(c.level.window.startIso, e.target.value));
              }}
            />
            <span>
              Day {c.session.day + 1} of {c.level.window.days + 1}
            </span>
          </label>
          {c.hint && (
            <div className="c-guide">
              <b>{c.hint.hits ? 'Guide ready' : 'Closest guide'}</b>
              <span>
                {c.hint.aim.angleDeg.toFixed(2)}° · {c.hint.aim.speedKmS.toFixed(3)} km/s
              </span>
              <button
                className="primary"
                disabled={c.session.phase !== 'aim' || c.pending}
                onClick={c.applyGuide}
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
