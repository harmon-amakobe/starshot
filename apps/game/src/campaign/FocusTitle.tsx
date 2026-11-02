import { BODIES, type BodyId } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { bodyName, distanceText, type Units } from './session';
import type { SceneFrame } from './scene-types';
import type { CameraViews } from './use-camera-views';

/** The heading of a close observation, its moons switch and its close button. */
export function FocusTitle({
  id,
  focus,
  units,
  frame,
}: {
  id: BodyId;
  focus: Pick<CameraViews['focus'], 'moons' | 'close' | 'toggleMoons'>;
  units: Units;
  frame: Pick<SceneFrame, 'moonCount' | 'moonsAvailable' | 'renderer'>;
}) {
  return (
    <>
      <div className="c-focus-title">
        <span className="eyebrow">Close observation</span>
        <h1>{bodyName(id)}</h1>
        <p>{distanceText(BODIES[id].radiusKm * 2, units)} across · Real proportions</p>
        {frame.moonCount > 0 && frame.renderer !== 'Canvas 2D' && (
          <button
            className="pill"
            disabled={!frame.moonsAvailable}
            aria-pressed={focus.moons}
            onClick={() => focus.toggleMoons(id)}
          >
            Major moons {focus.moons ? 'on' : 'off'}
          </button>
        )}
        {frame.moonCount > 0 && !frame.moonsAvailable && (
          <p>Moon positions are available for late 2026 to 2027.</p>
        )}
        {frame.moonCount > 0 && frame.moonsAvailable && frame.renderer === 'Canvas 2D' && (
          <p>Moon close-ups are unavailable in this view.</p>
        )}
      </div>
      <button className="pill c-focus-close" aria-label="Close planet focus" onClick={focus.close}>
        <Icon name="close" />
      </button>
    </>
  );
}
