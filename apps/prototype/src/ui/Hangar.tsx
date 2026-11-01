import { Icon } from '../icons';
import type { Inspection } from '../render/vehicle';
const parts = {
  craft: { title: 'The collector', subtitle: 'Small ship. Big first step.', tag: '700 kg · Flight vehicle', description: 'A rounded instrument pod, a bright engine ring and a little room for curiosity.' },
  engine: { title: 'The starshot engine', subtitle: 'Pull the ring. Gather a field. Release a pulse.', tag: 'Engine test bay', description: 'Extend the ring to gather a graviton field. Release it to collapse the chamber into a pulse.' },
  crew: { title: 'A room with a view', subtitle: 'A future home for the crew.', tag: '1,000 kg · Design concept', description: 'A taller pressure cabin and a wraparound window. This heavier variant needs its own flight budget.' },
  drone: { title: 'Your little co-pilot', subtitle: 'A curious face in a very big sky.', tag: 'Service drone · Character study', description: 'Two soft lights, a tilting antenna and tiny side thrusters. Its silhouette stays readable at a glance.' },
};
export function Hangar({ part, select, back, rotate, flat, charge, setCharge, release, resetView }: { part: Inspection; select: (part: Inspection) => void; back: () => void; rotate: (direction: number) => void; flat: boolean;
  charge: number; setCharge: (value: number) => void; release: () => void; resetView: () => void }) {
  const info = parts[part];
  return <>
    <div className="hangar-caption"><span className="eyebrow">Vehicle workshop</span><h1>{info.title}</h1><p>{info.subtitle}</p><span className="model-tag">{info.tag}</span></div>
    <button className="pill hangar-close" onClick={back}><Icon name="close" />Back to flight</button>
    <section className="hangar-deck" aria-label="Vehicle inspection">
      <nav aria-label="Vehicle parts">{(['craft', 'engine', 'crew', 'drone'] as const).map(name => <button key={name} aria-pressed={part === name} className={part === name ? 'selected' : ''} onClick={() => select(name)}>{name === 'crew' ? 'Crew pod' : name[0]!.toUpperCase() + name.slice(1)}</button>)}</nav>
      <p>{info.description}</p>
      {part === 'engine' && <div className="engine-demo-controls"><label>Charge <output>{Math.round(charge * 100)}%</output><input aria-label="Engine demonstration charge" type="range" min="0" max="100" value={Math.round(charge * 100)} onChange={event => setCharge(Number(event.target.value) / 100)} /></label><button className="primary" onClick={release}>Release test</button><button className="pill" onClick={resetView}>Reset view</button></div>}
      <div className="inspection-controls">{flat ? <span>2D reference preview</span> : <><button className="pill" onClick={() => rotate(-1)} aria-label="Rotate model left">↶</button><span>Drag to look around</span><button className="pill" onClick={() => rotate(1)} aria-label="Rotate model right">↷</button></>}</div>
    </section>
  </>;
}
