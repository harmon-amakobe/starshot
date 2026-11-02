import { useEffect, useRef, useState } from 'react';
import { Icon } from '@starshot/presentation/icons';
import type { PilotController } from './profiles';
import type { CloudController } from './cloud';
import { CloudPanel } from './CloudPanel';
import { HelpPanel, StoresPanel } from './InfoPanels';
import { LevelsPanel } from './LevelsPanel';
import { MenuHome } from './MenuHome';
import { ProfilesPanel } from './ProfilesPanel';
import { SettingsPanel } from './SettingsPanel';
import type { SessionStore } from './session-store';
import type { Menu } from './use-menu';

/**
 * The main menu dialog over the live scene. It traps Tab, and Escape steps back to the
 * title screen and then into play. The profile drafts live here, not in their panel.
 */
export function HomeMenu({
  c,
  pilots,
  cloud,
  menu,
  targetDistance,
  entering,
  error,
}: {
  c: { store: SessionStore; hydrating: boolean; notice: string };
  pilots: PilotController;
  cloud: CloudController;
  menu: Pick<Menu, 'panel' | 'setPanel' | 'play' | 'pick' | 'hide'>;
  targetDistance: number;
  entering: boolean;
  error: string;
}) {
  const { panel, setPanel, play } = menu;
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
                'button:not(:disabled),input,summary,a[href]',
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
        <span className="entry-mark">
          S<span>✦</span>
        </span>
        <span className="entry-build">An orbital playground</span>
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
          menu={menu}
          cloud={cloud}
          targetDistance={targetDistance}
          entering={entering}
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
            {panel === 'levels' && <LevelsPanel pilots={pilots} menu={menu} />}
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
            {panel === 'settings' && <SettingsPanel store={c.store} hide={menu.hide} />}
            {panel === 'signin' && <CloudPanel cloud={cloud} busy={c.hydrating} play={play} />}
            {panel === 'stores' && <StoresPanel back={() => menu.setPanel('home')} />}
            {panel === 'help' && <HelpPanel />}
          </div>
        </div>
      )}
    </section>
  );
}
