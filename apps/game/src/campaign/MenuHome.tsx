import { Icon } from '@starshot/presentation/icons';
import { bodyName, missionNumber } from '../missions';
import { readableVersion } from '../release-version';
import type { HomeMenuProps } from './menu-types';
import { distanceText, unitOf } from './session';
const releaseLabel = readableVersion(__STARSHOT_VERSION__);
export function MenuHome({
  c,
  pilots,
  frame,
  entering,
  setPanel,
  play,
  error,
}: Pick<HomeMenuProps, 'c' | 'pilots' | 'frame' | 'entering' | 'setPanel' | 'play' | 'error'>) {
  return (
    <>
      <div className="entry-title">
        <span className="eyebrow">A small ship. A very big sky.</span>
        <h1>starshot</h1>
        <p>Find your way through the real Solar System.</p>
      </div>
      <div className="entry-actions">
        <span className="entry-chapter">
          <i />
          {c.store.level.sandbox ? 'Free flight' : `0${missionNumber(c.store.level.id)}`} ·{' '}
          {c.store.level.title}
          <span>Earth → {bodyName(c.store.level.target)}</span>
        </span>
        <button
          className="entry-play"
          aria-label={c.store.session.entered ? 'Continue' : 'Play'}
          disabled={!!c.hydrating || entering}
          onClick={play}
        >
          <span>
            <strong>{c.store.session.entered ? 'Continue' : 'Play'}</strong>
            <small>
              {c.hydrating
                ? 'Restoring your flight…'
                : c.store.session.phase === 'flight'
                  ? 'Your flight is waiting'
                  : c.store.session.phase === 'result'
                    ? 'Return to your last flight'
                    : 'One pull starts it all'}
            </small>
          </span>
          <Icon name="play" size={25} />
        </button>
        <div className="entry-secondary">
          <button className="pill" onClick={() => setPanel('levels')}>
            <Icon name="system" />
            Levels
          </button>
          <button className="pill" onClick={() => setPanel('profiles')}>
            <Icon name="face" />
            Profiles
          </button>
        </div>
        <div className="entry-quiet">
          <button onClick={() => setPanel('settings')}>Settings</button>
          <span>·</span>
          <button onClick={() => setPanel('signin')}>Cloud demo</button>
          <button onClick={() => setPanel('help')}>How to play</button>
        </div>
        {(error || c.notice || pilots.notice) && (
          <p className="entry-notice" role="status">
            {error || c.notice || pilots.notice}
          </p>
        )}
      </div>
      <div className="entry-vessel-note">
        <i />
        <span>
          The collector<small>Starshot engine · Crew pod · Co-pilot</small>
        </span>
      </div>
      <div className="entry-target">
        <span aria-hidden="true">↗</span>
        <b>{bodyName(c.store.level.target)}</b>
        <small>{distanceText(frame.targetDistance, unitOf(c.store.session.preferences))}</small>
      </div>
      <footer className="entry-bottom release-footer">
        <span className="release-source">
          View source on{' '}
          <a
            href="https://github.com/harmon-amakobe/starshot"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </span>
        <span data-release-version>{releaseLabel}</span>
        <button onClick={() => setPanel('help')}>About and credits</button>
      </footer>
    </>
  );
}
