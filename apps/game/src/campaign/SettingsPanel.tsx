import { Icon } from '@starshot/presentation/icons';
import { Eye } from './EyeIcon';
import type { SessionStore } from './session-store';

/** Sound, Hide UI and instrument detail. Detail moves world sizes with it unless unlinked. */
export function SettingsPanel({
  store,
  hide,
}: {
  store: Pick<SessionStore, 'session' | 'preferences'>;
  hide: () => void;
}) {
  const detail = () => {
    const p = store.session.preferences;
    store.preferences({
      scientific: !p.scientific,
      ...(p.sizeLinked ? { trueSize: !p.scientific } : {}),
    });
  };
  return (
    <>
      <h2>Make it yours</h2>
      <button
        className="setting-row"
        aria-pressed={store.session.preferences.sound}
        onClick={() => store.preferences({ sound: !store.session.preferences.sound })}
      >
        <Icon name="sound" />
        <span>Sound</span>
        <b>{store.session.preferences.sound ? 'On' : 'Off'}</b>
      </button>
      <button className="setting-row" onClick={hide}>
        <Eye open />
        <span>Hide UI</span>
      </button>
      <button className="setting-row" onClick={detail}>
        <Icon name={store.session.preferences.scientific ? 'orbit' : 'face'} />
        <span>Instruments</span>
        <b>{store.session.preferences.scientific ? 'Scientific' : 'Simplified'}</b>
      </button>
      <p>Reduced motion follows your device. Camera, world sizes and units stay with your pilot.</p>
      <p>Sound adds a soft charge, launch pulse and arrival chime.</p>
    </>
  );
}
