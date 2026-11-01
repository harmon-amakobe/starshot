import { Icon } from '../icons';
import type { CameraMode } from '../render/view-types';
export function CameraControls({ mode, select }: { mode: CameraMode; select: (mode: CameraMode) => void }) {
  return <div className="deck-cameras" role="group" aria-label="Travel camera">
    {(['follow', 'system', 'free'] as const).map(value => <button key={value} aria-pressed={mode === value}
      onClick={() => select(value)} className={mode === value ? 'selected' : ''}><Icon name={value} />{value.charAt(0).toUpperCase() + value.slice(1)}</button>)}
  </div>;
}
