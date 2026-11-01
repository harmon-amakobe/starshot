import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import type { LocalProfile } from './profiles';
import type { FrameReadout } from '../render/view-types';
import { formatDistance } from '../ui/FlightDeck';
import { CloudPreview } from './CloudPreview';
import type { CloudDemoController } from './use-cloud-demo';
type Panel = 'home' | 'levels' | 'profiles' | 'settings' | 'signin' | 'stores';
interface Props {
  ready: boolean; entering: boolean; error: string | null; frame: FrameReadout; profile: LocalProfile; profiles: LocalProfile[];
  notice: string; hydrating: boolean; sound: boolean; scientific: boolean;
  play: () => void; restart: () => void; select: (id: string) => void; create: (name: string) => void; rename: (name: string) => void;
  toggleSound: () => void; toggleDetail: () => void;
  cloud: CloudDemoController;
}
export function HomeMenu(p: Props) {
  const [panel, setPanel] = useState<Panel>('home'), [name, setName] = useState(''), [newName, setNewName] = useState('');
  const root = useRef<HTMLElement>(null), primary = useRef<HTMLButtonElement>(null);
  useEffect(() => { setName(p.profile.name); }, [p.profile.id, p.profile.name]);
  useEffect(() => { requestAnimationFrame(() => { if (panel === 'home') primary.current?.focus(); else root.current?.querySelector<HTMLElement>('.entry-panel button')?.focus(); }); }, [panel, p.ready]);
  const target = p.frame.moon, targetVisible = target[0] > innerWidth * .45 && target[0] < innerWidth - 30 && target[1] > 80 && target[1] < innerHeight * .52;
  return <section ref={root} inert={p.entering} className={`entry-shell ${p.entering ? 'entering' : ''}`} role="dialog" aria-modal="true" aria-label="Starshot main menu" aria-busy={!p.ready}
    onKeyDown={event => {
      if (event.key === 'Escape' && panel !== 'home') { event.preventDefault(); setPanel('home'); }
      if (event.key === 'Tab') {
        const buttons = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),summary,a[href],[tabindex="0"]')].filter(node => node.getClientRects().length);
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <div className="entry-shade" />
    <header className="entry-top"><span className="entry-mark">S<span>✦</span></span><span className="entry-build">An orbital playground</span><button className="pill" onClick={() => setPanel('profiles')} aria-label={`Local profile: ${p.profile.name}`}><Icon name="face" /><span>{p.profile.name}</span></button></header>
    {panel === 'home' ? <>
      <div className="entry-title"><span className="eyebrow">A small ship. A very big sky.</span><h1>starshot</h1><p>Find your way through the real Solar System.</p></div>
      <div className="entry-actions">
        <span className="entry-chapter"><i />01 · First leap <span>Earth → Moon</span></span>
        <button ref={primary} className="entry-play" aria-label={p.profile.session ? 'Continue' : 'Play'} disabled={!p.ready || p.entering} onClick={p.play}><span><strong>{p.profile.session ? 'Continue' : 'Play'}</strong><small>{!p.ready ? p.hydrating ? 'Restoring your orbit…' : 'Preparing your orbit…' : p.profile.session?.phase === 'flight' ? 'Your flight is waiting' : p.profile.session?.phase === 'result' ? 'Return to your last flight' : 'One pull starts it all'}</small></span><Icon name="play" size={25} /></button>
        <div className="entry-secondary"><button className="pill" onClick={() => setPanel('levels')}><Icon name="system" />Levels</button><button className="pill" onClick={() => setPanel('profiles')}><Icon name="face" />Profiles</button></div>
        <div className="entry-quiet"><button onClick={() => setPanel('settings')}>Settings</button><span aria-hidden="true">·</span><button onClick={() => setPanel('signin')}>{p.cloud.state.provider ? 'Cloud profiles' : 'Sign in'}</button></div>
        {p.error && <p className="entry-notice" role="status">{p.error}</p>}
      </div>
      <div className="entry-vessel-note" style={{ left: Math.min(innerWidth - 130, Math.max(innerWidth * .5, p.frame.craft[0] + 25)), top: Math.min(innerHeight * .47, Math.max(100, p.frame.craft[1] + 80)) }}><i /><span>The collector<small>700 kg · Ready for a leap</small></span></div>
      <div className={`entry-target ${targetVisible ? 'visible' : ''}`} style={targetVisible ? { left: Math.max(75, Math.min(innerWidth - 75, target[0])), top: target[1] - 28 } : undefined}><span aria-hidden="true" style={{ transform: `rotate(${Math.atan2(target[1] - innerHeight / 2, target[0] - innerWidth / 2)}rad)` }}>→</span><b>Moon</b><small>{formatDistance(p.frame.moonDistance, 0)}</small></div>
      <footer className="entry-bottom"><span>Play in your browser<small>Local saves · No account needed</small></span><div><button onClick={() => setPanel('stores')}>App Store <small>Coming soon</small></button><button onClick={() => setPanel('stores')}>Google Play <small>Coming soon</small></button></div></footer>
    </> : <div className="entry-panel" role="region" aria-label={panel === 'profiles' ? 'Local profiles' : panel === 'levels' ? 'Choose a level' : panel === 'settings' ? 'Settings' : panel === 'signin' ? 'Sign in' : 'Play on your phone'}>
      <header><button className="pill" aria-label="Back to main menu" onClick={() => setPanel('home')}>← Back</button><span className="eyebrow">starshot</span></header>
      <div className="entry-panel-body">
        {panel === 'levels' && <><h2>Your next leap</h2><p>Start near home. The rest of the sky can wait.</p><button className="level-card playable" onClick={() => { setPanel('home'); p.play(); }} disabled={!p.ready}><span className="level-number">01</span><span><b>First leap</b><small>Earth → Moon · Pull and release</small></span><Icon name="play" /></button><button className="entry-text" onClick={() => { p.restart(); setPanel('home'); }}>Start First leap fresh</button><div className="level-card future"><span className="level-number">02</span><span><b>Red horizon</b><small>Mars · Coming later</small></span><Icon name="lock" /></div><div className="level-card future"><span className="level-number">03</span><span><b>A wider orbit</b><small>New planes, new worlds · Coming later</small></span><Icon name="lock" /></div></>}
        {panel === 'profiles' && <><h2>Your own little universe</h2><p>Profiles stay in this browser. Each keeps its own flight and controls.</p><div className="profile-list">{p.profiles.filter(profile => !profile.id.startsWith('demo-')).map(profile => <button key={profile.id} className={`profile-row ${profile.id === p.profile.id ? 'selected' : ''}`} disabled={p.hydrating} aria-pressed={profile.id === p.profile.id} onClick={() => p.select(profile.id)}><Icon name="face" /><span><b>{profile.name}</b><small>{profile.session ? `First leap · ${profile.session.phase === 'aim' ? 'Ready to aim' : profile.session.phase === 'flight' ? 'In flight' : 'Flight complete'}` : 'A fresh start'}</small></span>{profile.id === p.profile.id && <span>Active</span>}</button>)}</div><form hidden={p.profile.id.startsWith('demo-')} onSubmit={event => { event.preventDefault(); p.rename(name); }}><label>Profile name<input value={name} maxLength={24} onChange={event => setName(event.target.value)} /></label><button className="pill" disabled={!name.trim()}>Save name</button></form><form onSubmit={event => { event.preventDefault(); p.create(newName); setNewName(''); }}><label>New profile<input value={newName} maxLength={24} placeholder="A name for this pilot" onChange={event => setNewName(event.target.value)} /></label><button className="primary" disabled={!newName.trim() || p.hydrating || p.profiles.length >= 8}>Create profile</button></form><p className="entry-notice" role="status">{p.notice || 'Up to eight profiles. Clearing browser data removes local saves.'}</p></>}
        {panel === 'settings' && <><h2>Make it yours</h2><p>These settings follow the current local profile.</p><button className="setting-row" aria-pressed={p.sound} onClick={p.toggleSound}><Icon name="sound" /><span>Sound</span><b>{p.sound ? 'On' : 'Off'}</b></button><button className="setting-row" aria-pressed={p.scientific} onClick={p.toggleDetail}><Icon name={p.scientific ? 'orbit' : 'face'} /><span>Instruments</span><b>{p.scientific ? 'Scientific' : 'Simplified'}</b></button><p>Reduced motion follows your device preference. More flight controls are always in the cockpit.</p></>}
        {panel === 'signin' && <CloudPreview cloud={p.cloud} busy={p.hydrating} play={() => { setPanel('home'); p.play(); }} />}
        {panel === 'stores' && <><span className="panel-symbol"><Icon name="craft" size={42} /></span><h2>A pocket full of space</h2><p>App Store and Google Play editions are coming later. This browser prototype is ready to explore.</p><button className="primary" onClick={() => setPanel('home')}>Back to the game</button></>}
      </div>
    </div>}
  </section>;
}
