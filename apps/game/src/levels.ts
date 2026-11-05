/**
 * Starshot's levels. Every launch window is a real one, found with the
 * physics package's Lambert search (bestDirectTransfer) over the JPL
 * approximate ephemeris, and every non-sandbox level carries a known solution
 * that levels.test.ts flies with the game's exact simulator settings.
 */
import { PLANET_IDS, type PlanetId, type Vec3 } from "@starshot/ephemeris";
import { deltaVFromLeo } from "@starshot/physics";
import type { HintQuery, KnownShot } from "./sim/hint.js";
import {
  OUTER_SIM_SETTINGS,
  SIM_SETTINGS,
  type ShotRequest,
  type ShotTemplate,
  type SimSettings,
} from "./sim/shot.js";

export type LevelId = "first-light" | "morning-star" | "big-game" | "grand-tour" | "sandbox";

export interface LaunchWindow {
  /** First launch date (00:00 UTC). */
  readonly startIso: string;
  /** Launch days are startIso + 0..days (inclusive). */
  readonly days: number;
}

export interface Par {
  /** Delta-v from a 200 km parking orbit [km/s] of the reference shot. */
  readonly deltaVKmS: number;
  readonly source: string;
}

export interface Level {
  readonly id: LevelId;
  readonly title: string;
  /** One-line, factual real-world context. */
  readonly blurb: string;
  readonly window: LaunchWindow;
  readonly defaultLaunchIso: string;
  readonly target: PlanetId;
  readonly maxFlightDays: number;
  /** Departure excess speed cap: a full slingshot pull [km/s]. */
  readonly vInfMaxKmS: number;
  /** Planets whose gravity acts on the probe (the Sun always does). */
  readonly attractors: readonly PlanetId[];
  /** A planet to fly through (inside its sphere of influence) on the way. */
  readonly requiredFlyby?: PlanetId;
  readonly par?: Par;
  /**
   * The efficiency star needs delta-v <= par x parTolerance. Default 1.10; tighter
   * where the speed cap would otherwise hand the star to every hit.
   */
  readonly parTolerance?: number;
  /**
   * Capture-zone radius as a multiple of the target's real sphere of influence.
   * Default 1 (real size); only the first, training level is larger. Never below
   * 1: the flight stops at the real sphere, so simulateShot rejects a smaller zone.
   */
  readonly captureZoneScale?: number;
  /** Integrator settings: the same for this level's preview and launch (D6). */
  readonly sim: SimSettings;
  /** A curated hint for levels whose answer is not a direct transfer. */
  readonly hint?: KnownShot;
  readonly sandbox?: boolean;
}

/** Default efficiency-star tolerance on the par delta-v. */
export const DEFAULT_PAR_TOLERANCE = 1.1;

export const parToleranceOf = (level: Level): number => level.parTolerance ?? DEFAULT_PAR_TOLERANCE;
export const captureZoneScaleOf = (level: Level): number => level.captureZoneScale ?? 1;

/** The level's shot without launch time and aim; preview, launch, hint and tests all start here. */
export function shotTemplate(level: Level): ShotTemplate {
  return {
    target: level.target,
    attractors: level.attractors,
    maxFlightDays: level.maxFlightDays,
    requiredFlyby: level.requiredFlyby,
    sim: level.sim,
    captureZoneScale: captureZoneScaleOf(level),
  };
}

export const shotRequestFor = (level: Level, launchEt: number, vInf: Vec3): ShotRequest => ({
  ...shotTemplate(level),
  launchEt,
  vInf,
});

/** The hint search for a level, run with the level's own shot settings. */
export function hintQueryFor(level: Level): HintQuery {
  return {
    shot: shotTemplate(level),
    windowStartIso: level.window.startIso,
    windowDays: level.window.days,
    vInfMaxKmS: level.vInfMaxKmS,
    curated: level.hint,
  };
}

const par = (vInfKmS: number, source: string): Par => ({
  deltaVKmS: Math.round(deltaVFromLeo(vInfKmS) * 100) / 100,
  source,
});

/**
 * A Voyager-2-like Grand Tour shot (75.93 degrees, 9.800 km/s on 1977-08-20,
 * exactly as the hint label shows it): Jupiter flyby on 1979-07-03, Saturn
 * capture zone on 1981-06-26 in the game's flattened model. Verified in
 * levels.test.ts.
 */
