import * as THREE from 'three';
import { EntryCamera } from './entry-camera';
import type { FrameReadout, ViewState } from './view-types';
import type { frameGeometry } from './coordinates';
export function drawEntryFallback(ctx: CanvasRenderingContext2D, camera: EntryCamera, frame: ReturnType<typeof frameGeometry>, state: ViewState, readout: FrameReadout, width: number, height: number) {
  const amount = state.cinematic ?? 1;
  const position = (p: readonly number[]) => new THREE.Vector3((p[0]! - frame.centre[0]) / 1000, (p[1]! - frame.centre[1]) / 1000, p[2]! / 1000);
  const craft = position(frame.craft), earth = position([0, 0, 0]), moon = position(frame.moon);
  camera.update(amount, width, height, frame.height / 1000, craft, earth, moon);
  const displayed = craft.clone().add(new THREE.Vector3((readout.craft[0] - readout.physicalCraft[0]) * frame.height / height / 1000 * (1 - amount),
    -(readout.craft[1] - readout.physicalCraft[1]) * frame.height / height / 1000 * (1 - amount), 0));
  const ringDistance = Math.hypot(readout.engineGrip[0] - readout.craft[0], readout.engineGrip[1] - readout.craft[1]);
  const earthKm = THREE.MathUtils.lerp(readout.earthRadiusPx * frame.height / height, 6371, amount), moonKm = THREE.MathUtils.lerp(readout.moonRadiusPx * frame.height / height, 1737.4, amount);
  readout.craft = camera.project(displayed, width, height); readout.earth = camera.project(earth, width, height); readout.moon = camera.project(moon, width, height);
  const radius = (point: THREE.Vector3, km: number) => km / 1000 / point.distanceTo(camera.camera.position) * height / (2 * Math.tan(camera.camera.fov * Math.PI / 360));
  for (const [point, r, light, dark] of [[readout.earth, radius(earth, earthKm), '#8dc9dc', '#193c5c'], [readout.moon, radius(moon, moonKm), '#e3e6e0', '#606f7b']] as const) {
    if (!Number.isFinite(r) || r < .1) continue;
    const fill = ctx.createRadialGradient(point[0] - r * .3, point[1] - r * .4, r * .05, point[0], point[1], r);
    fill.addColorStop(0, light); fill.addColorStop(1, dark); ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(...point, r, 0, Math.PI * 2); ctx.fill();
  }
  const size = THREE.MathUtils.lerp(24, (width < 600 && height < 700 ? 140 : 180) / 2.8, amount);
  ctx.save(); ctx.translate(...readout.craft); ctx.rotate(THREE.MathUtils.lerp(-readout.headingRad, -.18, amount));
  ctx.fillStyle = '#eee8d7'; ctx.beginPath(); ctx.ellipse(size * .2 * amount, 0, size, size * .55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17384a'; ctx.beginPath(); ctx.ellipse(size * (.5 + .15 * amount), -size * (.08 - .04 * amount), size * .43, size * .32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d9ecec'; ctx.lineWidth = 3 + 5 * amount; ctx.beginPath(); ctx.ellipse(THREE.MathUtils.lerp(-ringDistance, -size * .9, amount), 0, size * .17, size * .7, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#a5edff'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
}
