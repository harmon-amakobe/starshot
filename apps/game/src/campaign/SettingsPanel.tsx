import { Icon } from '@starshot/presentation/icons';
import type { HomeMenuProps } from './menu-types';
import { type ReleaseMode } from './session';
export function SettingsPanel({
  c,
  eye,
  detail,
}: Pick<HomeMenuProps, 'c' | 'eye' | 'detail'> & {}) {
  return (
    <>
      <h2>Make it yours</h2>
      <label className="c-release-setting">
        When I release the ring
        <select
          aria-describedby="release-mode-help"
          value={c.store.session.preferences.releaseMode}
          onChange={(e) => c.playback.preferences({ releaseMode: e.target.value as ReleaseMode })}
        >
          <option value="plan">Plan and launch (default)</option>
          <option value="hail-mary">YOLO</option>
        </select>
      </label>
      <p id="release-mode-help">Plan holds; YOLO launches on release.</p>
      <button
        className="setting-row"
        aria-pressed={c.store.session.preferences.sound}
        onClick={() => c.playback.preferences({ sound: !c.store.session.preferences.sound })}
      >
        <Icon name="sound" />
        <span>Sound</span>
        <b>{c.store.session.preferences.sound ? 'On' : 'Off'}</b>
      </button>
      <button className="setting-row" onClick={eye}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M2 12q10-15 20 0-10 15-20 0Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>Hide UI</span>
      </button>
      <button className="setting-row" onClick={detail}>
        <Icon name={c.store.session.preferences.scientific ? 'orbit' : 'face'} />
        <span>Instruments</span>
        <b>{c.store.session.preferences.scientific ? 'Scientific' : 'Simplified'}</b>
      </button>
      <p>Reduced motion follows your device. Camera, world sizes and units stay with your pilot.</p>
      <p>Sound adds a soft charge, launch pulse and arrival chime.</p>
    </>
  );
}
