import { BODIES } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import type { CloudController } from './cloud';
import { distanceText, unitOf } from './session';
import type { SessionStore } from './session-store';
import type { Menu } from './use-menu';

/** The title screen: the current mission, Play or Continue, and the way into each panel. */
export function MenuHome({
  c,
  menu,
  cloud,
  targetDistance,
  entering,
  error,
}: {
  c: { store: Pick<SessionStore, 'session' | 'level'>; hydrating: boolean; notice: string };
  menu: Pick<Menu, 'play' | 'setPanel'>;
  cloud: Pick<CloudController, 'state'>;
  targetDistance: number;
  entering: boolean;
  error: string;
}) {
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
          {c.store.level.sandbox ? 'Free flight' : `0${c.store.level.number}`} ·{' '}
          {c.store.level.title}
          <span>Earth → {BODIES[c.store.level.target].name}</span>
        </span>
        <button
          className="entry-play"
          aria-label={c.store.session.entered ? 'Continue' : 'Play'}
          disabled={c.hydrating || entering}
          onClick={menu.play}
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
          <button className="pill" onClick={() => menu.setPanel('levels')}>
            <Icon name="system" />
            Levels
          </button>
          <button className="pill" onClick={() => menu.setPanel('profiles')}>
            <Icon name="face" />
            Profiles
          </button>
        </div>
        <div className="entry-quiet">
          <button onClick={() => menu.setPanel('settings')}>Settings</button>
          <span>·</span>
          <button onClick={() => menu.setPanel('signin')}>
            {cloud.state.provider ? 'Cloud profiles' : 'Sign in'}
          </button>
          <button onClick={() => menu.setPanel('help')}>How to play</button>
        </div>
        {(error || c.notice) && (
          <p className="entry-notice" role="status">
            {error || c.notice}
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
        <b>{BODIES[c.store.level.target].name}</b>
        <small>{distanceText(targetDistance, unitOf(c.store.session.preferences))}</small>
      </div>
      <footer className="entry-bottom">
        <span>
          Play in your browser<small>Local saves · No account needed</small>
        </span>
        <div>
          <button onClick={() => menu.setPanel('stores')}>
            App Store <small>Coming soon</small>
          </button>
          <button onClick={() => menu.setPanel('stores')}>
            Google Play <small>Coming soon</small>
          </button>
        </div>
      </footer>
    </>
  );
}
