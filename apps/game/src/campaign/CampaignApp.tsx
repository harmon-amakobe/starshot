import { Icon } from '@starshot/presentation/icons';
import { useEffect, useRef, type CSSProperties } from 'react';
import { type Mission as Level } from '../missions';
import { AimHandle } from './AimHandle';
import { useAutosave } from './autosave';
import { BodyLabels } from './BodyLabels';
import { BodyPopup } from './BodyPopup';
import { useDebugHook } from './debug-hook';
import { useEscape } from './escape';
import { Eye } from './EyeIcon';
import { useArrivalSound, useFlightAudio } from './flight-audio';
import { FlightDeck, MoonLoadPanel } from './FlightDeck';
import { FocusTitle } from './FocusTitle';
import { useShellAssets } from './fonts';
import { useGestures } from './gestures';
import { HangarView } from './HangarView';
import { HomeMenu } from './HomeMenu';
import { IntroCaption } from './IntroCaption';
import { lunarReadiness } from './lunar-readiness';
import { MapTools } from './MapTools';
import { useMissionHeader } from './mission-header';
import { MissionDeck } from './MissionDeck';
import { usePilotSession } from './pilot-session';
import { useReducedMotionState, useReducedParking } from './reduced-motion';
import { ResultCard } from './ResultCard';
import { EMPTY_FRAME } from './scene-types';
import { sceneView } from './scene-view';
import { distanceText, freshSession, unitOf } from './session';
import { useCameraViews } from './use-camera-views';
import { summaryOf } from './use-campaign';
import { useHangar } from './use-hangar';
import { useMenu } from './use-menu';
import { useView } from './use-view';

