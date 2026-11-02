import type { SceneFrame } from './scene-types';
/** Keep the same point in the view plane under a wheel pointer or pinch midpoint. */
export function zoomAt(frame: Pick<SceneFrame, 'centre' | 'heightKm' | 'width' | 'height'>, factor: number, point: [number, number], orbit: [number, number]) {
  const heightKm = Math.max(1000, Math.min(2e11, frame.heightKm * factor));
  const amount = (frame.heightKm - heightKm) / frame.height;
  const y = (frame.height / 2 - point[1]) * amount / Math.cos(orbit[0]);
  const x = ((point[0] - frame.width / 2) * amount + Math.sin(orbit[1]) * Math.sin(orbit[0]) * y) / Math.cos(orbit[1]);
  return { heightKm, pan: [frame.centre[0] + x, frame.centre[1] + y] as [number, number] };
}
