import { useRef, useState, type PointerEvent, type RefObject, type WheelEvent } from 'react';
import type { SceneFrame, SceneState } from './scene-types';
import type { CampaignController } from './use-campaign';
import type { Aim } from '../sim/shot';
import { aimFromPull, chargeFromPull } from './contracts';
import { zoomAt } from './zoom';
import type { ReleaseMode } from './session';
export function useGestures(c: CampaignController, frame: RefObject<SceneFrame>, inspect: boolean, demo: (value: number) => void, sound: (kind: 'pull' | 'launch', n?: number) => void) {
  const [lock, setLock] = useState<SceneState['lock']>(null), [pulling, setPulling] = useState(false);
  const drag = useRef<{ pointer: number; start: [number, number]; moved: boolean; anchor: [number, number]; offset: [number, number]; travel: number; rotation: number; orbit: [number, number]; rest: number; last: Aim; prograde: number; initialCharge: number; initialDistance: number; initialAim: Aim; wasPaused: boolean; owner: string; releaseMode: ReleaseMode } | null>(null);
  const points = useRef(new Map<number, [number, number]>());
  const finish = (cancelled: boolean, final?: Aim) => {
    const d = drag.current; drag.current = null; setPulling(false); setLock(null);
    if (d && !cancelled && d.moved) { if (d.releaseMode === 'hail-mary') sound('launch', d.last.speedKmS / c.store.level.vInfMaxKmS); c.release.actions.releasePull(final ?? d.last, d.releaseMode, d.owner); }
    else if (d) c.release.actions.cancelPull(d.initialAim, d.wasPaused, d.owner);
    else if (cancelled) c.release.cancel();
  };
  const aimAt = (e: PointerEvent) => {
    const d = drag.current; if (!d) return c.store.session.aim;
    if (Math.hypot(e.clientX - d.start[0], e.clientY - d.start[1]) >= 4) d.moved = true;
    if (!d.moved) return d.last;
    const dx = e.clientX - d.offset[0] - d.anchor[0], dy = e.clientY - d.offset[1] - d.anchor[1], distance = Math.hypot(dx, dy);
    const direction = aimFromPull(dx, dy, d.rotation, d.orbit);
    const angleDeg = c.store.session.parking ? Math.max(-35, Math.min(35, ((d.prograde * 180 / Math.PI - direction + 540) % 360) - 180)) : direction;
    const charge = chargeFromPull(d.initialCharge, d.initialDistance, distance, d.travel);
    d.last = { angleDeg, speedKmS: Math.max(0, Math.min(1, charge)) * c.store.level.vInfMaxKmS }; return d.last;
  };
  const ring = {
    onPointerDown(e: PointerEvent<HTMLButtonElement>) {
      if (drag.current || e.button !== 0 || c.release.pending || c.hydrating || c.store.session.phase !== 'aim') return;
      e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
      c.release.actions.freezeParking();
      const f = frame.current, rest = (f.height < 500 && f.width > 600 ? 15 : 22) * 1.12;
      drag.current = { pointer: e.pointerId, start: [e.clientX, e.clientY], moved: false, anchor: [...f.craft], offset: [e.clientX - f.grip[0], e.clientY - f.grip[1]], travel: f.travel, rotation: f.rotation, orbit: c.store.session.preferences.camera === 'free' ? [...c.store.session.preferences.orbit] : [0, 0], rest, last: c.store.session.aim, prograde: f.prograde, initialCharge: c.store.session.aim.speedKmS / c.store.level.vInfMaxKmS, initialDistance: Math.hypot(f.grip[0] - f.craft[0], f.grip[1] - f.craft[1]), initialAim: { ...c.store.session.aim }, wasPaused: c.store.session.paused, owner: c.owner, releaseMode: c.store.session.preferences.releaseMode };
      setLock({ heightKm: f.heightKm, centre: [...f.centre], anchor: [...f.craft], travel: f.travel }); setPulling(true); sound('pull');
    },
    onPointerMove(e: PointerEvent<HTMLButtonElement>) { if (drag.current?.pointer !== e.pointerId) return; e.preventDefault(); c.release.actions.aim(aimAt(e)); },
    onPointerUp(e: PointerEvent<HTMLButtonElement>) { if (drag.current?.pointer !== e.pointerId) return; e.preventDefault(); const final = aimAt(e); finish(false, final); },
    onPointerCancel() { finish(true); }, onLostPointerCapture() { if (drag.current) finish(true); },
  };
  const zoom = (factor: number, point?: [number, number]) => {
    if (drag.current) return; const f = frame.current;
    c.playback.preferences({ camera: 'free', ...zoomAt(f, factor, point ?? [f.width / 2, f.height / 2], c.store.session.preferences.camera === 'free' ? c.store.session.preferences.orbit : [0, 0]) });
  };
  const world = {
    onWheel(e: WheelEvent) { if (!drag.current) zoom(Math.exp(Math.max(-.4, Math.min(.4, e.deltaY * .0015))), [e.clientX, e.clientY]); },
    onPointerDown(e: PointerEvent<HTMLDivElement>) { if (drag.current) { finish(true); return; } if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); points.current.set(e.pointerId, [e.clientX, e.clientY]); },
    onPointerMove(e: PointerEvent<HTMLDivElement>) {
      const old = points.current.get(e.pointerId); if (!old) return;
      const next: [number, number] = [e.clientX, e.clientY], f = frame.current, p = c.store.session.preferences;
      if (points.current.size > 1) { const other = [...points.current].find(([id]) => id !== e.pointerId)?.[1]; if (other) zoom(Math.hypot(old[0] - other[0], old[1] - other[1]) / Math.max(10, Math.hypot(next[0] - other[0], next[1] - other[1])), [(next[0] + other[0]) / 2, (next[1] + other[1]) / 2]); }
      else if (inspect || e.shiftKey) c.playback.preferences({ camera: inspect ? p.camera : 'free', heightKm: f.heightKm, pan: [...f.centre], orbit: [Math.max(-1.2, Math.min(1.2, p.orbit[0] + (next[1] - old[1]) * .008)), Math.max(-1.2, Math.min(1.2, p.orbit[1] + (next[0] - old[0]) * .008))] });
      else {
        const a = p.camera === 'free' ? p.orbit[0] : 0, b = p.camera === 'free' ? p.orbit[1] : 0;
        const dy = (next[1] - old[1]) * f.heightKm / f.height / Math.cos(a), dx = (-(next[0] - old[0]) * f.heightKm / f.height - Math.sin(b) * Math.sin(a) * dy) / Math.cos(b);
        c.playback.preferences({ camera: 'free', heightKm: f.heightKm, pan: [f.centre[0] + dx, f.centre[1] + dy] });
      }
      points.current.set(e.pointerId, next);
    },
    onPointerUp(e: PointerEvent) { points.current.delete(e.pointerId); }, onPointerCancel(e: PointerEvent) { points.current.delete(e.pointerId); },
  };
  return { ring, world, lock, pulling, zoom, cancel: () => finish(true), isDragging: () => !!drag.current, demo };
}
