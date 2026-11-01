/**
 * Every campaign level is solvable with the game's exact simulator settings
 * (the same simulateShot the worker runs for the preview and the launch), and
 * the Grand Tour really needs Jupiter.
 */
import { describe, expect, it } from "vitest";
import { createEphemeris, norm, type Vec3 } from "@starshot/ephemeris";
import { bestDirectTransfer, deltaVFromLeo } from "@starshot/physics";
import { CAMPAIGN, allLevels, sandboxLevel, type Level, type LevelId } from "./levels.js";
import { findHint } from "./sim/hint.js";
import {
  DAY,
  analyzeShot,
  daysBetweenIso,
  launchEtForDay,
  simulateShot,
  vInfFromAim,
  type ShotRequest,
} from "./sim/shot.js";

const eph = createEphemeris({ flatten: true });

/** One known solution per campaign level: launch date + departure excess velocity [km/s]. */
const KNOWN_SOLUTIONS: Readonly<Record<Exclude<LevelId, "sandbox">, { launchIso: string; vInf: Vec3 }>> = {
  "first-light": { launchIso: "2026-11-04", vInf: [-1.731115, 2.595697, 0] }, // 123.7 deg, 3.12 km/s
  "morning-star": { launchIso: "2028-03-05", vInf: [0.799577, 2.431928, 0] }, // 71.8 deg, 2.56 km/s
  "big-game": { launchIso: "2028-12-24", vInf: [-8.698397, -0.167018, 0] }, // 181.1 deg, 8.70 km/s
  "grand-tour": { launchIso: "1977-08-20", vInf: [2.325702, 9.314028, 0] }, // 75.98 deg, 9.60 km/s
};

const shotFor = (level: Level, launchIso: string, vInf: Vec3): ShotRequest => {
  const day = daysBetweenIso(level.window.startIso, launchIso);
  return {
    target: level.target,
    attractors: level.attractors,
    launchEt: launchEtForDay(level.window.startIso, day),
    vInf,
    maxFlightDays: level.maxFlightDays,
    requiredFlyby: level.requiredFlyby,
  };
};

describe("campaign levels are solvable with the game's simulator", () => {
  for (const level of CAMPAIGN) {
    it(`${level.number}. ${level.title}: the known solution reaches ${level.target}`, () => {
      const sol = KNOWN_SOLUTIONS[level.id as Exclude<LevelId, "sandbox">];
      const day = daysBetweenIso(level.window.startIso, sol.launchIso);
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(level.window.days);
      expect(norm(sol.vInf)).toBeLessThanOrEqual(level.vInfMaxKmS);

      const shot = shotFor(level, sol.launchIso, sol.vInf);
      const a = analyzeShot(eph, shot, simulateShot(eph, shot));
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

  it("pars match the cheapest direct transfer in each window (within 2%)", () => {
    for (const level of CAMPAIGN) {
      if (level.requiredFlyby || !level.par) continue;
      const launches = Array.from({ length: level.window.days + 1 }, (_, k) => launchEtForDay(level.window.startIso, k));
      const tofs = Array.from({ length: Math.floor((level.maxFlightDays - 40) / 4) }, (_, k) => (40 + 4 * k) * DAY);
      const best = bestDirectTransfer(eph, "earth", level.target, launches, tofs)!;
      expect(Math.abs(deltaVFromLeo(best.vInfKmS) / level.par.deltaVKmS - 1)).toBeLessThan(0.02);
    }
  });
});

describe("hints", () => {
  for (const level of CAMPAIGN) {
    it(`${level.title}: the hint reaches the target`, () => {
      const hint = findHint(eph, {
        target: level.target,
        attractors: level.attractors,
        windowStartIso: level.window.startIso,
        windowDays: level.window.days,
        maxFlightDays: level.maxFlightDays,
        vInfMaxKmS: level.vInfMaxKmS,
        requiredFlyby: level.requiredFlyby,
        curated: level.hint,
      });
      expect(hint).not.toBeNull();
      expect(hint!.hits).toBe(true);
      expect(hint!.aim.speedKmS).toBeLessThanOrEqual(level.vInfMaxKmS);
      const shot: ShotRequest = { ...shotFor(level, level.window.startIso, vInfFromAim(hint!.aim)), launchEt: hint!.launchEt };
      const a = analyzeShot(eph, shot, simulateShot(eph, shot));
      expect(a.hit).toBe(true);
      if (level.requiredFlyby) expect(a.requiredFlybyDone).toBe(true);
    });
  }
});

describe("Grand Tour needs Jupiter", () => {
  const tour = CAMPAIGN.find((l) => l.id === "grand-tour")!;

  it("no direct (Lambert) transfer to Saturn fits under the speed cap in the window", () => {
    const launches = Array.from({ length: tour.window.days + 1 }, (_, k) => launchEtForDay(tour.window.startIso, k));
    const tofs = Array.from({ length: Math.floor((tour.maxFlightDays - 200) / 5) + 1 }, (_, k) => (200 + 5 * k) * DAY);
    const best = bestDirectTransfer(eph, "earth", "saturn", launches, tofs)!;
    expect(best.vInfKmS).toBeGreaterThan(tour.vInfMaxKmS + 1);
  });

  it("without Jupiter, no shot on a coarse grid reaches Saturn's capture zone", () => {
    const noJupiter = tour.attractors.filter((p) => p !== "jupiter");
    let nearest = Infinity;
    for (const day of [0, 15, 30]) {
      for (const speed of [tour.vInfMaxKmS, tour.vInfMaxKmS - 1]) {
        for (let angle = 0; angle < 360; angle += 5) {
          const shot: ShotRequest = {
            ...shotFor(tour, tour.window.startIso, vInfFromAim({ angleDeg: angle, speedKmS: speed })),
            attractors: noJupiter,
            launchEt: launchEtForDay(tour.window.startIso, day),
          };
          const a = analyzeShot(eph, shot, simulateShot(eph, shot));
          expect(a.hit).toBe(false);
          nearest = Math.min(nearest, a.closestKm);
        }
      }
    }
    // Not even close: the nearest miss is several capture-zone radii out.
    expect(nearest).toBeGreaterThan(2 * eph.soiKm("saturn", launchEtForDay(tour.window.startIso, 0)));
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
});
