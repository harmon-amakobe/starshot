import { Icon } from '@starshot/presentation/icons';
import { bodyName, bodyRadius, type MissionBody as BodyId } from '../missions';
import { distanceText, unitOf } from './session';

import type { SceneFrame } from './scene-types';
import type { CampaignController } from './use-campaign';

export function FocusTitle({
  c,
  focus,
  frame,
  moons,
  setMoons,
  closeFocus,
}: {
  c: CampaignController;
  focus: BodyId;
  frame: SceneFrame;
  moons: boolean;
  setMoons: (value: boolean) => void;
  closeFocus: () => void;
}) {
  return (
    <>
      <div className="c-focus-title">
        <span className="eyebrow">Close observation</span>
        <h1>{focus === 'sun' ? 'Sol' : bodyName(focus)}</h1>
        <p>
          {distanceText(bodyRadius(focus) * 2, unitOf(c.store.session.preferences))} across · Real
          proportions
        </p>
        {frame.moonCount > 0 && frame.renderer !== 'Canvas 2D' && (
          <button
            className="pill"
            disabled={!frame.moonsAvailable}
            aria-pressed={moons}
            onClick={() => {
              setMoons(!moons);
              if (!moons) c.playback.preferences({ heightKm: bodyRadius(focus) * 90 });
            }}
          >
            Major moons {moons ? 'on' : 'off'}
          </button>
        )}
        {frame.moonCount > 0 && !frame.moonsAvailable && (
          <p>Moon positions are available for late 2026 to 2027.</p>
        )}
        {frame.moonCount > 0 && frame.moonsAvailable && frame.renderer === 'Canvas 2D' && (
          <p>Moon close-ups are unavailable in this view.</p>
        )}
      </div>
      <button className="pill c-focus-close" aria-label="Close planet focus" onClick={closeFocus}>
        <Icon name="close" />
      </button>
    </>
  );
}
