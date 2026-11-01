import { norm, sub } from '@starshot/ephemeris';
import { LunarModel, EARTH_RADIUS, MOON_RADIUS } from '../lunar/model';
import { sampleFlight } from '../lunar/flight';
import { frameGeometry, frameReadout, local } from './coordinates';
import type { SceneView, ViewState } from './view-types';
import { drawSleeve } from './charge-sleeve';
export class CanvasView implements SceneView {
  private ctx: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement, private model: LunarModel) { this.ctx = canvas.getContext('2d')!; }
  update(state: ViewState) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = w * devicePixelRatio; this.canvas.height = h * devicePixelRatio;
    const ctx = this.ctx; ctx.scale(devicePixelRatio, devicePixelRatio); ctx.clearRect(0, 0, w, h);
    const frame = frameGeometry(this.model, state, w / h, { width: w, height: h }), ratio = h / frame.height;
    const readout = frameReadout(frame, state, w, h, 'Canvas fallback');
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
    }
    if (!state.inspection) { circle([0, 0, 0], readout.earthRadiusPx / ratio, '#397ea1'); circle(frame.moon, readout.moonRadiusPx / ratio, '#c0c7cb'); }
    if (state.flight && !state.inspection) {
      ctx.strokeStyle = state.previewUpdating ? '#ffd99155' : '#ffd991'; ctx.lineWidth = 2; ctx.setLineDash([2, 8]); ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const t = state.flight.request.launchEt + (state.flight.endEt - state.flight.request.launchEt) * (i / 400) ** 2;
        const p = xy(local(sub(sampleFlight(state.flight.samples, t).r, this.model.bodies(t).earth.r), frame.basis));
        if (i) ctx.lineTo(...p); else ctx.moveTo(...p);
      }
      ctx.stroke(); ctx.setLineDash([]);
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
