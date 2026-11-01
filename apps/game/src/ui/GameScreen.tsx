import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BODIES, PLANET_IDS, createEphemeris, orbitPath, type PlanetId } from "@starshot/ephemeris";
import { sampleAt } from "@starshot/physics";
import { bodyName, formatAimAngle, formatAimSpeed, formatDate, formatKm } from "../format.js";
import {
  captureZoneScaleOf,
  framingBodies,
  hintQueryFor,
  parToleranceOf,
  shotRequestFor,
  type Level,
} from "../levels.js";
import { aimFromPull, useSlingshot, type Pull } from "../input/useSlingshot.js";
import { fitCamera, focusPoint, panBy, project, zoomAt, type Camera, type Viewport } from "../render/camera.js";
import {
  buildPath,
  drawScene,
  overlaps,
  visibleMapRect,
  type Ghost,
  type Marker,
  type PathData,
  type Rect,
  type SceneLayout,
} from "../render/draw.js";
import { renderStarfield } from "../render/starfield.js";
import { maxStars, scoreShot, type Score, type ScoringRules } from "../scoring.js";
import type { Hint } from "../sim/hint.js";
import { launchGate, shotKey } from "../sim/preview.js";
import type { ShotResponse } from "../sim/protocol.js";
import {
  DAY,
  cachedEphemeris,
  daysBetweenIso,
  launchEtForDay,
  normalizeDeg,
  vInfFromAim,
  type Aim,
  type ShotAnalysis,
  type ShotRequest,
} from "../sim/shot.js";
import { useSimulation } from "../sim/useSimulation.js";
import { c3, deltaVFromLeo } from "@starshot/physics";
import { AimControls, FlightControls, type HintState, type Tone } from "./Controls.js";
import { Hud } from "./Hud.js";
import { ResultOverlay } from "./ResultOverlay.js";

/** Main-thread ephemeris, for drawing only (the worker has its own for physics). */
const eph = cachedEphemeris(createEphemeris({ flatten: true }));

export interface GameScreenProps {
  readonly level: Level;
  readonly hasNext: boolean;
  readonly onExit: () => void;
  readonly onNext: () => void;
  readonly onRecord: (level: Level, score: Score, analysis: ShotAnalysis) => void;
  readonly onSandboxTarget?: (target: PlanetId) => void;
  /** Show the first-run coach mark until the player drags or nudges the aim. */
  readonly showCoach: boolean;
  readonly onCoachSeen: () => void;
}

type Phase = "aim" | "launching" | "flight" | "result";

interface FlightAnim {
  readonly response: ShotResponse;
  readonly path: PathData;
  t: number;
  lastNow: number | null;
  readonly daysPerSecond: number;
  doneAt: number | null;
  lastClock: number;
  /** Planet the time-warp is slowing down for, if any. */
  slowedBy: PlanetId | null;
}

const DPR_CAP = 2;
const FAST_FORWARD = 6;
const round = (x: number, step: number) => Math.round(x / step) * step;

/** First-run coach mark, shown near Earth and in the status line. */
export const COACH_TEXT = "Drag anywhere to pull the slingshot";

/** "Training capture zone (3× real)" on the training level, otherwise null. */
export function trainingZoneLabel(level: Level): string | null {
  const k = captureZoneScaleOf(level);
  return k === 1 ? null : `Training capture zone (${k}\u00D7 real)`;
}

export const scoringRulesFor = (level: Level): ScoringRules => ({
  parDeltaVKmS: level.par?.deltaVKmS,
  parTolerance: parToleranceOf(level),
  requiredFlyby: level.requiredFlyby,
});

/** One-line fingerprint of a flight, to check that a launch flew exactly its preview (D6). */
const flightSummary = (a: ShotAnalysis): string =>
  `${a.hit}|${a.termination}|${a.endEt}|${a.closestKm}|${a.flybys.map((f) => `${f.body}@${f.t}`).join(",")}`;

function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => typeof matchMedia === "function" && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia(query);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * A first aim that shows how the slingshot works without solving the level:
 * a gentle push along (outer targets) or against (inner targets) Earth's motion.
 */
function defaultAim(level: Level, launchEt: number): Aim {
  const v = eph.state("earth", launchEt).v;
  const prograde = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
  const inner = level.target === "venus" || level.target === "mercury";
  return { angleDeg: round(normalizeDeg(prograde + (inner ? 180 : 0)), 0.1), speedKmS: round(level.vInfMaxKmS * 0.3, 0.01) };
}

