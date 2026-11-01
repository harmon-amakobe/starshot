/**
 * Every campaign level is solvable with the game's exact simulator settings
 * (the same simulateShot the worker runs for the preview and the launch), its
 * par is real and reachable, the hints are deterministic and verified, and the
 * Grand Tour really needs Jupiter.
 */
import { describe, expect, it } from "vitest";
import { createEphemeris, etFromIso, norm, type Vec3 } from "@starshot/ephemeris";
import { bestDirectTransfer, deltaVFromLeo } from "@starshot/physics";
import {
  CAMPAIGN,
  GRAND_TOUR_PAR_SHOT,
  allLevels,
  captureZoneScaleOf,
  hintQueryFor,
  parToleranceOf,
  sandboxLevel,
  shotRequestFor,
  type Level,
  type LevelId,
} from "./levels.js";
import { scoreShot } from "./scoring.js";
import { HINT_MAX_SIMULATIONS, findHint } from "./sim/hint.js";
import {
  DAY,
  OUTER_SIM_SETTINGS,
  SIM_SETTINGS,
  analyzeShot,
  cachedEphemeris,
  daysBetweenIso,
  launchEtForDay,
  simulateShot,
  vInfFromAim,
  type ShotRequest,
} from "./sim/shot.js";

const eph = createEphemeris({ flatten: true });

/** One known solution per campaign level: launch date + departure excess velocity [km/s]. */
const KNOWN_SOLUTIONS: Readonly<Record<Exclude<LevelId, "sandbox">, { launchIso: string; vInf: Vec3 }>> = {
  // 127.50 deg, 2.982 km/s: inside even Mars's real sphere of influence (periapsis 0.65 SOI).
  "first-light": { launchIso: "2026-11-02", vInf: [-1.815327, 2.36578, 0] },
  "morning-star": { launchIso: "2028-03-05", vInf: [0.799577, 2.431928, 0] }, // 71.8 deg, 2.56 km/s
  "big-game": { launchIso: "2028-12-24", vInf: [-8.698397, -0.167018, 0] }, // 181.1 deg, 8.70 km/s
  "grand-tour": { launchIso: "1977-08-20", vInf: [2.325702, 9.314028, 0] }, // 75.98 deg, 9.60 km/s
};

/**
 * Without Jupiter, a full 10.5 km/s pull comes closest to Saturn on the window's
 * last day (also the day of the cheapest direct transfer), aimed 95-110 degrees:
 * 7.5 Saturn SOI at best, found by a 1-degree scan of every day refined to 0.1.
 */
const NO_JUPITER_DAY = "1977-09-09";
const NO_JUPITER_BAND: readonly [number, number] = [95, 110];

const shotFor = (level: Level, launchIso: string, vInf: Vec3): ShotRequest =>
  shotRequestFor(level, launchEtForDay(level.window.startIso, daysBetweenIso(level.window.startIso, launchIso)), vInf);

const fly = (shot: ShotRequest) => analyzeShot(eph, shot, simulateShot(eph, shot));

const byId = (id: LevelId) => CAMPAIGN.find((l) => l.id === id)!;

