import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useFlight } from '../use-flight';
import { requestFor } from '../lunar/flight';
import { FUEL_BUDGET, LAUNCH_ET } from '../lunar/model';
import { FlightAudio } from '../audio';
import { Icon } from '../icons';
import type { CameraMode } from '../render/view-types';
import type { Inspection } from '../render/vehicle';
import { useScene } from './use-scene';
import { FlightDeck, formatDistance } from './FlightDeck';
import { Hangar } from './Hangar';
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function App() {
  const { state, dispatch, model } = useFlight();
  const canvas = useRef<HTMLCanvasElement>(null), handle = useRef<HTMLButtonElement>(null), menuButton = useRef<HTMLButtonElement>(null);
  const [scientific, setScientific] = useState(false), [expanded, setExpanded] = useState(true), [units, setUnits] = useState(0);
  const [paused, setPaused] = useState(false), [menu, setMenu] = useState(false), [showFine, setShowFine] = useState(false);
  const [mode, setMode] = useState<CameraMode>('follow'), [height, setHeight] = useState(2200), [autoZoom, setAutoZoom] = useState(false);
  const [pan, setPan] = useState<[number, number]>([0, 0]), [orbit, setOrbit] = useState<[number, number]>([-.5, .18]);
  const [inspection, setInspection] = useState<Inspection | null>(null), [pull, setPull] = useState<[number, number] | null>(null);
  const [guided, setGuided] = useState(false), [sound, setSound] = useState(false);
  const [deckHeight, setDeckHeight] = useState(230);
  const [reduced, setReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const audio = useRef(new FlightAudio()), previousPhase = useRef(state.phase);
  const drag = useRef<{ id: number; anchor: [number, number]; start: [number, number] } | null>(null);
  const mapDrag = useRef<{ id: number; x: number; y: number; pan: [number, number]; orbit: [number, number] } | null>(null);
  const { readout, et, snapshot } = useScene(canvas, model, { state, paused, menu, inspection, reduced, mode,
    height, pan, orbit, pulling: !!pull, autoZoom, finish: () => dispatch({ type: 'finish' }) });
  const active = state.phase === 'aim' ? state.preview : state.launch;
  const announce = state.error ?? (state.phase === 'result' ? active?.entryEt ? 'Moon approach reached. Your collector is on its way.' : active?.impact ? 'The path met Earth. Try a gentler angle.' : 'The Moon is still out of reach. Adjust your pull and try again.' : state.pendingRelease ? 'Computing the released path.' : state.phase === 'flight' ? paused ? 'Flight paused.' : 'In flight.' : active?.entryEt ? 'Preview ready. Moon approach lined up.' : 'Pull the ship back, then release.');
  function cancel() { drag.current = null; setPull(null); dispatch({ type: 'cancel' }); }
  function aim(dv: number, angle: number) { setGuided(false); dispatch({ type: 'aim', request: requestFor(dv, angle) }); }
  function retry() { cancel(); dispatch({ type: 'retry' }); setPaused(false); setHeight(2200); setPan([0, 0]); setMode('follow'); setAutoZoom(false); }
  function launch() { cancel(); setPaused(false); setAutoZoom(true); if (reduced) setMode('system'); dispatch({ type: 'release' }); }
  function toggleMode(value: boolean) { setScientific(value); setUnits(value ? 1 : 0); }
  function zoom(factor: number) {
    setHeight(clamp(readout.heightKm * factor, 180, 1800000)); setAutoZoom(false);
    if (mode === 'system') { setMode('free'); setPan(readout.centre); }
  }
  function beginPull(event: PointerEvent<HTMLButtonElement>) {
    if (state.phase !== 'aim' || event.button !== 0) return;
    if (!event.isPrimary) { cancel(); return; }
    event.preventDefault(); event.stopPropagation();
    drag.current = { id: event.pointerId, anchor: snapshot.current.readout.craft, start: [event.clientX, event.clientY] };
    setPull([event.clientX, event.clientY]); event.currentTarget.setPointerCapture(event.pointerId);
  }
  function movePull(event: PointerEvent<HTMLButtonElement>) {
    const gesture = drag.current; if (!gesture || gesture.id !== event.pointerId) return;
    const dx = gesture.anchor[0] - event.clientX, dy = event.clientY - gesture.anchor[1];
    const pullTravel = Math.max(50, Math.min(145, gesture.anchor[0] - 20));
    const strength = clamp(Math.hypot(dx, dy) / pullTravel, 0, 1);
    const angle = clamp(Math.atan2(dy, Math.max(1, dx)) * 180 / Math.PI, -35, 35);
    setPull([event.clientX, event.clientY]); aim(Math.round(strength * FUEL_BUDGET * 100) / 100, Math.round(angle * 10) / 10);
    audio.current.play('pull', strength);
  }
  function endPull(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const length = Math.hypot(event.clientX - drag.current.start[0], event.clientY - drag.current.start[1]);
    drag.current = null; setPull(null);
    if (length > 12) launch();
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function mapDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || !event.isPrimary) { mapDrag.current = null; return; }
    mapDrag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: snapshot.current.readout.centre, orbit };
    event.currentTarget.setPointerCapture(event.pointerId);
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
    const deck = document.querySelector('.flight-deck');
    if (!deck) return;
    const observer = new ResizeObserver(() => setDeckHeight(deck.getBoundingClientRect().height));
    observer.observe(deck); return () => observer.disconnect();
  }, [inspection]);
  useEffect(() => {
    audio.current.enabled = sound;
    if (previousPhase.current !== state.phase) {
      if (state.phase === 'flight') audio.current.play('launch');
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
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancel(); mapDrag.current = null; if (inspection) setInspection(null); else if (menu) { setMenu(false); menuButton.current?.focus(); } else if (showFine) setShowFine(false);
      }
      if (event.key === ' ' && (event.target === document.body || event.target === canvas.current) && state.phase === 'flight') { event.preventDefault(); setPaused(value => !value); }
    };
    const lost = () => { cancel(); mapDrag.current = null; };
    window.addEventListener('keydown', key); window.addEventListener('blur', lost);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('blur', lost); };
  }, [inspection, menu, showFine, state.phase]);
  useEffect(() => {
    const descriptor = { configurable: true, get: () => ({ phase: state.phase, requestId: state.id, request: state.request,
      pendingRelease: state.pendingRelease, previewReady: !!state.preview, samePath: !!state.launch && state.launch === state.preview,
      preview: state.preview ? { entryEt: state.preview.entryEt, impact: state.preview.impact, count: state.preview.samples.length } : null,
      et: snapshot.current.et, camera: mode, heightKm: snapshot.current.readout.heightKm, craft: snapshot.current.readout.craft,
      renderer: snapshot.current.readout.renderer, centre: snapshot.current.readout.centre, inspection, paused, reduced }) };
    Object.defineProperty(window, '__starshot', descriptor);
    return () => { Reflect.deleteProperty(window, '__starshot'); };
  }, [state, mode, inspection, paused, reduced, snapshot]);
  const moonOffscreen = readout.moon[0] < 75 || readout.moon[0] > innerWidth - 130 || readout.moon[1] < 150 || readout.moon[1] > innerHeight * .55;
  const moonX = moonOffscreen ? innerWidth * .62 : readout.moon[0], moonY = moonOffscreen ? innerHeight * .39 : readout.moon[1];
  return <main className="game-shell" data-phase={state.phase} data-renderer={readout.renderer} style={{ '--deck-height': `${deckHeight}px` } as React.CSSProperties}>
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
        else { setMode('free'); setHeight(readout.heightKm); setAutoZoom(false); setPan([readout.centre[0] + dx * readout.heightKm * .08, readout.centre[1] + dy * readout.heightKm * .08]); }
      }}
      onWheel={event => { if (!inspection) zoom(Math.exp(event.deltaY * .001)); }} />
    {!inspection ? <>
      <header className="topbar"><div className="brand">starshot<span>First leap · Play study</span></div><div className="mission-pill"><i className="tiny-earth" />Earth <span>→</span><i className="tiny-moon" />Moon</div><button ref={menuButton} className="pill" onClick={() => { cancel(); setMenu(true); }}><Icon name="menu" /><span>Menu</span></button></header>
      <div className="level-caption"><span className="eyebrow">01 / First leap</span><h1>A little pull.<br />A whole new world.</h1><p>Reach the Moon's approach zone.</p></div>
      {model && <div className={`moon-marker ${moonOffscreen ? 'offscreen' : ''}`} style={{ left: moonX, top: moonY }}><i /><b>Moon {moonOffscreen && <span aria-hidden="true" style={{ display: 'inline-block', transform: `rotate(${Math.atan2(readout.moon[1] - moonY, readout.moon[0] - moonX)}rad)` }}>→</span>}</b><span>{formatDistance(readout.moonDistance, units)}</span></div>}
      <nav className="camera-controls" aria-label="Camera controls"><div className="zoom-pills"><button onClick={() => zoom(.65)} aria-label="Zoom in"><Icon name="plus" /></button><button onClick={() => zoom(1.55)} aria-label="Zoom out"><Icon name="minus" /></button></div><button className={`pill ${mode === 'system' ? 'selected' : ''}`} onClick={() => { setMode('system'); setPan([0, 0]); }} aria-pressed={mode === 'system'}><Icon name="fit" /><span>Whole system</span></button><button className={`pill ${mode === 'follow' ? 'selected' : ''}`} onClick={() => { setMode('follow'); setPan([0, 0]); setHeight(2200); setAutoZoom(state.phase !== 'aim'); }} aria-pressed={mode === 'follow'}><Icon name="craft" /><span>Follow craft</span></button></nav>
      <div className="world-footer"><div className="scale-bar"><i />{formatDistance(readout.scaleKm, units)}</div><span>Distances to scale · Craft enlarged</span>{readout.renderer === 'Canvas fallback' && <b>Canvas fallback</b>}</div>
      <button className="pill hangar-entry" onClick={() => { cancel(); setInspection('craft'); }}><Icon name="craft" />Hangar</button>
      {state.phase === 'aim' && model && <>
        <svg className="pull-lines" aria-hidden="true">{pull && <><path d={`M ${readout.craft[0]} ${readout.craft[1] - 24} Q ${pull[0]} ${readout.craft[1]} ${pull[0]} ${pull[1]} Q ${pull[0]} ${readout.craft[1]} ${readout.craft[0]} ${readout.craft[1] + 24}`} /><line x1={readout.craft[0]} y1={readout.craft[1]} x2={pull[0]} y2={pull[1]} /></>}</svg>
        <button ref={handle} className={`pull-handle ${pull ? 'pulling' : ''}`} style={{ left: readout.craft[0], top: readout.craft[1] }} aria-label="Pull craft to aim. Arrow keys adjust angle and strength. Enter launches."
          onPointerDown={beginPull} onPointerMove={movePull} onPointerUp={endPull} onPointerCancel={cancel} onLostPointerCapture={() => { if (drag.current) cancel(); }}
          onKeyDown={event => {
            if (event.key.startsWith('Arrow')) { event.preventDefault(); aim(state.request.deltaVKmS + (event.key === 'ArrowRight' ? .05 : event.key === 'ArrowLeft' ? -.05 : 0), clamp(state.request.burnAngleDeg + (event.key === 'ArrowUp' ? .5 : event.key === 'ArrowDown' ? -.5 : 0), -35, 35)); }
            if (event.key === 'Enter') { event.preventDefault(); launch(); }
          }}><span className="sr-only">Pull craft</span></button>
        {!pull && mode === 'follow' && <div className="pull-coach" style={{ left: readout.craft[0], top: readout.craft[1] + 53 }}><span>←</span> Pull back & release<button onClick={() => setShowFine(value => !value)}>Use buttons</button></div>}
        {pull && <div className="pull-grip" style={{ left: pull[0], top: pull[1] }} aria-hidden="true">{Math.round(state.request.deltaVKmS / FUEL_BUDGET * 100)}%</div>}
      </>}
      {showFine && state.phase === 'aim' && <section className="aim-buttons" aria-label="Aim controls"><div><b>Aim controls</b><button aria-label="Close aim controls" onClick={() => setShowFine(false)}><Icon name="close" /></button></div><div><button onClick={() => aim(state.request.deltaVKmS - .05, state.request.burnAngleDeg)} aria-label="Less pull">−</button><span>{Math.round(state.request.deltaVKmS / FUEL_BUDGET * 100)}% fuel</span><button onClick={() => aim(state.request.deltaVKmS + .05, state.request.burnAngleDeg)} aria-label="More pull">+</button></div><div><button onClick={() => aim(state.request.deltaVKmS, clamp(state.request.burnAngleDeg - 1, -35, 35))} aria-label="Aim down">↓</button><span>{state.request.burnAngleDeg.toFixed(1)}°</span><button onClick={() => aim(state.request.deltaVKmS, clamp(state.request.burnAngleDeg + 1, -35, 35))} aria-label="Aim up">↑</button></div></section>}
      {state.phase === 'result' && <div className={`result-card ${active?.entryEt ? 'success' : ''}`}><Icon name={active?.entryEt ? 'guide' : 'orbit'} size={28} /><h2>{active?.entryEt ? 'Hello, Moon.' : active?.impact ? 'A little too low.' : 'One more try?'}</h2><p>{active?.entryEt ? 'Approach zone reached. Your first leap.' : active?.impact ? 'Earth caught this shot. Pull a little higher.' : state.request.scope === 'local' ? 'This pull made a loop around Earth.' : 'The Moon moved beyond this path.'}</p></div>}
      <FlightDeck state={state} scientific={scientific} expanded={expanded} paused={paused} elapsed={et - LAUNCH_ET} distance={readout.moonDistance} units={units} guide={guided}
        setScientific={toggleMode} toggleExpanded={() => setExpanded(value => !value)} cycleUnits={() => setUnits(value => (value + 1) % 3)} aim={aim} release={launch} cancel={cancel}
        hint={() => { cancel(); dispatch({ type: 'aim', request: requestFor(3.24, 0) }); setGuided(true); }} pause={() => setPaused(value => !value)} retry={retry} replay={() => { setPaused(false); dispatch({ type: 'replay' }); }} />
    </> : <Hangar part={inspection} select={setInspection} flat={readout.renderer === 'Canvas fallback'} back={() => setInspection(null)} rotate={direction => setOrbit(value => [value[0] + direction * .4, value[1]])} />}
    <div className="sr-only" role="status" aria-live="polite">{announce}</div>
    {menu && <div className="modal-shade" onClick={() => { setMenu(false); menuButton.current?.focus(); }}><section className="menu-panel" role="dialog" aria-modal="true" aria-labelledby="menu-title" onClick={event => event.stopPropagation()}
      onKeyDown={event => { if (event.key === 'Tab') { const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,a')); const first = controls[0]!, last = controls.at(-1)!; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }}>
      <div className="menu-heading"><h2 id="menu-title">Flight menu</h2><button autoFocus aria-label="Close menu" onClick={() => { setMenu(false); menuButton.current?.focus(); }}><Icon name="close" /></button></div>
      <button className="pill" aria-pressed={sound} onClick={() => setSound(value => !value)}><Icon name="sound" />Sound {sound ? 'on' : 'off'}</button>
      <button className="pill" onClick={() => { setMenu(false); setInspection('craft'); }}>Open the hangar</button>
      <a className="pill" href={`${import.meta.env.BASE_URL}observatory/shell-preview.html`}>Open Observatory</a>
      <p>Drag the ship back and let go. Guide sets a measured lunar approach. Arrow keys on the ship also aim; Enter launches.</p>
      <p>700 kg collector. Starts 200 km above Earth. This lesson reaches a 65,000 km lunar approach zone. It does not land or capture into orbit.</p>
      <p>3D world. Aim stays in one departure plane for this lesson.</p>
    </section></div>}
  </main>;
}