export const GRAND_TOUR_HINT: KnownShot = {
  launchIso: "1977-08-20",
  vInf: [2.3829478446723424, 9.50586974293102, 0],
};

/**
 * The Grand Tour's par shot: the cheapest Jupiter-assisted hit found on the
 * search grid (every launch day at 0.1 km/s steps from 8.8 to 10.5 km/s, then
 * 0.01 km/s steps from 9.00 to 9.12 km/s on 1977-08-26 to 09-09, at 0.01 degree
 * steps around every close Jupiter pass), within ~0.01 km/s of the floor in
 * delta-v. A finer probe (0.005 km/s and 0.002 degree steps, 1977-08-29 to
 * 09-03) finds hits down to 9.085 km/s (delta-v 6.489 km/s, on 09-01 and 09-02)
 * and none at 9.080 km/s; this shot needs 6.499 km/s. 68.43 degrees at
 * 9.100 km/s on 1977-09-02 sits in a band about 0.14 degrees wide (hits from
 * 68.331 to 68.468 degrees at 0.001 degree steps), passes Jupiter on 1979-11-04
 * and reaches Saturn on 1982-04-04, after 1,676 days. Flown in levels.test.ts.
 */
export const GRAND_TOUR_PAR_SHOT: KnownShot = {
  launchIso: "1977-09-02",
  vInf: [3.345503, 8.462719, 0],
};

export const CAMPAIGN: readonly Level[] = [
  {
    id: "first-light",
    title: "First Light",
    blurb:
      "Earth-Mars launch windows open about every 26 months; this is the real late-2026 window.",
    window: { startIso: "2026-10-15", days: 90 },
    defaultLaunchIso: "2026-11-05",
    target: "mars",
    maxFlightDays: 400,
    vInfMaxKmS: 6,
    attractors: ["earth", "mars", "jupiter"],
    // Training: a capture zone three times Mars's real sphere of influence, said so in the HUD.
    captureZoneScale: 3,
    sim: SIM_SETTINGS,
    // "(323 days)" is the Lambert time of flight, 1-day grid: the minimum that
    // crates/starshot-physics/tests/lambert_fine.rs proves. D11's 326 days is the best node of
    // the simulate test's 8-day grid, and the known solution's simulated flight is a third
    // quantity (302.7 days to the training zone, 308.3 to the real sphere, measured 2026-11-01).
    par: par(2.982, "Cheapest direct transfer in the window: launch 2026-11-02, v-infinity 2.98 km/s (323 days)."),
  },
  {
    id: "morning-star",
    title: "Morning Star",
    blurb:
      "Venus is the closest planet to Earth; launch windows to it come round about every 19 months.",
    window: { startIso: "2028-01-20", days: 90 },
    defaultLaunchIso: "2028-02-01",
    target: "venus",
    maxFlightDays: 300,
    vInfMaxKmS: 5,
    attractors: ["mercury", "venus", "earth"],
    sim: SIM_SETTINGS,
    par: par(2.528, "Cheapest direct transfer in the window: launch 2028-03-05, v-infinity 2.53 km/s (150 days)."),
  },
  {
    id: "big-game",
    title: "Big Game",
    blurb:
      "Jupiter outweighs all the other planets put together; windows to it open about every 13 months.",
    window: { startIso: "2028-11-20", days: 90 },
    defaultLaunchIso: "2028-12-01",
    target: "jupiter",
    maxFlightDays: 1300,
    vInfMaxKmS: 12,
    attractors: ["earth", "mars", "jupiter", "saturn"],
    sim: SIM_SETTINGS,
    par: par(8.693, "Cheapest direct transfer in the window: launch 2028-12-25, v-infinity 8.69 km/s (1,056 days)."),
  },
  {
    id: "grand-tour",
    title: "Grand Tour",
    blurb:
      "Voyager 2 launched on 20 August 1977 and used Jupiter's gravity (July 1979) to reach Saturn (August 1981).",
    window: { startIso: "1977-08-10", days: 30 },
    defaultLaunchIso: "1977-08-20",
    target: "saturn",
    maxFlightDays: 1700,
    vInfMaxKmS: 10.5,
    attractors: ["earth", "jupiter", "saturn"],
    requiredFlyby: "jupiter",
    sim: SIM_SETTINGS,
    parTolerance: 1.05,
    // Cheapest assisted hit found on the search grid (see GRAND_TOUR_PAR_SHOT). 105% of it allows v-infinity up to
    // 9.60 km/s for the efficiency star; 110% would allow 10.09, nearly the 10.5 km/s cap.
    par: par(
      9.1,
      "Cheapest Jupiter-assisted hit found on the search grid (within ~0.01 km/s of the floor in delta-v): launch 1977-09-02, 68.43 degrees, v-infinity 9.10 km/s, Saturn after 1,676 days.",
    ),
    hint: GRAND_TOUR_HINT,
  },
];

