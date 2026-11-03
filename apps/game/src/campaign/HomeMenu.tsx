import { Icon } from '@starshot/presentation/icons';
import { useEffect, useRef, useState } from 'react';
import { CloudPanel } from './CloudPanel';
import { InfoPanels } from './InfoPanels';
import { LevelsPanel } from './LevelsPanel';
import type { HomeMenuProps } from './menu-types';
import { MenuHome } from './MenuHome';
import { ProfilesPanel } from './ProfilesPanel';
import { SettingsPanel } from './SettingsPanel';
export type MenuPanel = 'home' | 'levels' | 'profiles' | 'settings' | 'signin' | 'stores' | 'help';
export function HomeMenu({
  c,
  pilots,
  cloud,
  frame,
  entering,
  panel,
  setPanel,
  play,
  pick,
  detail,
  eye,
  error,
}: HomeMenuProps) {
  const [name, setName] = useState(pilots.pilot.name),
    [newName, setNewName] = useState(''),
    root = useRef<HTMLElement>(null);
  useEffect(() => setName(pilots.pilot.name), [pilots.pilot.id, pilots.pilot.name]);
  useEffect(() => {
    requestAnimationFrame(() =>
      root.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus(),
    );
  }, [panel, c.hydrating]);
  return (
    <section
      ref={root}
      className={`entry-shell ${entering ? 'entering' : ''}`}
      inert={entering}
      role="dialog"
      aria-modal="true"
      aria-label="Starshot main menu"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          if (panel !== 'home') setPanel('home');
          else if (!c.hydrating) play();
        }
        if (e.key === 'Tab') {
          const nodes = [
              ...e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select,summary,a[href]',
              ),
            ].filter((n) => n.getClientRects().length),
            first = nodes[0],
            last = nodes.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="entry-shade" />
      <header className="entry-top">
        <span className="release-author">
          A game by{' '}
          <a href="https://limitedsightfullvision.com" target="_blank" rel="noopener noreferrer">
            Kobe
          </a>
        </span>
        <button
          className="pill"
          onClick={() => setPanel('profiles')}
          aria-label={`Local profile: ${pilots.pilot.name}`}
        >
          <Icon name="face" />
          {pilots.pilot.name}
        </button>
      </header>
      {panel === 'home' ? (
        <MenuHome
          c={c}
          pilots={pilots}
          frame={frame}
          entering={entering}
          setPanel={setPanel}
          play={play}
          error={error}
        />
      ) : (
        <div className="entry-panel" role="region" aria-label={panel}>
          <header>
            <button className="pill" onClick={() => setPanel('home')}>
              ← Back
            </button>
            <span className="eyebrow">starshot</span>
          </header>
          <div className="entry-panel-body">
            {panel === 'levels' && (
              <LevelsPanel pilots={pilots} pick={pick} setPanel={setPanel} />
            )}
            {panel === 'profiles' && (
              <ProfilesPanel
                c={c}
                pilots={pilots}
                name={name}
                setName={setName}
                newName={newName}
                setNewName={setNewName}
              />
            )}
            {panel === 'settings' && <SettingsPanel c={c} eye={eye} detail={detail} />}
            {panel === 'signin' && <CloudPanel cloud={cloud} busy={c.hydrating} play={play} />}
            {panel === 'stores' && (
              <>
                <h2>A pocket full of space</h2>
                <p>
                  App Store and Google Play editions are coming later. This browser game is ready
                  now.
                </p>
                <button className="primary" onClick={() => setPanel('home')}>
                  Back to the game
                </button>
              </>
            )}
            {panel === 'help' && <InfoPanels />}
          </div>
        </div>
      )}
    </section>
  );
}
