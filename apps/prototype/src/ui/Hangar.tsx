import { Icon } from '../icons';
import type { Inspection } from '../render/vehicle';
const parts = {
  craft: { title: 'The collector', subtitle: 'Small ship. Big first step.', tag: '700 kg · Flight vehicle', description: 'A rounded instrument pod, a bright engine ring and a little room for curiosity.' },
  engine: { title: 'The starshot engine', subtitle: 'The pull becomes a pulse.', tag: 'One departure burn · 3.55 km/s budget', description: 'An open ring with eight braces, a bright amber core and a compact body. One departure impulse starts the flight.' },
  crew: { title: 'A room with a view', subtitle: 'A future home for the crew.', tag: '1,000 kg · Design concept', description: 'A taller pressure cabin and a wraparound window. This heavier variant needs its own flight budget.' },
  drone: { title: 'Your little co-pilot', subtitle: 'A curious face in a very big sky.', tag: 'Service drone · Character study', description: 'Two soft lights, a tilting antenna and tiny side thrusters. Its silhouette stays readable at a glance.' },
};
export function Hangar({ part, select, back, rotate, flat }: { part: Inspection; select: (part: Inspection) => void; back: () => void; rotate: (direction: number) => void; flat: boolean }) {
  const info = parts[part];
  return <>
    <div className="hangar-caption"><span className="eyebrow">Vehicle workshop</span><h1>{info.title}</h1><p>{info.subtitle}</p><span className="model-tag">{info.tag}</span></div>
    <button className="pill hangar-close" onClick={back}><Icon name="close" />Back to flight</button>
    <section className="hangar-deck" aria-label="Vehicle inspection">
      <nav aria-label="Vehicle parts">{(['craft', 'engine', 'crew', 'drone'] as const).map(name => <button key={name} aria-pressed={part === name} className={part === name ? 'selected' : ''} onClick={() => select(name)}>{name === 'crew' ? 'Crew pod' : name[0]!.toUpperCase() + name.slice(1)}</button>)}</nav>
      <p>{info.description}</p>
      <div className="inspection-controls">{flat ? <span>2D reference preview</span> : <><button className="pill" onClick={() => rotate(-1)} aria-label="Rotate model left">↶</button><span>Drag to look around</span><button className="pill" onClick={() => rotate(1)} aria-label="Rotate model right">↷</button></>}</div>
    </section>
  </>;
}
