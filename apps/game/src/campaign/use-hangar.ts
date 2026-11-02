import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Inspection } from '@starshot/presentation/vehicle';
import type { Sound } from './flight-audio';
import { RELEASE_SNAP_MS } from './scene-types';
import type { Preferences } from './session';
import type { SessionStore } from './session-store';

/** Dragging the demo ring left charges it; a quarter of the screen height (min 70 px) fills it. */
export const demoChargeFromDrag = (
  start: { x: number; charge: number },
  x: number,
  screenHeight: number,
) => Math.max(0, Math.min(1, start.charge + (start.x - x) / Math.max(70, screenHeight * 0.25)));

/**
 * The hangar: which vehicle part is inspected and the engine demonstration charge. The
 * camera the player left is restored on the way out.
 */
export function useHangar(
  store: Pick<SessionStore, 'session' | 'preferences'>,
  sound: Sound,
  reduced: boolean,
) {
  const [part, setPart] = useState<Inspection | null>(null),
    [charge, setCharge] = useState(0),
    returnTo = useRef<Preferences | null>(null),
    drag = useRef<{ x: number; charge: number } | null>(null);
  function release() {
    sound('launch', charge);
    const start = performance.now(),
      from = charge;
    const animate = (t: number) => {
      const u = Math.min(1, (t - start) / (reduced ? 1 : RELEASE_SNAP_MS));
      setCharge(from * (1 - u) ** 3);
      if (u < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
  return {
    part,
    charge,
    open() {
      returnTo.current = structuredClone(store.session.preferences);
      setPart('craft');
    },
    select: setPart,
    back() {
      setPart(null);
      if (returnTo.current) store.preferences(returnTo.current);
    },
    pull(value: number) {
      setCharge(value);
      sound('pull', value);
    },
    rotate(direction: number) {
      store.preferences({
        orbit: [
          store.session.preferences.orbit[0],
          Math.max(-1.2, Math.min(1.2, store.session.preferences.orbit[1] + direction * 0.2)),
        ],
      });
    },
    release,
    /** Handlers for the demonstration ring drawn over the engine. */
    ring: {
      onPointerDown(e: PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, charge };
      },
      onPointerMove(e: PointerEvent<HTMLButtonElement>) {
        const d = drag.current;
        if (d) setCharge(demoChargeFromDrag(d, e.clientX, innerHeight));
      },
      onPointerUp() {
        if (drag.current) {
          drag.current = null;
          release();
        }
      },
      onPointerCancel() {
        drag.current = null;
      },
      onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
        if (e.key === 'Enter') release();
      },
    },
  };
}
export type HangarState = ReturnType<typeof useHangar>;
