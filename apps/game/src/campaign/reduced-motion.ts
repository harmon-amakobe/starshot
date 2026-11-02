import { useEffect, useState } from 'react';
const media = () => matchMedia('(prefers-reduced-motion: reduce)');
/** Read at the moment of a decision, such as the snap after a release. */
export const prefersReducedMotion = () => media().matches;
/** The device setting as render state, updated when the player changes it. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const query = media(),
      change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  return reduced;
}