function statusFor(level: Level, a: ShotAnalysis | null): { text: string; tone: Tone } {
  if (!a) return { text: "Drag back from Earth to aim: the probe flies the opposite way.", tone: "idle" };
  const name = BODIES[level.target].name;
  const training = trainingZoneLabel(level);
  const via =
    level.requiredFlyby && a.requiredFlybyDone ? ` · ${BODIES[level.requiredFlyby].name} flyby` : "";
  // The JPL table stops at 2050; later planet positions are extrapolated.
  const range = a.beyondEphemerisRange ? " · after 2050: planet positions extrapolated" : "";
  if (a.hit) {
    if (a.termination === "impact") return { text: `Impact on ${name} on ${formatDate(a.endEt)}${via}${range}`, tone: "hit" };
    const bull = a.bullseye ? " · bullseye!" : "";
    if (training) {
      return { text: `Hit! ${training} on ${formatDate(a.endEt)}${bull}${via}${range}`, tone: "hit" };
    }
    return {
      text: `Hit! Capture ${formatDate(a.endEt)} · periapsis ${formatKm(a.closestKm)}${bull}${via}${range}`,
      tone: "hit",
    };
  }
  if (a.termination === "sun") return { text: "Falls into the Sun: aim further from it.", tone: "miss" };
  if (a.termination === "escape") return { text: `Escapes the Solar System: too fast.${range}`, tone: "miss" };
  if (a.termination === "impact") return { text: `Crashes into ${bodyName(a.terminatedBy)}.${range}`, tone: "miss" };
  return {
    text: `Miss ${formatKm(a.closestKm)} · ${training ? `${training}: ` : "capture zone "}${formatKm(a.captureZoneKm)}${via}${range}`,
    tone: "miss",
  };
}

/** Space taken by the HUD (top) and the controls (bottom on phones, a right-hand column on wide screens). */
function measureInsets(root: HTMLElement, hud: HTMLElement | null, controls: HTMLElement | null) {
  const rb = root.getBoundingClientRect();
  const hb = hud?.getBoundingClientRect();
  const wrap = controls?.getBoundingClientRect();
  const panel = controls?.firstElementChild?.getBoundingClientRect();
  const insetTop = hb ? Math.max(0, hb.bottom - rb.top) : 0;
  if (!wrap || !panel) return { insetTop, insetBottom: 0, insetRight: 0 };
  // The wrapper only leaves the bottom edge in the wide-screen column layout.
  const side = wrap.left > rb.left + rb.width * 0.5;
  return side
    ? { insetTop, insetBottom: 0, insetRight: Math.max(0, rb.right - wrap.left) }
    : { insetTop, insetBottom: Math.max(0, rb.bottom - panel.top), insetRight: 0 };
}

function buildMarkers(res: ShotResponse): Marker[] {
  const out: Marker[] = [];
  for (const e of res.result.encounters) {
    if (e.body === "sun" || e.body === res.shot.target) continue;
    if (e.body === "earth" && e.t - res.shot.launchEt < 60 * DAY) continue;
    const soi = eph.soiKm(e.body, res.shot.launchEt);
    if (!e.insideSoi && e.distanceKm > 3 * soi) continue;
    const p = sampleAt(res.result, e.t).r;
    out.push({
      x: p[0],
      y: p[1],
      label: `${BODIES[e.body].name} ${formatKm(e.distanceKm)}`,
      kind: e.insideSoi ? "flyby" : "near",
      color: BODIES[e.body].color,
    });
  }
  return out;
}

function buildGhost(res: ShotResponse): Ghost | null {
  const a = res.analysis;
  if (!Number.isFinite(a.closestKm) && !a.hit) return null;
  const t = a.hit ? a.endEt : a.closestEt;
  const target = eph.state(res.shot.target, t).r;
  const probe = sampleAt(res.result, t).r;
  const label = a.hit
    ? `${a.termination === "impact" ? "Impact" : "Capture"} · ${formatDate(t)}`
    : `Miss ${formatKm(a.closestKm)}`;
  return { x: target[0], y: target[1], probeX: probe[0], probeY: probe[1], label, hit: a.hit };
}

const overlapArea = (a: Rect, b: Readonly<Rect>) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Where the coach mark sits: next to Earth (below it when there is room),
 * inside the uncovered map, never on the closest-approach label and covering as
 * little as possible of the target, Earth and the aim arrow. The coach mark is
 * DOM over the canvas, and on a short landscape map the spot below Earth is
 * often where "Miss ..." is drawn.
 */