/** Planets the sandbox can target, with flight-time limits that make sense for each. */
export const SANDBOX_TARGETS: readonly PlanetId[] = PLANET_IDS.filter((p) => p !== "earth");
/** Long enough for slow transfers (Voyager 2 took about 8.5 years to Uranus, 12 to Neptune). */
const SANDBOX_MAX_FLIGHT_DAYS: Readonly<Record<PlanetId, number>> = {
  mercury: 400,
  venus: 400,
  earth: 800,
  mars: 800,
  jupiter: 2000,
  saturn: 2600,
  uranus: 4000,
  neptune: 5000,
};

/** The JPL table is valid 1800-2050; keep the sandbox window inside it. */
const SANDBOX_LATEST_START = "2048-01-01";

/** Today's UTC date as an ISO string, clamped to the ephemeris' range. */
export function sandboxStartIso(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  if (iso > SANDBOX_LATEST_START) return SANDBOX_LATEST_START;
  if (iso < "1800-01-01") return "1800-01-01";
  return iso;
}

/** Sandbox targets beyond Mars: years-long flights, run with OUTER_SIM_SETTINGS. */
const OUTER_TARGETS: ReadonlySet<PlanetId> = new Set<PlanetId>(["jupiter", "saturn", "uranus", "neptune"]);

/**
 * Planets that pull in the sandbox. Inner targets: every planet except Mercury
 * (tiny, and the fastest orbit to evaluate) unless it is the target. Targets
 * beyond Mars: Earth and the giants only; Mercury, Venus and Mars change a
 * 5-14 year flight to a 48-87 million km capture zone far less than the aim
 * resolution does, and leaving them out keeps the preview fast.
 */
export function sandboxAttractors(target: PlanetId): readonly PlanetId[] {
  if (OUTER_TARGETS.has(target)) return ["earth", "jupiter", "saturn", "uranus", "neptune"];
  return target === "mercury" ? PLANET_IDS : PLANET_IDS.filter((p) => p !== "mercury");
}

/** Free play from today's date: any target, generous speed, no par. */
export function sandboxLevel(target: PlanetId = "mars", now: Date = new Date()): Level {
  const startIso = sandboxStartIso(now);
  return {
    id: "sandbox",
    title: "Sandbox",
    blurb: "Free play from today's date: pick any planet and find your own window.",
    window: { startIso, days: 730 },
    defaultLaunchIso: startIso,
    target,
    maxFlightDays: SANDBOX_MAX_FLIGHT_DAYS[target],
    vInfMaxKmS: 20,
    attractors: sandboxAttractors(target),
    sim: OUTER_TARGETS.has(target) ? OUTER_SIM_SETTINGS : SIM_SETTINGS,
    sandbox: true,
  };
}

/** All five levels, the sandbox last (built for today's date). */
export function allLevels(now: Date = new Date()): readonly Level[] {
  return [...CAMPAIGN, sandboxLevel("mars", now)];
}

export function levelById(id: LevelId, now: Date = new Date()): Level | undefined {
  return allLevels(now).find((l) => l.id === id);
}

/** Planets whose orbits frame the view: Earth, the target and any required flyby. */
export function framingBodies(level: Level): PlanetId[] {
  const set = new Set<PlanetId>(["earth", level.target]);
  if (level.requiredFlyby) set.add(level.requiredFlyby);
  return [...set];
}
