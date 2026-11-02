import { useRef, useState, type PointerEvent, type RefObject, type WheelEvent } from 'react';
import type { SceneFrame, SceneState } from './scene-types';
import type { SessionStore } from './session-store';
import type { Release } from './use-release';
import type { Aim } from '../sim/shot';
import { aimFromPull } from './contracts';
export interface GestureGame {
  store: Pick<SessionStore, 'session' | 'level' | 'preferences'>;
  release: Pick<Release, 'pending' | 'aim' | 'launch' | 'cancel'>;
  hydrating: boolean;
}
export function useGestures(
  c: GestureGame,
  frame: RefObject<SceneFrame>,
  inspect: boolean,
  sound: (kind: 'pull' | 'launch', n?: number) => void,
) {
  const [lock, setLock] = useState<SceneState['lock']>(null),
    [pulling, setPulling] = useState(false);
  const drag = useRef<{
    pointer: number;
    start: [number, number];
    moved: boolean;
    anchor: [number, number];
    offset: [number, number];
    travel: number;
    rotation: number;
    orbit: [number, number];
    rest: number;
    last: Aim;
  } | null>(null);
  const points = useRef(new Map<number, [number, number]>());
  const finish = (cancelled: boolean, final?: Aim) => {
    const d = drag.current;
    drag.current = null;
    setPulling(false);
    setLock(null);
    if (d && !cancelled && d.moved) {
      sound('launch', d.last.speedKmS / c.store.level.vInfMaxKmS);
      c.release.launch(final ?? d.last);
    } else if (cancelled) c.release.cancel();
  };
  const aimAt = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return c.store.session.aim;
    if (Math.hypot(e.clientX - d.start[0], e.clientY - d.start[1]) >= 4) d.moved = true;
    if (!d.moved) return d.last;
    const dx = e.clientX - d.offset[0] - d.anchor[0],
      dy = e.clientY - d.offset[1] - d.anchor[1],
      distance = Math.hypot(dx, dy);
    const angleDeg = aimFromPull(dx, dy, d.rotation, d.orbit);
    d.last = {
      angleDeg,
      speedKmS: Math.max(0, Math.min(1, (distance - d.rest) / d.travel)) * c.store.level.vInfMaxKmS,
    };
    return d.last;
  };
  const ring = {
    onPointerDown(e: PointerEvent<HTMLButtonElement>) {
      if (
        drag.current ||
        e.button !== 0 ||
        c.release.pending ||
        c.hydrating ||
        c.store.session.phase !== 'aim'
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const f = frame.current,
        rest = (f.height < 500 && f.width > 600 ? 15 : 22) * 1.12;
      drag.current = {
        pointer: e.pointerId,
        start: [e.clientX, e.clientY],
        moved: false,
        anchor: [...f.craft],
        offset: [e.clientX - f.grip[0], e.clientY - f.grip[1]],
        travel: f.travel,
        rotation: f.rotation,
        orbit:
          c.store.session.preferences.camera === 'free'
            ? [...c.store.session.preferences.orbit]
            : [0, 0],
        rest,
        last: c.store.session.aim,
      };
      setLock({
        heightKm: f.heightKm,
        centre: [...f.centre],
        anchor: [...f.craft],
        travel: f.travel,
      });
      setPulling(true);
      sound('pull');
    },
    onPointerMove(e: PointerEvent<HTMLButtonElement>) {
      if (drag.current?.pointer !== e.pointerId) return;
      e.preventDefault();
      c.release.aim(aimAt(e));
    },
    onPointerUp(e: PointerEvent<HTMLButtonElement>) {
      if (drag.current?.pointer !== e.pointerId) return;
      e.preventDefault();
      const final = aimAt(e);
      finish(false, final);
    },
    onPointerCancel() {
      finish(true);
    },
    onLostPointerCapture() {
      if (drag.current) finish(true);
    },
  };
  const zoom = (factor: number) => {
    if (drag.current) return;
    const f = frame.current;
    c.store.preferences({
      camera: inspect ? c.store.session.preferences.camera : 'follow',
      heightKm: Math.max(1000, Math.min(2e11, f.heightKm * factor)),
      pan: [...f.centre],
    });
  };
  const world = {
    onWheel(e: WheelEvent) {
      if (!drag.current) zoom(Math.exp(Math.max(-0.4, Math.min(0.4, e.deltaY * 0.0015))));
    },
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      if (drag.current) {
        finish(true);
        return;
      }
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      points.current.set(e.pointerId, [e.clientX, e.clientY]);
    },
    onPointerMove(e: PointerEvent<HTMLDivElement>) {
      const old = points.current.get(e.pointerId);
      if (!old) return;
      const next: [number, number] = [e.clientX, e.clientY],
        f = frame.current,
        p = c.store.session.preferences;
      if (points.current.size > 1) {
        const other = [...points.current].find(([id]) => id !== e.pointerId)?.[1];
        if (other)
          zoom(
            Math.hypot(old[0] - other[0], old[1] - other[1]) /
              Math.max(10, Math.hypot(next[0] - other[0], next[1] - other[1])),
          );
      } else if (inspect || e.shiftKey)
        c.store.preferences({
          camera: inspect ? p.camera : 'free',
          heightKm: f.heightKm,
          pan: [...f.centre],
          orbit: [
            Math.max(-1.2, Math.min(1.2, p.orbit[0] + (next[1] - old[1]) * 0.008)),
            Math.max(-1.2, Math.min(1.2, p.orbit[1] + (next[0] - old[0]) * 0.008)),
          ],
        });
      else {
        const a = p.camera === 'free' ? p.orbit[0] : 0,
          b = p.camera === 'free' ? p.orbit[1] : 0;
        const dy = ((next[1] - old[1]) * f.heightKm) / f.height / Math.cos(a),
          dx =
            ((-(next[0] - old[0]) * f.heightKm) / f.height - Math.sin(b) * Math.sin(a) * dy) /
            Math.cos(b);
        c.store.preferences({
          camera: 'free',
          heightKm: f.heightKm,
          pan: [f.centre[0] + dx, f.centre[1] + dy],
        });
      }
      points.current.set(e.pointerId, next);
    },
    onPointerUp(e: PointerEvent) {
      points.current.delete(e.pointerId);
    },
    onPointerCancel(e: PointerEvent) {
      points.current.delete(e.pointerId);
    },
  };
  return {
    ring,
    world,
    lock,
    pulling,
    zoom,
    cancel: () => finish(true),
    isDragging: () => !!drag.current,
  };
}
export type Gestures = ReturnType<typeof useGestures>;
