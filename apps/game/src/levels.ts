/**
 * Starshot's levels. Every launch window is a real one, found with the
 * physics package's Lambert search (bestDirectTransfer) over the JPL
 * approximate ephemeris, and every non-sandbox level carries a known solution
 * that levels.test.ts flies with the game's exact simulator settings.
 */
import { PLANET_IDS, type PlanetId } from "@starshot/ephemeris";
import { deltaVFromLeo } from "@starshot/physics";
import type { KnownShot } from "./sim/hint.js";

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
  /** 1-based position in the campaign. */
  readonly number: number;
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
  /** A curated hint for levels whose answer is not a direct transfer. */
  readonly hint?: KnownShot;
  readonly sandbox?: boolean;
}

const par = (vInfKmS: number, source: string): Par => ({
  deltaVKmS: Math.round(deltaVFromLeo(vInfKmS) * 100) / 100,
  source,
});

/**
 * A Voyager-2-like Grand Tour shot (75.93 degrees, 9.80 km/s on 1977-08-20):
 * Jupiter flyby on 1979-07-07, Saturn capture zone on 1981-06-21 in the
 * game's flattened model. Verified in levels.test.ts.
 */
export const GRAND_TOUR_HINT: KnownShot = {
  launchIso: "1977-08-20",
  vInf: [2.3829478446723424, 9.50586974293102, 0],
};

export const CAMPAIGN: readonly Level[] = [
  {
    id: "first-light",
    number: 1,
    title: "First Light",
    blurb:
      "Earth-Mars launch windows open about every 26 months; this is the real late-2026 window.",
    window: { startIso: "2026-10-15", days: 90 },
    defaultLaunchIso: "2026-11-05",
    target: "mars",
    maxFlightDays: 400,
    vInfMaxKmS: 6,
    attractors: ["earth", "mars", "jupiter"],
    par: par(3.116, "Cheapest direct transfer in the window: launch 2026-11-04, v-infinity 3.12 km/s."),
  },
  {
    id: "morning-star",
    number: 2,
    title: "Morning Star",
    blurb:
      "Venus is the closest planet to Earth; launch windows to it come round about every 19 months.",
    window: { startIso: "2028-01-20", days: 90 },
    defaultLaunchIso: "2028-02-01",
    target: "venus",
    maxFlightDays: 300,
    vInfMaxKmS: 5,
    attractors: ["mercury", "venus", "earth"],
    par: par(2.533, "Cheapest direct transfer in the window: launch 2028-03-03, v-infinity 2.53 km/s."),
  },
  {
    id: "big-game",
    number: 3,
    title: "Big Game",
    blurb:
      "Jupiter outweighs all the other planets put together; windows to it open about every 13 months.",
    window: { startIso: "2028-11-20", days: 90 },
    defaultLaunchIso: "2028-12-01",
    target: "jupiter",
    maxFlightDays: 1300,
    vInfMaxKmS: 12,
    attractors: ["earth", "mars", "jupiter", "saturn"],
    par: par(8.7, "Cheapest direct transfer in the window: launch 2028-12-24, v-infinity 8.70 km/s."),
  },
  {
    id: "grand-tour",
    number: 4,
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
    par: par(9.4, "Cheapest Jupiter-assisted shot found on a 0.1 degree by 0.2 km/s search: v-infinity 9.4 km/s."),
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

/** Free play from today's date: any target, generous speed, no par. */
export function sandboxLevel(target: PlanetId = "mars", now: Date = new Date()): Level {
  const startIso = sandboxStartIso(now);
  return {
    id: "sandbox",
    number: CAMPAIGN.length + 1,
    title: "Sandbox",
    blurb: "Free play from today's date: pick any planet and find your own window.",
    window: { startIso, days: 730 },
    defaultLaunchIso: startIso,
    target,
    maxFlightDays: SANDBOX_MAX_FLIGHT_DAYS[target],
    vInfMaxKmS: 20,
    // Every planet pulls, except Mercury when it is not the target: it is tiny, and the
    // fastest orbit to evaluate, so dropping it keeps 14-year previews under budget.
    attractors: target === "mercury" ? PLANET_IDS : PLANET_IDS.filter((p) => p !== "mercury"),
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