export function CampaignApp() {
  const { pilots, owner, c, cloud } = usePilotSession();
  const { home, setHome, panel, setPanel, hidden, setHidden, play, menu } = useMenu(
    c,
    pilots,
    cloud,
    () => gestures.cancel(),
  );
  const {
    map,
    setMap,
    focus,
    setFocus,
    selected,
    setSelected,
    moons,
    setMoons,
    actions: { camera, openMap, inspectBody, closeFocus },
  } = useCameraViews(
    c,
    () => frame,
    () => gestures.cancel(),
  );

  const { reduced, setReduced } = useReducedMotionState();
  const frameRef = useRef(EMPTY_FRAME);

  const { audio, sound } = useFlightAudio(c);
  const hangar = useHangar(c, reduced, sound);
  const { inspection, setInspection, demoCharge, setDemoCharge, hangarReturn, backFromHangar } =
    hangar;
  const gestures = useGestures(c, frameRef, !!inspection, setDemoCharge, sound);

  const { mission, setMission, introDismissed, openMission, openGuide } = useMissionHeader(
    c,
    owner,
    gestures.pulling,
  );
  useReducedParking(c, owner, reduced);

  const state = sceneView(c, map, focus, inspection, demoCharge, moons, reduced, gestures.lock);
  const measuredDeck = useRef(200);
  state.deckHeight = measuredDeck.current;
  const view = useView(c, state, home, home || !!inspection, frameRef);
  frameRef.current = view.frameRef.current;
  measuredDeck.current = view.deckHeight;
  // Computed once per render: components take it as a prop, actions and gestures read the ref.
  const readiness = lunarReadiness(c.store.level, view.model, view.status === 'failed');
  c.release.readiness.current = readiness;
  const frame = view.frame,
    live = useRef({ c, pilots, cloud, home, map, focus, inspection, frame });
  live.current = { c, pilots, cloud, home, map, focus, inspection, frame };

  useShellAssets(setReduced, audio);

  useAutosave(live);
  useEffect(() => {
    gestures.cancel();
    setFocus(null);
    setSelected(null);
    setInspection(null);
    setMap(false);
    setMission(false);
  }, [owner]);

  useArrivalSound(c.store.session.phase, sound);
  useEffect(() => {
    if (c.store.session.preferences.expanded && mission && innerWidth < 900) setMission(false);
  }, [c.store.session.preferences.expanded]);
  // A launch closes the mission drawer: it is drawn above the result card and would cover its buttons.
  useEffect(() => {
    if (c.store.session.phase !== 'aim') setMission(false);
  }, [c.store.session.phase]);

  useEscape(
    c,
    gestures,
    inspection,
    focus,
    selected,
    home,
    backFromHangar,
    closeFocus,
    setSelected,
    menu,
  );
  useDebugHook(live, frameRef, measuredDeck);
  function pick(level: Level) {
    gestures.cancel();
    const save = freshSession(level, {
      ...c.store.session.preferences,
      camera: level.id === 'moonshot' ? 'orbit' : 'system',
      orbit: [0, 0],
    });
    c.restore(save);
    pilots.stash(save);
    setFocus(null);
    setMap(false);
    setInspection(null);
  }

  function detail() {
    const p = c.store.session.preferences;
    c.playback.preferences({
      scientific: !p.scientific,
      ...(p.sizeLinked ? { trueSize: !p.scientific } : {}),
    });
  }

  const renderUI = !home && !hidden;
  useEffect(() => {
    // A result card or inspection can unmount the button that held keyboard focus. While the Moon
    // loads, Launch is disabled and cannot take focus, so the loading panel takes it.
    if (renderUI && !view.entering && !inspection && document.activeElement === document.body)
      document.querySelector<HTMLElement>('.c-deck .c-actions .primary:enabled, .c-moon-load')?.focus();
  }, [renderUI, view.entering, inspection, focus, c.store.session.phase, readiness.scene, view.status]);
  return (
    <main
      className="game-shell campaign-shell"
      data-lunar={!!c.store.session.parking}
      data-phase={c.store.session.phase}
      data-pulling={gestures.pulling}
      data-home={home}
      data-preview-current={!!c.view.preview}
      data-preview-summary={summaryOf(c.view.preview) || ''}
      data-flight-summary={summaryOf(c.view.flight) || ''}
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
          {!focus && <MissionDeck c={c} open={mission} toggle={openMission} readiness={readiness} />}
          {focus ? (
            <FocusTitle
              c={c}
              focus={focus}
              frame={frame}
              moons={moons}
              setMoons={setMoons}
              closeFocus={closeFocus}
            />
          ) : (
            <>
              <IntroCaption
                c={c}
                gestures={gestures}
                introDismissed={introDismissed}
                map={map}
                mission={mission}
              />
              <BodyLabels
                frame={frame}
                level={c.store.level}
                map={map}
                deckHeight={view.deckHeight}
                select={setSelected}
              />
              {c.store.session.phase === 'aim' && !map && !mission && (
                <AimHandle c={c} gestures={gestures} frame={frame} readiness={readiness} />
              )}
            </>
          )}
          {selected && (
            <BodyPopup selected={selected} inspectBody={inspectBody} setSelected={setSelected} />
          )}
          <MapTools c={c} gestures={gestures} focus={focus} camera={camera} />
          {c.store.session.parking &&
            frame.ready &&
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
            aria-label="Hangar"
            onClick={() => {
              gestures.cancel();
              hangarReturn.current = structuredClone(c.store.session.preferences);
              setInspection('craft');
            }}
          >
            <Icon name="craft" />
            <span>Hangar</span>
          </button>
          {c.store.session.phase === 'result' && !focus && <ResultCard c={c} pick={pick} />}
          <MoonLoadPanel readiness={readiness} failed={view.status === 'failed'} retry={view.retry} />
          <FlightDeck
            c={c}
            frame={frame}
            deck={view.deck}
            camera={camera}
            map={map}
            openMap={openMap}
            guide={openGuide}
            readiness={readiness}
          />
          <div className="c-scale">
            <i />
            {distanceText(frame.scaleKm, unitOf(c.store.session.preferences))}
          </div>
          {c.view.active?.analysis.beyondEphemerisRange && (
            <p className="c-warning">Beyond 2050: planet positions are extrapolated.</p>
          )}
        </div>
      )}
      {renderUI && inspection && <HangarView c={c} frame={frame} hangar={hangar} sound={sound} />}
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
        {c.notice || view.error || (renderUI ? readiness.reason : '')}
      </div>
    </main>
  );
}
