import { useRef, type CSSProperties } from 'react';
import { Icon } from '@starshot/presentation/icons';
import { AimHandle } from './AimHandle';
import { BodyLabels } from './BodyLabels';
import { BodyPopup } from './BodyPopup';
import { summaryOf } from './contracts';
import { useDebugHook } from './debug-hook';
import { useDefaultFocus } from './default-focus';
import { Eye } from './EyeIcon';
import { useFlightAudio } from './flight-audio';
import { FlightDeck } from './FlightDeck';
import { FocusTitle } from './FocusTitle';
import { useFonts } from './fonts';
import { useGestures } from './gestures';
import { DemoRing, Hangar, HangarButton } from './Hangar';
import { HomeMenu } from './HomeMenu';
import { IntroCaption } from './IntroCaption';
import { MapTools } from './MapTools';
import { MissionDeck } from './MissionDeck';
import { usePilotSession } from './pilot-session';
import { useReducedMotion } from './reduced-motion';
import { ResultCard } from './ResultCard';
import { EMPTY_FRAME } from './scene-types';
import { useSceneView } from './scene-view';
import { distanceText, unitOf, type CameraMode } from './session';
import { useCameraViews } from './use-camera-views';
import { useHangar } from './use-hangar';
import { useMenu } from './use-menu';

/**
 * The campaign shell: one mounted scene and worker behind the menu, play and the hangar.
 * Effects run in hook order; the controller's come first and the default focus last.
 */
export function CampaignApp() {
  const { pilots, game, cloud, owner } = usePilotSession();
  const { store, view: shown } = game,
    session = store.session;
  const reduced = useReducedMotion();
  const sound = useFlightAudio(session);
  const hangar = useHangar(store, sound, reduced);
  // The frame as of this render, which gestures and the debug hook measure against.
  const rendered = useRef(EMPTY_FRAME);
  const gestures = useGestures(game, rendered, !!hangar.part, sound);
  const views = useCameraViews(store, gestures.cancel);
  const menu = useMenu({ owner, game, pilots, cloud, gestures, views, hangar });
  const scene = useSceneView({
    game,
    views,
    hangar,
    home: menu.home,
    lock: gestures.lock,
    reduced,
    rendered,
  });
  const frame = scene.frame,
    focus = views.focus.id,
    units = unitOf(session.preferences),
    playing = !menu.home && !menu.hidden,
    camera = (mode: CameraMode) => views.camera(mode, frame);
  useDebugHook({
    game,
    pilots,
    home: menu.home,
    map: views.map,
    focus,
    inspection: hangar.part,
    rendered,
    measuredDeck: scene.measuredDeck,
  });
  useDefaultFocus(playing, scene.entering, hangar.part, focus, session.phase);
  useFonts();
  return (
    <main
      className="game-shell campaign-shell"
      data-phase={session.phase}
      data-pulling={gestures.pulling}
      data-home={menu.home}
      data-preview-current={!!shown.preview}
      data-preview-summary={summaryOf(shown.preview) || ''}
      data-flight-summary={summaryOf(shown.flight) || ''}
      style={{ '--deck-height': `${scene.deckHeight}px` } as CSSProperties}
    >
      <div className="starfield" />
      <div className="c-world" {...gestures.world} aria-hidden="true">
        <canvas ref={scene.background} />
        <canvas ref={scene.foreground} />
      </div>
      {playing && !hangar.part && (
        <div className="c-game-ui" inert={scene.entering}>
          <header className="c-topbar">
            <button className="c-brand" aria-label="Open main menu" onClick={menu.open}>
              starshot
            </button>
            <button className="pill" aria-label="Open menu" onClick={menu.open}>
              <Icon name="menu" />
            </button>
          </header>
          {!focus && <MissionDeck c={game} open={menu.mission.open} toggle={menu.mission.toggle} />}
          {focus ? (
            <FocusTitle id={focus} focus={views.focus} units={units} frame={frame} />
          ) : (
            <>
              <IntroCaption level={store.level} faded={menu.mission.captionFaded} />
              <BodyLabels
                frame={frame}
                level={store.level}
                map={views.map}
                deckHeight={scene.deckHeight}
                select={views.select}
              />
              {session.phase === 'aim' && !views.map && !menu.mission.open && (
                <AimHandle
                  ring={gestures.ring}
                  cancel={gestures.cancel}
                  aim={session.aim}
                  release={game.release}
                  disabled={game.release.pending || game.hydrating}
                  frame={frame}
                />
              )}
            </>
          )}
          {views.selected && (
            <BodyPopup
              id={views.selected}
              inspect={views.inspect}
              close={() => views.select(null)}
            />
          )}
          <MapTools
            store={store}
            active={shown.active}
            focused={!!focus}
            zoom={gestures.zoom}
            fit={() => camera('system')}
          />
          <HangarButton
            open={() => {
              gestures.cancel();
              hangar.open();
            }}
          />
          {session.phase === 'result' && !focus && (
            <ResultCard store={store} view={shown} playback={game.playback} pick={menu.pick} />
          )}
          <FlightDeck
            c={game}
            targetDistance={frame.targetDistance}
            deck={scene.deck}
            camera={camera}
            map={views.map}
            openMap={views.openMap}
            guide={menu.mission.guide}
          />
          <div className="c-scale">
            <i />
            {distanceText(frame.scaleKm, units)}
          </div>
          {shown.active?.analysis.beyondEphemerisRange && (
            <p className="c-warning">Beyond 2050: planet positions are extrapolated.</p>
          )}
        </div>
      )}
      {playing && hangar.part && (
        <>
          <Hangar
            part={hangar.part}
            select={hangar.select}
            back={hangar.back}
            flat={frame.renderer === 'Canvas 2D'}
            charge={hangar.charge}
            setCharge={hangar.pull}
            release={hangar.release}
            rotate={hangar.rotate}
          />
          {hangar.part === 'engine' && <DemoRing grip={frame.demoGrip} handlers={hangar.ring} />}
        </>
      )}
      {menu.hidden && (
        <button className="pill c-show-ui" aria-label="Show UI" onClick={menu.show}>
          <Eye open={false} />
        </button>
      )}
      {(menu.home || scene.entering) && (
        <HomeMenu
          c={game}
          pilots={pilots}
          cloud={cloud}
          menu={menu}
          targetDistance={frame.targetDistance}
          entering={!menu.home}
          error={scene.error}
        />
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {game.notice || scene.error}
      </div>
    </main>
  );
}
