import { norm, sub } from '@starshot/ephemeris';
import { LunarModel, EARTH_RADIUS, MOON_RADIUS } from '../lunar/model';
import { sampleFlight } from '../lunar/flight';
import { frameGeometry, local } from './coordinates';
import type { SceneView, ViewState } from './view-types';
export class CanvasView implements SceneView {
  private ctx: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement, private model: LunarModel) { this.ctx = canvas.getContext('2d')!; }
  update(state: ViewState) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = w * devicePixelRatio; this.canvas.height = h * devicePixelRatio;
    const ctx = this.ctx; ctx.scale(devicePixelRatio, devicePixelRatio); ctx.clearRect(0, 0, w, h);
    const frame = frameGeometry(this.model, state, w / h), ratio = h / frame.height;
    const xy = (p: readonly number[]): [number, number] => [w / 2 + (p[0]! - frame.centre[0]) * ratio, h / 2 - (p[1]! - frame.centre[1]) * ratio];
    const circle = (p: readonly number[], r: number, color: string) => { const q = xy(p); ctx.beginPath(); ctx.arc(...q, Math.max(2, r * ratio), 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
    if (!state.inspection) { circle([0, 0, 0], EARTH_RADIUS, '#397ea1'); circle(frame.moon, MOON_RADIUS, '#c0c7cb'); }
    if (state.flight && !state.inspection) {
      ctx.strokeStyle = '#ffd991'; ctx.lineWidth = 2; ctx.setLineDash([2, 8]); ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const t = state.flight.request.launchEt + (state.flight.endEt - state.flight.request.launchEt) * (i / 400) ** 2;
        const p = xy(local(sub(sampleFlight(state.flight.samples, t).r, this.model.bodies(t).earth.r), frame.basis));
        if (i) ctx.lineTo(...p); else ctx.moveTo(...p);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    const p = state.inspection ? [w / 2, h * .5] : xy(frame.craft);
    const size = state.inspection ? Math.min(105, w * .26, h * .14) : 24;
    ctx.save(); ctx.translate(p[0]!, p[1]!); if (!state.inspection) ctx.rotate(-state.angle * Math.PI / 180);
    if (state.inspection === 'engine') {
      ctx.strokeStyle = '#eee8d7'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(0, 0, size * .8, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, size * .65, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * size * .65, Math.sin(a) * size * .65); ctx.stroke(); }
    } else if (state.inspection === 'drone') {
      ctx.fillStyle = '#eee8d7'; ctx.beginPath(); ctx.arc(0, 0, size * .7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#123348'; ctx.beginPath(); ctx.ellipse(0, 0, size * .55, size * .32, 0, 0, Math.PI * 2); ctx.fill();
      for (const side of [-1, 1]) { ctx.fillStyle = '#adf3ff'; ctx.beginPath(); ctx.ellipse(side * size * .2, 0, size * .06, size * .12, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#89989b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -size * .6); ctx.lineTo(-size * .1, -size); ctx.stroke();
    } else {
      ctx.fillStyle = '#eee8d7'; ctx.beginPath(); ctx.ellipse(0, 0, size, size * (state.inspection === 'crew' ? .8 : .55), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#123348'; ctx.beginPath(); ctx.ellipse(size * .5, -size * .08, size * .43, size * .32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(-size * .8, 0, size * .17, size * .7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    return { craft: xy(frame.craft), moon: xy(frame.moon), moonDistance: norm(sub(frame.moon, frame.craft)), scaleKm: frame.height * 80 / h, heightKm: frame.height, centre: [frame.centre[0], frame.centre[1]] as [number, number], renderer: 'Canvas fallback' };
  }
  dispose() {}
}
