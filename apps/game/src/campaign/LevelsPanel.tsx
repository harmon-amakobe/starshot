import { BODIES, type PlanetId } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { CAMPAIGN, SANDBOX_TARGETS, sandboxLevel } from '../levels';
import { isUnlocked, totalStars } from '../progress';
import type { PilotController } from './profiles';
import type { Menu } from './use-menu';

/** Mission cards with earned stars and unlocks, playtest access, and the sandbox planets. */
export function LevelsPanel({
  pilots,
  menu,
}: {
  pilots: Pick<PilotController, 'pilot' | 'data' | 'togglePlaytest'>;
  menu: Pick<Menu, 'pick' | 'setPanel'>;
}) {
  return (
    <>
      <h2>Your next leap</h2>
      <p>{totalStars(pilots.pilot.progress)} earned stars · Four real launch windows.</p>
      <button
        className="setting-row"
        aria-pressed={pilots.data.playtest}
        onClick={pilots.togglePlaytest}
      >
        <span>Playtest access</span>
        <b>{pilots.data.playtest ? 'All missions open' : 'Earn your next mission'}</b>
      </button>
      <div className="campaign-cards">
        {CAMPAIGN.map((l, i) => {
          const unlocked = isUnlocked(
              CAMPAIGN.map((l) => l.id),
              i,
              pilots.pilot.progress,
            ),
            stars = pilots.pilot.progress.levels[l.id]?.stars ?? 0;
          return (
            <button
              key={l.id}
              className="level-card playable"
              aria-label={`Play ${l.title}`}
              disabled={!unlocked && !pilots.data.playtest}
              onClick={() => {
                menu.pick(l);
                menu.setPanel('home');
              }}
            >
              <span className="level-number">0{l.number}</span>
              <span>
                <b>{l.title}</b>
                <small>
                  Earth → {l.requiredFlyby ? `${BODIES[l.requiredFlyby].name} → ` : ''}
                  {BODIES[l.target].name}
                </small>
                <small>
                  {'★'.repeat(stars)}
                  {'☆'.repeat(3 - stars)} ·{' '}
                  {unlocked ? 'Unlocked' : pilots.data.playtest ? 'Playtest access' : 'Locked'}
                </small>
              </span>
              <Icon name={unlocked || pilots.data.playtest ? 'play' : 'lock'} />
            </button>
          );
        })}
      </div>
      <h3>Open Solar System</h3>
      <p>Seven destinations. Explore a fresh launch window.</p>
      <div className="sandbox-grid">
        {SANDBOX_TARGETS.map((id) => (
          <button
            className="pill"
            key={id}
            aria-label={`Sandbox ${BODIES[id].name}`}
            onClick={() => {
              menu.pick(sandboxLevel(id as PlanetId));
              menu.setPanel('home');
            }}
          >
            {BODIES[id].name}
          </button>
        ))}
      </div>
      <p>Playtest access does not award stars or change campaign progress.</p>
    </>
  );
}
