import { Icon } from '@starshot/presentation/icons';
import { totalStars } from '../progress';
import type { PilotController } from './profiles';
import { missionName } from './session';
import type { SessionStore } from './session-store';

/**
 * Local pilots: switch, rename or create one. Both drafts belong to the menu, so they
 * survive a visit to another panel. Switching saves the current session first.
 */
export function ProfilesPanel({
  c,
  pilots,
  name,
  setName,
  newName,
  setNewName,
}: {
  c: { store: Pick<SessionStore, 'snapshot'>; hydrating: boolean };
  pilots: PilotController;
  name: string;
  setName: (name: string) => void;
  newName: string;
  setNewName: (name: string) => void;
}) {
  return (
    <>
      <h2>Your own little universe</h2>
      <p>Each pilot keeps a flight, earned stars and control preferences in this browser.</p>
      <div className="profile-list">
        {pilots.data.profiles
          .filter((p) => !p.id.startsWith('demo-'))
          .map((p) => (
            <button
              key={p.id}
              className={`profile-row ${p.id === pilots.pilot.id ? 'selected' : ''}`}
              disabled={c.hydrating}
              onClick={() => {
                pilots.stash(c.store.snapshot());
                pilots.select(p.id);
              }}
            >
              <Icon name="face" />
              <span>
                <b>{p.name}</b>
                <small>
                  {missionName(p.session)} · {p.session.phase} · {totalStars(p.progress)} stars
                </small>
              </span>
              {p.id === pilots.pilot.id && <span>Active</span>}
            </button>
          ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pilots.rename(name);
        }}
      >
        <label>
          Profile name
          <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="pill">Save name</button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pilots.stash(c.store.snapshot());
          pilots.create(newName);
          setNewName('');
        }}
      >
        <label>
          New profile
          <input
            value={newName}
            maxLength={24}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="A name for this pilot"
          />
        </label>
        <button
          className="primary"
          disabled={
            c.hydrating ||
            !newName.trim() ||
            pilots.data.profiles.filter((p) => !p.id.startsWith('demo-')).length >= 8
          }
        >
          Create profile
        </button>
      </form>
      <p role="status">
        {pilots.notice || 'Up to eight local pilots. Clearing browser data removes these saves.'}
      </p>
    </>
  );
}
