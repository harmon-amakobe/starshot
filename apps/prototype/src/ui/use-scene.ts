import { useEffect, useRef, useState, type RefObject } from 'react';
import { norm, sub } from '@starshot/ephemeris';
import { LunarModel, LAUNCH_ET } from '../lunar/model';
import { sampleFlight } from '../lunar/flight';
import type { ShotState } from '../lunar/shot-state';
import { ThreeView } from '../render/scene';
import { CanvasView } from '../render/fallback';
import type { CameraMode, FrameReadout, SceneView } from '../render/view-types';
import type { Inspection } from '../render/vehicle';
export interface SceneInput {
  state: ShotState; paused: boolean; menu: boolean; inspection: Inspection | null; reduced: boolean;
  mode: CameraMode; height: number; pan: [number, number]; orbit: [number, number];
  pulling: boolean; autoZoom: boolean; finish: () => void;
}
export function useScene(canvas: RefObject<HTMLCanvasElement | null>, model: LunarModel | null, input: SceneInput) {
  const current = useRef(input); current.current = input;
  const elapsed = useRef(0), lastPhase = useRef('aim'), lastLaunch = useRef(input.state.launch);
  const [readout, setReadout] = useState<FrameReadout>({ craft: [0, 0], moon: [0, 0], moonDistance: 0, scaleKm: 0, heightKm: 2200, centre: [0, 0], renderer: 'Loading' });
  const [et, setEt] = useState(LAUNCH_ET);
  const snapshot = useRef({ et: LAUNCH_ET, readout });
  useEffect(() => {
    if (!canvas.current || !model) return;
    const element = canvas.current;
    let scene: SceneView;
    const fallback = new URLSearchParams(location.search).get('renderer') === 'canvas';
    if (!fallback && element.getContext('webgl2')) scene = new ThreeView(element, model);
    else scene = new CanvasView(element, model);
    let frameId = 0, last = performance.now(), publish = 0;
    const render = (now: number) => {
      const value = current.current, { state } = value;
      if (state.phase === 'aim' || (state.phase === 'flight' && lastPhase.current !== 'flight') || lastLaunch.current !== state.launch) elapsed.current = 0;
      lastPhase.current = state.phase; lastLaunch.current = state.launch;
      if (state.phase === 'flight' && !value.paused && !value.menu && !value.inspection) elapsed.current += Math.min(.1, (now - last) / 1000);
      last = now;
      const flight = state.phase === 'aim' ? state.preview : state.launch;
      const seconds = 7, progress = Math.min(1, elapsed.current / seconds);
      const eased = progress * progress * (3 - 2 * progress);
      const time = state.phase === 'aim' ? LAUNCH_ET : state.phase === 'result' ? (flight?.endEt ?? LAUNCH_ET) : LAUNCH_ET + ((flight?.endEt ?? LAUNCH_ET) - LAUNCH_ET) * eased;
      let height = value.height;
      if (value.autoZoom && !value.reduced && state.phase !== 'aim' && value.mode === 'follow' && flight) height = Math.max(2200, norm(sub(sampleFlight(flight.samples, time).r, model.bodies(time).earth.r)) * .7);
      const next = scene.update({ flight, et: time, mode: value.mode, heightKm: height, pan: value.pan, inspection: value.inspection,
        orbit: value.orbit, angle: state.request.burnAngleDeg, pulling: value.pulling, reducedMotion: value.reduced });
      snapshot.current = { et: time, readout: next };
      if (now - publish > 75) { setReadout(next); setEt(time); publish = now; }
      if (state.phase === 'flight' && progress === 1) value.finish();
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frameId); scene.dispose(); };
  }, [canvas, model]);
  return { readout, et, snapshot };
}
