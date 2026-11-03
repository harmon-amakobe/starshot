import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BODIES, dateFromEt } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { FlightAudio } from '@starshot/presentation/audio';
import type { Inspection } from '@starshot/presentation/vehicle';
import {
  MISSIONS as CAMPAIGN,
  nextMission,
  bodyName,
  bodyRadius,
  type Mission as Level,
  type MissionBody as BodyId,
} from '../missions';
import { withResult } from '../progress';
import { shotKey } from '../sim/preview';
import { usePilots } from './profiles';
import { useCampaign, summaryOf } from './use-campaign';
import { useCloud } from './cloud';
import { useView } from './use-view';
import { useGestures } from './gestures';
import { distanceText, freshSession, unitOf, type CameraMode, type Preferences } from './session';
import { EMPTY_FRAME, type SceneState } from './scene-types';
import { FlightDeck, SpeedPill } from './FlightDeck';
import { HomeMenu, type MenuPanel } from './HomeMenu';
import { MissionDeck } from './MissionDeck';
import { Hangar } from './Hangar';
import { assetBase } from './scene-data';
import { BodyLabels } from './BodyLabels';
import { impactBody } from './outcome';

export function CampaignApp() {
  const pilots = usePilots(),
    pilotLive = useRef(pilots);
  pilotLive.current = pilots;
  const owner = `${pilots.pilot.id}:${pilots.revision}`;
  const c = useCampaign(pilots.pilot.session, owner, (score, res, save) => {
    const p = pilotLive.current;
    p.record(save, score, res.analysis.deltaVKmS);
  });
  const cloud = useCloud(pilots, c.snapshot, c.hydrating);
  const [home, setHome] = useState(true),
    [panel, setPanel] = useState<MenuPanel>('home'),
    [mission, setMission] = useState(false),
    [map, setMap] = useState(false);
  const [focus, setFocus] = useState<BodyId | null>(null),
    [selected, setSelected] = useState<BodyId | null>(null),
    [moons, setMoons] = useState(false);
  const [inspection, setInspection] = useState<Inspection | null>(null),
    [demoCharge, setDemoCharge] = useState(0),
    [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const frameRef = useRef(EMPTY_FRAME),
    audio = useRef(new FlightAudio()),
    focusReturn = useRef<Preferences | null>(null),
    mapReturn = useRef<Preferences | null>(null);
  const demoDrag = useRef<{ x: number; charge: number } | null>(null),
    hangarReturn = useRef<Preferences | null>(null);
  const sound = (kind: 'pull' | 'launch' | 'arrive', value?: number) => {
    audio.current.enabled = c.session.preferences.sound;
    audio.current.play(kind, value);
  };
  const gestures = useGestures(c, frameRef, !!inspection, setDemoCharge, sound);
  const [introDismissed, setIntroDismissed] = useState(false);
  useEffect(() => {
    setIntroDismissed(false);
  }, [owner, c.level.id, c.level.window.startIso]);
  useEffect(() => {
    if (gestures.pulling) setIntroDismissed(true);
  }, [gestures.pulling]);
  useEffect(() => {
    if (reduced && c.session.parking) c.freezeParking();
  }, [owner, c.level.id, reduced]);
  const state: Omit<SceneState, 'et' | 'visualTime' | 'home'> = {
    level: c.level,
    parking: c.session.parking,
    launchEt: c.shot.launchEt,
    response: c.active,
    aim: c.session.aim,
    aiming: c.session.phase === 'aim',
    charge: c.session.phase === 'aim' ? c.session.aim.speedKmS / c.level.vInfMaxKmS : 0,
    firing: c.session.phase === 'flight',
    snap: c.snapping ? 1 : 0,
    map,
    focus,
    inspection,
    demoCharge,
    showMoons: moons,
    reduced,
    preferences: c.session.preferences,
    deckHeight: 200,
    lock: gestures.lock,
  };
  const measuredDeck = useRef(200);
  state.deckHeight = measuredDeck.current;
  const view = useView(c, state, home, home || !!inspection, frameRef);
  frameRef.current = view.frameRef.current;
  measuredDeck.current = view.deckHeight;
  const frame = view.frame,
    live = useRef({ c, pilots, cloud, home, map, focus, inspection, frame });
  live.current = { c, pilots, cloud, home, map, focus, inspection, frame };
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)'),
      change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    const fonts = document.createElement('style');
    fonts.textContent = [400, 500, 700]
      .map(
        (weight) =>
          `@font-face{font-family:Plex;src:url('${assetBase}ibm-plex-mono-${weight}.woff2') format('woff2');font-weight:${weight};font-display:swap}`,
      )
      .join('');
    document.head.append(fonts);
    return () => {
      query.removeEventListener('change', change);
      fonts.remove();
      audio.current.dispose();
    };
  }, []);
  useEffect(() => {
    const save = () => {
      const l = live.current;
      if (!l.c.hydrating && l.c.owner === `${l.pilots.pilot.id}:${l.pilots.revision}`)
        l.pilots.stash(l.c.snapshot());
    };
    const timer = setInterval(save, 1200);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', save);
    };
  }, []);
  useEffect(() => {
    gestures.cancel();
    setFocus(null);
    setSelected(null);
    setInspection(null);
    setMap(false);
    setMission(false);
  }, [owner]);
  useEffect(() => {
    if (c.session.phase === 'result') sound('arrive');
  }, [c.session.phase]);
  useEffect(() => {
    if (c.session.preferences.expanded && mission && innerWidth < 900) setMission(false);
  }, [c.session.preferences.expanded]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (gestures.isDragging() || c.pending) {
        e.preventDefault();
        gestures.cancel();
      } else if (inspection) backFromHangar();
      else if (focus) closeFocus();
      else if (selected) setSelected(null);
      else if (!home) menu();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  });
  useEffect(() => {
    Object.defineProperty(window, '__starshotCampaign', {
      configurable: true,
      get: () => {
        const l = live.current,
          s = l.c.snapshot(),
          f = l.c.flight,
          frame = frameRef.current;
        return structuredClone({
          levelId: s.levelId,
          target: s.target,
          day: s.day,
          launchIso: dateFromEt(l.c.shot.launchEt).toISOString(),
          aim: s.aim,
          shot: l.c.shot,
          shotKey: shotKey(l.c.shot),
          previewReady: !!l.c.preview,
          pendingRelease: l.c.pending,
          release: l.c.releaseOwner.pending,
          previewSummary: summaryOf(l.c.preview),
          flightSummary: summaryOf(f),
          previewShot: l.c.preview?.shot,
          flightShot: f?.shot,
          previewId: l.c.preview?.id,
          flightId: f?.id,
          phase: s.phase,
          et: s.et,
          parking: s.parking,
          fullPath: frame.ready ? l.c.active?.result.samples.length : 0,
          endEt: f?.analysis.endEt,
          paused: s.paused,
          hit: l.c.active?.analysis.hit,
          requiredFlyby: l.c.active?.analysis.requiredFlybyDone,
          hintUsed: s.hintUsed,
          stars: l.c.score?.stars,
          score: l.c.score,
          analysis: l.c.active?.analysis,
          owner: l.c.owner,
          profileId: l.pilots.pilot.id,
          hydrating: l.c.hydrating,
          visit: l.c.visit,
          entryPhase: l.home ? 'menu' : 'playing',
          map: l.map,
          focus: l.focus,
          inspection: l.inspection,
          preferences: s.preferences,
          camera: s.preferences.camera,
          workerIdentity: l.c.workerIdentity,
          rendererIdentity: frame.identity,
          renderer: frame.renderer,
          physicalCraft: frame.physicalCraft,
          displayCraft: frame.craft,
          renderedForward: frame.forward,
          heightKm: frame.heightKm,
          centre: frame.centre,
          snapping: l.c.snapping,
          projectedOrigin: frame.bodies.find((b) => b.id === 'earth')?.point,
          projectedTarget: frame.target,
          grip: frame.grip,
          travel: frame.travel,
          deckHeight: measuredDeck.current,
        });
      },
    });
    return () => {
      delete (window as unknown as Record<string, unknown>).__starshotCampaign;
    };
  }, []);
  function play() {
    c.enter();
    setHome(false);
    setHidden(false);
  }
  function menu() {
    gestures.cancel();
    pilots.stash(c.snapshot());
    cloud.sync();
    setHome(true);
    setPanel('home');
    setHidden(false);
  }
  function pick(level: Level) {
    gestures.cancel();
    const save = freshSession(level, {
      ...c.session.preferences,
      camera: level.id === 'moonshot' ? 'orbit' : 'system',
      orbit: [0, 0],
    });
    c.restore(save);
    pilots.stash(save);
    setFocus(null);
    setMap(false);
    setInspection(null);
  }
  function camera(mode: CameraMode) {
    setMap(false);
    if (focus) closeFocus();
    c.preferences({
      camera: mode,
      heightKm:
        mode === 'follow'
          ? c.session.parking
            ? 24000
            : Math.max(2e5, frame.heightKm * 0.65)
          : frame.heightKm,
      pan: [...frame.centre],
      orbit: [0, 0],
    });
  }
  function openMap() {
    const previous = focus ? (focusReturn.current ?? c.session.preferences) : c.session.preferences;
    gestures.cancel();
    if (focus) closeFocus();
    if (map) {
      if (mapReturn.current)
        c.preferences({
          camera: mapReturn.current.camera,
          heightKm: mapReturn.current.heightKm,
          pan: mapReturn.current.pan,
          orbit: mapReturn.current.orbit,
        });
      setMap(false);
    } else {
      mapReturn.current = structuredClone(previous);
      c.preferences({ camera: 'system', orbit: [0, 0] });
      setMap(true);
    }
    setSelected(null);
  }
  function inspectBody(id: BodyId) {
    focusReturn.current = structuredClone(c.session.preferences);
    setFocus(id);
    setSelected(null);
    setMoons(false);
    c.preferences({ heightKm: bodyRadius(id) * 6, camera: 'system', orbit: [0, 0] });
  }
  function closeFocus() {
    const previous = focusReturn.current;
    setFocus(null);
    setMoons(false);
    if (previous)
      c.preferences({
        camera: previous.camera,
        heightKm: previous.heightKm,
        pan: previous.pan,
        orbit: previous.orbit,
      });
  }
  function detail() {
    const p = c.session.preferences;
    c.preferences({
      scientific: !p.scientific,
      ...(p.sizeLinked ? { trueSize: !p.scientific } : {}),
    });
  }
  function openMission() {
    if (!mission && innerWidth < 900) c.preferences({ expanded: false });
    setMission(!mission);
  }
  function openGuide() {
    if (innerWidth < 900) c.preferences({ expanded: false });
    setMission(true);
    c.guide();
  }
  function backFromHangar() {
    setInspection(null);
    if (hangarReturn.current) c.preferences(hangarReturn.current);
  }
  function releaseDemo() {
    sound('launch', demoCharge);
    const start = performance.now(),
      charge = demoCharge;
    const animate = (t: number) => {
      const u = Math.min(1, (t - start) / (reduced ? 1 : 180));
      setDemoCharge(charge * (1 - u) ** 3);
      if (u < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
  const renderUI = !home && !hidden,
    impact = impactBody(c.flight);
  useEffect(() => {
    // A result card or inspection can unmount the button that held keyboard focus.
    if (renderUI && !view.entering && !inspection && document.activeElement === document.body)
      document.querySelector<HTMLButtonElement>('.c-deck .c-actions .primary')?.focus();
  }, [renderUI, view.entering, inspection, focus, c.session.phase]);
  return (
    <main
      className="game-shell campaign-shell"
      data-lunar={!!c.session.parking}
      data-phase={c.session.phase}
      data-pulling={gestures.pulling}
      data-home={home}
      data-preview-current={!!c.preview}
      data-preview-summary={summaryOf(c.preview) || ''}
      data-flight-summary={summaryOf(c.flight) || ''}
      style={{ '--deck-height': `${view.deckHeight}px` } as CSSProperties}
    >
      <div className="starfield" />
      <div className="c-world" {...gestures.world} aria-hidden="true">
        <canvas ref={view.background} />
        <canvas ref={view.foreground} />
      </div>
      {renderUI && !inspection && (
        <div className="c-game-ui" inert={view.entering}>
          <header className="c-topbar">
            <button className="c-brand" aria-label="Open main menu" onClick={menu}>
              starshot
            </button>
            <button className="pill" aria-label="Open menu" onClick={menu}>
              <Icon name="menu" />
            </button>
          </header>
          {!focus && <MissionDeck c={c} open={mission} toggle={openMission} />}
          {focus ? (
            <>
              <div className="c-focus-title">
                <span className="eyebrow">Close observation</span>
                <h1>{focus === 'sun' ? 'Sol' : bodyName(focus)}</h1>
                <p>
                  {distanceText(bodyRadius(focus) * 2, unitOf(c.session.preferences))} across · Real
                  proportions
                </p>
                {frame.moonCount > 0 && frame.renderer !== 'Canvas 2D' && (
                  <button
                    className="pill"
                    disabled={!frame.moonsAvailable}
                    aria-pressed={moons}
                    onClick={() => {
                      setMoons(!moons);
                      if (!moons) c.preferences({ heightKm: bodyRadius(focus) * 90 });
                    }}
                  >
                    Major moons {moons ? 'on' : 'off'}
                  </button>
                )}
                {frame.moonCount > 0 && !frame.moonsAvailable && (
                  <p>Moon positions are available for late 2026 to 2027.</p>
                )}
                {frame.moonCount > 0 && frame.moonsAvailable && frame.renderer === 'Canvas 2D' && (
                  <p>Moon close-ups are unavailable in this view.</p>
                )}
              </div>
              <button
                className="pill c-focus-close"
                aria-label="Close planet focus"
                onClick={closeFocus}
              >
                <Icon name="close" />
              </button>
            </>
          ) : (
            <>
              <div
                className={`c-caption ${gestures.pulling || introDismissed || c.session.phase !== 'aim' || map || mission ? 'faded' : ''}`}
              >
                <span className="eyebrow">
                  {c.level.sandbox
                    ? 'Open Solar System'
                    : `Chapter one · Mission ${c.level.number}`}
                </span>
                <h1>{c.level.title}</h1>
                <p>
                  {c.session.preferences.releaseMode === 'plan'
                    ? 'Pull the engine ring. Inspect the dots. Press Launch.'
                    : 'Pull the engine ring. Watch the dots. Release to launch.'}
                </p>
              </div>
              <BodyLabels
                frame={frame}
                level={c.level}
                map={map}
                deckHeight={view.deckHeight}
                select={setSelected}
              />
              {c.session.phase === 'aim' && !map && !mission && (
                <>
                  <button
                    {...gestures.ring}
                    className="c-ring-handle"
                    style={{ left: frame.grip[0], top: frame.grip[1] }}
                    aria-label="Pull engine ring to aim. Arrow keys adjust, Enter launches, Escape cancels."
                    disabled={c.pending || c.hydrating}
                    onKeyDown={(e) => {
                      if (e.key.startsWith('Arrow')) {
                        e.preventDefault();
                        c.aim({
                          angleDeg:
                            c.session.aim.angleDeg +
                            (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0),
                          speedKmS:
                            c.session.aim.speedKmS +
                            (e.key === 'ArrowUp' ? 0.05 : e.key === 'ArrowDown' ? -0.05 : 0),
                        });
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        c.launch();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        gestures.cancel();
                      }
                    }}
                  />
                  <span
                    className="c-symbol-note"
                    style={{ left: frame.craft[0], top: frame.craft[1] + 36 }}
                  >
                    {c.session.parking ? 'Craft symbol · enlarged' : 'Departure control · enlarged'}
                  </span>
                </>
              )}
            </>
          )}
          {selected && (
            <div className="c-body-popup">
              <span>{selected === 'sun' ? 'Sol' : bodyName(selected)}</span>
              <button className="primary" onClick={() => inspectBody(selected)}>
                View closer
              </button>
              <button
                className="pill"
                aria-label="Close body selection"
                onClick={() => setSelected(null)}
              >
                <Icon name="close" />
              </button>
            </div>
          )}
          <aside className="c-map-tools">
            <div className="pill c-zoom">
              <button aria-label="Zoom in" onClick={() => gestures.zoom(0.65)}>
                <Icon name="plus" />
              </button>
              <button aria-label="Zoom out" onClick={() => gestures.zoom(1.55)}>
                <Icon name="minus" />
              </button>
              <button aria-label="Fit system view" onClick={() => camera('system')}>
                <Icon name="fit" />
              </button>
            </div>
            {!focus && (
              <button
                className="pill c-size"
                aria-pressed={c.session.preferences.trueSize}
                onClick={() =>
                  c.preferences({ trueSize: !c.session.preferences.trueSize, sizeLinked: false })
                }
              >
                <span className="size-icon" aria-hidden="true">
                  {c.session.preferences.trueSize ? '· ◯' : '● ◯'}
                </span>
                <span>
                  {c.session.preferences.trueSize ? 'Realistic sizes' : 'Worlds enlarged'}
                </span>
              </button>
            )}
            <SpeedPill c={c} />
          </aside>
          {c.session.parking &&
            (frame.target[0] < 0 ||
              frame.target[0] > frame.width ||
              frame.target[1] < 70 ||
              frame.target[1] > frame.height - view.deckHeight) && (
              <button className="pill c-target-cue" onClick={() => camera('system')}>
                Show Moon and flight path <Icon name="system" />
              </button>
            )}
          <button
            className="pill c-hangar-button"
            onClick={() => {
              gestures.cancel();
              hangarReturn.current = structuredClone(c.session.preferences);
              setInspection('craft');
            }}
          >
            <Icon name="craft" />
            Hangar
          </button>
          {c.session.phase === 'result' && !focus && (
            <section className="c-result" aria-label="Flight result">
              <span className="eyebrow">
                {c.score?.hit ? 'A new world within reach' : 'One more try'}
              </span>
              <h2>
                {impact
                  ? `Impact with ${impact}.`
                  : c.score?.hit
                    ? 'Nice shot, pilot.'
                    : 'A little closer next time.'}
              </h2>
              <div aria-label={`${c.score?.stars ?? 0} stars`} className="c-stars">
                {'★'.repeat(c.score?.stars ?? 0)}
                {'☆'.repeat(3 - (c.score?.stars ?? 0))}
              </div>
              <p>
                {impact
                  ? `The flight ended at ${impact}'s surface. Adjust the burn or departure position and try again.`
                  : c.score?.hit
                    ? `${bodyName(c.level.target)} reached in ${c.flight?.analysis.flightDays.toFixed(0)} days.`
                    : `Closest approach: ${distanceText(c.flight?.analysis.closestKm ?? 0, unitOf(c.session.preferences))}.`}
              </p>
              {c.session.hintUsed && <p>Guided attempt · Up to 2 stars</p>}
              <div className="result-actions">
                <button className="primary" onClick={c.retry}>
                  <Icon name="retry" />
                  Try again
                </button>
                <button className="pill" onClick={c.replay}>
                  <Icon name="play" />
                  Replay
                </button>
                {c.score?.hit && !c.level.sandbox && !!nextMission(c.level.id) && (
                  <button
                    className="pill"
                    onClick={() => {
                      const next = nextMission(c.level.id);
                      if (next) pick(next);
                    }}
                  >
                    Next mission →
                  </button>
                )}
              </div>
            </section>
          )}
          <FlightDeck
            c={c}
            frame={frame}
            deck={view.deck}
            camera={camera}
            map={map}
            openMap={openMap}
            guide={openGuide}
          />
          <div className="c-scale">
            <i />
            {distanceText(frame.scaleKm, unitOf(c.session.preferences))}
          </div>
          {c.active?.analysis.beyondEphemerisRange && (
            <p className="c-warning">Beyond 2050: planet positions are extrapolated.</p>
          )}
        </div>
      )}
      {renderUI && inspection && (
        <>
          <Hangar
            part={inspection}
            select={setInspection}
            back={backFromHangar}
            flat={frame.renderer === 'Canvas 2D'}
            charge={demoCharge}
            setCharge={(value) => {
              setDemoCharge(value);
              sound('pull', value);
            }}
            release={releaseDemo}
            rotate={(direction) =>
              c.preferences({
                orbit: [
                  c.session.preferences.orbit[0],
                  Math.max(-1.2, Math.min(1.2, c.session.preferences.orbit[1] + direction * 0.2)),
                ],
              })
            }
          />
          {inspection === 'engine' && (
            <button
              className="c-ring-handle c-demo-ring"
              style={{ left: frame.demoGrip[0], top: frame.demoGrip[1] }}
              aria-label="Pull engine demonstration ring"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                demoDrag.current = { x: e.clientX, charge: demoCharge };
              }}
              onPointerMove={(e) => {
                const d = demoDrag.current;
                if (d)
                  setDemoCharge(
                    Math.max(
                      0,
                      Math.min(1, d.charge + (d.x - e.clientX) / Math.max(70, innerHeight * 0.25)),
                    ),
                  );
              }}
              onPointerUp={() => {
                if (demoDrag.current) {
                  demoDrag.current = null;
                  releaseDemo();
                }
              }}
              onPointerCancel={() => {
                demoDrag.current = null;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') releaseDemo();
              }}
            />
          )}
        </>
      )}
      {hidden && (
        <button className="pill c-show-ui" aria-label="Show UI" onClick={() => setHidden(false)}>
          <Eye open={false} />
        </button>
      )}
      {(home || view.entering) && (
        <HomeMenu
          c={c}
          pilots={pilots}
          cloud={cloud}
          frame={frame}
          entering={!home}
          panel={panel}
          setPanel={setPanel}
          play={play}
          pick={pick}
          detail={detail}
          eye={() => {
            setHome(false);
            setHidden(true);
          }}
          error={view.error}
        />
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {c.notice || view.error}
      </div>
    </main>
  );
}
export function Eye({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M2 12q10-15 20 0-10 15-20 0Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 9q9 12 18 0M5 13l-2 3m8-1v4m8-6 2 3" />
        </>
      )}
    </svg>
  );
}
