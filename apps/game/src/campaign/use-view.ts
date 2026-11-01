import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EntryPresentation } from '@starshot/presentation/presentation';
import { CampaignScene } from './scene';
import { EMPTY_FRAME, type SceneState } from './scene-types';
import type { CampaignController } from './use-campaign';
export function useView(
  controller: CampaignController,
  state: Omit<SceneState, 'et' | 'visualTime' | 'home'>,
  home: boolean,
  suspended: boolean,
) {
  const background = useRef<HTMLCanvasElement>(null),
    foreground = useRef<HTMLCanvasElement>(null),
    [deckNode, setDeckNode] = useState<HTMLElement | null>(null);
  const deck = useCallback((node: HTMLElement | null) => setDeckNode(node), []);
  const [frame, setFrame] = useState(EMPTY_FRAME),
    frameRef = useRef(frame),
    [deckHeight, setDeckHeight] = useState(240);
  const [error, setError] = useState(''),
    presentation = useRef(new EntryPresentation());
  const [entering, setEntering] = useState(false),
    enteringRef = useRef(false);
  const live = useRef({ controller, state, suspended });
  live.current = { controller, state, suspended };
  useLayoutEffect(() => {
    presentation.current.setHome(home, performance.now(), state.reduced);
    setEntering(!home);
    enteringRef.current = !home;
  }, [home]);
  useEffect(() => {
    if (!deckNode) return;
    const measure = () => setDeckHeight(Math.ceil(deckNode.getBoundingClientRect().height) + 16);
    const observer = new ResizeObserver(measure);
    observer.observe(deckNode);
    measure();
    return () => observer.disconnect();
  }, [deckNode]);
  useEffect(() => {
    const scene = new CampaignScene(background.current!, foreground.current!);
    let raf = 0,
      previous = performance.now(),
      painted = 0;
    const draw = (now: number) => {
      const { controller: c, state: s, suspended: paused } = live.current;
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      c.tick(dt, now, paused || enteringRef.current);
      const amount = presentation.current.sample(now);
      if (enteringRef.current && amount === 0) {
        enteringRef.current = false;
        setEntering(false);
      }
      try {
        const missionBottom =
          document.querySelector('.c-mission-body')?.getBoundingClientRect().bottom ?? 0;
        const next = scene.update({
          ...s,
          safeTop: missionBottom ? missionBottom + 12 : undefined,
          et: s.aiming ? c.shot.launchEt : c.time.current,
          visualTime: now / 1000,
          home: amount,
        });
        frameRef.current = next;
        if (now - painted > 80) {
          painted = now;
          setFrame(next);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The scene could not be drawn.');
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      scene.dispose();
    };
  }, []);
  return { background, foreground, frame, frameRef, deck, deckHeight, entering, error };
}
