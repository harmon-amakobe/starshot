import { Icon } from '@starshot/presentation/icons';
import { type MissionBody as BodyId } from '../missions';
import { SpeedPill } from './FlightDeck';
import { useGestures } from './gestures';
import { type CameraMode } from './session';

import type { CampaignController } from './use-campaign';
type Gestures = ReturnType<typeof useGestures>;

export function MapTools({
  c,
  gestures,
  focus,
  camera,
}: {
  c: CampaignController;
  gestures: Gestures;
  focus: BodyId | null;
  camera: (mode: CameraMode) => void;
}) {
  return (
    <aside className="c-map-tools">
      <div className="pill c-zoom">
        <button aria-label="Zoom in" onClick={() => gestures.zoom(0.65)}>
          <Icon name="plus" />
        </button>
        <button aria-label="Zoom out" onClick={() => gestures.zoom(1.55)}>
          <Icon name="minus" />
        </button>
        <button aria-label="Fit system view" onClick={() => camera('system')}>
          <Icon name="fit" />
        </button>
      </div>
      {!focus && (
        <button
          className="pill c-size"
          aria-pressed={c.store.session.preferences.trueSize}
          onClick={() =>
            c.playback.preferences({
              trueSize: !c.store.session.preferences.trueSize,
              sizeLinked: false,
            })
          }
        >
          <span className="size-icon" aria-hidden="true">
            {c.store.session.preferences.trueSize ? '· ◯' : '● ◯'}
          </span>
          <span>
            {c.store.session.preferences.trueSize ? 'Realistic sizes' : 'Worlds enlarged'}
          </span>
        </button>
      )}
      <SpeedPill c={c} />
    </aside>
  );
}
