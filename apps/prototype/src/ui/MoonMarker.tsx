import { useLayoutEffect, useRef } from 'react';

interface Props { x: number; y: number; world: readonly number[]; offscreen: boolean; distance: string; }
export function MoonMarker({ x, y, world, offscreen, distance }: Props) {
  const marker = useRef<HTMLDivElement>(null), arrow = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = marker.current;
    if (!element) return;
    element.style.top = `${y}px`;
    const box = element.getBoundingClientRect();
    const controls = Array.from(document.querySelectorAll('.camera-controls,.pull-coach'))
      .map(control => control.getBoundingClientRect())
      .filter(control => control.width && control.left < box.right + 8 && control.right > box.left - 8);
    const bottom = (document.querySelector('.flight-deck')?.getBoundingClientRect().top ?? innerHeight) - 18;
    // Labels may move; the body and its orbit stay at their physical projections.
    const candidates = [box.top, ...controls.flatMap(control => [control.top - box.height - 8, control.bottom + 8])]
      .filter(top => top >= 88 && top + box.height <= bottom && controls.every(control => top + box.height <= control.top - 8 || top >= control.bottom + 8));
    const top = candidates.sort((a, b) => Math.abs(a - box.top) - Math.abs(b - box.top))[0] ?? box.top;
    const placedY = y + top - box.top;
    element.style.top = `${placedY}px`;
    if (arrow.current) arrow.current.style.transform = `rotate(${Math.atan2(world[1]! - placedY, world[0]! - x)}rad)`;
  }, [x, y, world, offscreen, distance]);
  return <div ref={marker} className={`moon-marker ${offscreen ? 'offscreen' : 'on-world'}`} style={{ left: x, top: y }}>
    <b>Moon {offscreen && <span ref={arrow} aria-hidden="true" style={{ display: 'inline-block' }}>→</span>}</b><span>{distance}</span>
  </div>;
}
