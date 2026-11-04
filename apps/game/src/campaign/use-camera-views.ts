import { useRef, useState } from 'react';
import type { MissionBody as BodyId } from '../missions';
import { bodyRadius, isLunarLevel } from '../missions';
import type { SceneFrame } from './scene-types';
import { type CameraMode, type Preferences } from './session';
import type { CampaignController } from './use-campaign';
export function useCameraViews(
  c: CampaignController,
  getFrame: () => SceneFrame,
  cancelGesture: () => void,
) {
  const [map, setMap] = useState(false);
  const [focus, setFocus] = useState<BodyId | null>(null);
  const [selected, setSelected] = useState<BodyId | null>(null);
  const [moons, setMoons] = useState(false);
  const focusReturn = useRef<Preferences | null>(null);
  const mapReturn = useRef<Preferences | null>(null);
  function camera(mode: CameraMode) {
    const frame = getFrame();
    // An undrawn frame, as on a Moon level waiting for its model, has no view to keep.
    if (!frame.ready) return;
    setMap(false);
    if (focus) closeFocus();
    c.playback.preferences({
      camera: mode,
      heightKm:
        mode === 'follow'
          ? c.store.session.parking
            ? 24000
            : Math.max(2e5, frame.heightKm * 0.65)
          : frame.heightKm,
      pan: [...frame.centre],
      orbit: [0, 0],
    });
  }
  function openMap() {
    const previous = focus
      ? (focusReturn.current ?? c.store.session.preferences)
      : c.store.session.preferences;
    cancelGesture();
    if (focus) closeFocus();
    if (map) {
      if (mapReturn.current)
        c.playback.preferences({
          camera: mapReturn.current.camera,
          heightKm: mapReturn.current.heightKm,
          pan: mapReturn.current.pan,
          orbit: mapReturn.current.orbit,
        });
      setMap(false);
    } else {
      mapReturn.current = structuredClone(previous);
      c.playback.preferences({ camera: 'system', orbit: [0, 0] });
      setMap(true);
    }
    setSelected(null);
  }
  function inspectBody(id: BodyId) {
    // Only a Moon level loads the Moon model, so a planetary one refuses a Moon focus before any
    // focus state changes; `world.ts` still throws if a frame asks for it anyway.
    if (id === 'moon' && !isLunarLevel(c.store.level)) return;
    focusReturn.current = structuredClone(c.store.session.preferences);
    setFocus(id);
    setSelected(null);
    setMoons(false);
    c.playback.preferences({ heightKm: bodyRadius(id) * 6, camera: 'system', orbit: [0, 0] });
  }
  function closeFocus() {
    const previous = focusReturn.current;
    setFocus(null);
    setMoons(false);
    if (previous)
      c.playback.preferences({
        camera: previous.camera,
        heightKm: previous.heightKm,
        pan: previous.pan,
        orbit: previous.orbit,
      });
  }
  return {
    map,
    setMap,
    focus,
    setFocus,
    selected,
    setSelected,
    moons,
    setMoons,
    actions: { camera, openMap, inspectBody, closeFocus },
  };
}
