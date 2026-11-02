import { useEffect } from 'react';
import type { BodyId } from '@starshot/ephemeris';
import type { Inspection } from '@starshot/presentation/vehicle';
import type { Session } from './session';

/**
 * A result card or inspection can unmount the button that held keyboard focus. When
 * focus falls back to the page, it moves to the deck's primary action.
 */
export function useDefaultFocus(
  shown: boolean,
  entering: boolean,
  inspection: Inspection | null,
  focus: BodyId | null,
  phase: Session['phase'],
) {
  useEffect(() => {
    if (shown && !entering && !inspection && document.activeElement === document.body)
      document.querySelector<HTMLButtonElement>('.c-deck .c-actions .primary')?.focus();
  }, [shown, entering, inspection, focus, phase]);
}
