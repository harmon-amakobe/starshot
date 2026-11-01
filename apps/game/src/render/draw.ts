/**
 * Canvas 2D renderer for the map. Pure drawing: everything it needs arrives in
 * a SceneInput, so the game can redraw on demand (no permanent rAF loop).
 */
import { BODIES, PLANET_IDS, type Ephemeris, type PlanetId } from "@starshot/ephemeris";
import { hermite, type SimulationResult } from "@starshot/physics";
import { project, type Camera, type Viewport } from "./camera.js";

export const COLORS = {
  bg: "#0b1020",
  sun: "#ffd166",
  probe: "#5eead4",
  text: "#e6ebff",
  muted: "#9aa6c8",
  warn: "#fbbf24",
  danger: "#f87171",
  hint: "#c4b5fd",
} as const;

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Minimum on-screen planet radius [px]: big planets a little bigger. */
const MIN_RADIUS_PX: Readonly<Record<PlanetId, number>> = {
  mercury: 4,
  venus: 4.5,
  earth: 5,
  mars: 4,
  jupiter: 6.5,
  saturn: 6,
  uranus: 5,
  neptune: 5,
};

// ---------------------------------------------------------------------------
// Trajectory polylines

export interface PathData {
  /** [t, x, y] triples (ET, km, km). */
  readonly pts: Float64Array;
  readonly count: number;
}

/** Densify the integrator knots with cubic Hermite so the drawn curve is smooth. */
export function buildPath(result: SimulationResult, subdiv = 3): PathData {
  const s = result.samples;
  const n = Math.max(1, (s.length - 1) * subdiv + 1);
  const pts = new Float64Array(n * 3);
  let k = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i]!;
    const b = s[i + 1]!;
    for (let j = 0; j < subdiv; j++) {
      const t = a.t + ((b.t - a.t) * j) / subdiv;
      const p = j === 0 ? a : hermite(a, b, t);
      pts[k++] = t;
      pts[k++] = p.r[0];
      pts[k++] = p.r[1];
    }
  }
  const last = s[s.length - 1]!;
  pts[k++] = last.t;
  pts[k++] = last.r[0];
  pts[k++] = last.r[1];
  return { pts, count: k / 3 };
}

