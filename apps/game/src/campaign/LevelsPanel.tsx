import { BODIES, type PlanetId } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { SANDBOX_TARGETS, sandboxLevel } from '../levels';
import { MISSIONS as CAMPAIGN, bodyName } from '../missions';
import { totalStars } from '../progress';
import type { HomeMenuProps } from './menu-types';
export function LevelsPanel({
  pilots,
  pick,
  setPanel,
}: Pick<HomeMenuProps, 'pilots' | 'pick' | 'setPanel'>) {
  return (
    <>
      <h2>Your next leap</h2>
      <p>{totalStars(pilots.pilot.progress)} earned stars · Five real launch windows.</p>
      <button
        className="setting-row"
        aria-pressed={pilots.data.playtest}
        onClick={pilots.togglePlaytest}
      >
        <span>Playtest access</span>
        <b>{pilots.data.playtest ? 'All missions open' : 'Earn your next mission'}</b>
      </button>
      <div className="campaign-cards">
        {CAMPAIGN.map((l) => {
          const unlocked = pilots.hasAccess(l.id),
            stars = pilots.pilot.progress.levels[l.id]?.stars ?? 0;
          return (
            <button
              key={l.id}
              className="level-card playable"
              aria-label={`Play ${l.title}`}
              disabled={!unlocked && !pilots.data.playtest}
              onClick={() => {
                pick(l);
                setPanel('home');
              }}
            >
              <span className="level-number">0{l.number}</span>
              <span>
                <b>{l.title}</b>
                <small>
                  Earth → {l.requiredFlyby ? `${BODIES[l.requiredFlyby].name} → ` : ''}
                  {bodyName(l.target)}
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
              pick(sandboxLevel(id as PlanetId));
              setPanel('home');
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
