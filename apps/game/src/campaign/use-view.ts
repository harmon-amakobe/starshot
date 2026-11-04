import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { EntryPresentation } from '@starshot/presentation/presentation';
import { isLunarLevel } from '../missions';
import { lunarModelLoader } from '../sim/load-lunar-model';
import { lunarLoadRun } from './lunar-readiness';
import { CampaignScene } from './scene';
import { EMPTY_FRAME, type SceneState, type SceneFrame } from './scene-types';
import type { CampaignController } from './use-campaign';
export function useView(controller: CampaignController, state: Omit<SceneState, 'et' | 'visualTime' | 'home'>, home: boolean, suspended: boolean, sharedFrame?: RefObject<SceneFrame>) {
  const background = useRef<HTMLCanvasElement>(null), foreground = useRef<HTMLCanvasElement>(null), [deckNode, setDeckNode] = useState<HTMLElement | null>(null);
  const deck = useCallback((node: HTMLElement | null) => setDeckNode(node), []);
  const [frame, setFrame] = useState(EMPTY_FRAME), ownFrame = useRef(frame), frameRef = sharedFrame ?? ownFrame, [deckHeight, setDeckHeight] = useState(240);
  const [error, setError] = useState(''), presentation = useRef(new EntryPresentation());
  const [entering, setEntering] = useState(false), enteringRef = useRef(false);
  const [model, setModel] = useState(lunarModelLoader.model), [status, setStatus] = useState(lunarModelLoader.state);
  const live = useRef({ controller, state, suspended, model }); live.current = { controller, state, suspended, model };
  const lunar = isLunarLevel(controller.store.level), retry = useRef(() => {}), sceneRef = useRef<CampaignScene | null>(null);
  const waiting = lunar && !model;
  useLayoutEffect(() => { presentation.current.setHome(home, performance.now(), state.reduced); setEntering(!home); enteringRef.current = !home; }, [home]);
  useEffect(() => {
    if (!deckNode) return;
    const measure = () => setDeckHeight(Math.ceil(deckNode.getBoundingClientRect().height) + 16);
    const observer = new ResizeObserver(measure); observer.observe(deckNode); measure(); return () => observer.disconnect();
  }, [deckNode]);
  useEffect(() => {
    const { hydrationRefs, store } = controller;
    const run = lunarLoadRun(controller.store.level, { ...hydrationRefs, mission: () => store.current.current.levelId },
      { model: setModel, status: setStatus }, lunarModelLoader);
    retry.current = run?.retry ?? (() => {});
    return run?.dispose;
  }, [lunar, controller.owner, controller.identity.visit]);
  useLayoutEffect(() => {
    // A switch to a waiting Moon level renders once with the planetary frame still on the canvases
    // and in state. Blanking both here, before the browser paints, means that render never shows.
    if (!waiting || frameRef.current === EMPTY_FRAME) return;
    sceneRef.current?.clear(); frameRef.current = EMPTY_FRAME; setFrame(EMPTY_FRAME);
  }, [waiting]);
  useEffect(() => {
    // This hook owns the Moon model, loaded on demand, and hands it to the scene each frame;
    // request code never touches it.
    const scene = new CampaignScene(background.current!, foreground.current!); let raf = 0, previous = performance.now(), painted = 0;
    sceneRef.current = scene;
    const draw = (now: number) => {
      const { controller: c, state: s, suspended: paused, model: drawModel } = live.current;
      // A Moon level waits for its model with lunar time held and nothing drawn, so no unseen orbit
      // advances; the layout effect above has already blanked the last planetary frame.
      const wait = isLunarLevel(c.store.level) && !drawModel;
      const dt = Math.min(.05, (now - previous) / 1000); previous = now;
      c.playback.tick(dt, now, paused || enteringRef.current || wait);
      const amount = presentation.current.sample(now);
      if (enteringRef.current && amount === 0) { enteringRef.current = false; setEntering(false); }
      if (!wait) try {
        const missionBottom = document.querySelector('.c-mission-body')?.getBoundingClientRect().bottom ?? 0;
        const bounds = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
        const controls = bounds('.c-map-tools'), deckBounds = bounds('.c-deck'), cue = bounds('.c-target-cue'), hangar = bounds('.c-hangar-button');
        const landscape = innerHeight < 500 && innerWidth > 600;
        const safeRect = deckBounds && controls ? { left: 35, right: landscape ? deckBounds.left - 20 : innerWidth - 35,
          top: Math.max(controls.bottom + 12, missionBottom ? missionBottom + 12 : 0),
          bottom: Math.max(controls.bottom + 56, Math.min(landscape ? innerHeight - 12 : deckBounds.top - 12, cue?.top ?? Infinity, hangar?.top ?? Infinity) - 12) } : undefined;
        const next = scene.update({ ...s, safeTop: missionBottom ? missionBottom + 12 : undefined, safeRect, et: s.aiming && !s.parking ? c.store.shot.launchEt : c.view.time.current, visualTime: now / 1000, home: amount }, drawModel); frameRef.current = next;
        if (now - painted > 80) { painted = now; setFrame(next); }
      } catch (e) { setError(e instanceof Error ? e.message : 'The scene could not be drawn.'); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => { cancelAnimationFrame(raf); scene.dispose(); };
  }, []);
  // Readiness reads the same model the scene draws with.
  return { background, foreground, frame, frameRef, deck, deckHeight, entering, error, model, status, retry: () => retry.current() };
}
