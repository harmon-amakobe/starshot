import { Icon } from '@starshot/presentation/icons';
import type { Inspection } from '@starshot/presentation/vehicle';
const parts = {
  craft: ['The collector', 'Small ship. Big first step.', 'A rounded instrument pod, a bright engine ring and a little room for curiosity.'],
  engine: ['The starshot engine', 'Pull the ring. Gather a field. Release a pulse.', 'Extend the chamber. Watch the field gather, then release its stored energy.'],
  crew: ['A room with a view', 'A future home for the crew.', 'A pressure cabin and a wraparound window. A front-row seat to the Solar System.'],
  drone: ['Your little co-pilot', 'A curious face in a very big sky.', 'Two soft lights, a tilting antenna and tiny side thrusters.'],
};
export function Hangar({ part, select, back, rotate, flat, charge, setCharge, release }: { part: Inspection; select: (part: Inspection) => void; back: () => void; rotate: (direction: number) => void; flat: boolean; charge: number; setCharge: (value: number) => void; release: () => void }) {
  const info = parts[part];
  return <><div className="hangar-caption"><span className="eyebrow">Vehicle workshop</span><h1>{info[0]}</h1><p>{info[1]}</p></div><button className="pill hangar-close" onClick={back}><Icon name="close" />Back to flight</button>
    <section className="hangar-deck" aria-label="Vehicle inspection"><nav aria-label="Vehicle parts">{(['craft', 'engine', 'crew', 'drone'] as const).map(name => <button key={name} aria-pressed={part === name} className={part === name ? 'selected' : ''} onClick={() => select(name)}>{name === 'crew' ? 'Crew pod' : name[0]!.toUpperCase() + name.slice(1)}</button>)}</nav><p>{info[2]}</p>
      {part === 'engine' && <div className="engine-demo-controls"><label>Charge <output>{Math.round(charge * 100)}%</output><input aria-label="Engine demonstration charge" type="range" min="0" max="100" value={Math.round(charge * 100)} onChange={event => setCharge(Number(event.target.value) / 100)} /></label><button className="primary" onClick={release}>Release test</button></div>}
      <div className="inspection-controls">{flat ? <span>Canvas reference view</span> : <><button className="pill" onClick={() => rotate(-1)} aria-label="Rotate model left">↶</button><span>Drag to look around</span><button className="pill" onClick={() => rotate(1)} aria-label="Rotate model right">↷</button></>}</div>
    </section></>;
}
