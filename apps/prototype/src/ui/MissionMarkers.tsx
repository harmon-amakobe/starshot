import type { FrameReadout } from '../render/view-types';
import { DAY } from '../lunar/model';
export function MissionMarkers({ frame, et }: { frame: FrameReadout; et: number }) {
  const { futureMoon, approachPoint } = frame;
  const merged = futureMoon && Math.hypot(futureMoon[0] - frame.moon[0], futureMoon[1] - frame.moon[1]) < 70;
  return <div className="mission-guides" aria-hidden="true">
    <span className="orbit-cue" style={{ left: frame.orbitCue[0], top: frame.orbitCue[1], transform: `translate(-50%,-50%) rotate(${frame.orbitDirection}rad)` }}>›</span>
    {futureMoon && approachPoint && <>
      <svg className="approach-link"><circle className="approach-zone" cx={futureMoon[0]} cy={futureMoon[1]} r={frame.approachRadiusPx} /><line x1={approachPoint[0]} y1={approachPoint[1]} x2={futureMoon[0]} y2={futureMoon[1]} /><circle cx={approachPoint[0]} cy={approachPoint[1]} r="5" /></svg>
      {!merged && <div className="future-moon" style={{ left: futureMoon[0], top: futureMoon[1] }}><i /><span>Moon at arrival</span></div>}
      <div className="approach-label" style={{ left: approachPoint[0], top: approachPoint[1] }}>{et >= frame.approachEt! ? 'Approach reached' : <>Approach in <span>{((frame.approachEt! - et) / DAY).toFixed(2)} days</span></>}</div>
    </>}
  </div>;
}
