import { BODIES } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { CAMPAIGN, type Level } from '../levels';
import type { Playback } from './flight-clock';
import { distanceText, unitOf } from './session';
import type { SessionStore } from './session-store';
import type { FlightView } from './use-campaign';

/** The stars for a finished flight, and what to do next. */
export function ResultCard({
  store,
  view,
  playback,
  pick,
}: {
  store: Pick<SessionStore, 'session' | 'level'>;
  view: Pick<FlightView, 'score' | 'flight'>;
  playback: Pick<Playback, 'retry' | 'replay'>;
  pick: (level: Level) => void;
}) {
  const { score, flight } = view,
    level = store.level;
  return (
    <section className="c-result" aria-label="Flight result">
      <span className="eyebrow">{score?.hit ? 'A new world within reach' : 'One more try'}</span>
      <h2>{score?.hit ? 'Nice shot, pilot.' : 'A little closer next time.'}</h2>
      <div aria-label={`${score?.stars ?? 0} stars`} className="c-stars">
        {'★'.repeat(score?.stars ?? 0)}
        {'☆'.repeat(3 - (score?.stars ?? 0))}
      </div>
      <p>
        {score?.hit
          ? `${BODIES[level.target].name} reached in ${flight?.analysis.flightDays.toFixed(0)} days.`
          : `Closest approach: ${distanceText(flight?.analysis.closestKm ?? 0, unitOf(store.session.preferences))}.`}
      </p>
      {store.session.hintUsed && <p>Guided attempt · Up to 2 stars</p>}
      <div className="result-actions">
        <button className="primary" onClick={playback.retry}>
          <Icon name="retry" />
          Try again
        </button>
        <button className="pill" onClick={playback.replay}>
          <Icon name="play" />
          Replay
        </button>
        {score?.hit && !level.sandbox && level.number < CAMPAIGN.length && (
          <button className="pill" onClick={() => pick(CAMPAIGN[level.number]!)}>
            Next mission →
          </button>
        )}
      </div>
    </section>
  );
}
