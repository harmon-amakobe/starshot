import { useGestures } from './gestures';

import type { CampaignController } from './use-campaign';
type Gestures = ReturnType<typeof useGestures>;

export function IntroCaption({
  c,
  gestures,
  introDismissed,
  map,
  mission,
}: {
  c: CampaignController;
  gestures: Gestures;
  introDismissed: boolean;
  map: boolean;
  mission: boolean;
}) {
  return (
    <div
      className={`c-caption ${gestures.pulling || introDismissed || c.store.session.phase !== 'aim' || map || mission ? 'faded' : ''}`}
    >
      <span className="eyebrow">
        {c.store.level.sandbox
          ? 'Open Solar System'
          : `Chapter one · Mission ${c.store.level.number}`}
      </span>
      <h1>{c.store.level.title}</h1>
      <p>
        {c.store.session.preferences.releaseMode === 'plan'
          ? 'Pull the engine ring. Inspect the dots. Press Launch.'
          : 'Pull the engine ring. Watch the dots. Release to launch.'}
      </p>
    </div>
  );
}
