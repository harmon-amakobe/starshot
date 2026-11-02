import type { SceneFrame } from './scene-types';
import type { Gestures } from './gestures';
import type { Aim } from '../sim/shot';
import type { Release } from './use-release';

/**
 * The engine ring's grip: drag it to aim, or use the keyboard (arrows nudge the aim,
 * Enter or Space launches, Escape cancels), with the note that labels the enlarged craft.
 */
export function AimHandle({
  ring,
  cancel,
  aim,
  release,
  disabled,
  frame,
}: {
  ring: Gestures['ring'];
  cancel: () => void;
  aim: Aim;
  release: Pick<Release, 'aim' | 'launch'>;
  disabled: boolean;
  frame: Pick<SceneFrame, 'grip' | 'craft'>;
}) {
  return (
    <>
      <button
        {...ring}
        className="c-ring-handle"
        style={{ left: frame.grip[0], top: frame.grip[1] }}
        aria-label="Pull engine ring to aim. Arrow keys adjust, Enter launches, Escape cancels."
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            release.aim({
              angleDeg:
                aim.angleDeg + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0),
              speedKmS:
                aim.speedKmS + (e.key === 'ArrowUp' ? 0.05 : e.key === 'ArrowDown' ? -0.05 : 0),
            });
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            release.launch();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancel();
          }
        }}
      />
      <span className="c-symbol-note" style={{ left: frame.craft[0], top: frame.craft[1] + 36 }}>
        Departure control · enlarged
      </span>
    </>
  );
}
