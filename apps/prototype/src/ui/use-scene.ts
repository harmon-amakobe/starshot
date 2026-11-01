import { useEffect, useRef, useState, type RefObject } from 'react';
import { norm, sub } from '@starshot/ephemeris';
import { LunarModel, LAUNCH_ET, FUEL_BUDGET } from '../lunar/model';
import { sampleFlight } from '../lunar/flight';
import type { ShotState } from '../lunar/shot-state';
import { ThreeView } from '../render/scene';
import { CanvasView } from '../render/fallback';
import type { CameraMode, FrameReadout, SceneView } from '../render/view-types';
import type { Inspection } from '../render/vehicle';
import type { PullPose } from './pull-pose';
import { frameGeometry } from '../render/coordinates';
import { elapsedForEt, missionClock, type MapPreferences } from './observatory-session';
import type { EngineDemo } from './engine-demo';
import type { EntryPresentation } from '../entry/presentation';
let nextRendererIdentity = 0;
export interface SceneSeek { revision: number; et: number; }
export interface SceneTransport { et: number; preferences: MapPreferences; }
export interface SceneInput {
  state: ShotState; paused: boolean; menu: boolean; inspection: Inspection | null; reduced: boolean;
  mode: CameraMode; height: number; pan: [number, number]; orbit: [number, number];
  pulling: boolean; autoZoom: boolean; finish: () => void; snapComplete: () => void;
  pose: RefObject<PullPose>; deckHeight: number; simplified: boolean; onFrame: (frame: FrameReadout) => void;
  suspended: boolean; seek: RefObject<SceneSeek | null>; transport: RefObject<SceneTransport | null>;
  demo: RefObject<EngineDemo>;
  entry: RefObject<EntryPresentation>; entryPhase: 'home' | 'entering' | 'play'; enterComplete: () => void;
}
export function useScene(canvas: RefObject<HTMLCanvasElement | null>, model: LunarModel | null, input: SceneInput) {
  const current = useRef(input); current.current = input;
  const elapsed = useRef(0), lastPhase = useRef('aim'), lastLaunch = useRef(input.state.launch);
  const appliedSeek = useRef(0);
  const rendererIdentity = useRef(0);
  const [readout, setReadout] = useState<FrameReadout>({ craft: [0, 0], moon: [0, 0], moonDistance: 0, scaleKm: 0, heightKm: 2200, centre: [0, 0], renderer: 'Loading',
    physicalCraft: [0, 0], controlAnchor: [0, 0], earth: [0, 0], earthRadiusPx: 0, moonRadiusPx: 0, worldsEnlarged: false,
    worldRect: { left: 0, top: 0, right: 0, bottom: 0 }, poseStage: 'rest', charge: 0, snapProgress: 0,
    headingRad: 0, renderedForward: [1, 0], tangent: [1, 0], enginePulse: 0, sleeveLengthPx: 0,
    progradeHeadingRad: 0, futureMoon: null, approachPoint: null, approachEt: null, orbitCue: [0, 0], orbitDirection: 0, approachRadiusPx: 0,
    engineFront: [0, 0], engineGrip: [0, 0], engineExtensionPx: 0, maxEngineExtensionPx: 145, aimSign: -1,
    demoCharge: .35, demoGrip: [0, 0], demoFront: [0, 0], demoTravelPx: 100 });
  const [et, setEt] = useState(LAUNCH_ET);
  const snapshot = useRef({ et: LAUNCH_ET, readout, requestId: input.state.id, phase: input.state.phase, appliedSeek: 0 });
  useEffect(() => {
    if (!canvas.current || !model) return;
    const element = canvas.current;
    let scene: SceneView;
    const fallback = new URLSearchParams(location.search).get('renderer') === 'canvas';
    if (!fallback && element.getContext('webgl2')) scene = new ThreeView(element, model);
    else scene = new CanvasView(element, model);
    rendererIdentity.current = ++nextRendererIdentity;
    let frameId = 0, last = performance.now(), publish = 0;
    const render = (now: number) => {
      const value = current.current, { state } = value;
      if (value.suspended) { last = now; frameId = requestAnimationFrame(render); return; }
      if (state.phase === 'flight' && lastPhase.current === 'result' && (!value.seek.current || value.seek.current.revision === appliedSeek.current)) {
        const frame = frameGeometry(model, { flight: state.launch, et: LAUNCH_ET, mode: 'system', heightKm: value.height,
          pan: [0, 0], inspection: null, orbit: [0, 0], angle: state.request.burnAngleDeg, pulling: false,
          reducedMotion: value.reduced, aiming: true, deckHeight: value.deckHeight }, element.clientWidth / element.clientHeight,
          { width: element.clientWidth, height: element.clientHeight });
        value.pose.current.flightLock = { heightKm: frame.height, centre: [frame.centre[0], frame.centre[1]] };
      }
      if (state.phase === 'snap' && lastPhase.current !== 'snap') {
        value.pose.current.lock ??= { heightKm: snapshot.current.readout.heightKm, centre: snapshot.current.readout.centre };
        value.pose.current.snap(now, value.reduced);
      }
      if (state.phase === 'aim' || (state.phase === 'flight' && lastPhase.current !== 'flight') || lastLaunch.current !== state.launch) elapsed.current = 0;
      lastPhase.current = state.phase; lastLaunch.current = state.launch;
      const seek = value.seek.current, didSeek = !!seek && seek.revision !== appliedSeek.current;
      if (didSeek && state.launch) { elapsed.current = elapsedForEt(seek!.et, LAUNCH_ET, state.launch.endEt); appliedSeek.current = seek!.revision; }
      const dt = Math.min(.1, (now - last) / 1000);
      if (state.phase === 'flight' && value.entryPhase === 'play' && !value.paused && !value.menu && !value.inspection && !didSeek) {
        const transport = value.transport.current;
        if (transport && state.launch) {
          const clock = missionClock(model, state.launch), progress = (transport.et - LAUNCH_ET) / (state.launch.endEt - LAUNCH_ET);
          const next = clock.advance({ ...transport.preferences, science: transport.preferences.science, progress }, dt);
          transport.et = LAUNCH_ET + next * (state.launch.endEt - LAUNCH_ET); elapsed.current = elapsedForEt(transport.et, LAUNCH_ET, state.launch.endEt);
        } else elapsed.current += dt;
      }
      last = now;
      const flight = state.phase === 'aim' ? state.preview ?? state.previousPreview ?? null : state.launch;
      const seconds = 7, progress = Math.min(1, elapsed.current / seconds);
      const eased = progress * progress * (3 - 2 * progress);
      const time = state.phase === 'aim' || state.phase === 'snap' ? LAUNCH_ET : state.phase === 'result' ? (flight?.endEt ?? LAUNCH_ET) : value.transport.current?.et ?? LAUNCH_ET + ((flight?.endEt ?? LAUNCH_ET) - LAUNCH_ET) * eased;
      let height = value.height;
      if (value.autoZoom && !value.reduced && (state.phase === 'flight' || state.phase === 'result') && value.mode === 'follow' && flight) {
        const target = Math.max(2200, norm(sub(sampleFlight(flight.samples, time).r, model.bodies(time).earth.r)) * .7);
        const startHeight = value.pose.current.flightLock?.heightKm ?? value.height;
        height = startHeight + (target - startHeight) * Math.min(1, elapsed.current / .7);
      }
      const lock = value.pose.current.lock ?? (value.mode === 'system' ? value.pose.current.flightLock : null), pose = value.pose.current.sample(now);
      const charge = state.phase === 'aim' ? state.request.deltaVKmS / FUEL_BUDGET
        : state.phase === 'snap' ? state.request.deltaVKmS / FUEL_BUDGET * (1 - pose.progress) : 0;
      const cinematic = value.entry.current.sample(now);
      const next = scene.update({ flight, et: time, mode: value.mode, heightKm: height, pan: value.pan, inspection: value.inspection,
        orbit: value.orbit, angle: state.request.burnAngleDeg, pulling: value.pulling, reducedMotion: value.reduced,
        deckHeight: value.deckHeight, simplified: value.simplified, gestureOffset: pose.offset, charge, engineTravel: value.pose.current.travel,
        poseStage: pose.stage, snapProgress: pose.progress, cameraLock: lock, aiming: state.phase === 'aim' || state.phase === 'snap',
        previewUpdating: state.phase === 'aim' && !state.preview, flightActive: state.phase === 'flight', visualTime: elapsed.current,
        demoCharge: value.demo.current.sample(now), cinematic });
      snapshot.current = { et: time, readout: next, requestId: state.id, phase: state.phase, appliedSeek: appliedSeek.current };
      value.onFrame(next);
      if (now - publish > 75) { setReadout(next); setEt(time); publish = now; }
      if (pose.snapDone && state.phase === 'snap') value.snapComplete();
      if (value.entryPhase === 'entering' && cinematic === 0) value.enterComplete();
      if (state.phase === 'flight' && progress === 1) value.finish();
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frameId); scene.dispose(); };
  }, [canvas, model]);
  return { readout, et, snapshot, rendererIdentity };
}
