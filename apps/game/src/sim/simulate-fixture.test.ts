/**
 * fixtures/conformance/simulate.json flies the campaign's and the sandbox's shots with
 * templates and settings copied into its generator
 * (packages/physics/test/conformance-simulate.test.ts), because a package cannot import
 * the game. This holds every level flight to the request the game itself builds (D6): the
 * same launch, settings, attractors, target and time limit, and the same step count from
 * simulateShot. The aims come from the fixture, so a changed aim fails here only where
 * levels.ts exports it: the Grand Tour's hint and par shot are compared to the bit. The
 * known solutions live in levels.test.ts, which exports nothing, and the direct levels'
 * par shots are searched afresh by the generator.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createEphemeris, etFromIso, type PlanetId, type Vec3 } from "@starshot/ephemeris";
import { CAMPAIGN, GRAND_TOUR_HINT, GRAND_TOUR_PAR_SHOT, sandboxLevel, shotRequestFor } from "../levels.js";
import { DAY, simulateShot } from "./shot.js";

interface FixtureFlight {
  readonly input: {
    readonly name: string;
    readonly level: string | null;
    readonly launchIso: string;
    readonly launchEt: string;
    readonly vInf: readonly string[];
    readonly duration: string;
    readonly attractors: readonly PlanetId[] | null;
    readonly stopAtSoiOf: PlanetId | null;
    readonly departFrom: string | null;
    readonly sim: { rtol: string; atolKm: string; maxStep: string; maxSteps: number } | null;
  };
  readonly output: { readonly steps: number };
}

const FIXTURE = new URL("../../../../fixtures/conformance/simulate.json", import.meta.url);
const flights = (JSON.parse(readFileSync(FIXTURE, "utf8")) as { flights: FixtureFlight[] }).flights;
const view = new DataView(new ArrayBuffer(8));
const fromBits = (hex: string): number => {
  view.setBigUint64(0, BigInt(`0x${hex}`));
  return view.getFloat64(0);
};
const eph = createEphemeris({ flatten: true });

describe("the simulate conformance fixture flies the game's own requests", () => {
  const levelFlights = flights.filter((f) => f.input.level !== null);

  it("covers every campaign level and the sandbox on both settings", () => {
    const levels = new Set(levelFlights.map((f) => f.input.level));
    expect([...levels].sort()).toEqual([...CAMPAIGN.map((l) => l.id), "sandbox"].sort());
    // SIM_SETTINGS and OUTER_SIM_SETTINGS differ in their position tolerance.
    const tolerances = new Set(levelFlights.map((f) => f.input.sim?.atolKm));
    expect(tolerances.size).toBe(2);
  });

  it("flies the Grand Tour's exported hint and par shot to the bit", () => {
    const aims = [["grand-tour hint", GRAND_TOUR_HINT], ["grand-tour par", GRAND_TOUR_PAR_SHOT]] as const;
    for (const [name, aim] of aims) {
      const { input } = flights.find((f) => f.input.name === name)!;
      expect(input.launchIso, name).toBe(aim.launchIso);
      // toBe is Object.is, so a sign of zero or a last bit counts.
      input.vInf.forEach((hex, i) => expect(fromBits(hex), name).toBe(aim.vInf[i]));
    }
  });

  for (const { input, output } of levelFlights) {
    it(`${input.name}: same request and step count`, () => {
      const target = input.stopAtSoiOf!;
      const level =
        input.level === "sandbox"
          ? sandboxLevel(target, new Date(`${input.launchIso}T00:00:00Z`))
          : CAMPAIGN.find((l) => l.id === input.level)!;
      const launchEt = etFromIso(input.launchIso);
      expect(fromBits(input.launchEt)).toBe(launchEt);
      const shot = shotRequestFor(level, launchEt, input.vInf.map(fromBits) as unknown as Vec3);
      expect(target).toBe(shot.target);
      // simulateShot adds the target to the attractors when a level leaves it out.
      const attractors = shot.attractors.includes(target) ? shot.attractors : [...shot.attractors, target];
      expect(input.attractors).toEqual(attractors);
      expect(fromBits(input.duration)).toBe(shot.maxFlightDays * DAY);
      expect(input.departFrom).toBe("earth");
      const sim = input.sim!;
      const settings = { rtol: fromBits(sim.rtol), atolKm: fromBits(sim.atolKm), maxStep: fromBits(sim.maxStep), maxSteps: sim.maxSteps };
      expect(settings).toEqual(shot.sim);
      expect(simulateShot(eph, shot).steps).toBe(output.steps);
    });
  }
});
