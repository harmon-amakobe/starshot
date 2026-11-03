import { Icon } from '@starshot/presentation/icons';
import { bodyName, type MissionBody as BodyId } from '../missions';

export function BodyPopup({
  selected,
  inspectBody,
  setSelected,
}: {
  selected: BodyId;
  inspectBody: (id: BodyId) => void;
  setSelected: (id: BodyId | null) => void;
}) {
  return (
    <div className="c-body-popup">
      <span>{selected === 'sun' ? 'Sol' : bodyName(selected)}</span>
      <button className="primary" onClick={() => inspectBody(selected)}>
        View closer
      </button>
      <button className="pill" aria-label="Close body selection" onClick={() => setSelected(null)}>
        <Icon name="close" />
      </button>
    </div>
  );
}
