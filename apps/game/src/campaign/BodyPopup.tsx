import type { BodyId } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { bodyName } from './session';

/** The selected body's name, with a closer view or a way back. */
export function BodyPopup({
  id,
  inspect,
  close,
}: {
  id: BodyId;
  inspect: (id: BodyId) => void;
  close: () => void;
}) {
  return (
    <div className="c-body-popup">
      <span>{bodyName(id)}</span>
      <button className="primary" onClick={() => inspect(id)}>
        View closer
      </button>
      <button className="pill" aria-label="Close body selection" onClick={close}>
        <Icon name="close" />
      </button>
    </div>
  );
}
