import { useRef, useState } from 'react';
import { BODIES, type BodyId } from '@starshot/ephemeris';
import type { CameraMode, Preferences } from './session';
import type { SessionStore } from './session-store';
import type { SceneFrame } from './scene-types';

/** The system camera, level and unrotated: where the map, a body focus and a new mission start. */
export const systemView = (): Pick<Preferences, 'camera' | 'orbit'> => ({
  camera: 'system',
  orbit: [0, 0],
});
/** The camera part of saved preferences, which a closed map or focus returns to. */
export const cameraOf = (p: Preferences) => ({
  camera: p.camera,
  heightKm: p.heightKm,
  pan: p.pan,
  orbit: p.orbit,
});
/** A body focus frames six radii; its major moons need ninety. */
export const focusHeightKm = (id: BodyId, moons = false) => BODIES[id].radiusKm * (moons ? 90 : 6);
/** A camera mode starts from the frame on screen; Follow closes in, but not past 200,000 km. */
export const cameraPreferences = (
  mode: CameraMode,
  frame: Pick<SceneFrame, 'heightKm' | 'centre'>,
): Partial<Preferences> => ({
  camera: mode,
  heightKm: mode === 'follow' ? Math.max(2e5, frame.heightKm * 0.65) : frame.heightKm,
  pan: [...frame.centre],
  orbit: [0, 0],
});

/**
 * The views over the mission: the Launch window map, a close focus on one body (with its
 * major moons) and the body selection. Opening the map or a focus remembers the camera,
 * and closing it returns there.
 */
export function useCameraViews(
  store: Pick<SessionStore, 'session' | 'preferences'>,
  cancelGesture: () => void,
) {
  const [map, setMap] = useState(false),
    [focus, setFocus] = useState<BodyId | null>(null),
    [selected, setSelected] = useState<BodyId | null>(null),
    [moons, setMoons] = useState(false);
  const focusReturn = useRef<Preferences | null>(null),
    mapReturn = useRef<Preferences | null>(null);
  function closeFocus() {
    const previous = focusReturn.current;
    setFocus(null);
    setMoons(false);
    if (previous) store.preferences(cameraOf(previous));
  }
  return {
    map,
    selected,
    focus: {
      id: focus,
      moons,
      close: closeFocus,
      toggleMoons(id: BodyId) {
        setMoons(!moons);
        if (!moons) store.preferences({ heightKm: focusHeightKm(id, true) });
      },
    },
    camera(mode: CameraMode, frame: Pick<SceneFrame, 'heightKm' | 'centre'>) {
      if (focus) closeFocus();
      store.preferences(cameraPreferences(mode, frame));
    },
    openMap() {
      const previous = focus
        ? (focusReturn.current ?? store.session.preferences)
        : store.session.preferences;
      cancelGesture();
      if (focus) closeFocus();
      if (map) {
        if (mapReturn.current) store.preferences(cameraOf(mapReturn.current));
        setMap(false);
      } else {
        mapReturn.current = structuredClone(previous);
        store.preferences(systemView());
        setMap(true);
      }
      setSelected(null);
    },
    inspect(id: BodyId) {
      focusReturn.current = structuredClone(store.session.preferences);
      setFocus(id);
      setSelected(null);
      setMoons(false);
      store.preferences({ heightKm: focusHeightKm(id), ...systemView() });
    },
    select: setSelected,
    /** Leaves the map and any focus, as a new mission does. */
    leave() {
      setFocus(null);
      setMap(false);
    },
  };
}
export type CameraViews = ReturnType<typeof useCameraViews>;
