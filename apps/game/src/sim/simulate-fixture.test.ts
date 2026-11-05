/**
 * fixtures/conformance/simulate.json flies the campaign's and the sandbox's shots with
 * templates and settings copied into its generator
 * (packages/physics/test/conformance-simulate.test.ts), because a package cannot import
 * the game. This holds every level flight to the request the game itself builds (D6): the
 * same launch, settings, attractors, target and time limit, and the same step count from
 * simulateShot. A level change that the fixture missed fails here.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createEphemeris, etFromIso, type PlanetId, type Vec3 } from "@starshot/ephemeris";
import { CAMPAIGN, sandboxLevel, shotRequestFor } from "../levels.js";
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