describe("campaign levels are solvable with the game's simulator", () => {
  for (const level of CAMPAIGN) {
    it(`${level.number}. ${level.title}: the known solution reaches ${level.target}`, () => {
      const sol = KNOWN_SOLUTIONS[level.id as Exclude<LevelId, "sandbox">];
      const day = daysBetweenIso(level.window.startIso, sol.launchIso);
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(level.window.days);
      expect(norm(sol.vInf)).toBeLessThanOrEqual(level.vInfMaxKmS);

      const a = fly(shotFor(level, sol.launchIso, sol.vInf));
      expect(a.hit).toBe(true);
      expect(a.flightDays).toBeLessThanOrEqual(level.maxFlightDays);
      if (level.requiredFlyby) expect(a.requiredFlybyDone).toBe(true);
    });
  }

  it("default launch dates sit inside their windows", () => {
    for (const level of allLevels(new Date("2026-10-31T12:00:00Z"))) {
      const d = daysBetweenIso(level.window.startIso, level.defaultLaunchIso);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(level.window.days);
      expect(level.attractors).toContain(level.target);
      expect(level.attractors).toContain("earth");
    }
  });

  it("direct levels: the par is the window's cheapest Lambert transfer (within 1%) and three stars are reachable", () => {
    for (const level of CAMPAIGN) {
      if (level.requiredFlyby || !level.par) continue;
      const launches = Array.from({ length: level.window.days + 1 }, (_, k) => launchEtForDay(level.window.startIso, k));
      const tofs = Array.from({ length: Math.floor((level.maxFlightDays - 40) / 4) + 1 }, (_, k) => (40 + 4 * k) * DAY);
      const best = bestDirectTransfer(eph, "earth", level.target, launches, tofs)!;
      expect(Math.abs(deltaVFromLeo(best.vInfKmS) / level.par.deltaVKmS - 1)).toBeLessThan(0.01);
      const sol = KNOWN_SOLUTIONS[level.id as Exclude<LevelId, "sandbox">];
      expect(deltaVFromLeo(norm(sol.vInf))).toBeLessThanOrEqual(level.par.deltaVKmS * parToleranceOf(level));
    }
  });
});

describe("First Light's training capture zone", () => {
  const level = byId("first-light");
  // 129.60 deg, 2.982 km/s on 2026-11-02: passes Mars at 1.11 spheres of influence.
  const nearMiss = shotFor(level, "2026-11-02", [-1.900798, 2.29767, 0]);

  it("is three times the real sphere of influence, on the training level only", () => {
    expect(captureZoneScaleOf(level)).toBe(3);
    for (const other of CAMPAIGN) if (other.id !== level.id) expect(captureZoneScaleOf(other)).toBe(1);
    expect(captureZoneScaleOf(sandboxLevel("mars"))).toBe(1);
  });

  it("counts a pass inside 3 SOI as a hit, and the flight ends where it enters the zone", () => {
    const res = simulateShot(eph, nearMiss);
    const a = analyzeShot(eph, nearMiss, res);
    expect(a.hit).toBe(true);
    expect(a.captureZoneScale).toBe(3);
    expect(a.captureZoneKm).toBeCloseTo(3 * a.targetSoiKm, 6);
    const end = res.samples[res.samples.length - 1]!;
    const mars = eph.state("mars", end.t).r;
    expect(Math.hypot(end.r[0] - mars[0], end.r[1] - mars[1]) / a.captureZoneKm).toBeCloseTo(1, 4);
    expect(scoreShot({ parDeltaVKmS: level.par!.deltaVKmS }, { ...a, hintUsed: false }).hit).toBe(true);
  });

  it("a zone smaller than the real sphere of influence is refused, not mis-scored", () => {
    for (const captureZoneScale of [0.5, 0, Number.NaN]) {
      expect(() => simulateShot(eph, { ...nearMiss, captureZoneScale })).toThrow(/captureZoneScale must be at least 1/);
    }
  });

  it("the same shot misses the real-size zone", () => {
    const a = fly({ ...nearMiss, captureZoneScale: 1 });
    expect(a.hit).toBe(false);
    expect(a.closestKm / a.targetSoiKm).toBeGreaterThan(1);
    expect(a.closestKm / a.targetSoiKm).toBeLessThan(3);
  });
});

