import { useEffect, useRef, useState } from 'react';
import { LAUNCH_ET, FUEL_BUDGET } from '../lunar/model';
import type { SavedSession } from './profiles';
import type { CloudDemoController } from './use-cloud-demo';
import { Icon } from '../icons';
const summary = (save: SavedSession) => `${save.phase === 'aim' ? 'Aiming' : save.phase === 'result' ? 'Complete' : `Day ${((save.et - LAUNCH_ET) / 86400).toFixed(2)}`} · ${Math.round(save.dv / FUEL_BUDGET * 100)}% shot · ${save.angle.toFixed(1)}°`;
export function CloudPreview({ cloud, busy, play }: { cloud: CloudDemoController; busy: boolean; play: () => void }) {
  const [route, setRoute] = useState<'choose' | 'google' | 'email' | 'sent'>('choose'), [name, setName] = useState('');
  const s = cloud.state, pilot = s.pilots.find(p => p.id === s.selected);
  const content = useRef<HTMLDivElement>(null), conflict = s.status === 'conflict';
  useEffect(() => {
    // A step can remove its triggering button, so move focus to the new step's heading.
    const heading = content.current?.querySelector('h2');
    if (heading) { heading.tabIndex = -1; heading.focus(); }
  }, [route, s.provider, s.selected, conflict, cloud.ownsPilot]);
  return <div ref={content} className="cloud-preview">
    <div className="demo-label"><Icon name="orbit" size={17} /><span>Cloud profile demo<small>Simulated locally · No account or server connection</small></span></div>
    {!s.provider ? <>
      {route === 'choose' && <><h2>Keep your place in the sky</h2><p>A preview of signing in and taking your pilots between devices. Use the sample account to try it.</p><button className="provider-button" onClick={() => setRoute('google')}><b aria-hidden="true">G</b>Continue with Google</button><button className="provider-button" onClick={() => setRoute('email')}><Icon name="mail" />Continue with email</button><p className="cloud-note">This demo never asks for your real account or password.</p></>}
      {route === 'google' && <><h2>Choose a demo account</h2><p>This is the simulated provider step.</p><button className="demo-account" onClick={() => cloud.signIn('google')}><span className="account-avatar">P</span><span><b>Demo pilot</b><small>pilot@example.com</small></span><span>→</span></button><button className="entry-text" onClick={() => setRoute('choose')}>Use another method</button></>}
      {route === 'email' && <><h2>A link to your next leap</h2><p>Passwordless sign-in would send a link to your email. This preview uses a sample address.</p><label>Demo email<input value="pilot@example.com" readOnly /></label><button className="primary" onClick={() => setRoute('sent')}>Send demo sign-in link</button><button className="entry-text" onClick={() => setRoute('choose')}>Use another method</button></>}
      {route === 'sent' && <><h2>Your demo link is ready</h2><p>No email was sent. Open the simulated email to return as a verified demo pilot.</p><div className="demo-email"><span>To: pilot@example.com</span><b>Your Starshot sign-in link</b><p>Welcome back, pilot. This link opens your saved profiles.</p><button className="primary" onClick={() => cloud.signIn('email')}>Open demo email</button></div></>}
    </> : <>
      <div className="cloud-account"><span className="account-avatar">P</span><span><b>Demo pilot</b><small>pilot@example.com · {s.provider === 'google' ? 'Google' : 'Email link'}</small></span><button className="entry-text" disabled={busy} onClick={() => { cloud.signOut(); setRoute('choose'); }}>Sign out</button></div>
      {!pilot ? <><h2>Choose your pilot</h2><p>Restore a sample save or start a fresh cloud pilot. Your local profile stays separate.</p><div className="profile-list">{s.pilots.map(p => <button className="profile-row" key={p.id} disabled={busy} onClick={() => cloud.choose(p.id)}><Icon name="face" /><span><b>{p.name}</b><small>{summary(p.save)} · Revision {p.revision}</small></span><span>Restore</span></button>)}</div><form onSubmit={event => { event.preventDefault(); cloud.create(name); setName(''); }}><label>New cloud pilot<input value={name} maxLength={24} onChange={event => setName(event.target.value)} /></label><button className="primary" disabled={!name.trim() || busy || s.pilots.length >= 6}>Create cloud pilot</button></form></>
        : <><h2>{pilot.name}'s next leap</h2><div className={`sync-status ${s.status}`} role="status"><i /><span>{busy ? 'Restoring this pilot…' : s.status === 'conflict' ? 'Two saves need your choice' : s.status === 'queued' ? 'Saved here · Waiting to sync' : s.online ? 'Saved to demo cloud' : 'Offline · This device keeps your save'}<small>{summary(pilot.save)} · Cloud revision {pilot.revision}</small></span></div>
          {!cloud.ownsPilot ? <button className="primary cloud-play" disabled={busy} onClick={() => cloud.choose(pilot.id)}>Resume this pilot</button> : s.status === 'conflict' && s.queued ? <div className="save-conflict"><p>Choose the flight you want to keep. Both saves stay separate until you decide.</p><button disabled={busy} onClick={() => cloud.resolve('local')}><b>Keep this device</b><small>{summary(s.queued)}</small></button><button disabled={busy} onClick={() => cloud.resolve('cloud')}><b>Use cloud save</b><small>{summary(pilot.save)}</small></button></div> : <button className="primary cloud-play" disabled={busy} onClick={play}>Play this pilot <Icon name="play" /></button>}
          <div className="cloud-tools"><button className="pill" disabled={busy || !cloud.ownsPilot} onClick={cloud.sync}>Sync now</button><button className="pill" onClick={cloud.download}>Download demo save</button><button className="pill" disabled={busy} onClick={cloud.chooseAnother}>Choose another pilot</button></div>
          <details className="demo-scenarios"><summary>Try a sync scenario</summary><p>These controls simulate connection and device changes.</p><button className="setting-row" aria-pressed={!s.online} disabled={busy} onClick={cloud.connectivity}><span>Connection</span><b>{s.online ? 'Go offline' : 'Reconnect'}</b></button><button className="pill" disabled={busy || !cloud.ownsPilot} onClick={cloud.secondDevice}>Simulate second device</button><p>A second device changes the saved aim. This preview proposes a choice between save versions.</p></details>
        </>}
    </>}
    {cloud.notice && <p className="entry-notice" role="status">{cloud.notice}</p>}
  </div>;
}
