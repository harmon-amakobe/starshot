import { useEffect } from 'react';

export type EscapeAction = 'cancel' | 'hangar' | 'focus' | 'selection' | 'menu' | null;

/** Escape undoes the innermost thing: a pull or pending release, then a view, then play. */
export function escapeAction(s: {
  dragging: boolean;
  pending: boolean;
  inspecting: boolean;
  focused: boolean;
  selected: boolean;
  home: boolean;
}): EscapeAction {
  if (s.dragging || s.pending) return 'cancel';
  if (s.inspecting) return 'hangar';
  if (s.focused) return 'focus';
  if (s.selected) return 'selection';
  if (!s.home) return 'menu';
  return null;
}

/**
 * A window listener re-registered on every render, so it always runs the latest
 * handlers. It ignores an Escape whose default was prevented. The aim handle stops its
 * Escape before the window; the main menu reacts to Escape first and lets it through.
 */
export function useEscape(input: {
  isDragging: () => boolean;
  pending: boolean;
  inspecting: boolean;
  focused: boolean;
  selected: boolean;
  home: boolean;
  cancel: () => void;
  back: () => void;
  closeFocus: () => void;
  clearSelection: () => void;
  menu: () => void;
}) {
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const action = escapeAction({ ...input, dragging: input.isDragging() });
      if (action === 'cancel') {
        e.preventDefault();
        input.cancel();
      } else if (action === 'hangar') input.back();
      else if (action === 'focus') input.closeFocus();
      else if (action === 'selection') input.clearSelection();
      else if (action === 'menu') input.menu();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  });
}
