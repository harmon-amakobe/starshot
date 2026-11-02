/** The store editions, which are not out yet. */
export function StoresPanel({ back }: { back: () => void }) {
  return (
    <>
      <h2>A pocket full of space</h2>
      <p>App Store and Google Play editions are coming later. This browser game is ready now.</p>
      <button className="primary" onClick={back}>
        Back to the game
      </button>
    </>
  );
}

/** How to play, the model's simplifications, and the licences. */
export function HelpPanel() {
  return (
    <>
      <h2>Pull. Aim. Let go.</h2>
      <p>
        Pull the rear engine ring away from the craft. More extension adds departure speed. Rotate
        your pull to aim. The dots are the exact flight the worker will launch.
      </p>
      <p>
        Use Fine aim in the flight deck for keyboard controls. Launch window changes the date. A
        guide can line up a shot; applying it limits the result to two stars.
      </p>
      <p>
        Follow keeps the craft in view. System fits the mission. Free lets you pan, zoom or hold
        Shift while dragging to orbit the camera. Pinch to zoom on touchscreens.
      </p>
      <p>
        These first missions use a flattened orbital plane. Planet distances and launch dynamics
        remain in the real heliocentric frame. The enlarged craft control symbol has a leader to the
        departure point.
      </p>
      <p>
        Original Starshot media: CC BY 4.0. Code: Apache-2.0. Planet imagery and rotation data
        credits are in the repository's observatory asset manifest.
      </p>
    </>
  );
}
