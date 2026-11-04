import type { LunarModel } from '@starshot/physics/lunar';
import { isLunarLevel, type Mission } from '../missions';

/**
 * Whether the level can be drawn, which every control needs: Launch, Guide, the aim handle, a
 * pull and the launch guard. A matching preview is not part of it, because the launch commit
 * already waits for the preview of the request it captured (`launchGate`). So a coasting orbit
 * can still launch and ask for a guide.
 */
export interface Readiness {
  readonly scene: boolean;
  /** Visible text that says why the controls wait; empty when they do not. */
  readonly reason: string;
}
export const READY: Readiness = Object.freeze({ scene: true, reason: '' });

/** A planetary level is ready at once and never waits for the Moon model; a Moon level needs it. */
export function lunarReadiness(level: Mission, model: LunarModel | null): Readiness {
  return !isLunarLevel(level) || model ? READY : { scene: false, reason: 'Loading the Moon.' };
}

/** Who a late callback acts for: the pilot and visit refs of `useHydration`, the mission and the view. */
export interface CallbackOwner {
  readonly token: { readonly current: string };
  readonly visit: { readonly current: number };
  readonly mission: () => string;
  readonly disposed: { readonly current: boolean };
}

/**
 * Binds a callback to the pilot, visit and mission current now. It runs only while all three are
 * unchanged and the view is not disposed, and returns whether it ran. A load that settles late
 * then cannot act for another pilot, mission or view.
 */
export function ownedCallback<A extends unknown[]>(owner: CallbackOwner, run: (...args: A) => void) {
  const token = owner.token.current,
    visit = owner.visit.current,
    mission = owner.mission();
  return (...args: A): boolean => {
    if (owner.disposed.current || owner.token.current !== token) return false;
    if (owner.visit.current !== visit || owner.mission() !== mission) return false;
    run(...args);
    return true;
  };
}
