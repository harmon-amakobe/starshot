import { norm, sub } from '@starshot/ephemeris';
import { LunarModel, EARTH_RADIUS, MOON_RADIUS } from '../lunar/model';
import { sampleFlight } from '../lunar/flight';
import { frameGeometry, frameReadout, local } from './coordinates';
import type { SceneView, ViewState } from './view-types';
import { drawSleeve } from './charge-sleeve';
import { parkingOrbit, routePoints } from './orbital-context';
import { EntryCamera } from './entry-camera';
import { drawEntryFallback } from './entry-fallback';
export class CanvasView implements SceneView {
  private ctx: CanvasRenderingContext2D;
  private entryCamera = new EntryCamera();
  constructor(private canvas: HTMLCanvasElement, private model: LunarModel) { this.ctx = canvas.getContext('2d')!; }
  update(state: ViewState) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = w * devicePixelRatio; this.canvas.height = h * devicePixelRatio;
    const ctx = this.ctx; ctx.scale(devicePixelRatio, devicePixelRatio); ctx.clearRect(0, 0, w, h);
    const frame = frameGeometry(this.model, state, w / h, { width: w, height: h }), ratio = h / frame.height;
    const readout = frameReadout(frame, state, w, h, 'Canvas fallback');
    readout.ready = true; readout.cinematic = state.cinematic ?? 0;
    if (state.cinematic && state.cinematic > 0 && !state.inspection) { drawEntryFallback(ctx, this.entryCamera, frame, state, readout, w, h); return readout; }
    if (state.inspection === 'engine') {
      const top = h < 500 ? 115 : 190, bottom = h < 500 ? 180 : 285;
      const y = (top + h - bottom) / 2, travel = Math.min(150, w * .45), front: [number, number] = [w / 2 + travel / 2, y];
      const grip: [number, number] = [front[0] - 22 - (state.demoCharge ?? 0) * travel, y];
      readout.demoFront = front; readout.demoGrip = grip; readout.demoTravelPx = travel;
      drawSleeve(ctx, front, grip, Math.min(34, Math.max(20, (h - top - bottom) / 4)));
      for (const [point, color, lineWidth] of [[front, '#334957', 9], [grip, '#e2e7df', 8], [grip, '#adf5ff', 2]] as const) {
        ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.beginPath(); ctx.ellipse(point[0], point[1], 10, 37, 0, 0, Math.PI * 2); ctx.stroke();
      }
      return readout;
    }
    const xy = (p: readonly number[]): [number, number] => [w / 2 + (p[0]! - frame.centre[0]) * ratio, h / 2 - (p[1]! - frame.centre[1]) * ratio];
    const circle = (p: readonly number[], r: number, color: string) => { const q = xy(p); ctx.beginPath(); ctx.arc(...q, r * ratio, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
    if (!state.inspection) {
      ctx.strokeStyle = '#72939566'; ctx.lineWidth = 1; ctx.beginPath();
      frame.orbit.forEach((point, index) => { const p = xy(point); if (index) ctx.lineTo(...p); else ctx.moveTo(...p); }); ctx.stroke();
      const radius = state.flight?.request.parkingRadiusKm ?? 6571, orbit = parkingOrbit(this.model, radius);
      ctx.strokeStyle = '#8dbfdfa6'; ctx.beginPath(); orbit.forEach((point, i) => { const p = xy(point); if (i) ctx.lineTo(...p); else ctx.moveTo(...p); }); ctx.stroke();
      readout.parkingRadiusPx = radius * ratio; readout.burnNode = xy(orbit[0]!);
    }
    if (!state.inspection) { circle([0, 0, 0], readout.earthRadiusPx / ratio, '#397ea1'); circle(frame.moon, readout.moonRadiusPx / ratio, '#c0c7cb'); }
    if (state.flight && !state.inspection) {
      const points = routePoints(this.model, state.flight), past = state.aiming ? [] : points.filter(p => p.t < state.et).map(p => p.p), future = points.filter(p => p.t >= state.et).map(p => p.p);
      if (past.length) past.push(frame.craft); future.unshift(frame.craft);
      readout.travelledPoints = past.length; readout.futurePoints = future.length;
      for (const [line, travelled] of [[past, true], [future, false]] as const) {
        ctx.strokeStyle = travelled ? '#8d9eac88' : state.previewUpdating ? '#ffd99155' : '#ffd991'; ctx.lineWidth = travelled ? 1 : 2;
        ctx.setLineDash(travelled ? [] : [2, 8]); ctx.beginPath();
        line.forEach((point, i) => { const p = xy(point); if (i) ctx.lineTo(...p); else ctx.moveTo(...p); }); ctx.stroke();
      }
      ctx.setLineDash([]);
      if (readout.burnNode && (readout.parkingRadiusPx ?? 0) > readout.earthRadiusPx + 1) { ctx.strokeStyle = '#e1f3ff'; ctx.beginPath(); ctx.arc(...readout.burnNode, 4, 0, Math.PI * 2); ctx.stroke(); }
    }
    const p = state.inspection ? [w / 2, h * .5] : readout.craft;
    const size = state.inspection ? Math.min(105, w * .26, h * .14) : 24;
    if (!state.inspection && readout.engineExtensionPx > .5) drawSleeve(ctx, readout.engineFront, readout.engineGrip);
    ctx.save(); ctx.translate(p[0]!, p[1]!); if (!state.inspection) ctx.rotate(-readout.headingRad);
    if (!state.inspection && readout.enginePulse > 0) {
      const length = size * (2 + readout.enginePulse), glow = ctx.createLinearGradient(-size, 0, -size - length, 0);
      glow.addColorStop(0, '#e9fcffee'); glow.addColorStop(.3, '#7ddff780'); glow.addColorStop(1, '#7183cf00');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(-size, -size * .2); ctx.lineTo(-size - length, 0); ctx.lineTo(-size, size * .2); ctx.closePath(); ctx.fill();
    }
    if (state.inspection === 'drone') {
      ctx.fillStyle = '#eee8d7'; ctx.beginPath(); ctx.arc(0, 0, size * .7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#123348'; ctx.beginPath(); ctx.ellipse(0, 0, size * .55, size * .32, 0, 0, Math.PI * 2); ctx.fill();
      for (const side of [-1, 1]) { ctx.fillStyle = '#adf3ff'; ctx.beginPath(); ctx.ellipse(side * size * .2, 0, size * .06, size * .12, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#89989b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -size * .6); ctx.lineTo(-size * .1, -size); ctx.stroke();
    } else {
      ctx.fillStyle = '#eee8d7'; ctx.beginPath(); ctx.ellipse(0, 0, size, size * (state.inspection === 'crew' ? .8 : .55), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#123348'; ctx.beginPath(); ctx.ellipse(size * .5, -size * .08, size * .43, size * .32, 0, 0, Math.PI * 2); ctx.fill();
      const charge = state.charge ?? 0;
      ctx.strokeStyle = '#b8f2ff'; ctx.lineWidth = 3 + charge * 3; ctx.shadowColor = '#89dbf4'; ctx.shadowBlur = charge * 20 + readout.enginePulse * 10;
      ctx.beginPath(); ctx.ellipse(-Math.hypot(readout.engineGrip[0] - readout.craft[0], readout.engineGrip[1] - readout.craft[1]), 0, size * .17, size * .7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    return readout;
  }
  dispose() {}
}
