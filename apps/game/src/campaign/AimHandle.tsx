import { useGestures } from './gestures';
import type { Readiness } from './lunar-readiness';

import type { SceneFrame } from './scene-types';
import type { CampaignController } from './use-campaign';
type Gestures = ReturnType<typeof useGestures>;

export function AimHandle({
  c,
  gestures,
  frame,
  readiness,
}: {
  c: CampaignController;
  gestures: Gestures;
  frame: SceneFrame;
  readiness: Readiness;
}) {
  return (
    <>
      <button
        {...gestures.ring}
        className="c-ring-handle"
        style={{ left: frame.grip[0], top: frame.grip[1] }}
        aria-label="Pull engine ring to aim. Arrow keys adjust, Enter launches, Escape cancels."
        disabled={c.release.pending || c.hydrating || !readiness.scene}
        aria-describedby={readiness.scene ? undefined : 'c-launch-wait'}
        onKeyDown={(e) => {
          if (e.key.startsWith('Arrow') && readiness.scene) {
            e.preventDefault();
            c.release.actions.aim({
              angleDeg:
                c.store.session.aim.angleDeg +
                (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0),
              speedKmS:
                c.store.session.aim.speedKmS +
                (e.key === 'ArrowUp' ? 0.05 : e.key === 'ArrowDown' ? -0.05 : 0),
            });
          } else if ((e.key === 'Enter' || e.key === ' ') && readiness.scene) {
            e.preventDefault();
            c.release.actions.launch();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            gestures.cancel();
          }
        }}
      />
      <span className="c-symbol-note" style={{ left: frame.craft[0], top: frame.craft[1] + 36 }}>
        {c.store.session.parking ? 'Craft symbol · enlarged' : 'Departure control · enlarged'}
      </span>
    </>
  );
}