describe("hints", () => {
  for (const level of CAMPAIGN) {
    it(`${level.title}: the hint is on the controls' grid, deterministic, and its exact aim reaches the target`, () => {
      const hint = findHint(eph, hintQueryFor(level));
      expect(hint).not.toBeNull();
      expect(hint!.hits).toBe(true);
      expect(hint!.simulations).toBeLessThanOrEqual(HINT_MAX_SIMULATIONS + 1);
      // Exactly what the label shows and "Use hint" applies: 0.01 degree, 0.001 km/s, [0, 360).
      const { angleDeg, speedKmS } = hint!.aim;
      expect(Math.round(angleDeg * 100) / 100).toBe(angleDeg);
      expect(Math.round(speedKmS * 1000) / 1000).toBe(speedKmS);
      expect(angleDeg).toBeGreaterThanOrEqual(0);
      expect(angleDeg).toBeLessThan(360);
      expect(speedKmS).toBeLessThanOrEqual(level.vInfMaxKmS);
      const a = fly(shotRequestFor(level, hint!.launchEt, vInfFromAim(hint!.aim)));
      expect(a.hit).toBe(true);
      if (level.requiredFlyby) expect(a.requiredFlybyDone).toBe(true);
      // Same level, same hint, with or without the cache: no wall clock is involved.
      expect(findHint(cachedEphemeris(eph), hintQueryFor(level))).toEqual(hint);
    });
  }

  it("the budget is a simulation count: with none, the rounded Lambert aim itself comes back, checked", () => {
    const level = byId("morning-star");
    const hint = findHint(eph, { ...hintQueryFor(level), maxSimulations: 0 })!;
    expect(hint.simulations).toBe(1);
    expect(hint.hits).toBe(fly(shotRequestFor(level, hint.launchEt, vInfFromAim(hint.aim))).hit);
  });
});

describe("Grand Tour", () => {
  const tour = byId("grand-tour");
  const soiSaturn = eph.soiKm("saturn", launchEtForDay(tour.window.startIso, 0));
  const rules = { parDeltaVKmS: tour.par!.deltaVKmS, parTolerance: parToleranceOf(tour), requiredFlyby: tour.requiredFlyby };

  it("the par shot is a real Jupiter-assisted hit at par, worth three stars", () => {
    const a = fly(shotFor(tour, GRAND_TOUR_PAR_SHOT.launchIso, GRAND_TOUR_PAR_SHOT.vInf));
    expect(a.hit).toBe(true);
    expect(a.requiredFlybyDone).toBe(true);
    expect(a.flightDays).toBeLessThanOrEqual(tour.maxFlightDays);
    expect(Math.round(a.deltaVKmS * 100) / 100).toBe(tour.par!.deltaVKmS);
    expect(scoreShot(rules, { ...a, hintUsed: false }).stars).toBe(3);
  });

  it("the efficiency star is earned, not automatic under the speed cap", () => {
    expect(parToleranceOf(tour)).toBe(1.05);
    const fullPull = { hit: true, deltaVKmS: deltaVFromLeo(tour.vInfMaxKmS), bullseye: false, requiredFlybyDone: true, hintUsed: false };
    expect(scoreShot(rules, fullPull).efficient).toBe(false);
    // The known 9.60 km/s solution is just inside; the curated 9.80 km/s hint is not.
    expect(scoreShot(rules, { ...fullPull, deltaVKmS: deltaVFromLeo(9.6) }).efficient).toBe(true);
    expect(scoreShot(rules, { ...fullPull, deltaVKmS: deltaVFromLeo(9.8) }).efficient).toBe(false);
  });

  it("no direct (Lambert) transfer to Saturn fits under the speed cap in the window", () => {
    const launches = Array.from({ length: tour.window.days + 1 }, (_, k) => launchEtForDay(tour.window.startIso, k));
    const tofs = Array.from({ length: Math.floor((tour.maxFlightDays - 40) / 5) + 1 }, (_, k) => (40 + 5 * k) * DAY);
    const best = bestDirectTransfer(eph, "earth", "saturn", launches, tofs);
    // A finite minimum (15.12 km/s, 1977-09-09, 1,498 days), far above the 10.5 km/s cap.
    expect(best).not.toBeNull();
    expect(best!.vInfKmS).toBeGreaterThan(15);
    expect(best!.vInfKmS).toBeLessThan(15.3);
    expect(best!.vInfKmS).toBeGreaterThan(tour.vInfMaxKmS);
  });

  it("without Jupiter, a full pull on the most promising day stays more than 5 Saturn SOI away", () => {
    const noJupiter = tour.attractors.filter((p) => p !== "jupiter");
    const day = daysBetweenIso(tour.window.startIso, NO_JUPITER_DAY);
    expect(day).toBe(tour.window.days);
    let nearest = Infinity;
    for (let k = 0; k <= (NO_JUPITER_BAND[1] - NO_JUPITER_BAND[0]) * 10; k++) {
      const aim = { angleDeg: NO_JUPITER_BAND[0] + k / 10, speedKmS: tour.vInfMaxKmS };
      const shot: ShotRequest = {
        ...shotRequestFor(tour, launchEtForDay(tour.window.startIso, day), vInfFromAim(aim)),
        attractors: noJupiter,
      };
      const a = fly(shot);
      expect(a.hit).toBe(false);
      nearest = Math.min(nearest, a.closestKm);
    }
    expect(nearest).toBeGreaterThan(5 * soiSaturn);
  });

  it("without Jupiter, no full pull in any direction mid-window comes within 5 Saturn SOI either", () => {
    const noJupiter = tour.attractors.filter((p) => p !== "jupiter");
    let nearest = Infinity;
    for (const day of [15]) {
      for (let angleDeg = 0; angleDeg < 360; angleDeg += 2) {
        const aim = { angleDeg, speedKmS: tour.vInfMaxKmS };
        const shot: ShotRequest = {
          ...shotRequestFor(tour, launchEtForDay(tour.window.startIso, day), vInfFromAim(aim)),
          attractors: noJupiter,
        };
        nearest = Math.min(nearest, fly(shot).closestKm);
      }
    }
    expect(nearest).toBeGreaterThan(5 * soiSaturn);
  });
});

