import type { MissionBody as BodyId } from '../missions';
import type { SceneFrame } from './scene-types';
import type { Mission as Level } from '../missions';
interface Rect { x: number; y: number; w: number; h: number; }
const meets = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w + 5 && a.x + a.w + 5 > b.x && a.y < b.y + b.h + 5 && a.y + a.h + 5 > b.y;
export function BodyLabels({ frame, level, map, deckHeight, select }: { frame: SceneFrame; level: Level; map: boolean; deckHeight: number; select: (id: BodyId) => void }) {
  const view = frame.visibleRect;
  const occupied: Rect[] = [...document.querySelectorAll<HTMLElement>('.c-map-tools,.c-mission-body,.c-caption:not(.faded),.c-hangar-button,.c-result,.c-scale,.c-symbol-note,.c-timeline')].map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  // Labels may move or disappear in a conjunction, but must not cover the worlds or engine grip.
  occupied.push(...frame.bodies.map(b => ({ x: b.point[0] - b.radius, y: b.point[1] - b.radius, w: b.radius * 2, h: b.radius * 2 })));
  const targets = frame.bodies.map(b => { const half = Math.max(22, Math.min(50, b.radius)); return { id: b.id, x: b.point[0] - half, y: b.point[1] - half, w: half * 2, h: half * 2 }; });
  occupied.push({ x: frame.craft[0] - 38, y: frame.craft[1] - 30, w: 76, h: 60 }, { x: frame.grip[0] - 28, y: frame.grip[1] - 28, w: 56, h: 56 });
  const bodies = frame.bodies.filter(b => (map || b.id === 'earth' || b.id === level.target || b.id === level.requiredFlyby || b.id === 'sun') && b.point[0] > 5 && b.point[0] < view.right + 30 && b.point[1] > 65 && b.point[1] < view.bottom + 20).sort((a, b) => (b.id === level.target ? 5 : b.id === 'earth' ? 4 : b.id === level.requiredFlyby ? 3 : 0) - (a.id === level.target ? 5 : a.id === 'earth' ? 4 : a.id === level.requiredFlyby ? 3 : 0));
  return <>{bodies.map(b => {
    const width = 32 + b.name.length * 7 + (b.id === level.target ? 40 : 0), r = Math.min(60, b.radius), [x, y] = b.point;
    const options = [[x - width / 2, y + r + 8], [x - width / 2, y - r - 52], [x - r - width - 8, y - 22], [x + r + 8, y - 22], [x - width / 2, y + r + 56], [x - width / 2, y - r - 100],
      // Diagonal places come last, so they only add a label where every other place was taken.
      [x + r + 8, y + r + 8], [x - r - width - 8, y + r + 8]];
    const candidates = options.map(([left, top]) => ({ x: Math.max(7, Math.min(view.right - width, left!)), y: Math.max(68, Math.min(view.bottom - 44, top!)), w: width, h: 44 }));
    // A label may sit on its own body's 44 px hit target, which selects the same body, but never on another's.
    const others = targets.filter(t => t.id !== b.id);
    const rect = candidates.find(candidate => !occupied.some(old => overlap(old, candidate)) && !others.some(t => meets(t, candidate))); if (rect) occupied.push(rect);
    const hitSize = Math.max(44, Math.min(100, b.radius * 2));
    return <div key={b.id}><button className="c-body-hit" style={{ left: x, top: y, width: hitSize, height: hitSize }} aria-label={`Inspect ${b.name}`} onClick={() => select(b.id as BodyId)} />{rect && <button className={`c-body-label ${b.id === level.target ? 'target' : ''}`} style={{ left: rect.x + width / 2, top: rect.y, width }} onClick={() => select(b.id as BodyId)} aria-label={`Select ${b.name}`}><i style={{ background: b.id === level.target ? '#b9e5d3' : undefined }} />{b.name}{b.id === level.target && <small>Target</small>}</button>}</div>;
  }).reverse()}</>;
}
