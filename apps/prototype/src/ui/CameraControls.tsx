import { Icon } from '../icons';
import type { CameraMode } from '../render/view-types';
export function CameraControls({ mode, select, parking }: { mode: CameraMode; select: (mode: CameraMode) => void; parking: () => void }) {
  return <div className="deck-cameras" role="group" aria-label="Travel camera">
    {(['follow', 'system', 'free'] as const).map(value => <button key={value} aria-pressed={mode === value}
      onClick={() => select(value)} className={mode === value ? 'selected' : ''}><Icon name={value} />{value.charAt(0).toUpperCase() + value.slice(1)}</button>)}
    <button className="parking-camera" aria-label="Parking orbit" title="View parking orbit" onClick={parking}><Icon name="orbit" /></button>
  </div>;
}