describe("sandbox", () => {
  it("starts today, clamps to the ephemeris range and targets any planet", () => {
    const s = sandboxLevel("neptune", new Date("2026-10-31T08:00:00Z"));
    expect(s.window.startIso).toBe("2026-10-31");
    expect(s.par).toBeUndefined();
    expect(s.attractors).toContain("neptune");
    expect(sandboxLevel("mars", new Date("2077-01-01T00:00:00Z")).window.startIso).toBe("2048-01-01");
  });

  it("uses the faster outer settings beyond Mars only, and the campaign settings everywhere else", () => {
    for (const level of CAMPAIGN) expect(level.sim).toBe(SIM_SETTINGS);
    for (const t of ["mercury", "venus", "mars"] as const) {
      expect(sandboxLevel(t).sim).toBe(SIM_SETTINGS);
      expect(sandboxLevel(t).attractors).toContain("venus");
    }
    for (const t of ["jupiter", "saturn", "uranus", "neptune"] as const) {
      const s = sandboxLevel(t);
      expect(s.sim).toBe(OUTER_SIM_SETTINGS);
      expect(s.attractors).toEqual(["earth", "jupiter", "saturn", "uranus", "neptune"]);
    }
  });

  it("the game's cached ephemeris changes no result, bit for bit", () => {
    const s = sandboxLevel("saturn", new Date("2026-11-01T00:00:00Z"));
    const shot = shotRequestFor(s, launchEtForDay(s.window.startIso, 200), vInfFromAim({ angleDeg: 75, speedKmS: 12 }));
    expect(simulateShot(cachedEphemeris(eph), shot)).toEqual(simulateShot(eph, shot));
  });

  it("flags flights that run past the JPL table's 2050 limit", () => {
    const late = sandboxLevel("neptune", new Date("2047-06-01T00:00:00Z"));
    const a = fly(shotRequestFor(late, launchEtForDay(late.window.startIso, 0), vInfFromAim({ angleDeg: 200, speedKmS: 3 })));
    expect(a.endEt).toBeGreaterThan(etFromIso("2050-01-01"));
    expect(a.beyondEphemerisRange).toBe(true);
    const sol = KNOWN_SOLUTIONS["first-light"];
    expect(fly(shotFor(byId("first-light"), sol.launchIso, sol.vInf)).beyondEphemerisRange).toBe(false);
  });
});
