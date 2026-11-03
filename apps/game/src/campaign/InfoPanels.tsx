import { readableVersion } from '../release-version';
import type { HomeMenuProps } from './menu-types';
const releaseLabel = readableVersion(__STARSHOT_VERSION__);
export function InfoPanels({}: Pick<HomeMenuProps, never> & {}) {
  return (
    <>
      <h2>Pull. Plan. Launch.</h2>
      <p data-about-version>{releaseLabel}</p>
      <details className="release-build-details">
        <summary>Build details</summary>
        <p>
          Full version: <code data-full-version>{__STARSHOT_VERSION__}</code>
        </p>
      </details>
      <p>
        Pull the rear engine ring away from the craft. More extension adds departure speed. Rotate
        your pull to aim. The dots are the exact flight the worker will launch.
      </p>
      <p>
        By default, letting go sets the aim and keeps time paused. Inspect the path, then press
        Launch. Settings also offers YOLO to launch on release. Use Fine aim in the flight deck for
        keyboard controls. Launch date changes the date. A guide can line up a shot; applying it
        limits the result to two stars.
      </p>
      <p>
        Craft keeps the craft in view. Orbit fits the parking orbit or flight path. System shows the
        full relevant orbits. Free lets you pan, zoom or hold Shift while dragging to orbit the
        camera. Pinch to zoom on touchscreens.
      </p>
      <p>
        Moonshot starts in a circular Earth parking orbit and integrates Sun, Earth and Moon gravity
        after the burn. Choose Orbit position at a frozen time, or change the date while keeping
        that position. Later planetary missions use a flattened orbital plane. Distances and launch
        dynamics remain in the real heliocentric frame. The enlarged craft control symbol has a
        leader to the departure point.
      </p>
      <p>
        This public preview saves only in this browser. Cloud demo is a local interaction study, not
        an account or backup. Clearing browser data removes saves.
      </p>
      <p>Original Starshot media: CC BY 4.0. Code: Apache-2.0. The name and logo are reserved.</p>
      <nav className="release-links" aria-label="Credits and support">
        <a href="./CREDITS.md" target="_blank" rel="noopener noreferrer">
          Credits
        </a>
        <a href="./LICENSE" target="_blank" rel="noopener noreferrer">
          Code licence
        </a>
        <a href="./NOTICE.md" target="_blank" rel="noopener noreferrer">
          Notices
        </a>
        <a href="./observatory/NOTICE.txt" target="_blank" rel="noopener noreferrer">
          Media licences
        </a>
        <a
          href="https://github.com/harmon-amakobe/starshot"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source
        </a>
        <a
          href="https://github.com/harmon-amakobe/starshot/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          Support
        </a>
      </nav>
    </>
  );
}
