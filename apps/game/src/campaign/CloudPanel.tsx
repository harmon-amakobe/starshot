import { useEffect, useRef, useState } from 'react';
import { Icon } from '@starshot/presentation/icons';
import { missionName, type Session } from './session';
import type { CloudController } from './cloud';
const summary = (s: Session) =>
  `${missionName(s)} · ${s.phase === 'aim' ? 'Ready to aim' : s.phase === 'flight' ? 'In flight' : 'Complete'} · ${s.aim.angleDeg.toFixed(2)}°`;
export function CloudPanel({
  cloud: c,
  busy,
  play,
}: {
  cloud: CloudController;
  busy: boolean;
  play: () => void;
}) {
  const [route, setRoute] = useState('choose'),
    [name, setName] = useState(''),
    root = useRef<HTMLDivElement>(null);
  const s = c.state,
    remote = c.remote;
  useEffect(() => {
    const heading = root.current?.querySelector('h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [route, s.provider, s.selected, c.status, c.ownsPilot]);
  return (
    <div ref={root} className="cloud-preview">
      <div className="demo-label">
        <Icon name="orbit" />
        <span>
          Cloud profile demo<small>Simulated locally · No account or server connection</small>
        </span>
      </div>
      {!s.provider ? (
        <>
          {route === 'choose' && (
            <>
              <h2>Keep your place in the sky</h2>
              <p>Try the full sign-in and sync loop with a sample account.</p>
              <button className="provider-button" onClick={() => setRoute('google')}>
                <b>G</b>Continue with Google
              </button>
              <button className="provider-button" onClick={() => setRoute('email')}>
                <Icon name="mail" />
                Continue with email
              </button>
              <p>No real account or password is needed.</p>
            </>
          )}
          {route === 'google' && (
            <>
              <h2>Choose a demo account</h2>
              <button className="demo-account" onClick={() => c.signIn('google')}>
                <span className="account-avatar">P</span>
                <span>
                  <b>Demo pilot</b>
                  <small>pilot@example.com</small>
                </span>
                →
              </button>
              <button onClick={() => setRoute('choose')}>Use another method</button>
            </>
          )}
          {route === 'email' && (
            <>
              <h2>A link to your next leap</h2>
              <label>
                Demo email
                <input value="pilot@example.com" readOnly />
              </label>
              <button className="primary" onClick={() => setRoute('sent')}>
                Send demo sign-in link
              </button>
              <button onClick={() => setRoute('choose')}>Use another method</button>
            </>
          )}
          {route === 'sent' && (
            <>
              <h2>Your demo link is ready</h2>
              <p>No email was sent. Open the simulated email to sign in.</p>
              <div className="demo-email">
                <b>Your Starshot sign-in link</b>
                <p>Welcome back, pilot.</p>
                <button className="primary" onClick={() => c.signIn('email')}>
                  Open demo email
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="cloud-account">
            <span className="account-avatar">P</span>
            <span>
              <b>Demo pilot</b>
              <small>pilot@example.com · {s.provider}</small>
            </span>
            <button
              disabled={busy}
              onClick={() => {
                c.signOut();
                setRoute('choose');
              }}
            >
              Sign out
            </button>
          </div>
          {!remote ? (
            <>
              <h2>Choose your pilot</h2>
              <p>Your local pilot stays separate. Each cloud pilot keeps its own campaign.</p>
              <div className="profile-list">
                {s.pilots.map((p) => (
                  <button
                    className="profile-row"
                    key={p.pilot.id}
                    disabled={busy}
                    onClick={() => c.choose(p.pilot.id)}
                  >
                    <Icon name="face" />
                    <span>
                      <b>{p.pilot.name}</b>
                      <small>
                        {summary(p.pilot.session)} · Revision {p.revision}
                      </small>
                    </span>
                    Restore
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  c.create(name);
                  setName('');
                }}
              >
                <label>
                  New cloud pilot
                  <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
                </label>
                <button className="primary" disabled={busy || !name.trim() || s.pilots.length >= 6}>
                  Create cloud pilot
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>{remote.pilot.name}'s next leap</h2>
              <div className={`sync-status ${c.status}`} role="status">
                <i />
                <span>
                  {busy
                    ? 'Restoring this pilot…'
                    : c.status === 'conflict'
                      ? 'Two saves need your choice'
                      : c.status === 'queued'
                        ? 'Saved here · Waiting to sync'
                        : s.online
                          ? 'Saved to demo cloud'
                          : 'Offline · This device keeps your save'}
                  <small>
                    {summary(remote.pilot.session)} · Revision {remote.revision}
                  </small>
                </span>
              </div>
              {!c.ownsPilot ? (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => c.choose(remote.pilot.id)}
                >
                  Resume this pilot
                </button>
              ) : c.status === 'conflict' && c.draft ? (
                <div className="save-conflict">
                  <p>Choose the flight to keep. Both versions stay separate until you decide.</p>
                  <button disabled={busy} onClick={() => c.resolve('local')}>
                    <b>Keep this device</b>
                    <small>{summary(c.draft.pilot.session)}</small>
                  </button>
                  <button disabled={busy} onClick={() => c.resolve('cloud')}>
                    <b>Use cloud save</b>
                    <small>{summary(remote.pilot.session)}</small>
                  </button>
                </div>
              ) : (
                <button className="primary cloud-play" disabled={busy} onClick={play}>
                  Play this pilot <Icon name="play" />
                </button>
              )}
              <div className="cloud-tools">
                <button className="pill" disabled={busy || !c.ownsPilot} onClick={c.sync}>
                  Sync now
                </button>
                <button className="pill" onClick={c.download}>
                  Download demo save
                </button>
                <button className="pill" disabled={busy} onClick={c.another}>
                  Choose another pilot
                </button>
              </div>
              <details className="demo-scenarios">
                <summary>Try a sync scenario</summary>
                <button className="setting-row" disabled={busy} onClick={c.connectivity}>
                  <span>Connection</span>
                  <b>{s.online ? 'Go offline' : 'Reconnect'}</b>
                </button>
                <button className="pill" disabled={busy || !c.ownsPilot} onClick={c.secondDevice}>
                  Simulate second device
                </button>
                <p>A second device changes the saved aim. Choose which version to keep.</p>
              </details>
            </>
          )}
        </>
      )}
      {c.notice && <p role="status">{c.notice}</p>}
    </div>
  );
}
