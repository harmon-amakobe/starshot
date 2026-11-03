import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { EntryPresentation } from '@starshot/presentation/presentation';
import { CampaignScene } from './scene';
import { EMPTY_FRAME, type SceneState, type SceneFrame } from './scene-types';
import type { CampaignController } from './use-campaign';
export function useView(controller: CampaignController, state: Omit<SceneState, 'et' | 'visualTime' | 'home'>, home: boolean, suspended: boolean, sharedFrame?: RefObject<SceneFrame>) {
  const background = useRef<HTMLCanvasElement>(null), foreground = useRef<HTMLCanvasElement>(null), [deckNode, setDeckNode] = useState<HTMLElement | null>(null);
  const deck = useCallback((node: HTMLElement | null) => setDeckNode(node), []);
  const [frame, setFrame] = useState(EMPTY_FRAME), ownFrame = useRef(frame), frameRef = sharedFrame ?? ownFrame, [deckHeight, setDeckHeight] = useState(240);
  const [error, setError] = useState(''), presentation = useRef(new EntryPresentation());
  const [entering, setEntering] = useState(false), enteringRef = useRef(false);
  const live = useRef({ controller, state, suspended }); live.current = { controller, state, suspended };
  useLayoutEffect(() => { presentation.current.setHome(home, performance.now(), state.reduced); setEntering(!home); enteringRef.current = !home; }, [home]);
  useEffect(() => {
    if (!deckNode) return;
    const measure = () => setDeckHeight(Math.ceil(deckNode.getBoundingClientRect().height) + 16);
    const observer = new ResizeObserver(measure); observer.observe(deckNode); measure(); return () => observer.disconnect();
  }, [deckNode]);
  useEffect(() => {
    const scene = new CampaignScene(background.current!, foreground.current!); let raf = 0, previous = performance.now(), painted = 0;
    const draw = (now: number) => {
      const { controller: c, state: s, suspended: paused } = live.current;
      const dt = Math.min(.05, (now - previous) / 1000); previous = now;
      c.playback.tick(dt, now, paused || enteringRef.current);
      const amount = presentation.current.sample(now);
      if (enteringRef.current && amount === 0) { enteringRef.current = false; setEntering(false); }
      try {
        const missionBottom = document.querySelector('.c-mission-body')?.getBoundingClientRect().bottom ?? 0;
        const bounds = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
        const controls = bounds('.c-map-tools'), deckBounds = bounds('.c-deck'), cue = bounds('.c-target-cue'), hangar = bounds('.c-hangar-button');
        const landscape = innerHeight < 500 && innerWidth > 600;
        const safeRect = deckBounds && controls ? { left: 35, right: landscape ? deckBounds.left - 20 : innerWidth - 35,
          top: Math.max(controls.bottom + 12, missionBottom ? missionBottom + 12 : 0),
          bottom: Math.max(controls.bottom + 56, Math.min(landscape ? innerHeight - 12 : deckBounds.top - 12, cue?.top ?? Infinity, hangar?.top ?? Infinity) - 12) } : undefined;
        const next = scene.update({ ...s, safeTop: missionBottom ? missionBottom + 12 : undefined, safeRect, et: s.aiming && !s.parking ? c.store.shot.launchEt : c.view.time.current, visualTime: now / 1000, home: amount }); frameRef.current = next;
        if (now - painted > 80) { painted = now; setFrame(next); }
      } catch (e) { setError(e instanceof Error ? e.message : 'The scene could not be drawn.'); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => { cancelAnimationFrame(raf); scene.dispose(); };
  }, []);
  return { background, foreground, frame, frameRef, deck, deckHeight, entering, error };
}
