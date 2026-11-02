/**
 * Top-down linear camera. World units are km in the heliocentric ecliptic
 * frame (+x towards the vernal equinox, +y 90 degrees ahead); screen units are
 * CSS pixels with y pointing down.
 */
export interface Viewport {
  /** Canvas size [CSS px]. */
  readonly width: number;
  readonly height: number;
  /**
   * Pixels covered by the HUD (top) and the controls (bottom, or right on wide
   * screens); the camera frames the space that is left.
   */
  readonly insetTop: number;
  readonly insetBottom: number;
  readonly insetRight: number;
}

/** Uncovered area [px]: left, top, width, height. */
function usable(vp: Viewport): [number, number, number, number] {
  const top = Math.min(vp.insetTop, vp.height * 0.4);
  const bottom = Math.min(vp.insetBottom, vp.height * 0.55);
  const right = Math.min(vp.insetRight, vp.width * 0.5);
  return [0, top, Math.max(80, vp.width - right), Math.max(80, vp.height - top - bottom)];
}

export interface Camera {
  /** World point [km] shown at the focus point of the viewport. */
  readonly x: number;
  readonly y: number;
  /** Pixels per km. */
  readonly scale: number;
}

/** Screen point the camera centre maps to: the middle of the uncovered area. */
export function focusPoint(vp: Viewport): [number, number] {
  const [x, y, w, h] = usable(vp);
  return [x + w / 2, y + h / 2];
}

/** Camera showing a circle of radiusKm around (x, y) inside the uncovered area. */
export function fitCamera(vp: Viewport, radiusKm: number, x = 0, y = 0, margin = 0.94): Camera {
  const [, , w, h] = usable(vp);
  return { x, y, scale: ((Math.min(w, h) / 2) * margin) / radiusKm };
}

export function project(cam: Camera, vp: Viewport, x: number, y: number): [number, number] {
  const [fx, fy] = focusPoint(vp);
  return [fx + (x - cam.x) * cam.scale, fy - (y - cam.y) * cam.scale];
}

export function unproject(cam: Camera, vp: Viewport, sx: number, sy: number): [number, number] {
  const [fx, fy] = focusPoint(vp);
  return [cam.x + (sx - fx) / cam.scale, cam.y - (sy - fy) / cam.scale];
}

export interface ZoomLimits {
  readonly minScale: number;
  readonly maxScale: number;
}

/** Zoom by `factor` keeping the world point under (sx, sy) fixed. */
export function zoomAt(cam: Camera, vp: Viewport, sx: number, sy: number, factor: number, limits: ZoomLimits): Camera {
  const scale = Math.min(limits.maxScale, Math.max(limits.minScale, cam.scale * factor));
  const [wx, wy] = unproject(cam, vp, sx, sy);
  const [fx, fy] = focusPoint(vp);
  return { scale, x: wx - (sx - fx) / scale, y: wy + (sy - fy) / scale };
}

/** Move the view by a screen-space drag (dx, dy) [px]. */
export function panBy(cam: Camera, dx: number, dy: number): Camera {
  return { ...cam, x: cam.x - dx / cam.scale, y: cam.y + dy / cam.scale };
}
