import type { PlanetId } from "./elements.js";

export type BodyId = "sun" | PlanetId;

export interface BodyInfo {
  readonly id: BodyId;
  readonly name: string;
  /** Gravitational parameter GM [km^3/s^2]. Planets use their system value (planet + moons). */
  readonly gm: number;
  /** Mean radius [km]. */
  readonly radiusKm: number;
  /** Display colour (CSS). */
  readonly color: string;
}

/** 1 astronomical unit [km] (IAU 2012). */
export const AU_KM = 149597870.7;

/**
 * Physical constants. GM values are the JPL DE440 system values; radii are IAU
 * mean radii. Sources: https://ssd.jpl.nasa.gov/astro_par.html and
 * https://ssd.jpl.nasa.gov/planets/phys_par.html
 */
export const BODIES: Readonly<Record<BodyId, BodyInfo>> = {
  sun: { id: "sun", name: "Sun", gm: 132712440041.279419, radiusKm: 695700, color: "#ffd166" },
  mercury: { id: "mercury", name: "Mercury", gm: 22031.868551, radiusKm: 2439.4, color: "#b8b3ad" },
  venus: { id: "venus", name: "Venus", gm: 324858.592, radiusKm: 6051.8, color: "#f4d58d" },
  earth: { id: "earth", name: "Earth", gm: 403503.235502, radiusKm: 6371.0084, color: "#4f8cff" },
  mars: { id: "mars", name: "Mars", gm: 42828.375816, radiusKm: 3389.5, color: "#e4572e" },
  jupiter: { id: "jupiter", name: "Jupiter", gm: 126712764.1, radiusKm: 69911, color: "#d9a066" },
  saturn: { id: "saturn", name: "Saturn", gm: 37940584.8418, radiusKm: 58232, color: "#e9d8a6" },
  uranus: { id: "uranus", name: "Uranus", gm: 5794556.4, radiusKm: 25362, color: "#8fd3e8" },
  neptune: { id: "neptune", name: "Neptune", gm: 6836527.10058, radiusKm: 24622, color: "#5b7cfa" },
};

export const PLANET_IDS: readonly PlanetId[] = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

/** Laplace sphere-of-influence radius [km]: a * (m / M_sun)^(2/5). */
export function sphereOfInfluenceKm(id: PlanetId, semiMajorAxisKm: number): number {
  return semiMajorAxisKm * Math.pow(BODIES[id].gm / BODIES.sun.gm, 0.4);
}