function placeCoach(el: HTMLElement, vp: Viewport, x: number, y: number, layout: SceneLayout) {
  const map = visibleMapRect(vp, 8);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const clampX = (left: number) => Math.max(map.x, Math.min(left, map.x + map.w - w));
  const clampY = (top: number) => Math.max(map.y, Math.min(top, map.y + map.h - h));
  const below = y + 18;
  const above = y - 18 - h;
  const spots: Rect[] = [
    { x: clampX(x - w / 2), y: below, w, h },
    { x: clampX(x - w / 2), y: above, w, h },
    { x: x - 18 - w, y: clampY(y - h / 2), w, h },
    { x: x + 18, y: clampY(y - h / 2), w, h },
    { x: x - 18 - w, y: below, w, h },
    { x: x + 18, y: below, w, h },
    { x: x - 18 - w, y: above, w, h },
    { x: x + 18, y: above, w, h },
  ];
  const fits = (r: Rect) => r.x >= map.x && r.y >= map.y && r.x + r.w <= map.x + map.w && r.y + r.h <= map.y + map.h;
  // On a map strip too short to hold it (small landscape phones), the status line says
  // the same thing, so the coach mark stays hidden rather than covering the map.
  el.style.visibility = map.h < 3 * h ? "hidden" : "";
  const label = layout.ghostLabel;
  const host = el.offsetParent as HTMLElement | null;
  const toolsEl = host?.querySelector<HTMLElement>(".map-tools") ?? null;
  let tools: Rect | null = null;
  if (host && toolsEl) {
    const a = host.getBoundingClientRect();
    const b = toolsEl.getBoundingClientRect();
    tools = { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height };
  }
  const usable = spots.filter(
    (r) => fits(r) && (label === null || !overlaps(r, label)) && (tools === null || !overlaps(r, tools)),
  );
  const cost = (r: Rect) => layout.keepClear.reduce((sum, k) => sum + overlapArea(r, k), 0);
  // Earlier spots win ties, so an unobstructed "below Earth" is always the choice.
  let at: Rect | null = null;
  for (const r of usable) if (at === null || cost(r) < cost(at)) at = r;
  at ??= spots.find(fits) ?? { x: clampX(x - w / 2), y: clampY(below), w, h };
  el.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
}

