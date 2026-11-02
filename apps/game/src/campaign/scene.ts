import { BODIES, orbitPath, type PlanetId, type Vec3 } from '@starshot/ephemeris';
import { drawSleeve } from '@starshot/presentation/charge-sleeve';
import { routePath } from './orbit-path';
import type { FlightResponse as ShotResponse } from '../sim/protocol';
import { colours, makeFrame, type FrameGeometry } from './frame';
import { loadSceneData, type SceneData } from './scene-data';
import { ThreeScene } from './three-scene';
import { ephemeris } from './scene-geometry';
import type { SceneState } from './scene-types';
import { bodyName } from '../missions';
import { isLunar } from '../sim/flight-request';
let identity = 0;
export class CampaignScene {
  readonly identity = ++identity;
  private three: ThreeScene | null = null;
  private ctx: CanvasRenderingContext2D;
  private data: SceneData | null = null;
  private orbitKey = '';
  private orbits = new Map<PlanetId, readonly Vec3[]>();
  private disposed = false;
  private wasAiming = true;
  private releaseAt = 0;
  private previousCharge = 0;
  private releaseCharge = 0;
  private previousAnchor: [number, number] | null = null;
  private releaseAnchor: [number, number] | null = null;
  constructor(private background: HTMLCanvasElement, foreground: HTMLCanvasElement) {
    this.ctx = background.getContext('2d')!;
    if (new URLSearchParams(location.search).get('renderer') !== 'canvas') { try { this.three = new ThreeScene(foreground); } catch { foreground.hidden = true; } }
    loadSceneData().then(data => { if (!this.disposed) { this.data = data; this.three?.setData(data); } }).catch(() => {});
  }
  update(state: SceneState) {
    const w = this.background.clientWidth, h = this.background.clientHeight, ratio = Math.min(devicePixelRatio, 2);
    if (this.background.width !== Math.round(w * ratio) || this.background.height !== Math.round(h * ratio)) { this.background.width = Math.round(w * ratio); this.background.height = Math.round(h * ratio); }
    if (this.wasAiming && !state.aiming && state.snap) { this.releaseAt = state.visualTime; this.releaseCharge = this.previousCharge; this.releaseAnchor = this.previousAnchor; }
    this.wasAiming = state.aiming;
    const snap = state.snap && !state.reduced ? Math.max(0, 1 - (state.visualTime - this.releaseAt) / .18) : 0;
    const drawn = snap > 0 ? { ...state, charge: this.releaseCharge * snap ** 3 } : state;
    const f = makeFrame(drawn, w, h, this.data, this.identity, this.three ? 'WebGL 2' : 'Canvas 2D');
    if (snap && this.releaseAnchor) f.frame.craft = [f.frame.craft[0] * (1 - snap) + this.releaseAnchor[0] * snap, f.frame.craft[1] * (1 - snap) + this.releaseAnchor[1] * snap];
    this.previousCharge = state.charge; this.previousAnchor = [...f.frame.craft];
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0); this.ctx.clearRect(0, 0, w, h);
    if (!state.inspection && state.home < .95) this.drawRoutes(state, f);
    if (this.three) this.three.update(drawn, f); else this.drawFallback(drawn, f);
    return f.frame;
  }
  private drawRoutes(state: SceneState, f: FrameGeometry) {
    const ctx = this.ctx, { frame } = f;
    const key = `${state.level.id}:${state.level.target}:${state.map}:${Math.floor(state.et / 86400)}`;
    if (key !== this.orbitKey) {
      this.orbitKey = key; this.orbits.clear();
      const ids = state.parking ? [] : state.map ? Object.keys(colours).filter(id => id !== 'sun' && id !== 'moon') : [...new Set(['earth', state.level.target, ...(state.level.requiredFlyby ? [state.level.requiredFlyby] : [])])];
      ids.forEach(id => this.orbits.set(id as PlanetId, orbitPath(id as PlanetId, state.et, 160, { flatten: true })));
    }
    ctx.globalAlpha = 1 - state.home; ctx.lineWidth = 1;
    for (const [id, points] of this.orbits) {
      ctx.strokeStyle = id === state.level.target ? '#93c9bc55' : '#9eafc62b'; ctx.setLineDash([]); ctx.beginPath();
      points.forEach((p, i) => { const q = f.project(p); if (i) ctx.lineTo(...q); else ctx.moveTo(...q); }); ctx.closePath(); ctx.stroke();
      const body = ephemeris.state(id, state.et), q = f.project(body.r), next = f.project([body.r[0] + body.v[0] * 2e5, body.r[1] + body.v[1] * 2e5, 0]);
      const a = Math.atan2(next[1] - q[1], next[0] - q[0]); ctx.save(); ctx.translate(q[0] + Math.cos(a) * 43, q[1] + Math.sin(a) * 43); ctx.rotate(a);
      ctx.strokeStyle = '#9dbcb780'; ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(0, 0); ctx.lineTo(-7, 4); ctx.stroke(); ctx.restore();
    }
    if (f.g.parking.length) {
      ctx.strokeStyle = '#9ed4e6b0'; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.beginPath();
      f.g.parking.forEach((p, i) => { const q = f.projectPlane(p); if (i) ctx.lineTo(...q); else ctx.moveTo(...q); }); ctx.stroke();
    }
    if (f.g.moonOrbit.length) {
      ctx.strokeStyle = '#88b9c866'; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.beginPath();
      f.g.moonOrbit.forEach((p, i) => { const q = f.projectPlane(p); if (i) ctx.lineTo(...q); else ctx.moveTo(...q); }); ctx.stroke();
    }
    if (state.response) {
      for (const past of [true, false]) {
        ctx.setLineDash(past ? [] : [1, 7]); ctx.lineCap = 'round'; ctx.strokeStyle = past ? '#f8c76f' : state.response?.analysis.hit ? '#b9ebd8' : '#d2dbe8b0'; ctx.lineWidth = past ? 2 : 2.2; ctx.beginPath(); let active = false;
        for (let i = 0; i < f.g.path.length; i++) {
          const isPast = !state.aiming && routePath(state.response)[i]!.t <= state.et;
          const p = f.projectPlane(f.g.path[i]!);
          if (isPast === past) { if (!active) ctx.moveTo(...p); else ctx.lineTo(...p); active = true; } else active = false;
        }
        ctx.stroke();
      }
      if (frame.intercept && !(isLunar(state.response.shot) && state.response.shot.scope === 'local')) {
        ctx.setLineDash([3, 5]); ctx.strokeStyle = frame.interceptHit ? '#a8e9ca' : '#f3c97a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(...frame.intercept, Math.max(3, frame.captureRadius), 0, Math.PI * 2); ctx.stroke();
        if (frame.approachCraft) {
          ctx.setLineDash([8, 8]); ctx.strokeStyle = '#e6b66a70'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(...frame.approachCraft); ctx.lineTo(...frame.intercept); ctx.stroke();
          ctx.fillStyle = '#dcebe8'; ctx.font = '10px Plex, monospace';
          const label = `${bodyName(state.level.target)} at ${frame.interceptHit ? 'arrival' : 'closest pass'}`;
          ctx.fillText(label, Math.max(12, Math.min(frame.width - ctx.measureText(label).width - 12, frame.intercept[0] + 10)), Math.max(75, Math.min(frame.height - state.deckHeight - 15, frame.intercept[1] - 12)));
        }
        ctx.beginPath(); ctx.moveTo(frame.intercept[0] - 22, frame.intercept[1]); ctx.lineTo(frame.intercept[0] + 22, frame.intercept[1]); ctx.stroke();
      }
    }
    if (state.aiming && !state.focus) {
      ctx.setLineDash([2, 4]); ctx.strokeStyle = '#a8bbce80'; ctx.beginPath(); ctx.moveTo(...frame.physicalCraft); ctx.lineTo(...frame.craft); ctx.stroke();
      ctx.fillStyle = '#e5f8ff'; ctx.beginPath(); ctx.arc(...frame.physicalCraft, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  private drawFallback(state: SceneState, f: FrameGeometry) {
    const ctx = this.ctx, { frame } = f;
    if (!state.inspection) for (const body of frame.bodies) {
      const [x, y] = body.point, r = Math.max(body.radius, .7); if (Math.abs(x) > frame.width + r || Math.abs(y) > frame.height + r || r > 1e6) continue;
      this.drawRings(body.id, state, f, false);
      const fill = ctx.createRadialGradient(x - r * .4, y - r * .4, 0, x, y, r);
      fill.addColorStop(0, body.id === 'sun' && (state.preferences.scientific || state.preferences.trueSize) ? '#ffffff' : colours[body.id]!); fill.addColorStop(1, body.id === 'sun' ? '#f7c674' : '#111c2d');
      ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      this.drawRings(body.id, state, f, true);
    }
    const anchor: [number, number] = state.inspection ? [frame.width / 2, frame.height * .45] : frame.craft;
    const size = state.inspection ? Math.min(frame.width * .13, 70) : f.pixels + state.home * 50, heading = state.inspection ? 0 : frame.heading;
    const charge = state.inspection ? state.demoCharge : state.charge, travel = state.inspection ? 2.5 * size : frame.travel;
    ctx.save(); ctx.translate(...anchor); ctx.rotate(-heading);
    if (state.inspection === 'drone') { ctx.fillStyle = '#e9dfc9'; ctx.beginPath(); ctx.roundRect(-size, -size * .6, size * 2, size * 1.2, size * .4); ctx.fill(); ctx.fillStyle = '#59c2db'; ctx.fillRect(-size * .6, -size * .15, size * .3, size * .22); ctx.fillRect(size * .3, -size * .15, size * .3, size * .22); }
    else {
      drawSleeve(ctx, [-size * .64, 0], [-size * 1.12 - charge * travel, 0], size * .65);
      ctx.strokeStyle = '#eff0e6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(-size * 1.12 - charge * travel, 0, size * .13, size * .8, 0, 0, Math.PI * 2); ctx.stroke();
      if (state.inspection !== 'engine') { ctx.fillStyle = '#eee8d7'; ctx.beginPath(); ctx.ellipse(size * .4, 0, size * 1.2, size * .65, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#223f51'; ctx.beginPath(); ctx.ellipse(size, 0, size * .32, size * .47, 0, 0, Math.PI * 2); ctx.fill(); }
      if (state.firing) { ctx.fillStyle = '#acdeff99'; ctx.beginPath(); ctx.moveTo(-size * 1.2, -size * .3); ctx.lineTo(-size * 2.5, 0); ctx.lineTo(-size * 1.2, size * .3); ctx.fill(); }
    }
    ctx.restore(); frame.demoGrip = [anchor[0] - size * 1.12 - charge * travel, anchor[1]];
  }
  private drawRings(id: string, state: SceneState, f: FrameGeometry, front: boolean) {
    const bands = this.data?.rings[id], physical = this.data?.physical.bodies[id];
    if (!bands || !physical || !this.data) return;
    const basis = this.data.astronomy.orientation(physical, state.et); if (!basis) return;
    const x = f.direction(basis[0] as unknown as Vec3), y = f.direction(basis[1] as unknown as Vec3), marker = f.frame.bodies.find(b => b.id === id)!;
    const scale = marker.radius / BODIES[id as PlanetId].radiusKm, ctx = this.ctx;
    const point = (r: number, a: number): [number, number] => [marker.point[0] + r * scale * (Math.cos(a) * x[0] + Math.sin(a) * y[0]), marker.point[1] - r * scale * (Math.cos(a) * x[1] + Math.sin(a) * y[1])];
    for (const [, inner, outer, alpha, kind] of bands) {
      if (kind === 'guide' || outer <= inner || outer * scale < 1) continue;
      ctx.fillStyle = `rgba(208,190,160,${Math.max(.02, alpha)})`;
      for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2, b = (i + 1) / 96 * Math.PI * 2, mid = (a + b) / 2; if ((Math.cos(mid) * x[2] + Math.sin(mid) * y[2] >= 0) !== front) continue; ctx.beginPath(); ctx.moveTo(...point(inner, a)); ctx.lineTo(...point(outer, a)); ctx.lineTo(...point(outer, b)); ctx.lineTo(...point(inner, b)); ctx.closePath(); ctx.fill(); }
    }
  }
  dispose() { this.disposed = true; this.three?.dispose(); }
}
