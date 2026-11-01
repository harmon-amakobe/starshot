import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useFlight } from '../use-flight';
import { requestFor, type ShotRequest } from '../lunar/flight';
import { FUEL_BUDGET, LAUNCH_ET } from '../lunar/model';
import { FlightAudio } from '../audio';
import { Icon } from '../icons';
import type { CameraMode } from '../render/view-types';
import type { Inspection } from '../render/vehicle';
import { useScene, type SceneSeek, type SceneTransport } from './use-scene';
import { FlightDeck, formatDistance } from './FlightDeck';
import { Hangar } from './Hangar';
import { PullPose } from './pull-pose';
import { engineInput } from '../render/engine-geometry';
import { MissionMarkers } from './MissionMarkers';
import { LaunchWindow } from './LaunchWindow';
import type { MapCheckpoint, MapPreferences, Units } from './observatory-session';
import { EngineDemo } from './engine-demo';
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const flightIdentities = new WeakMap<object, number>();
let nextFlightIdentity = 0;
function flightIdentity(value: object | null) { if (!value) return null; if (!flightIdentities.has(value)) flightIdentities.set(value, ++nextFlightIdentity); return flightIdentities.get(value); }

export function App() {
  const { state, dispatch, model } = useFlight();
  const canvas = useRef<HTMLCanvasElement>(null), handle = useRef<HTMLButtonElement>(null), menuButton = useRef<HTMLButtonElement>(null);
  const leader = useRef<SVGLineElement>(null), coach = useRef<HTMLDivElement>(null);
  const resultAction = useRef<HTMLButtonElement>(null), pose = useRef(new PullPose()), gestureOrigin = useRef<ShotRequest | null>(null);
  const [scientific, setScientific] = useState(false), [expanded, setExpanded] = useState(true), [units, setUnits] = useState(0);
  const [paused, setPaused] = useState(false), [menu, setMenu] = useState(false), [showFine, setShowFine] = useState(false);
  const [mode, setMode] = useState<CameraMode>('system'), [height, setHeight] = useState(2200), [autoZoom, setAutoZoom] = useState(false);
  const [pan, setPan] = useState<[number, number]>([0, 0]), [orbit, setOrbit] = useState<[number, number]>([-.5, .18]);
  const [inspection, setInspection] = useState<Inspection | null>(null), [pull, setPull] = useState<[number, number] | null>(null);
  const [guided, setGuided] = useState(false), [sound, setSound] = useState(false);
  const [mapOpen, setMapOpen] = useState(false), [worldSize, setWorldSize] = useState({ linked: true, trueSize: false });
  const [mapRates, setMapRates] = useState({ rate: 0, lightRate: 1 });
  const unitPreferences = useRef({ simple: 'light' as Units, science: 'metric' as Units });
  const mapOpener = useRef<HTMLElement | null>(null), mapCheckpoint = useRef<unknown>(null);
  const seek = useRef<SceneSeek | null>(null), transport = useRef<SceneTransport | null>(null);
  const demo = useRef(new EngineDemo()), demoHandle = useRef<HTMLButtonElement>(null);
  const demoDrag = useRef<{ id: number; start: [number, number]; axis: [number, number]; charge: number; travel: number; moved: boolean } | null>(null);
  const [deckHeight, setDeckHeight] = useState(230);
  const [reduced, setReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const audio = useRef(new FlightAudio()), previousPhase = useRef(state.phase);
  const followHeight = useRef(2200);
  const drag = useRef<{ id: number; anchor: [number, number]; grip: [number, number]; start: [number, number]; travel: number; prograde: number; sign: number } | null>(null);
  const mapDrag = useRef<{ id: number; x: number; y: number; pan: [number, number]; orbit: [number, number] } | null>(null);
  const { readout, et, snapshot } = useScene(canvas, model, { state, paused, menu, inspection, reduced, mode,
    height, pan, orbit, pulling: !!pull, autoZoom, finish: () => dispatch({ type: 'finish' }),
    pose, deckHeight, simplified: !worldSize.trueSize, suspended: mapOpen, seek, transport, demo, snapComplete: () => dispatch({ type: 'complete-snap' }), onFrame: frame => {
      if (handle.current) { handle.current.style.left = `${frame.engineGrip[0]}px`; handle.current.style.top = `${frame.engineGrip[1]}px`; }
      if (demoHandle.current) { demoHandle.current.style.left = `${frame.demoGrip[0]}px`; demoHandle.current.style.top = `${frame.demoGrip[1]}px`; }
      if (leader.current) {
        leader.current.setAttribute('x1', String(frame.physicalCraft[0])); leader.current.setAttribute('y1', String(frame.physicalCraft[1]));
        leader.current.setAttribute('x2', String(frame.controlAnchor[0])); leader.current.setAttribute('y2', String(frame.controlAnchor[1]));
      }
    } });
  const active = state.phase === 'aim' ? state.preview : state.launch;
  const mapPreferences = useMemo<MapPreferences>(() => ({ science: scientific, trueSize: worldSize.trueSize, sizeLinked: worldSize.linked,
    camera: mode, unitPreferences: { ...unitPreferences.current }, ...mapRates }), [scientific, worldSize, mode, units, mapRates]);
  useEffect(() => { if (transport.current) transport.current.preferences = mapPreferences; }, [mapPreferences]);
  const announce = state.error ?? (state.phase === 'result' ? active?.entryEt ? 'Moon approach reached. Your collector is on its way.' : active?.impact ? 'The path met Earth. Try a gentler angle.' : 'The Moon is still out of reach. Adjust your pull and try again.' : state.pendingRelease ? 'Computing the released path.' : state.phase === 'flight' ? paused ? 'Flight paused.' : 'In flight.' : active?.entryEt ? 'Preview ready. Moon approach lined up.' : 'Pull the rear engine ring, then release.');
  function cancel() {
    drag.current = null; setPull(null);
    if (state.phase === 'aim' || state.phase === 'snap') pose.current.cancel(performance.now(), reduced);
    dispatch({ type: 'cancel' });
    if (gestureOrigin.current && (state.phase === 'aim' || state.phase === 'snap')) dispatch({ type: 'aim', request: gestureOrigin.current });
    gestureOrigin.current = null;
  }
  function aim(dv: number, angle: number) {
    if (!drag.current && pose.current.stage === 'held') {
      pose.current.cancel(performance.now(), reduced); setPull(null); gestureOrigin.current = null;
    }
    setGuided(false); dispatch({ type: 'aim', request: requestFor(dv, angle) });
  }
  function initialCamera() { setPaused(false); followHeight.current = 2200; setHeight(2200); setPan([0, 0]); setMode('system'); setAutoZoom(false); }
  function retry() { transport.current = null; gestureOrigin.current = null; cancel(); pose.current.reset(); dispatch({ type: 'retry' }); initialCamera(); requestAnimationFrame(() => handle.current?.focus()); }
  function restart() {
    transport.current = null; gestureOrigin.current = null; cancel(); pose.current.reset(); dispatch({ type: 'restart', request: requestFor(0, 0) });
    initialCamera(); setGuided(false); setMenu(false); setInspection(null); setShowFine(false); requestAnimationFrame(() => handle.current?.focus());
  }
  function launch() { transport.current = null; drag.current = null; pose.current.hold(); setPaused(false); setAutoZoom(false); dispatch({ type: 'release' }); }
  function replay() { if (transport.current) transport.current.et = LAUNCH_ET; pose.current.reset(); initialCamera(); dispatch({ type: 'replay' }); requestAnimationFrame(() => canvas.current?.focus()); }
  function toggleMode(value: boolean) { cancel(); setScientific(value); setUnits(['light', 'metric', 'imperial'].indexOf(unitPreferences.current[value ? 'science' : 'simple'])); if (worldSize.linked) setWorldSize({ linked: true, trueSize: value }); }
  function cycleUnits() { const next = (units + 1) % 3; unitPreferences.current[scientific ? 'science' : 'simple'] = ['light', 'metric', 'imperial'][next] as Units; setUnits(next); }
  function openMap() { mapOpener.current = document.activeElement as HTMLElement; cancel(); setMenu(false); setShowFine(false); setMapOpen(true); }
  function returnMap(checkpoint: MapCheckpoint) {
    const p = checkpoint.preferences; unitPreferences.current = { ...p.unitPreferences }; setScientific(p.science);
    setUnits(['light', 'metric', 'imperial'].indexOf(p.unitPreferences[p.science ? 'science' : 'simple']));
    setWorldSize({ linked: p.sizeLinked, trueSize: p.trueSize }); setMapRates({ rate: p.rate, lightRate: p.lightRate });
    if (state.phase !== 'aim' && state.launch) {
      seek.current = { revision: (seek.current?.revision ?? 0) + 1, et: checkpoint.et }; transport.current = { et: checkpoint.et, preferences: p };
      dispatch({ type: 'restore-playback', result: checkpoint.et >= state.launch.endEt }); setPaused(!checkpoint.playing);
    }
    if (checkpoint.cameraChanged) camera(p.camera);
    setMapOpen(false); requestAnimationFrame(() => { if (mapOpener.current?.isConnected) mapOpener.current.focus(); else menuButton.current?.focus(); });
  }
  function camera(value: CameraMode) {
    cancel(); pose.current.reset(); setMode(value); setAutoZoom(false);
    if (value === 'free') { setPan(snapshot.current.readout.centre); setHeight(snapshot.current.readout.heightKm); }
    else if (value === 'follow') setHeight(followHeight.current);
  }
  function zoom(factor: number) {
    cancel(); pose.current.reset();
    const next = clamp(snapshot.current.readout.heightKm * factor, 180, 20000000);
    followHeight.current = next; setHeight(next); setMode('follow'); setAutoZoom(false);
  }
  function beginPull(event: PointerEvent<HTMLButtonElement>) {
    if (state.phase !== 'aim' || state.pendingRelease || event.button !== 0) return;
    if (!event.isPrimary) { cancel(); return; }
    event.preventDefault(); event.stopPropagation();
    const frame = snapshot.current.readout;
    drag.current = { id: event.pointerId, anchor: frame.controlAnchor, grip: frame.engineGrip, start: [event.clientX, event.clientY], travel: frame.maxEngineExtensionPx, prograde: frame.progradeHeadingRad, sign: frame.aimSign };
    gestureOrigin.current = state.request;
    pose.current.begin({ heightKm: frame.heightKm, centre: frame.centre }, frame.maxEngineExtensionPx);
    setPull([event.clientX, event.clientY]); event.currentTarget.setPointerCapture(event.pointerId);
  }
  function movePull(event: PointerEvent<HTMLButtonElement>) {
    const gesture = drag.current; if (!gesture || gesture.id !== event.pointerId) return;
    const input = engineInput(gesture.anchor, gesture.grip, gesture.start, [event.clientX, event.clientY], gesture.travel, gesture.prograde, gesture.sign);
    pose.current.move(event.clientX - gesture.start[0], event.clientY - gesture.start[1], input.strength);
    setPull([event.clientX, event.clientY]); aim(Math.round(input.strength * FUEL_BUDGET * 100) / 100, Math.round(input.angle * 10) / 10);
    audio.current.play('pull', input.strength);
  }
  function endPull(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const length = Math.hypot(event.clientX - drag.current.start[0], event.clientY - drag.current.start[1]);
    if (length > 12) { movePull(event); launch(); } else cancel();
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function mapDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || !event.isPrimary) { mapDrag.current = null; return; }
    if (pose.current.stage === 'drag' || pose.current.stage === 'held' || state.phase === 'snap') cancel();
    mapDrag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: snapshot.current.readout.centre, orbit };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function beginDemo(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const frame = snapshot.current.readout, x = frame.demoGrip[0] - frame.demoFront[0], y = frame.demoGrip[1] - frame.demoFront[1], length = Math.hypot(x, y);
    if (length < 1 || frame.demoTravelPx < 1) return;
    demoDrag.current = { id: event.pointerId, start: [event.clientX, event.clientY], axis: [x / length, y / length], charge: demo.current.charge, travel: Math.max(20, frame.demoTravelPx), moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDemo(event: PointerEvent<HTMLButtonElement>) {
    const d = demoDrag.current; if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.start[0], dy = event.clientY - d.start[1]; d.moved ||= Math.hypot(dx, dy) > 4;
    demo.current.set(d.charge + (dx * d.axis[0] + dy * d.axis[1]) / d.travel);
  }
  function cancelDemo() { if (demoDrag.current) demo.current.set(demoDrag.current.charge); demoDrag.current = null; }
  function endDemo(event: PointerEvent<HTMLButtonElement>) {
    if (!demoDrag.current || demoDrag.current.id !== event.pointerId) return;
    moveDemo(event); const moved = demoDrag.current.moved;
    if (!moved) cancelDemo(); else { demoDrag.current = null; demo.current.release(performance.now(), reduced); }
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function mapMove(event: PointerEvent<HTMLCanvasElement>) {
    const gesture = mapDrag.current; if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (inspection) { if (readout.renderer !== 'Canvas fallback') setOrbit([gesture.orbit[0] + dx / 140, clamp(gesture.orbit[1] + dy / 140, -1.3, 1.3)]); }
    else if (Math.hypot(dx, dy) > 3) {
      setMode('free'); setAutoZoom(false); setHeight(readout.heightKm);
      const kmPerPixel = readout.heightKm / innerHeight;
      setPan([gesture.pan[0] - dx * kmPerPixel, gesture.pan[1] + dy * kmPerPixel]);
    }
  }
  useEffect(() => {
    if (state.phase === 'flight') { gestureOrigin.current = null; setPull(null); }
    if (state.phase === 'result') resultAction.current?.focus();
    if (state.error) { pose.current.cancel(performance.now(), reduced); setPull(null); gestureOrigin.current = null; }
  }, [state.phase, state.error, reduced]);
  useEffect(() => {
    const deck = document.querySelector('.flight-deck');
    if (!deck) return;
    const observer = new ResizeObserver(() => setDeckHeight(deck.getBoundingClientRect().height));
    observer.observe(deck); return () => observer.disconnect();
  }, [inspection]);
  useEffect(() => {
    audio.current.enabled = sound;
    if (previousPhase.current !== state.phase) {
      if (state.phase === 'snap') audio.current.play('launch');
      if (state.phase === 'result' && state.launch?.entryEt) audio.current.play('arrive');
      previousPhase.current = state.phase;
    }
  }, [sound, state.phase, state.launch]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)'), changed = () => setReduced(media.matches);
    media.addEventListener('change', changed);
    return () => { media.removeEventListener('change', changed); audio.current.dispose(); };
  }, []);
  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>('.game-shell > :not(.launch-window)')];
    elements.forEach(element => { element.inert = mapOpen; });
    return () => { elements.forEach(element => { element.inert = false; }); };
  }, [mapOpen]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (mapOpen) return;
      if (event.key === 'Escape') {
        cancel(); cancelDemo(); mapDrag.current = null; if (inspection) setInspection(null); else if (menu) { setMenu(false); menuButton.current?.focus(); } else if (showFine) setShowFine(false);
      }
      if (event.key === ' ' && (event.target === document.body || event.target === canvas.current) && state.phase === 'flight') { event.preventDefault(); setPaused(value => !value); }
    };
    const lost = () => { cancel(); cancelDemo(); mapDrag.current = null; };
    window.addEventListener('keydown', key); window.addEventListener('blur', lost); window.addEventListener('resize', lost);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('blur', lost); window.removeEventListener('resize', lost); };
  }, [inspection, menu, showFine, state.phase, mapOpen]);
  useEffect(() => {
    const descriptor = { configurable: true, get: () => ({ phase: state.phase, requestId: state.id, request: state.request,
      pendingRelease: state.pendingRelease, previewReady: !!state.preview, samePath: !!state.launch && state.launch === state.preview,
      preview: state.preview ? { entryEt: state.preview.entryEt, impact: state.preview.impact, count: state.preview.samples.length } : null,
      et: snapshot.current.et, camera: mode, heightKm: snapshot.current.readout.heightKm, craft: snapshot.current.readout.craft,
      renderer: snapshot.current.readout.renderer, centre: snapshot.current.readout.centre, inspection, paused, reduced,
      pose: { stage: snapshot.current.readout.poseStage, offset: [...pose.current.offset], charge: snapshot.current.readout.charge, snapProgress: snapshot.current.readout.snapProgress },
      physicalCraft: snapshot.current.readout.physicalCraft, controlAnchor: snapshot.current.readout.controlAnchor,
      earth: snapshot.current.readout.earth, moon: snapshot.current.readout.moon, earthRadiusPx: snapshot.current.readout.earthRadiusPx, moonRadiusPx: snapshot.current.readout.moonRadiusPx,
      worldRect: snapshot.current.readout.worldRect, worldsEnlarged: snapshot.current.readout.worldsEnlarged,
      headingRad: snapshot.current.readout.headingRad, renderedForward: snapshot.current.readout.renderedForward,
      tangent: snapshot.current.readout.tangent, enginePulse: snapshot.current.readout.enginePulse, sleeveLengthPx: snapshot.current.readout.sleeveLengthPx,
      progradeHeadingRad: snapshot.current.readout.progradeHeadingRad, futureMoon: snapshot.current.readout.futureMoon,
      approachPoint: snapshot.current.readout.approachPoint, approachEt: snapshot.current.readout.approachEt,
      engineGrip: snapshot.current.readout.engineGrip, engineFront: snapshot.current.readout.engineFront,
      engineExtensionPx: snapshot.current.readout.engineExtensionPx, maxEngineExtensionPx: snapshot.current.readout.maxEngineExtensionPx,
      aimSign: snapshot.current.readout.aimSign, mapOpen, bridge: mapCheckpoint.current, transport: transport.current,
      flightIdentity: flightIdentity(state.launch), previewIdentity: flightIdentity(state.preview), preferences: mapPreferences, endEt: active?.endEt,
      engineDemo: { charge: snapshot.current.readout.demoCharge, grip: snapshot.current.readout.demoGrip, front: snapshot.current.readout.demoFront, travel: snapshot.current.readout.demoTravelPx },
      previewStart: state.preview?.samples[0] ?? null, launchStart: state.launch?.samples[0] ?? null }) };
    Object.defineProperty(window, '__starshot', descriptor);
    return () => { Reflect.deleteProperty(window, '__starshot'); };
  }, [state, mode, inspection, paused, reduced, snapshot, mapOpen, mapPreferences, active]);
  const moonOffscreen = readout.moon[0] < 30 || readout.moon[0] > innerWidth - 30 || readout.moon[1] < 90 || readout.moon[1] > innerHeight - deckHeight - 24;
  const moonX = moonOffscreen ? innerWidth * .62 : readout.moon[0], moonY = moonOffscreen ? innerHeight * .39 : readout.moon[1];
  return <main className="game-shell" data-phase={state.phase} data-camera={mode} data-pulling={!!pull || state.pendingRelease} data-renderer={readout.renderer} style={{ '--deck-height': `${deckHeight}px` } as React.CSSProperties}>
    <div className="starfield" aria-hidden="true" />
    <canvas ref={canvas} className="world" tabIndex={0} aria-label={inspection ? readout.renderer === 'Canvas fallback' ? '2D vehicle reference' : 'Vehicle model. Drag or use arrow keys to rotate.' : 'Earth to Moon. Drag empty space or use arrow keys to pan.'}
      onPointerDown={mapDown} onPointerMove={mapMove} onPointerUp={() => { mapDrag.current = null; }} onPointerCancel={() => { mapDrag.current = null; }}
      onLostPointerCapture={() => { mapDrag.current = null; }}
      onKeyDown={event => {
        if (!event.key.startsWith('Arrow')) return;
        event.preventDefault();
        const dx = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        const dy = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
        if (inspection) { if (readout.renderer !== 'Canvas fallback') setOrbit(value => [value[0] + dx * .2, clamp(value[1] + dy * .2, -1.3, 1.3)]); }
        else { cancel(); pose.current.reset(); setMode('free'); setHeight(readout.heightKm); setAutoZoom(false); setPan([readout.centre[0] + dx * readout.heightKm * .08, readout.centre[1] + dy * readout.heightKm * .08]); }
      }}
      onWheel={event => { if (!inspection) zoom(Math.exp(event.deltaY * .001)); }} />
    {!inspection ? <>
      <header className="topbar"><div className="brand">starshot<span>First leap · Play study</span></div><button className="mission-pill" aria-label="Launch window" onClick={openMap}><Icon name="system" /><span>Launch window</span></button><button ref={menuButton} className="pill" onClick={() => { cancel(); setMenu(true); }}><Icon name="menu" /><span>Menu</span></button></header>
      <div className={`level-caption ${state.request.deltaVKmS > 0 ? 'charged' : ''}`}><span className="eyebrow">01 / First leap</span><h1>Reach the Moon.</h1><p>Pull the rear engine ring, then release.</p></div>
      {model && <><div className={`moon-marker ${moonOffscreen ? 'offscreen' : 'on-world'}`} style={{ left: moonOffscreen ? moonX : Math.min(innerWidth - 78, moonX + readout.moonRadiusPx + 12), top: moonY }}><b>Moon {moonOffscreen && <span aria-hidden="true" style={{ display: 'inline-block', transform: `rotate(${Math.atan2(readout.moon[1] - moonY, readout.moon[0] - moonX)}rad)` }}>→</span>}</b><span>{formatDistance(readout.moonDistance, units)}</span></div>
        {mode === 'system' && <div className="earth-label" style={{ left: Math.max(12, readout.earth[0] - readout.earthRadiusPx - 44), top: readout.earth[1] }}>Earth</div>}</>}
      <nav className="camera-controls" aria-label="Zoom controls"><div className="zoom-pills"><button onClick={() => zoom(.65)} aria-label="Zoom in"><Icon name="plus" /></button><button onClick={() => zoom(1.55)} aria-label="Zoom out"><Icon name="minus" /></button></div></nav>
      <MissionMarkers frame={readout} et={et} />
      <div className="world-footer"><div className="scale-bar"><i />{formatDistance(readout.scaleKm, units)}</div><span>{readout.worldsEnlarged ? 'Worlds & craft enlarged' : 'Realistic worlds · Craft enlarged'} · Distances to scale</span>{readout.renderer === 'Canvas fallback' && <b>Canvas fallback</b>}</div>
      <button className="pill hangar-entry" onClick={() => { cancel(); setInspection('craft'); }}><Icon name="craft" />Hangar</button>
      {model && <svg className="pull-lines" aria-hidden="true"><line ref={leader} className="craft-anchor" /></svg>}
      {state.phase === 'aim' && model && <>
        <button ref={handle} className={`pull-handle ${pull ? 'pulling' : ''}`} aria-label="Pull engine ring to charge. Arrow keys adjust angle and strength. Enter launches."
          onPointerDown={beginPull} onPointerMove={movePull} onPointerUp={endPull} onPointerCancel={cancel} onLostPointerCapture={() => { if (drag.current) cancel(); }}
          onKeyDown={event => {
            if (event.key.startsWith('Arrow')) { event.preventDefault(); aim(state.request.deltaVKmS + (event.key === 'ArrowRight' ? .05 : event.key === 'ArrowLeft' ? -.05 : 0), clamp(state.request.burnAngleDeg + readout.aimSign * (event.key === 'ArrowUp' ? .5 : event.key === 'ArrowDown' ? -.5 : 0), -35, 35)); }
            if (event.key === 'Enter') { event.preventDefault(); launch(); }
          }}><span className="sr-only">Pull engine ring</span></button>
        {!pull && !state.pendingRelease && !(scientific && expanded) && <div ref={coach} className="pull-coach"><button onClick={() => setShowFine(value => !value)}>Use buttons</button></div>}
        {pull && Math.abs(state.request.burnAngleDeg) >= 35 && <div ref={coach} className="pull-coach aim-limit">Aim limit: ±35°</div>}
      </>}
      {showFine && state.phase === 'aim' && <section className="aim-buttons" aria-label="Aim controls"><div><b>Aim controls</b><button aria-label="Close aim controls" onClick={() => setShowFine(false)}><Icon name="close" /></button></div><div><button onClick={() => aim(state.request.deltaVKmS - .05, state.request.burnAngleDeg)} aria-label="Less pull">−</button><span>{Math.round(state.request.deltaVKmS / FUEL_BUDGET * 100)}% fuel</span><button onClick={() => aim(state.request.deltaVKmS + .05, state.request.burnAngleDeg)} aria-label="More pull">+</button></div><div><button onClick={() => aim(state.request.deltaVKmS, clamp(state.request.burnAngleDeg - readout.aimSign, -35, 35))} aria-label="Aim down">↓</button><span>{state.request.burnAngleDeg.toFixed(1)}°</span><button onClick={() => aim(state.request.deltaVKmS, clamp(state.request.burnAngleDeg + readout.aimSign, -35, 35))} aria-label="Aim up">↑</button></div></section>}
      {state.phase === 'result' && <section className={`result-card ${active?.entryEt ? 'success' : ''}`} aria-label="Flight result"><Icon name={active?.entryEt ? 'guide' : 'orbit'} size={28} /><h2>{active?.entryEt ? 'Hello, Moon.' : active?.impact ? 'A little too low.' : 'One more try?'}</h2><p>{active?.entryEt ? 'Approach zone reached. Your first leap.' : active?.impact ? 'Earth caught this shot. Pull a little higher.' : state.request.scope === 'local' ? 'This pull made a loop around Earth.' : 'The Moon moved beyond this path.'}</p><div className="result-actions"><button ref={resultAction} className="primary" onClick={retry}><Icon name="retry" />Try again</button><button className="pill" onClick={replay}><Icon name="play" />Replay</button></div></section>}
      <FlightDeck state={state} scientific={scientific} expanded={expanded} paused={paused} elapsed={et - LAUNCH_ET} distance={readout.moonDistance} units={units} guide={guided}
        camera={mode} setCamera={camera}
        setScientific={toggleMode} toggleExpanded={() => { cancel(); setExpanded(value => !value); }} cycleUnits={cycleUnits} aim={aim} release={launch} cancel={cancel}
        hint={() => { cancel(); pose.current.reset(); dispatch({ type: 'aim', request: requestFor(3.24, 0) }); setGuided(true); }} pause={() => setPaused(value => !value)} retry={retry} replay={replay} />
    </> : <><Hangar part={inspection} select={value => { cancelDemo(); setInspection(value); }} flat={readout.renderer === 'Canvas fallback'} back={() => { cancelDemo(); setInspection(null); }} rotate={direction => setOrbit(value => [value[0] + direction * .4, value[1]])}
      charge={readout.demoCharge} setCharge={value => demo.current.set(value)} release={() => demo.current.release(performance.now(), reduced)} resetView={() => setOrbit([-.5, .18])} />
      {inspection === 'engine' && <button ref={demoHandle} className="pull-handle demo-handle" aria-label="Pull demonstration engine ring to charge" onPointerDown={beginDemo} onPointerMove={moveDemo} onPointerUp={endDemo} onPointerCancel={cancelDemo} onLostPointerCapture={cancelDemo}
        onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); demo.current.set(demo.current.charge + (event.key === 'ArrowRight' ? .05 : -.05)); } if (event.key === 'Enter') demo.current.release(performance.now(), reduced); }} />}</>}
    <div className="sr-only" role="status" aria-live="polite">{announce}</div>
    {menu && <div className="modal-shade" onClick={() => { setMenu(false); menuButton.current?.focus(); }}><section className="menu-panel" role="dialog" aria-modal="true" aria-labelledby="menu-title" onClick={event => event.stopPropagation()}
      onKeyDown={event => { if (event.key === 'Tab') { const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,a')); const first = controls[0]!, last = controls.at(-1)!; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }}>
      <div className="menu-heading"><h2 id="menu-title">Flight menu</h2><button autoFocus aria-label="Close menu" onClick={() => { setMenu(false); menuButton.current?.focus(); }}><Icon name="close" /></button></div>
      <button className="pill" aria-pressed={sound} onClick={() => setSound(value => !value)}><Icon name="sound" />Sound {sound ? 'on' : 'off'}</button>
      <button className="pill" onClick={restart}><Icon name="retry" />Restart level</button>
      <button className="pill" onClick={() => { setMenu(false); setInspection('craft'); }}>Open the hangar</button>
      <button className="pill" onClick={openMap}>Launch window</button>
      <p>Pull the rear engine ring and let go. Guide sets a measured lunar approach. Arrow keys on the ring also aim; Enter launches.</p>
      <p>700 kg collector. Starts 200 km above Earth. This lesson reaches a 65,000 km lunar approach zone. It does not land or capture into orbit.</p>
      <p>3D world. Aim stays in one departure plane for this lesson.</p>
    </section></div>}
    {mapOpen && <LaunchWindow flight={state.phase === 'snap' ? null : active} model={model} requestId={state.id} phase={state.phase}
      et={snapshot.current.et} playing={state.phase === 'flight' && !paused} preferences={mapPreferences} finish={returnMap} checkpoint={value => { mapCheckpoint.current = value; }} />}
  </main>;
}