/** Index of the last point with time <= t (binary search). */
export function pathIndexAt(path: PathData, t: number): number {
  let lo = 0;
  let hi = path.count - 1;
  if (t >= path.pts[hi * 3]!) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path.pts[mid * 3]! <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ---------------------------------------------------------------------------
// Scene

export interface Marker {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly kind: "flyby" | "near";
  readonly color: string;
}

export interface Ghost {
  /** Target centre at the closest approach / arrival [km]. */
  readonly x: number;
  readonly y: number;
  /** Probe at that moment [km]. */
  readonly probeX: number;
  readonly probeY: number;
  readonly label: string;
  readonly hit: boolean;
}

export interface AimVisual {
  readonly angleDeg: number;
  readonly speedKmS: number;
  readonly vMax: number;
}

export interface SceneInput {
  readonly vp: Viewport;
  readonly cam: Camera;
  readonly dpr: number;
  readonly starfield: HTMLCanvasElement | null;
  readonly eph: Ephemeris;
  /** Time the planets are drawn at (launch date while aiming, flight time while flying). */
  readonly et: number;
  /** Time the capture-zone radius is evaluated at. */
  readonly soiEt: number;
  readonly target: PlanetId;
  readonly highlight?: PlanetId;
  readonly orbits: ReadonlyArray<{ readonly id: PlanetId; readonly pts: Float64Array }>;
  readonly path: PathData | null;
  readonly pathHit: boolean;
  /** In flight: draw the glowing trail up to this time and the probe there. */
  readonly flightT: number | null;
  readonly probe: readonly [number, number] | null;
  readonly markers: readonly Marker[];
  readonly ghost: Ghost | null;
  readonly aim: AimVisual | null;
  readonly drag: { readonly pullX: number; readonly pullY: number; readonly maxPull: number } | null;
  readonly hintAim: AimVisual | null;
  /** Animation clock [ms]. */
  readonly time: number;
  /** Pulse the capture zone (off for prefers-reduced-motion and when idle). */
  readonly pulse: boolean;
  /** Expanding ring at a world point (launch at Earth, capture at the target). */
  readonly burst: { readonly progress: number; readonly x: number; readonly y: number; readonly color: string } | null;
  readonly shake: readonly [number, number];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
const rgba = (hex: string, a: number) => `rgba(${hexToRgb(hex)},${a})`;

/** Stroke a world-space polyline, breaking segments that are far off screen on the same side. */
function strokeWorldPolyline(
  ctx: CanvasRenderingContext2D,
  s: SceneInput,
  xy: (i: number) => [number, number],
  from: number,
  to: number,
  closed = false,
) {
  const { vp, cam } = s;
  const pad = 400;
  const minX = -pad, maxX = vp.width + pad, minY = -pad, maxY = vp.height + pad;
  const code = (x: number, y: number) => (x < minX ? 1 : x > maxX ? 2 : 0) | (y < minY ? 4 : y > maxY ? 8 : 0);
  ctx.beginPath();
  let prevCode = -1;
  let px = 0, py = 0;
  let open = false;
  const total = closed ? to + 1 : to;
  for (let k = from; k <= total; k++) {
    const i = closed && k === to + 1 ? from : k;
    const [wx, wy] = xy(i);
    const [x, y] = project(cam, vp, wx, wy);
    const c = code(x, y);
    if (k === from) {
      ctx.moveTo(x, y);
      open = true;
    } else if ((c & prevCode) !== 0) {
      // Both ends beyond the same edge: skip, restart at the next point.
      open = false;
    } else {
      if (!open) ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      open = true;
    }
    prevCode = c;
    px = x;
    py = y;
  }
  ctx.stroke();
}

function planetRadiusPx(id: PlanetId, cam: Camera): number {
  return Math.max(MIN_RADIUS_PX[id], BODIES[id].radiusKm * cam.scale);
}

function drawPlanet(ctx: CanvasRenderingContext2D, id: PlanetId, x: number, y: number, r: number, sunX: number, sunY: number) {
  const color = BODIES[id].color;
  // Lit from the Sun: a highlight offset towards it.
  const dx = sunX - x, dy = sunY - y;
  const d = Math.hypot(dx, dy) || 1;
  const hx = x + (dx / d) * r * 0.45, hy = y + (dy / d) * r * 0.45;
  const g = ctx.createRadialGradient(hx, hy, r * 0.1, x, y, r * 1.05);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.18, color);
  g.addColorStop(1, rgba(color, 0.55));
  if (id === "saturn") {
    ctx.strokeStyle = rgba(color, 0.75);
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 2.1, r * 0.75, -0.35, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (id === "earth") {
    ctx.strokeStyle = "rgba(150,200,255,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r + 2.2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleDeg: number,
  length: number,
  color: string,
  width: number,
  dashed = false,
) {
  const a = (angleDeg * Math.PI) / 180;
  const ux = Math.cos(a), uy = -Math.sin(a);
  const ex = x + ux * length, ey = y + uy * length;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  if (dashed) ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x + ux * 9, y + uy * 9);
  ctx.lineTo(ex - ux * 6, ey - uy * 6);
  ctx.stroke();
  ctx.setLineDash([]);
  const head = 7 + width * 1.5;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - ux * head - uy * head * 0.55, ey - uy * head + ux * head * 0.55);
  ctx.lineTo(ex - ux * head + uy * head * 0.55, ey - uy * head - ux * head * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function arrowLengthPx(speedKmS: number, vMax: number): number {
  return 26 + 78 * Math.min(1, speedKmS / Math.max(vMax, 1e-9));
}

/** Colour of the rubber band for a tension in [0, 1]: probe cyan to amber to red. */
export function tensionColor(t: number): string {
  const lerp = (a: number[], b: number[], u: number) => a.map((v, i) => Math.round(v + (b[i]! - v) * u));
  const c0 = [94, 234, 212], c1 = [251, 191, 36], c2 = [248, 113, 113];
  const c = t < 0.6 ? lerp(c0, c1, t / 0.6) : lerp(c1, c2, Math.min(1, (t - 0.6) / 0.4));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function drawScene(ctx: CanvasRenderingContext2D, s: SceneInput): void {
  const { vp, cam, eph, dpr } = s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, vp.width, vp.height);
  if (s.starfield) ctx.drawImage(s.starfield, 0, 0, vp.width, vp.height);
  ctx.translate(s.shake[0], s.shake[1]);

  const [sunX, sunY] = project(cam, vp, 0, 0);
  // Label placement avoids the HUD and the controls, the planets and each other.
  const occupied: Rect[] = [
    { x: 0, y: 0, w: vp.width, h: vp.insetTop },
    { x: 0, y: vp.height - vp.insetBottom, w: vp.width, h: vp.insetBottom },
    { x: vp.width - vp.insetRight, y: 0, w: vp.insetRight, h: vp.height },
  ];
  const planets: Array<{ id: PlanetId; x: number; y: number; r: number }> = [];
  for (const id of PLANET_IDS) {
    const st = eph.state(id, s.et);
    const [x, y] = project(cam, vp, st.r[0], st.r[1]);
    if (x < -60 || y < -60 || x > vp.width + 60 || y > vp.height + 60) continue;
    const r = planetRadiusPx(id, cam);
    planets.push({ id, x, y, r });
    const pad = id === s.target ? 10 : 1;
    occupied.push({ x: x - r - pad, y: y - r - pad, w: 2 * (r + pad), h: 2 * (r + pad) });
  }

  // Sun and its glow.
  const sunR = Math.max(7, BODIES.sun.radiusKm * cam.scale);
  const glowR = sunR * 2 + 34;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, glowR);
  glow.addColorStop(0, "rgba(255,209,102,0.9)");
  glow.addColorStop(0.25, "rgba(255,209,102,0.28)");
  glow.addColorStop(1, "rgba(255,209,102,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  occupied.push({ x: sunX - sunR, y: sunY - sunR, w: sunR * 2, h: sunR * 2 });

  // Orbits.
  ctx.lineWidth = 1;
  for (const o of s.orbits) {
    const emphasis = o.id === s.target ? 0.45 : o.id === s.highlight ? 0.32 : o.id === "earth" ? 0.3 : 0.14;
    ctx.strokeStyle = rgba(BODIES[o.id].color, emphasis);
    const n = o.pts.length / 2;
    strokeWorldPolyline(ctx, s, (i) => [o.pts[i * 2]!, o.pts[i * 2 + 1]!], 0, n - 1, true);
  }

  // Trajectory: dotted prediction, plus a glowing trail in flight.
  const path = s.path;
  if (path && path.count > 1) {
    const xy = (i: number): [number, number] => [path.pts[i * 3 + 1]!, path.pts[i * 3 + 2]!];
    const last = path.count - 1;
    ctx.save();
    ctx.lineCap = "round";
    if (s.flightT === null) {
      ctx.setLineDash([0.1, 7]);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = rgba(COLORS.probe, s.pathHit ? 0.95 : 0.75);
      strokeWorldPolyline(ctx, s, xy, 0, last);
    } else {
      const idx = pathIndexAt(path, s.flightT);
      ctx.setLineDash([0.1, 8]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(COLORS.probe, 0.22);
      if (idx < last) strokeWorldPolyline(ctx, s, xy, idx, last);
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 7;
      ctx.strokeStyle = rgba(COLORS.probe, 0.12);
      if (idx > 0) strokeWorldPolyline(ctx, s, xy, 0, idx);
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(COLORS.probe, 0.9);
      if (idx > 0) strokeWorldPolyline(ctx, s, xy, 0, idx);
    }
    ctx.restore();
  }

  // Encounter markers along the path.
  ctx.font = `600 10.5px ${FONT}`;
  for (const m of s.markers) {
    const [x, y] = project(cam, vp, m.x, m.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = m.kind === "flyby" ? m.color : "transparent";
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(-3.5, -3.5, 7, 7);
    if (m.kind === "flyby") ctx.fill();
    ctx.stroke();
    ctx.restore();
    const w = ctx.measureText(m.label).width;
    const rect = { x: x + 8, y: y - 7, w: w + 4, h: 14 };
    if (!occupied.some((o) => overlaps(o, rect))) {
      ctx.fillStyle = rgba(COLORS.bg, 0.6);
      ctx.fillRect(rect.x - 2, rect.y, rect.w + 2, rect.h);
      ctx.fillStyle = COLORS.text;
      ctx.fillText(m.label, x + 9, y + 4);
      occupied.push(rect);
    }
  }

  // Closest approach / arrival ghost: where the target will be, with its capture zone.
  const targetColor = BODIES[s.target].color;
  if (s.ghost) {
    const g = s.ghost;
    const [gx, gy] = project(cam, vp, g.x, g.y);
    const [qx, qy] = project(cam, vp, g.probeX, g.probeY);
    const ghostR = Math.max(7, s.eph.soiKm(s.target, s.soiEt) * cam.scale);
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba(targetColor, 0.7);
    ctx.fillStyle = rgba(targetColor, 0.06);
    ctx.beginPath();
    ctx.arc(gx, gy, ghostR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rgba(targetColor, 0.55);
    ctx.beginPath();
    ctx.arc(gx, gy, Math.max(2.5, BODIES[s.target].radiusKm * cam.scale), 0, Math.PI * 2);
    ctx.fill();
    if (!g.hit) {
      ctx.strokeStyle = rgba(COLORS.text, 0.55);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(qx, qy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = g.hit ? COLORS.probe : rgba(COLORS.probe, 0.8);
    ctx.beginPath();
    ctx.arc(qx, qy, g.hit ? 3.5 : 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 11px ${FONT}`;
    const w = ctx.measureText(g.label).width + 8;
    const h = 16;
    const off = ghostR + 6;
    const spots: Rect[] = [
      { x: gx + off * 0.75, y: gy + off * 0.75, w, h },
      { x: gx - off * 0.75 - w, y: gy + off * 0.75, w, h },
      { x: gx + off * 0.75, y: gy - off * 0.75 - h, w, h },
      { x: gx - off * 0.75 - w, y: gy - off * 0.75 - h, w, h },
      { x: gx - w / 2, y: gy + off, w, h },
      { x: gx - w / 2, y: gy - off - h, w, h },
    ];
    const at = spots.find((c) => !occupied.some((o) => overlaps(o, c))) ?? spots[0]!;
    ctx.fillStyle = rgba(COLORS.bg, 0.72);
    ctx.fillRect(at.x, at.y, at.w, at.h);
    ctx.fillStyle = g.hit ? COLORS.probe : COLORS.warn;
    ctx.fillText(g.label, at.x + 4, at.y + 12);
    occupied.push(at);
    ctx.restore();
  }

  // Planets, the target's capture zone, labels.
  const labelQueue: Array<{ id: PlanetId; x: number; y: number; r: number; priority: number }> = [];
  for (const { id, x, y, r } of planets) {
    if (id === s.target) drawCaptureZone(ctx, s, x, y, r);
    drawPlanet(ctx, id, x, y, r, sunX, sunY);
    const priority = id === s.target ? 0 : id === "earth" ? 1 : id === s.highlight ? 2 : 3;
    // Minor planets crowded around the Sun on outer-planet maps stay unlabelled.
    if (priority === 3 && Math.hypot(x - sunX, y - sunY) < 46) continue;
    labelQueue.push({ id, x, y, r, priority });
  }
  labelQueue.sort((a, b) => a.priority - b.priority);
  for (const l of labelQueue) {
    const isTarget = l.id === s.target;
    ctx.font = `${isTarget ? 700 : 600} ${isTarget ? 12 : 11}px ${FONT}`;
    const text = BODIES[l.id].name;
    const w = ctx.measureText(text).width;
    const h = 14;
    const gap = l.r + (isTarget ? 12 : 5);
    const candidates: Rect[] = [
      { x: l.x + gap, y: l.y - h / 2, w, h },
      { x: l.x - gap - w, y: l.y - h / 2, w, h },
      { x: l.x - w / 2, y: l.y - gap - h, w, h },
      { x: l.x - w / 2, y: l.y + gap, w, h },
      { x: l.x + gap * 0.8, y: l.y - gap * 0.8 - h, w, h },
      { x: l.x + gap * 0.8, y: l.y + gap * 0.8, w, h },
    ];
    // A label never sits on its own planet's box; other boxes are avoided when possible.
    const spot = candidates.find((c) => !occupied.some((o) => overlaps(o, c)));
    if (!spot && l.priority > 1) continue;
    const at = spot ?? candidates[0]!;
    occupied.push(at);
    ctx.fillStyle = isTarget ? BODIES[l.id].color : rgba(COLORS.text, l.priority <= 2 ? 0.92 : 0.62);
    ctx.fillText(text, at.x, at.y + h - 3);
  }

  // Hint ghost arrow, aim arrow and slingshot band, all anchored at Earth.
  const earth = eph.state("earth", s.et);
  const [ex, ey] = project(cam, vp, earth.r[0], earth.r[1]);
  if (s.flightT === null) {
    if (s.hintAim) {
      drawArrow(ctx, ex, ey, s.hintAim.angleDeg, arrowLengthPx(s.hintAim.speedKmS, s.hintAim.vMax), rgba(COLORS.hint, 0.85), 2, true);
    }
    if (s.drag) drawBand(ctx, ex, ey, s.drag);
    if (s.aim) {
      const t = s.drag ? Math.min(1, Math.hypot(s.drag.pullX, s.drag.pullY) / s.drag.maxPull) : s.aim.speedKmS / s.aim.vMax;
      drawArrow(ctx, ex, ey, s.aim.angleDeg, arrowLengthPx(s.aim.speedKmS, s.aim.vMax), s.drag ? tensionColor(t) : COLORS.probe, 3);
    }
  }

  // Launch / capture burst: two expanding rings.
  if (s.burst) {
    const p = s.burst.progress;
    const [bx, by] = project(cam, vp, s.burst.x, s.burst.y);
    ctx.save();
    for (const [delay, grow] of [[0, 52], [0.18, 34]] as const) {
      const q = Math.max(0, (p - delay) / (1 - delay));
      if (q <= 0) continue;
      ctx.strokeStyle = rgba(s.burst.color, Math.max(0, 1 - q) * 0.9);
      ctx.lineWidth = 3.5 * (1 - q) + 0.5;
      ctx.beginPath();
      ctx.arc(bx, by, 8 + q * grow, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // The probe.
  if (s.probe) {
    const [px, py] = project(cam, vp, s.probe[0], s.probe[1]);
    const pg = ctx.createRadialGradient(px, py, 0, px, py, 16);
    pg.addColorStop(0, "rgba(255,255,255,1)");
    pg.addColorStop(0.2, rgba(COLORS.probe, 0.95));
    pg.addColorStop(1, rgba(COLORS.probe, 0));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawCaptureZone(ctx: CanvasRenderingContext2D, s: SceneInput, x: number, y: number, r: number) {
  const color = BODIES[s.target].color;
  const soiPx = s.eph.soiKm(s.target, s.soiEt) * s.cam.scale;
  const phase = s.pulse ? (s.time % 1800) / 1800 : 0;
  ctx.save();
  if (soiPx >= 9) {
    ctx.fillStyle = rgba(color, 0.07);
    ctx.strokeStyle = rgba(color, 0.75);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(x, y, soiPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (s.pulse) {
      ctx.strokeStyle = rgba(color, 0.45 * (1 - phase));
      ctx.beginPath();
      ctx.arc(x, y, soiPx * (1 + 0.12 * phase), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // Capture zone smaller than a few pixels: a reticle marks the target instead.
    const rr = r + 8;
    ctx.strokeStyle = rgba(color, 0.9);
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 4; k++) {
      const a0 = (k * Math.PI) / 2 + Math.PI / 4 - 0.42;
      ctx.beginPath();
      ctx.arc(x, y, rr, a0, a0 + 0.84);
      ctx.stroke();
    }
    if (s.pulse) {
      ctx.strokeStyle = rgba(color, 0.55 * (1 - phase));
      ctx.beginPath();
      ctx.arc(x, y, rr + 12 * phase, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBand(
  ctx: CanvasRenderingContext2D,
  ex: number,
  ey: number,
  drag: { readonly pullX: number; readonly pullY: number; readonly maxPull: number },
) {
  const len = Math.hypot(drag.pullX, drag.pullY);
  if (len < 1) return;
  const k = Math.min(1, drag.maxPull / len);
  const hx = ex + drag.pullX * k, hy = ey + drag.pullY * k;
  const t = Math.min(1, len / drag.maxPull);
  const ux = drag.pullX / len, uy = drag.pullY / len;
  // Fork prongs either side of Earth, perpendicular to the pull.
  const fx = -uy * 13, fy = ux * 13;
  const color = tensionColor(t);
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.2 - 1.6 * t;
  ctx.beginPath();
  ctx.moveTo(ex + fx, ey + fy);
  ctx.lineTo(hx, hy);
  ctx.lineTo(ex - fx, ey - fy);
  ctx.stroke();
  ctx.fillStyle = rgba("#e6ebff", 0.85);
  ctx.beginPath();
  ctx.arc(ex + fx, ey + fy, 2.5, 0, Math.PI * 2);
  ctx.arc(ex - fx, ey - fy, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // The pouch with the probe in it.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(hx, hy, 6 + 2 * t, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
