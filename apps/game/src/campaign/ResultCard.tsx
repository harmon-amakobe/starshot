import { Icon } from '@starshot/presentation/icons';
import { bodyName, nextMission, type Mission as Level } from '../missions';
import { impactBody } from './outcome';
import { distanceText, unitOf } from './session';

import type { CampaignController } from './use-campaign';

export function ResultCard({ c, pick }: { c: CampaignController; pick: (level: Level) => void }) {
  const impact = impactBody(c.view.flight);
  return (
    <section className="c-result" aria-label="Flight result">
      <span className="eyebrow">
        {c.view.score?.hit ? 'A new world within reach' : 'One more try'}
      </span>
      <h2>
        {impact
          ? `Impact with ${impact}.`
          : c.view.score?.hit
            ? 'Nice shot, pilot.'
            : 'A little closer next time.'}
      </h2>
      <div aria-label={`${c.view.score?.stars ?? 0} stars`} className="c-stars">
        {'★'.repeat(c.view.score?.stars ?? 0)}
        {'☆'.repeat(3 - (c.view.score?.stars ?? 0))}
      </div>
      <p>
        {impact
          ? `The flight ended at ${impact}'s surface. Adjust the burn or departure position and try again.`
          : c.view.score?.hit
            ? `${bodyName(c.store.level.target)} reached in ${c.view.flight?.analysis.flightDays.toFixed(0)} days.`
            : `Closest approach: ${distanceText(c.view.flight?.analysis.closestKm ?? 0, unitOf(c.store.session.preferences))}.`}
      </p>
      {c.store.session.hintUsed && <p>Guided attempt · Up to 2 stars</p>}
      <div className="result-actions">
        <button className="primary" onClick={c.playback.retry}>
          <Icon name="retry" />
          Try again
        </button>
        <button className="pill" onClick={c.playback.replay}>
          <Icon name="play" />
          Replay
        </button>
        {c.view.score?.hit && !c.store.level.sandbox && !!nextMission(c.store.level.id) && (
          <button
            className="pill"
            onClick={() => {
              const next = nextMission(c.store.level.id);
              if (next) pick(next);
            }}
          >
            Next mission →
          </button>
        )}
      </div>
    </section>
  );
}
