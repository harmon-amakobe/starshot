import { describe, expect, it } from "vitest";
import {
  AU_KM,
  BODIES,
  add,
  createEphemeris,
  dot,
  etFromIso,
  norm,
  scale,
  sub,
  type Vec3,
} from "@starshot/ephemeris";
import { bestDirectTransfer, deltaVFromLeo, departureState, lambert, sampleAt, simulate } from "../src/index.js";

const DAY = 86400;
const eph3d = createEphemeris();
const eph2d = createEphemeris({ flatten: true });
const muSun = BODIES.sun.gm;
const energy = (r: Vec3, v: Vec3) => dot(v, v) / 2 - muSun / norm(r);

describe("two-body accuracy (Sun only)", () => {
  it("closes a circular 1 au orbit after one period to within 10 km", () => {
    const r0: Vec3 = [AU_KM, 0, 0];
    const v0: Vec3 = [0, Math.sqrt(muSun / AU_KM), 0];
    const period = 2 * Math.PI * Math.sqrt(AU_KM ** 3 / muSun);
    const res = simulate({ ephemeris: eph3d, attractors: [], t0: 0, r0, v0, duration: period });
    const end = res.samples[res.samples.length - 1]!;
    expect(res.termination).toBe("duration");
    expect(norm(sub(end.r, r0))).toBeLessThan(10);
    expect(Math.abs(energy(end.r, end.v) / energy(r0, v0) - 1)).toBeLessThan(1e-7);
  });

  it("interpolates between samples smoothly", () => {
    const r0: Vec3 = [AU_KM, 0, 0];
    const v0: Vec3 = [0, Math.sqrt(muSun / AU_KM), 0];
    const res = simulate({ ephemeris: eph3d, attractors: [], t0: 0, r0, v0, duration: 200 * DAY });
    const mid = sampleAt(res, 100.3 * DAY);
    expect(Math.abs(norm(mid.r) / AU_KM - 1)).toBeLessThan(1e-6);
  });
});

describe("lambert", () => {
  it("round-trips: integrating the Lambert velocity hits the target point", () => {
    const t0 = etFromIso("2026-11-20");
    const tof = 210 * DAY;
    const r1 = eph3d.state("earth", t0).r;
    const r2 = eph3d.state("mars", t0 + tof).r;
    const sol = lambert(r1, r2, tof)!;
    expect(sol).not.toBeNull();
    const res = simulate({ ephemeris: eph3d, attractors: [], t0, r0: r1, v0: sol.v1, duration: tof });
    const end = res.samples[res.samples.length - 1]!;
    expect(norm(sub(end.r, r2))).toBeLessThan(50);
    expect(norm(sub(end.v, sol.v2))).toBeLessThan(1e-4);
  });

  it("finds the late-2026 Earth to Mars window at a realistic C3", () => {
    const start = etFromIso("2026-10-01");
    const launches = Array.from({ length: 30 }, (_, k) => start + k * 4 * DAY);
    const tofs = Array.from({ length: 25 }, (_, k) => (150 + k * 10) * DAY);
    const best = bestDirectTransfer(eph3d, "earth", "mars", launches, tofs)!;
    // Real 2026 window: C3 ~ 9-12 km^2/s^2, i.e. vInf ~ 3.0-3.5 km/s.
    expect(best.vInfKmS).toBeGreaterThan(2.6);
    expect(best.vInfKmS).toBeLessThan(4.0);
  });
});

describe("launch model", () => {
  it("needs about 3.2 km/s from LEO just to escape", () => {
    expect(deltaVFromLeo(0)).toBeCloseTo(3.23, 1);
    expect(deltaVFromLeo(3.3)).toBeGreaterThan(3.5);
  });
  it("starts at Earth moving at Earth's velocity plus vInf (patched conic)", () => {
    const t0 = etFromIso("2026-11-20");
    const s = departureState(eph3d, t0, [0, 3, 0]);
    const earth = eph3d.state("earth", t0);
    expect(norm(sub(s.r, earth.r))).toBe(0);
    expect(norm(sub(s.v, earth.v))).toBeCloseTo(3, 12);
  });
});

describe("full game physics (flattened, all planets)", () => {
  it("reaches Mars' sphere of influence on the 2026 window with the Lambert aim", () => {
    const start = etFromIso("2026-10-15");
    const launches = Array.from({ length: 20 }, (_, k) => start + k * 3 * DAY);
    const tofs = Array.from({ length: 30 }, (_, k) => (150 + k * 8) * DAY);
    const best = bestDirectTransfer(eph2d, "earth", "mars", launches, tofs)!;
    const s0 = departureState(eph2d, best.launchEt, best.vInf);
    const res = simulate({
      ephemeris: eph2d,
      t0: best.launchEt,
      r0: s0.r,
      v0: s0.v,
      duration: best.tof * 1.3,
      stopAtSoiOf: "mars",
      departFrom: "earth",
    });
    // Planetary perturbations make the two-body Lambert aim close but not exact.
    expect(res.termination).toBe("soi-reached");
    expect(res.terminatedBy).toBe("mars");
  });

  it("detects a Jupiter flyby and the energy it gives (gravity assist)", () => {
    const t0 = etFromIso("1977-08-20");
    const tof = 700 * DAY;
    const jup = eph2d.state("jupiter", t0 + tof);
    // Aim 25 Jupiter radii outside Jupiter's orbit: a near miss, not a hit.
    const aim = add(jup.r, scale(jup.r, (25 * BODIES.jupiter.radiusKm) / norm(jup.r)));
    const earth = eph2d.state("earth", t0);
    const sol = lambert(earth.r, aim, tof)!;
    const res = simulate({
      ephemeris: eph2d,
      attractors: ["jupiter"],
      t0,
      r0: earth.r,
      v0: sol.v1,
      duration: tof + 200 * DAY,
    });
    const flyby = res.encounters.find((e) => e.body === "jupiter" && e.insideSoi);
    expect(flyby).toBeDefined();
    expect(flyby!.impact).toBe(false);
    const before = sampleAt(res, flyby!.t - 60 * DAY);
    const after = sampleAt(res, flyby!.t + 60 * DAY);
    const eBefore = energy(before.r, before.v);
    const eAfter = energy(after.r, after.v);
    // A close flyby swaps a large share of orbital energy with the planet.
    expect(Math.abs(eAfter - eBefore) / Math.abs(eBefore)).toBeGreaterThan(0.05);
  });

  it("stops on impact when aimed straight at a planet", () => {
    const t0 = etFromIso("2026-11-20");
    const tof = 220 * DAY;
    const earth = eph2d.state("earth", t0);
    const mars = eph2d.state("mars", t0 + tof);
    const sol = lambert(earth.r, mars.r, tof)!;
    const res = simulate({ ephemeris: eph2d, attractors: ["mars"], t0, r0: earth.r, v0: sol.v1, duration: tof * 1.2 });
    expect(res.termination).toBe("impact");
    expect(res.terminatedBy).toBe("mars");
  });

  it("is fast enough for a live aiming preview", () => {
    const t0 = etFromIso("2026-11-20");
    const s0 = departureState(eph2d, t0, [-1.5, 3.5, 0]);
    const t = performance.now();
    const res = simulate({
      ephemeris: eph2d, t0, r0: s0.r, v0: s0.v, duration: 3 * 365 * DAY, rtol: 1e-8, atolKm: 50, departFrom: "earth",
    });
    const ms = performance.now() - t;
    expect(res.steps).toBeGreaterThan(10);
    expect(ms).toBeLessThan(400);
  });
});
