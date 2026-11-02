import { Icon } from '@starshot/presentation/icons';
import type { ShotResponse } from '../sim/protocol';
import { SpeedPill } from './DeckControls';
import type { SessionStore } from './session-store';

/** Zoom, fit, the world-size switch and the trip speed, at the side of the map. */
export function MapTools({
  store,
  active,
  focused,
  zoom,
  fit,
}: {
  store: Pick<SessionStore, 'session' | 'preferences'>;
  active: ShotResponse | null;
  focused: boolean;
  zoom: (factor: number) => void;
  fit: () => void;
}) {
  const p = store.session.preferences;
  return (
    <aside className="c-map-tools">
      <div className="pill c-zoom">
        <button aria-label="Zoom in to craft" onClick={() => zoom(0.65)}>
          <Icon name="plus" />
        </button>
        <button aria-label="Zoom out" onClick={() => zoom(1.55)}>
          <Icon name="minus" />
        </button>
        <button aria-label="Fit system view" onClick={fit}>
          <Icon name="fit" />
        </button>
      </div>
      {!focused && (
        <button
          className="pill c-size"
          aria-pressed={p.trueSize}
          onClick={() => store.preferences({ trueSize: !p.trueSize, sizeLinked: false })}
        >
          <span className="size-icon" aria-hidden="true">
            {p.trueSize ? '· ◯' : '● ◯'}
          </span>
          <span>{p.trueSize ? 'Realistic sizes' : 'Worlds enlarged'}</span>
        </button>
      )}
      <SpeedPill store={store} active={active} />
    </aside>
  );
}