export function GameScreen(props: GameScreenProps) {
  const { level } = props;
  const reducedMotion = usePrefersReducedMotion();
  const sim = useSimulation();

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const coachRef = useRef<HTMLDivElement>(null);

  const clampDay = useCallback((d: number) => Math.max(0, Math.min(level.window.days, Math.round(d))), [level]);
  const [day, setDay] = useState(() => clampDay(daysBetweenIso(level.window.startIso, level.defaultLaunchIso)));
  const launchEt = useMemo(() => launchEtForDay(level.window.startIso, day), [level, day]);
  const [aim, setAim] = useState<Aim>(() => defaultAim(level, launchEt));
  const [fine, setFine] = useState(false);
  const [phase, setPhaseState] = useState<Phase>("aim");
  // Input handlers check this, not the rendered phase, so nothing can change the aim,
  // the date or the hint between Launch and the re-render that disables the controls.
  const phaseRef = useRef<Phase>("aim");
  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintState, setHintState] = useState<HintState>("idle");
  const [hintUsed, setHintUsed] = useState(false);
  const [flight, setFlight] = useState<ShotResponse | null>(null);
  const [outcome, setOutcome] = useState<{ score: Score; analysis: ShotAnalysis } | null>(null);
  const [clock, setClock] = useState<{ et: number; slowedBy: PlanetId | null }>({ et: 0, slowedBy: null });
  const [fast, setFast] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // The coach mark stays until the first drag or nudge of this session, even once storage says "seen".
  const [coach, setCoach] = useState(props.showCoach);

  const shot: ShotRequest = useMemo(() => shotRequestFor(level, launchEt, vInfFromAim(aim)), [level, launchEt, aim]);

  const { requestPreview } = sim;
  useEffect(() => {
    if (phase === "aim") requestPreview(shot);
  }, [shot, phase, requestPreview]);

  const preview = sim.preview;
  // Launch only the preview of exactly the aim on screen (D6); until it lands the status is "busy".
  const gate = launchGate(phase === "aim", preview, shot);
  const shown = phase === "flight" || phase === "result" ? flight : preview;
  const path = useMemo(() => (shown ? buildPath(shown.result) : null), [shown]);
  const markers = useMemo(() => (shown ? buildMarkers(shown) : []), [shown]);
  const ghost = useMemo(() => (shown ? buildGhost(shown) : null), [shown]);
  const shotStatus = statusFor(level, preview?.analysis ?? null);
  const status = coach ? { text: `${COACH_TEXT}: the probe flies the opposite way.`, tone: "idle" as Tone } : shotStatus;
  const { onCoachSeen } = props;
  const coachOn = useRef(props.showCoach);
  const dismissCoach = useCallback(() => {
    if (!coachOn.current) return;
    coachOn.current = false;
    setCoach(false);
    onCoachSeen();
  }, [onCoachSeen]);

  // ----- static per-level geometry
  const orbits = useMemo(() => {
    const et0 = launchEtForDay(level.window.startIso, 0);
    return PLANET_IDS.map((id) => {
      const pts = orbitPath(id, et0, 360, { flatten: true });
      const arr = new Float64Array(pts.length * 2);
      pts.forEach((p, i) => {
        arr[i * 2] = p[0];
        arr[i * 2 + 1] = p[1];
      });
      return { id, pts: arr };
    });
  }, [level]);
  const frameRadiusKm = useMemo(() => {
    const ids = new Set<PlanetId>(framingBodies(level));
    let r = 0;
    for (const o of orbits) {
      if (!ids.has(o.id)) continue;
      for (let i = 0; i < o.pts.length; i += 2) r = Math.max(r, Math.hypot(o.pts[i]!, o.pts[i + 1]!));
    }
    return r * 1.04;
  }, [orbits, level]);

  // ----- camera, viewport and the on-demand render loop
  const camRef = useRef<Camera>({ x: 0, y: 0, scale: 1e-6 });
  const vpRef = useRef<Viewport>({ width: 1, height: 1, insetTop: 0, insetBottom: 0, insetRight: 0 });
  const dprRef = useRef(1);
  const starRef = useRef<HTMLCanvasElement | null>(null);
  const userMovedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const animUntilRef = useRef(0);
  const burstRef = useRef<{ start: number; x: number; y: number; color: string } | null>(null);
  const flightRef = useRef<FlightAnim | null>(null);
  const fastRef = useRef(false);
  fastRef.current = fast;
  const fitScaleRef = useRef(1e-6);
  const insetsDirty = useRef(true);

  const maxPull = () => {
    const vp = vpRef.current;
    const usable = Math.min(vp.width - vp.insetRight, Math.max(120, vp.height - vp.insetTop - vp.insetBottom));
    return Math.max(90, Math.min(220, usable * 0.36));
  };

  // Latest render inputs, read by the canvas loop without re-subscribing.
  const snapshot = {
    phase,
    launchEt,
    aim,
    path,
    markers: phase === "flight" ? [] : markers,
    ghost: phase === "flight" ? null : ghost,
    hint,
    hintShown: hintState === "shown",
    reducedMotion,
    level,
    coach,
    gate,
    preview,
    shot,
    pathHit: Boolean((phase === "aim" || phase === "launching" ? preview : flight)?.analysis.hit),
  };
  const latest = useRef(snapshot);
  latest.current = snapshot;

  const pullRef = useRef<Pull | null>(null);
  const finishRef = useRef<(f: FlightAnim) => void>(() => {});

  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const L = latest.current;
    const f = flightRef.current;
    let et = L.launchEt;
    let probe: [number, number] | null = null;
    let flightT: number | null = null;
    if (f && (L.phase === "flight" || L.phase === "result")) {
      flightT = f.t;
      et = f.t;
      const p = sampleAt(f.response.result, f.t).r;
      probe = [p[0], p[1]];
    }
    let burst: { progress: number; x: number; y: number; color: string } | null = null;
    let shake: [number, number] = [0, 0];
    const b = burstRef.current;
    if (b !== null) {
      const p = (now - b.start) / 650;
      if (p >= 1) burstRef.current = null;
      else {
        burst = { progress: p, x: b.x, y: b.y, color: b.color };
        if (!L.reducedMotion && p < 0.35) {
          const k = (0.35 - p) * 7;
          shake = [Math.sin(now * 0.09) * k, Math.cos(now * 0.11) * k];
        }
      }
    }
    const pull = pullRef.current;
    const layout = drawScene(ctx, {
      vp: vpRef.current,
      cam: camRef.current,
      dpr: dprRef.current,
      starfield: starRef.current,
      eph,
      et,
      soiEt: L.launchEt,
      captureZoneScale: captureZoneScaleOf(L.level),
      target: L.level.target,
      highlight: L.level.requiredFlyby,
      orbits,
      path: L.path,
      pathHit: L.pathHit,
      flightT,
      probe,
      markers: L.markers,
      ghost: L.ghost,
      aim: L.phase === "aim" || L.phase === "launching" ? { ...L.aim, vMax: L.level.vInfMaxKmS } : null,
      drag: pull && L.phase === "aim" ? { ...pull, maxPull: maxPull() } : null,
      hintAim: L.hintShown && L.hint ? { ...L.hint.aim, vMax: L.level.vInfMaxKmS } : null,
      time: now,
      pulse: !L.reducedMotion && now < animUntilRef.current,
      burst,
      shake,
    });
    // The coach mark is DOM text (crisp, zoomable) that follows Earth on the map.
    const coachEl = coachRef.current;
    if (coachEl && L.coach && L.phase === "aim") {
      const e = eph.state("earth", et).r;
      const [x, y] = project(camRef.current, vpRef.current, e[0], e[1]);
      placeCoach(coachEl, vpRef.current, x, y, layout);
    }
    // The browser checks (verify-game) read the canvas-drawn label's box from here.
    const g = layout.ghostLabel;
    const tag = g ? [g.x, g.y, g.w, g.h].map(Math.round).join(",") : "";
    if (canvas.dataset.ghostLabel !== tag) canvas.dataset.ghostLabel = tag;
  }, [orbits]);

  const stepFlight = useCallback((now: number): boolean => {
    const f = flightRef.current;
    if (!f || latest.current.phase !== "flight") return false;
    if (f.lastNow === null) f.lastNow = now;
    const dt = Math.min(0.05, (now - f.lastNow) / 1000);
    f.lastNow = now;
    const end = f.response.analysis.endEt;
    if (f.t < end) {
      // Slow down within ~3 spheres of influence of any planet (time-warp).
      const p = sampleAt(f.response.result, f.t).r;
      let ratio = Infinity;
      let nearest: PlanetId | null = null;
      for (const id of f.response.shot.attractors) {
        const s = eph.state(id, f.t).r;
        const r = Math.hypot(p[0] - s[0], p[1] - s[1]) / eph.soiKm(id, f.t);
        if (r < ratio) {
          ratio = r;
          nearest = id;
        }
      }
      const factor = Math.max(0.12, Math.min(1, ratio / 3));
      f.slowedBy = factor < 0.6 && f.t - f.response.shot.launchEt > 30 * DAY ? nearest : null;
      const rate = f.daysPerSecond * factor * (fastRef.current ? FAST_FORWARD : 1);
      f.t = Math.min(end, f.t + rate * dt * DAY);
    }
    if (f.t >= end && f.doneAt === null) {
      // Arrival (or skip): a capture burst on a hit, then the result after a beat.
      f.doneAt = now;
      f.slowedBy = null;
      const last = f.response.result.samples[f.response.result.samples.length - 1]!;
      burstRef.current = f.response.analysis.hit
        ? { start: now, x: last.r[0], y: last.r[1], color: BODIES[f.response.shot.target].color }
        : null;
    }
    if (now - f.lastClock > 120 || f.doneAt !== null) {
      f.lastClock = now;
      setClock({ et: f.t, slowedBy: f.slowedBy });
    }
    if (f.doneAt !== null && now - f.doneAt > (latest.current.reducedMotion ? 250 : 900)) {
      finishRef.current(f);
      return false;
    }
    return true;
  }, []);

  const requestDraw = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(function frame(now) {
      frameRef.current = null;
      const flying = stepFlight(now);
      draw(now);
      const animating =
        flying || burstRef.current !== null || (!latest.current.reducedMotion && now < animUntilRef.current);
      if (animating) frameRef.current = requestAnimationFrame(frame);
    });
  }, [draw, stepFlight]);

  const poke = useCallback(
    (ms = 4000) => {
      animUntilRef.current = Math.max(animUntilRef.current, performance.now() + ms);
      requestDraw();
    },
    [requestDraw],
  );

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  // Redraw after every React render (state changes are what the scene shows).
  useEffect(() => {
    requestDraw();
  });

  const refit = useCallback(() => {
    const root = rootRef.current;
    if (root) vpRef.current = { ...vpRef.current, ...measureInsets(root, hudRef.current, controlsRef.current) };
    camRef.current = fitCamera(vpRef.current, frameRadiusKm);
    fitScaleRef.current = camRef.current.scale;
    userMovedRef.current = false;
    requestDraw();
  }, [frameRadiusKm, requestDraw]);

  // Canvas size, device pixel ratio and the HUD/controls insets.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const measure = () => {
      const rb = root.getBoundingClientRect();
      const width = Math.max(1, rb.width);
      const height = Math.max(1, rb.height);
      const insets = measureInsets(root, hudRef.current, controlsRef.current);
      // The zoom buttons sit just below the HUD, whose height changes (training chip, hint tag).
      root.style.setProperty("--hud-bottom", `${Math.round(insets.insetTop)}px`);
      const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      const prev = vpRef.current;
      const sizeChanged = prev.width !== width || prev.height !== height || dprRef.current !== dpr;
      // Insets only change the framing on a real resize, so the map does not jump when
      // the controls swap between aiming and flight.
      if (sizeChanged || insetsDirty.current) {
        vpRef.current = { width, height, ...insets };
        insetsDirty.current = false;
      }
      if (sizeChanged) {
        dprRef.current = dpr;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        starRef.current = renderStarfield(width, height, dpr);
      }
      if (!userMovedRef.current) {
        camRef.current = fitCamera(vpRef.current, frameRadiusKm);
        fitScaleRef.current = camRef.current.scale;
      }
      requestDraw();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    if (hudRef.current) ro.observe(hudRef.current);
    if (controlsRef.current) ro.observe(controlsRef.current);
    return () => ro.disconnect();
  }, [frameRadiusKm, requestDraw]);

  // Pulse the capture zone for a few seconds whenever the level or the preview changes.
  useEffect(() => {
    poke();
  }, [preview, level, poke]);

  // ----- input
  const aimBeforeDrag = useRef<Aim | null>(null);
  const maxTensionBuzzed = useRef(false);
  const zoomLimits = () => ({ minScale: fitScaleRef.current / 8, maxScale: fitScaleRef.current * 60000 });
  const endDrag = useCallback(() => {
    pullRef.current = null;
    aimBeforeDrag.current = null;
    setDragging(false);
  }, []);
  useSlingshot(canvasRef, phase === "aim", {
    onPull(pull, final) {
      if (phaseRef.current !== "aim") {
        // A keyboard launch during a drag: the aim is fixed, the band just goes away.
        if (final) endDrag();
        return;
      }
      dismissCoach();
      pullRef.current = final ? null : pull;
      if (!aimBeforeDrag.current) aimBeforeDrag.current = latest.current.aim;
      const raw = aimFromPull(pull, maxPull(), level.vInfMaxKmS);
      const next = { angleDeg: normalizeDeg(round(raw.angleDeg, 0.1)), speedKmS: round(raw.speedKmS, 0.01) };
      setAim(next);
      setDragging(!final);
      const atMax = Math.hypot(pull.pullX, pull.pullY) >= maxPull();
      if (atMax && !maxTensionBuzzed.current) navigator.vibrate?.(8);
      maxTensionBuzzed.current = atMax;
      if (final) aimBeforeDrag.current = null;
      poke(2500);
    },
    onPullCancel() {
      if (phaseRef.current === "aim" && aimBeforeDrag.current) setAim(aimBeforeDrag.current);
      endDrag();
      requestDraw();
    },
    onZoom(sx, sy, factor) {
      camRef.current = zoomAt(camRef.current, vpRef.current, sx, sy, factor, zoomLimits());
      userMovedRef.current = true;
      requestDraw();
    },
    onPan(dx, dy) {
      camRef.current = panBy(camRef.current, dx, dy);
      userMovedRef.current = true;
      requestDraw();
    },
  });

  const zoomButton = (factor: number) => {
    const [fx, fy] = focusPoint(vpRef.current);
    camRef.current = zoomAt(camRef.current, vpRef.current, fx, fy, factor, zoomLimits());
    userMovedRef.current = true;
    requestDraw();
  };

  // ----- actions (aim, date and hint act only while aiming: after Launch the shot is fixed)
  const nudgeAngle = useCallback(
    (d: number) => {
      if (phaseRef.current !== "aim") return;
      dismissCoach();
      setAim((a) => ({ ...a, angleDeg: normalizeDeg(round(a.angleDeg + d, 0.001)) }));
    },
    [dismissCoach],
  );
  const nudgeSpeed = useCallback(
    (d: number) => {
      if (phaseRef.current !== "aim") return;
      dismissCoach();
      setAim((a) => ({ ...a, speedKmS: Math.max(0, Math.min(level.vInfMaxKmS, round(a.speedKmS + d, 0.0001))) }));
    },
    [level, dismissCoach],
  );
  const pickDay = useCallback(
    (next: number | ((d: number) => number)) => {
      if (phaseRef.current !== "aim") return;
      setDay((d) => clampDay(typeof next === "function" ? next(d) : next));
    },
    [clampDay],
  );

  const showHint = useCallback(() => {
    if (phaseRef.current !== "aim") return;
    setHintState("busy");
    sim
      .hint(hintQueryFor(level))
      .then((res) => {
        if (!res.hint) {
          setHintState("failed");
          setAnnouncement("No direct route found in this window.");
          return;
        }
        const h = res.hint;
        setHint(h);
        setHintState("shown");
        const what = `launch ${formatDate(h.launchEt)}, angle ${formatAimAngle(h.aim.angleDeg)} degrees, ${formatAimSpeed(h.aim.speedKmS)} km/s`;
        setAnnouncement(
          h.hits
            ? `Hint: ${what}. Using it caps this level at two stars.`
            : `No exact hint found; closest miss shown: ${what}, missing by ${formatKm(h.closestKm)}. Using it caps this level at two stars.`,
        );
        poke();
      })
      .catch(() => setHintState("failed"));
  }, [sim, level, poke]);

  const applyHint = useCallback(() => {
    if (!hint || phaseRef.current !== "aim") return;
    // Only applying the hint caps the stars; looking at it does not.
    setHintUsed(true);
    dismissCoach();
    setDay(hint.day);
    setAim(hint.aim);
  }, [hint, dismissCoach]);

  const finish = useCallback(
    (f: FlightAnim) => {
      const a = f.response.analysis;
      const rules = scoringRulesFor(level);
      const score = scoreShot(rules, {
        hit: a.hit,
        deltaVKmS: a.deltaVKmS,
        bullseye: a.bullseye,
        requiredFlybyDone: a.requiredFlybyDone,
        hintUsed,
      });
      setOutcome({ score, analysis: a });
      setPhase("result");
      const zone = trainingZoneLabel(level);
      const name = BODIES[level.target].name;
      setAnnouncement(
        `${a.hit ? `Reached ${name}${zone ? ` (${zone})` : ""}` : `Missed ${name} by ${formatKm(a.closestKm)}`}: ${score.stars} of ${maxStars(rules)} stars.`,
      );
      props.onRecord(level, score, a);
    },
    [level, hintUsed, props],
  );
  finishRef.current = finish;

  /** Fly exactly the preview on screen: its own request, re-run by the deterministic worker. */
  const pendingLaunch = useRef<string | null>(null);
  const fire = useCallback(
    (current: ShotResponse) => {
      pendingLaunch.current = null;
      setPhase("launching");
      const expected = flightSummary(current.analysis);
      sim
        .launch(current.shot)
        .then((res) => {
          if (flightSummary(res.analysis) !== expected) {
            // D6 says this cannot happen; say so loudly if it ever does.
            console.error("Starshot: the launch did not fly its preview", { preview: expected, launch: flightSummary(res.analysis) });
          }
          const days = res.analysis.flightDays;
          const seconds = Math.max(4, Math.min(9, 2.5 + days / 200)) * (reducedMotion ? 0.6 : 1);
          flightRef.current = {
            response: res,
            path: buildPath(res.result),
            t: res.shot.launchEt,
            lastNow: null,
            daysPerSecond: Math.max(1, days / seconds),
            doneAt: null,
            lastClock: 0,
            slowedBy: null,
          };
          setFlight(res);
          setFast(false);
          setClock({ et: res.shot.launchEt, slowedBy: null });
          setPhase("flight");
          const earthAtLaunch = eph.state("earth", res.shot.launchEt).r;
          burstRef.current = { start: performance.now(), x: earthAtLaunch[0], y: earthAtLaunch[1], color: "#5eead4" };
          navigator.vibrate?.(18);
          setAnnouncement(`Launched on ${formatDate(res.shot.launchEt)} at ${res.analysis.vInfKmS.toFixed(2)} km/s.`);
          requestDraw();
        })
        .catch((err: unknown) => {
          setPhase("aim");
          setAnnouncement(`Launch failed: ${err instanceof Error ? err.message : String(err)}`);
        });
    },
    [sim, reducedMotion, requestDraw],
  );

  const launch = useCallback(() => {
    const L = latest.current;
    if (phaseRef.current !== "aim") return;
    dismissCoach();
    endDrag();
    if (L.gate.ready && L.preview) {
      fire(L.preview);
      return;
    }
    // The aim changed a moment ago (a key press) and its preview is still computing:
    // launch as soon as exactly that preview lands. The Launch button itself stays
    // disabled until then, so a pointer can never fire a stale shot.
    pendingLaunch.current = shotKey(L.shot);
    requestPreview(L.shot);
    setPhase("launching");
  }, [fire, requestPreview, dismissCoach, endDrag, setPhase]);

  useEffect(() => {
    const key = pendingLaunch.current;
    if (phase !== "launching" || key === null) return;
    if (preview && shotKey(preview.shot) === key) fire(preview);
    else if (sim.answeredKey === key) {
      // The worker answered exactly this shot without a path: it failed.
      pendingLaunch.current = null;
      setPhase("aim");
      setAnnouncement("Launch cancelled: the path for this aim could not be computed.");
    }
  }, [phase, preview, sim.answeredKey, fire, setPhase]);

  const skip = useCallback(() => {
    const f = flightRef.current;
    if (!f) return;
    f.t = f.response.analysis.endEt;
    requestDraw();
  }, [requestDraw]);

  const retry = useCallback(() => {
    flightRef.current = null;
    setFlight(null);
    setOutcome(null);
    setPhase("aim");
    poke();
  }, [poke]);

  // The flight loop must keep running once the phase flips to "flight".
  useEffect(() => {
    if (phase === "flight") requestDraw();
  }, [phase, requestDraw]);

  // Announce the preview once it settles, not on every drag frame.
  useEffect(() => {
    if (phase !== "aim" || dragging) return;
    const id = setTimeout(() => setAnnouncement(status.text), 600);
    return () => clearTimeout(id);
  }, [status.text, phase, dragging]);

  // ----- keyboard
  const keyHandlers = useRef({ nudgeAngle, nudgeSpeed, launch, showHint, applyHint, refit, zoomButton, pickDay, phase, hintState, skip });
  keyHandlers.current = { nudgeAngle, nudgeSpeed, launch, showHint, applyHint, refit, zoomButton, pickDay, phase, hintState, skip };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = keyHandlers.current;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (h.phase === "result") return;
      const onButton = tag === "BUTTON";
      const coarse = e.shiftKey ? 10 : 1;
      const fineK = e.altKey || fine ? 0.1 : 1;
      if (h.phase === "flight") {
        if (e.key === "Escape" || e.key.toLowerCase() === "s") {
          h.skip();
          e.preventDefault();
        }
        return;
      }
      if (h.phase !== "aim") return;
      switch (e.key) {
        case "ArrowLeft": // rotate the aim counter-clockwise (to the left)
          h.nudgeAngle(0.1 * coarse * fineK);
          break;
        case "ArrowRight":
          h.nudgeAngle(-0.1 * coarse * fineK);
          break;
        case "ArrowUp":
          h.nudgeSpeed(0.01 * coarse * fineK);
          break;
        case "ArrowDown":
          h.nudgeSpeed(-0.01 * coarse * fineK);
          break;
        case " ":
        case "Enter":
          if (onButton) return;
          h.launch();
          break;
        case "[":
          h.pickDay((d: number) => d - 1);
          break;
        case "]":
          h.pickDay((d: number) => d + 1);
          break;
        case "h":
        case "H":
          if (h.hintState === "shown") h.applyHint();
          else if (h.hintState !== "busy") h.showHint();
          break;
        case "f":
        case "F":
          setFine((v) => !v);
          break;
        case "0":
        case "r":
        case "R":
          h.refit();
          break;
        case "+":
        case "=":
          h.zoomButton(1.5);
          break;
        case "-":
        case "_":
          h.zoomButton(1 / 1.5);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fine]);

  // Focus the level title on entry so screen readers start in the right place.
  useEffect(() => {
    document.getElementById("game-title")?.focus({ preventScroll: true });
  }, [level.id]);

  // ----- derived UI values
  const vInfKmS = aim.speedKmS;
  const readouts = {
    vInfKmS,
    deltaVKmS: deltaVFromLeo(vInfKmS),
    c3: c3(vInfKmS),
    flightDays: preview ? preview.analysis.flightDays : null,
  };
  // Exactly what "Use hint" applies, formatted as the angle and speed controls show it.
  const hintLabel = hint
    ? `${formatDate(hint.launchEt)} · ${formatAimAngle(hint.aim.angleDeg)}° · ${formatAimSpeed(hint.aim.speedKmS)} km/s`
    : null;
  const inFlight = phase === "flight" || phase === "result";
  const dateCaption = inFlight ? "Now" : "Launch";
  const dateLabel = inFlight ? formatDate(clock.et || launchEt) : formatDate(launchEt);
  const rules = scoringRulesFor(level);
  const training = trainingZoneLabel(level);
  const canvasLabel = `Solar System map, ${level.title}: Earth and target ${BODIES[level.target].name}. Drag to aim the slingshot; pinch or scroll to zoom.`;
  // While the result dialog is open everything behind it is inert (no focus, hidden from assistive tech).
  const behindDialog = phase === "result" && outcome !== null;

  return (
    <div
      className={`game phase-${phase}${dragging ? " is-dragging" : ""}`}
      ref={rootRef}
      data-sim-ms={preview ? preview.ms.toFixed(1) : undefined}
      data-preview-hit={preview ? String(preview.analysis.hit) : undefined}
      data-preview-current={String(!gate.stale)}
      data-preview-summary={preview ? flightSummary(preview.analysis) : undefined}
      data-flight-summary={flight ? flightSummary(flight.analysis) : undefined}
      data-coach={coach ? "on" : "off"}
    >
      <canvas
        ref={canvasRef}
        className="stage"
        role="img"
        aria-label={canvasLabel}
        aria-describedby="shot-status"
        inert={behindDialog}
      />
      {coach && phase === "aim" ? (
        <div ref={coachRef} className="coach-mark" aria-hidden="true">
          <span className="coach-hand" />
          {COACH_TEXT}
        </div>
      ) : null}
      <div ref={hudRef} className="hud-wrap" inert={behindDialog}>
        <Hud
          level={level}
          dateLabel={dateLabel}
          dateCaption={dateCaption}
          onExit={props.onExit}
          onSandboxTarget={props.onSandboxTarget}
          targetLocked={phase !== "aim"}
          trainingZone={training}
        />
        {hintState === "shown" && hintLabel && hint && phase === "aim" ? (
          <p className={`hint-tag${hint.hits ? "" : " is-miss"}`}>
            <span>{hint.hits ? "Hint" : "No exact hint found \u2014 closest miss shown"}</span> {hintLabel}
          </p>
        ) : null}
      </div>
      <div className="map-tools" role="group" aria-label="Map view" inert={behindDialog}>
        <button type="button" className="icon-btn" aria-label="Zoom in" onClick={() => zoomButton(1.6)}>
          +
        </button>
        <button type="button" className="icon-btn" aria-label="Zoom out" onClick={() => zoomButton(1 / 1.6)}>
          &#x2212;
        </button>
        <button type="button" className="icon-btn" aria-label="Recenter the map" onClick={refit}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div ref={controlsRef} className="controls-wrap" inert={behindDialog}>
        {phase === "aim" || phase === "launching" ? (
          <AimControls
            level={level}
            aim={aim}
            fine={fine}
            day={day}
            launchDateLabel={formatDate(launchEt)}
            readouts={readouts}
            status={status.text}
            statusTone={gate.stale && !coach ? "busy" : status.tone}
            statusTwoLines={training !== null}
            hintState={hintState}
            hintLabel={hintLabel}
            launching={phase === "launching"}
            launchReady={gate.ready}
            onAngle={nudgeAngle}
            onSpeed={nudgeSpeed}
            onFine={() => phaseRef.current === "aim" && setFine((v) => !v)}
            onDay={pickDay}
            onHint={showHint}
            onApplyHint={applyHint}
            onLaunch={launch}
          />
        ) : (
          <FlightControls
            dayCount={(clock.et - (flight?.shot.launchEt ?? launchEt)) / DAY}
            dateLabel={formatDate(clock.et || launchEt)}
            fast={fast}
            slowedBy={clock.slowedBy ? BODIES[clock.slowedBy].name : null}
            onFast={() => setFast((v) => !v)}
            onSkip={skip}
          />
        )}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {phase === "result" && outcome ? (
        <ResultOverlay
          level={level}
          score={outcome.score}
          maxStars={maxStars(rules)}
          parTolerance={parToleranceOf(level)}
          trainingZone={training}
          analysis={outcome.analysis}
          hintUsed={hintUsed}
          canNext={props.hasNext && outcome.score.hit}
          onRetry={retry}
          onNext={props.onNext}
          onLevels={props.onExit}
        />
      ) : null}
    </div>
  );
}
