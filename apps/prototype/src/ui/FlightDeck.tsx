import { Icon } from '../icons';
import { DAY, FUEL_BUDGET } from '../lunar/model';
import type { ShotState } from '../lunar/shot-state';
import type { CameraMode } from '../render/view-types';
import { CameraControls } from './CameraControls';
interface Props {
  state: ShotState; scientific: boolean; expanded: boolean; paused: boolean; elapsed: number;
  distance: number; units: number; guide: boolean;
  setScientific: (value: boolean) => void; toggleExpanded: () => void; cycleUnits: () => void;
  aim: (dv: number, angle: number) => void; release: () => void; cancel: () => void;
  hint: () => void; pause: () => void; retry: () => void; replay: () => void;
  camera: CameraMode; setCamera: (mode: CameraMode) => void;
}
export function formatDistance(km: number, units: number) {
  if (units === 0) return km < 2997.92458 ? `${(km / 299.792458).toFixed(2)} light-ms` : `${(km / 299792.458).toFixed(2)} light-s`;
  const number = units === 2 ? km / 1.609344 : km;
  return `${Math.round(number).toLocaleString()} ${units === 2 ? 'mi' : 'km'}`;
}
export function FlightDeck(p: Props) {
  const { state, scientific, expanded } = p, aim = state.phase === 'aim' || state.phase === 'snap', snapping = state.phase === 'snap';
  const fuel = state.request.deltaVKmS / FUEL_BUDGET * 100;
  const result = state.preview;
  const progress = Math.max(0, Math.min(100, p.elapsed / ((state.launch?.endEt ?? state.request.launchEt + 1) - state.request.launchEt) * 100));
  const compactStatus = state.error ? 'Error' : state.pendingRelease || !result ? 'Updating' : result.entryEt ? 'Ready' : result.impact ? 'Earth' : state.request.scope === 'local' ? 'Loop' : 'Miss';
  const prediction = state.error ?? (state.pendingRelease ? 'Computing this path' : !result ? 'Computing your path…' : state.request.deltaVKmS === 0 ? 'Pull back to charge' : result.entryEt ? 'Moon approach lined up' : result.impact ? 'Earth is in the way' : state.request.scope === 'local' ? 'A loop around Earth' : 'This path misses the Moon');
  return <section className={`flight-deck ${expanded ? '' : 'collapsed'}`} aria-label="Flight deck">
    <div className="deck-heading">
      <button className="deck-title" onClick={p.toggleExpanded} aria-expanded={expanded} aria-label="Flight deck"><Icon name="down" /><span>Flight deck</span></button>
      {!expanded && <div className="compact-readings" aria-label={aim ? 'Shot summary' : 'Flight summary'}>
        <div className="compact-meter"><span>{aim ? 'Shot fuel' : 'Flight'}</span><div role={aim ? 'meter' : 'progressbar'} aria-label={aim ? 'Shot fuel' : 'Flight progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(aim ? fuel : progress)}><i style={{ width: `${aim ? fuel : progress}%` }} /></div><b>{Math.round(aim ? fuel : progress)}%</b></div>
        {aim ? <><span className="compact-angle" aria-label={`Burn angle ${state.request.burnAngleDeg.toFixed(1)} degrees`} title="Physical burn angle"><span aria-hidden="true">∠</span> {state.request.burnAngleDeg > 0 ? '+' : ''}{state.request.burnAngleDeg.toFixed(1)}°</span><span className="compact-status" title={state.error ?? undefined}><Icon name={result?.entryEt ? 'guide' : 'orbit'} size={15} />{compactStatus}</span></>
          : <span className="compact-distance">Moon · {formatDistance(p.distance, p.units)}</span>}
      </div>}
      <button className="pill units" onClick={p.cycleUnits} aria-label={`Units: ${['Light-time', 'Metric', 'Imperial'][p.units]}. Change units`}>
        {p.units === 0 ? <Icon name="wave" /> : <b className="unit-icon">{p.units === 1 ? 'km' : 'mi'}</b>}<span>{['Light-time', 'Metric', 'Imperial'][p.units]}</span>
      </button>
      <div className="detail-modes" aria-label="Detail level">
        <button className={!scientific ? 'selected' : ''} aria-pressed={!scientific} aria-label="Simplified" onClick={() => p.setScientific(false)}><Icon name="face" />{!scientific && expanded && <span>Simplified</span>}</button>
        <button className={scientific ? 'selected' : ''} aria-pressed={scientific} aria-label="Scientific" onClick={() => p.setScientific(true)}><Icon name="orbit" />{scientific && expanded && <span>Scientific</span>}</button>
      </div>
    </div>
    {expanded && <div className="deck-body">
      {aim ? <>
        <div className="instruments">
          <div className="fuel-instrument"><div className="fuel-ring" style={{ '--fuel': `${fuel}%` } as React.CSSProperties}><strong><span>{Math.round(fuel)}<small>%</small></span></strong></div><div><span>Shot fuel</span><b>{scientific ? `${state.request.deltaVKmS.toFixed(2)} km/s` : `${Math.round(100 - fuel)}% remaining`}</b></div></div>
          <div className={`prediction ${result?.entryEt ? 'hit' : ''}`}><Icon name={result?.entryEt ? 'guide' : 'orbit'} /><div><b>{prediction}</b><span>{result?.entryEt ? `${((result.entryEt - state.request.launchEt) / DAY).toFixed(2)} days to approach` : result && state.request.deltaVKmS > 0 ? `Closest: ${formatDistance(result.closestKm, p.units)}` : 'Release to fly'}</span></div></div>
        </div>
        {scientific && <div className="fine-controls">
          <label>Pull strength <output>{state.request.deltaVKmS.toFixed(2)} km/s</output><input disabled={snapping} aria-label="Pull strength" type="range" min="0" max="3.55" step="0.01" value={state.request.deltaVKmS} onChange={e => p.aim(Number(e.target.value), state.request.burnAngleDeg)} /></label>
          <label>Aim angle <output>{state.request.burnAngleDeg.toFixed(1)}°</output><input disabled={snapping} aria-label="Aim angle" type="range" min="-35" max="35" step="0.1" value={state.request.burnAngleDeg} onChange={e => p.aim(state.request.deltaVKmS, Number(e.target.value))} /></label>
        </div>}
      </> : <div className="flight-instruments"><div><span>Flight time</span><strong>{(p.elapsed / DAY).toFixed(2)} <small>days</small></strong></div><div><span>To the Moon</span><strong>{formatDistance(p.distance, p.units)}</strong></div><div className="fuel-left"><span>Fuel left</span><strong>{Math.round(100 - fuel)}<small>%</small></strong></div></div>}
    </div>}
    <div className="deck-footer"><CameraControls mode={p.camera} select={p.setCamera} />
    {state.phase !== 'result' && <div className="deck-actions">
      {aim ? <><button className="primary" onClick={p.release} disabled={!!state.error || snapping || state.pendingRelease}><Icon name="play" />{snapping ? 'Launching…' : state.pendingRelease ? 'Computing…' : 'Launch'}</button><button className="pill" disabled={snapping} onClick={p.hint}><Icon name="guide" />{p.guide ? 'Guide set' : 'Guide'}</button><button className="text-button" onClick={p.cancel}>Cancel pull</button></>
        : <><button className="primary" onClick={p.pause}><Icon name={p.paused ? 'play' : 'pause'} />{p.paused ? 'Resume' : 'Pause'}</button><button className="pill" onClick={p.retry}><Icon name="retry" />Try again</button></>}
      <span className="plane-lock"><Icon name="lock" size={15} />{scientific ? 'Aim plane locked' : 'One plane. All of space.'}</span>
    </div>}</div>
  </section>;
}
