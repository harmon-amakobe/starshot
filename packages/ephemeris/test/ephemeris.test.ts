import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/horizons.json" with { type: "json" };
import {
  AU_KM,
  angleBetween,
  createEphemeris,
  dateFromEt,
  etFromDate,
  etFromIso,
  etFromJdTdb,
  norm,
  orbitPath,
  planetState,
  solveKepler,
  sub,
  type PlanetId,
  type Vec3,
} from "../src/index.js";

type Fixture = { jdTdb: number; r: Vec3; v: Vec3 };
const states = fixtures.states as unknown as Record<PlanetId, Fixture[]>;

// Angular (heliocentric) error budgets in arcminutes. JPL quotes up to ~10'
// for Jupiter and Saturn over 1800-2050 with this table; inner planets ~1'.
const ARCMIN_BUDGET: Record<PlanetId, number> = {
  mercury: 1.5,
  venus: 1.5,
  earth: 1.5,
  mars: 2,
  jupiter: 12,
  saturn: 15,
  uranus: 3,
  neptune: 2,
};

describe("planet positions vs NASA/JPL Horizons", () => {
  for (const id of Object.keys(ARCMIN_BUDGET) as PlanetId[]) {
    it(`${id} is within ${ARCMIN_BUDGET[id]}' of JPL at every fixture epoch`, () => {
      for (const ref of states[id]) {
        const s = planetState(id, etFromJdTdb(ref.jdTdb));
        const arcmin = (angleBetween(s.r, ref.r) * 180 * 60) / Math.PI;
        expect(arcmin, `${id} @ JD ${ref.jdTdb}`).toBeLessThan(ARCMIN_BUDGET[id]);
        // distance from the Sun within 0.2% and speed within 1%
        expect(Math.abs(norm(s.r) / norm(ref.r) - 1)).toBeLessThan(2e-3);
        expect(norm(sub(s.v, ref.v)) / norm(ref.v)).toBeLessThan(1e-2);
      }
    });
  }
});

describe("time scales", () => {
  it("J2000.0 is 2000-01-01T11:58:55.816Z", () => {
    expect(etFromIso("2000-01-01T11:58:55.816Z")).toBeCloseTo(0, 3);
  });
  it("round-trips Date <-> ET", () => {
    const d = new Date("2026-10-31T20:52:00Z");
    expect(dateFromEt(etFromDate(d)).getTime()).toBe(d.getTime());
  });
  it("applies 37 leap seconds in 2026 (TT-UTC = 69.184 s)", () => {
    const et = etFromIso("2026-10-31T00:00:00Z");
    expect(et - etFromJdTdb(2461344.5)).toBeCloseTo(69.184, 3);
  });
});

describe("kepler solver", () => {
  it("satisfies M = E - e sin E across eccentricities", () => {
    for (const e of [0, 0.0167, 0.2056, 0.6, 0.9, 0.99]) {
      for (let M = -3.1; M <= 3.1; M += 0.37) {
        const E = solveKepler(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 10);
      }
    }
  });
});

describe("flattened ephemeris", () => {
  it("projects onto the ecliptic and keeps the Sun at the origin", () => {
    const eph = createEphemeris({ flatten: true });
    const s = eph.state("mars", 0);
    expect(s.r[2]).toBe(0);
    expect(s.v[2]).toBe(0);
    expect(eph.state("sun", 0).r).toEqual([0, 0, 0]);
  });
  it("gives Mars a sphere of influence of about 577,000 km", () => {
    const soi = createEphemeris().soiKm("mars", 0);
    expect(soi).toBeGreaterThan(5.6e5);
    expect(soi).toBeLessThan(5.9e5);
  });
  it("draws Earth's orbit at about 1 au", () => {
    for (const p of orbitPath("earth", 0, 64)) {
      expect(norm(p) / AU_KM).toBeGreaterThan(0.98);
      expect(norm(p) / AU_KM).toBeLessThan(1.02);
    }
  });
});
