/**
 * Pointer input for the map canvas.
 *
 * - One finger / left mouse drag: pull the slingshot. The band is anchored at
 *   Earth; the pull is measured from where the drag started, so the shot can be
 *   aimed even when Earth is a few pixels from the Sun on outer-planet maps.
 * - Two fingers: pinch to zoom and pan together.
 * - Desktop: mouse wheel zooms at the cursor; drag with Shift/Ctrl/Alt/Meta held
 *   (or with the middle or right button) pans.
 */
import { useEffect, useRef, type RefObject } from "react";

export interface Pull {
  readonly pullX: number;
  readonly pullY: number;
}

export interface SlingshotHandlers {
  /** Live pull while dragging (final = pointer released). */
  onPull(pull: Pull, final: boolean): void;
  /** The drag was cancelled (second finger, pointercancel, Escape). */
  onPullCancel(): void;
  onZoom(screenX: number, screenY: number, factor: number): void;
  onPan(dx: number, dy: number): void;
}

/** Drags shorter than this [px] are taps, not shots. */
export const DEAD_ZONE_PX = 6;

type Mode = "none" | "aim" | "pan" | "pinch";

export function useSlingshot(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  handlers: SlingshotHandlers,
): RefObject<Pull | null> {
  const pullRef = useRef<Pull | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let mode: Mode = "none";
    let startX = 0, startY = 0;
    let pinchDist = 0, pinchX = 0, pinchY = 0;

    const local = (e: PointerEvent | WheelEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pinchState = () => {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return null;
      return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    const cancelAim = () => {
      if (mode === "aim" && pullRef.current) {
        pullRef.current = null;
        handlersRef.current.onPullCancel();
      }
      pullRef.current = null;
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Capture can fail for synthetic events; dragging still works inside the canvas.
      }
      if (pointers.size === 2) {
        cancelAim();
        const ps = pinchState();
        if (ps) {
          mode = "pinch";
          pinchDist = ps.d;
          pinchX = ps.x;
          pinchY = ps.y;
        }
        return;
      }
      if (pointers.size > 2) return;
      const panGesture =
        e.pointerType === "mouse" && (e.button !== 0 || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey);
      if (panGesture || !enabledRef.current) {
        mode = "pan";
      } else {
        mode = "aim";
      }
      startX = p.x;
      startY = p.y;
      e.preventDefault();
    };

    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (mode === "pinch") {
        const ps = pinchState();
        if (!ps) return;
        if (pinchDist > 0) handlersRef.current.onZoom(ps.x, ps.y, ps.d / pinchDist);
        handlersRef.current.onPan(ps.x - pinchX, ps.y - pinchY);
        pinchDist = ps.d;
        pinchX = ps.x;
        pinchY = ps.y;
      } else if (mode === "pan") {
        handlersRef.current.onPan(p.x - prev.x, p.y - prev.y);
      } else if (mode === "aim") {
        const pull = { pullX: p.x - startX, pullY: p.y - startY };
        if (!pullRef.current && Math.hypot(pull.pullX, pull.pullY) < DEAD_ZONE_PX) return;
        pullRef.current = pull;
        handlersRef.current.onPull(pull, false);
      }
    };

    const up = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (mode === "aim" && pullRef.current) {
        const pull = pullRef.current;
        pullRef.current = null;
        handlersRef.current.onPull(pull, true);
      }
      // Lifting one finger of a pinch ends the gesture; it never turns into a shot.
      if (pointers.size === 0) mode = "none";
      else if (mode === "pinch") mode = "pan";
    };

    const cancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      cancelAim();
      if (pointers.size === 0) mode = "none";
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      handlersRef.current.onZoom(p.x, p.y, Math.exp(-e.deltaY * unit * 0.0015));
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "aim") {
        cancelAim();
        mode = "none";
      }
    };
    const noMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("contextmenu", noMenu);
    window.addEventListener("keydown", key);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("contextmenu", noMenu);
      window.removeEventListener("keydown", key);
    };
  }, [canvasRef]);

  return pullRef;
}

/**
 * Map a pull to an aim: the probe flies opposite the pull. Screen y points
 * down and world y up, so the world direction is (-pullX, +pullY).
 * Speed follows u^1.5 of the pull fraction: fine control at small pulls.
 */
export function aimFromPull(pull: Pull, maxPullPx: number, vMax: number): { angleDeg: number; speedKmS: number } {
  const len = Math.hypot(pull.pullX, pull.pullY);
  const u = Math.min(1, len / maxPullPx);
  const angle = (Math.atan2(pull.pullY, -pull.pullX) * 180) / Math.PI;
  return { angleDeg: ((angle % 360) + 360) % 360, speedKmS: vMax * Math.pow(u, 1.5) };
}
