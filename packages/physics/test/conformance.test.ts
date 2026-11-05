// Writes or checks fixtures/conformance/physics.json, the oracle the Rust physics crate is
// held to (crates/starshot-physics/tests/conformance_physics.rs and tests/lambert.rs,
// PR11). With STARSHOT_WRITE_CONFORMANCE=1 it writes the file; otherwise the file must
// equal this output exactly. Inputs are stored too, so Rust starts from the same bits.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AU_KM,
  BODIES,
  SECONDS_PER_DAY as DAY,
  add,
  createEphemeris,
  etFromIso,
  type BodyId,
  type Ephemeris,
} from "@starshot/ephemeris";
import { Dopri5, EARTH_GM, LEO_RADIUS_KM, acceleration, bestDirectTransfer, c3, deltaVFromLeo, hermite, lambert } from "../src/index.js";

const OUT = new URL("../../../fixtures/conformance/physics.json", import.meta.url);
const WRITE = process.env.STARSHOT_WRITE_CONFORMANCE === "1";

// f64 bits as 16 hex digits, as fixtures/math/golden.json stores them.
const view = new DataView(new ArrayBuffer(8));
const bits = (x: number): string => {
  view.setFloat64(0, x);
  return view.getBigUint64(0).toString(16).padStart(16, "0");
};

const eph3d = createEphemeris();
const eph2d = createEphemeris({ flatten: true });
const MU_SUN = BODIES.sun.gm;
const T_MARS = etFromIso("2026-11-20");
const T_TOUR = etFromIso("1977-08-20");
const knot = (eph: Ephemeris, id: BodyId, t: number) => ({ t, ...eph.state(id, t) });
const flat = (k: { t: number; r: readonly number[]; v: readonly number[] }) => [k.t, ...k.r, ...k.v];

// Two knot pairs at fractions of their gap, outside it too, where Hermite extrapolates.
const HERMITE = [
  [knot(eph3d, "mars", T_MARS), knot(eph3d, "mars", T_MARS + 3 * DAY)],
  [knot(eph2d, "earth", T_TOUR), knot(eph2d, "earth", T_TOUR + DAY / 2)],
] as const;
const hermiteRows = HERMITE.flatMap(([a, b]) =>
  [-0.5, 0, 0.25, 0.5, 0.61803398875, 1, 1.5].map((s) => {
    const t = a.t + (b.t - a.t) * s;
    const out = hermite(a, b, t);
    return [...flat(a), ...flat(b), t, ...out.r, ...out.v];
  }),
);

const launchRows = [0, 0.5, 1, 2.982, 3, 3.3, 6, 9.8, 12.5].flatMap((vInf) =>
  [LEO_RADIUS_KM, 6371 + 400, 42164].map((radius) => [vInf, radius, deltaVFromLeo(vInf, radius), c3(vInf)]),
);

// Probes near each planet and far from all of them. The planets' positions are stored, so
// Rust replays them and the indirect terms are arithmetic only.
const PLANETS: BodyId[] = ["earth", "mars", "jupiter", "saturn"];
const PROBES: Array<[number, readonly number[]]> = [
  [T_MARS, add(eph3d.state("earth", T_MARS).r, [5e5, -3e5, 1e4])],
  [T_MARS + 210 * DAY, add(eph3d.state("mars", T_MARS + 210 * DAY).r, [2e4, 1e4, -5e3])],
  [T_TOUR + 700 * DAY, add(eph3d.state("jupiter", T_TOUR + 700 * DAY).r, [25 * 69911, 0, 3e4])],
  [T_TOUR + 1500 * DAY, add(eph3d.state("saturn", T_TOUR + 1500 * DAY).r, [-4e6, 2e6, 0])],
  [0, [AU_KM, 0, 0]],
  [0, [0.3 * AU_KM, -0.2 * AU_KM, 0.05 * AU_KM]],
  [T_MARS, [-30 * AU_KM, 12 * AU_KM, -2 * AU_KM]],
  // Beyond 1,000 au the indirect terms outweigh every direct pull, so their order shows.
  ...[0, 1, 2, 3, 4, 5].map((k): [number, readonly number[]] => [
    T_TOUR + 900 * k * DAY,
    [2000 * AU_KM, -1500 * AU_KM, 300 * AU_KM],
  ]),
];
const accelerationRows = PROBES.map(([et, r]) => {
  const v3 = [r[0]!, r[1]!, r[2]!] as const;
  const sunOnly = acceleration(eph3d, [], et, v3);
  const all = acceleration(eph3d, ["sun", ...PLANETS], et, v3);
  return [et, ...r, ...sunOnly, ...PLANETS.flatMap((id) => eph3d.state(id, et).r), ...all];
});

// One step from each state, then a second of the same size after `accept`, so the reused
// last stage is checked too. Tolerances: simulate's default, then the preview's. The Sun
// pulls alone, except in the last two rows: a push along x that grows with t checks each
// stage's time, which the Sun's pull ignores.
const pushed = (push: number) => (t: number, y: Float64Array, dy: Float64Array) => {
  const a = acceleration(eph3d, [], t, [y[0]!, y[1]!, y[2]!]);
  dy.set([y[3]!, y[4]!, y[5]!, a[0] + push * t, a[1], a[2]]);
};
const circular = Math.sqrt(MU_SUN / AU_KM);
const earth = eph3d.state("earth", T_MARS);
const departing = [...earth.r, ...add(earth.v, [0, 3, 0])];
const STEPS: Array<[number, number, number, number, number, readonly number[]]> = [
  [1e-10, 1, 0, DAY / 4, 0, [AU_KM, 0, 0, 0, circular, 0]],
  [1e-10, 1, T_MARS, 5 * DAY, 0, departing],
  [1e-10, 1, T_MARS, 30 * DAY, 0, [...flat(knot(eph3d, "mars", T_MARS)).slice(1)]],
  [1e-8, 50, 0, 2 * DAY, 0, [...flat(knot(eph3d, "mercury", 0)).slice(1)]],
  [1e-8, 50, T_TOUR, 10 * DAY, 0, [AU_KM, 0, 0, 10, 45, 3]],
  [1e-10, 1, 0, DAY, 0, [0.1 * AU_KM, 0, 0, 0, 3 * circular, 1]],
  [1e-10, 1, T_MARS, DAY, 1e-15, departing],
  [1e-8, 50, T_TOUR, 3 * DAY, -2e-15, [AU_KM, 0, 0, 10, 45, 3]],
];
const stepRows = STEPS.map(([rtol, atolKm, t, h, push, y0]) => {
  const solver = new Dopri5(pushed(push), { rtol, atolPos: atolKm, atolVel: atolKm * 1e-6 });
  const err1 = solver.attempt(t, Float64Array.from(y0), h);
  const y1 = [...solver.yNew];
  solver.accept();
  const err2 = solver.attempt(t + h, Float64Array.from(y1), h);
  return [rtol, atolKm, atolKm * 1e-6, t, h, push, ...y0, err1, ...y1, err2, ...solver.yNew];
});

// NaN and Infinity check the clamp: Math.min and Math.max keep a NaN.
const ERRORS = [0, 1e-12, 1e-4, 0.01, 0.3, 0.5, 0.97, 1, 1.0001, 2, 7.5, 100, 3000, 1e4, 1e6, NaN, Infinity];
const nextStepRows = ERRORS.map((err) => [
  3600,
  err,
  Dopri5.nextStep(3600, err),
]);

// Short and long ways, both senses, hyperbolic flights, Earth's own GM, a 180-degree
// transfer with no solution, and a near-parabolic flight: by lambert.ts's own time
// equation, the time whose root is z = 9e-7, where the Stumpff series serves (|z| < 1e-6).
const at = (eph: Ephemeris, id: BodyId, t: number) => eph.state(id, t).r;
const [z0, n1, n2] = [9e-7, AU_KM, 1.2 * AU_KM];
const [c0, s0] = [1 / 2 - z0 / 24 + (z0 * z0) / 720, 1 / 6 - z0 / 120 + (z0 * z0) / 5040];
const y0 = n1 + n2 + (Math.sqrt(n1 * n2) * (z0 * s0 - 1)) / Math.sqrt(c0);
const NEAR_PARABOLIC = ((y0 / c0) ** 1.5 * s0 + Math.sqrt(n1 * n2) * Math.sqrt(y0)) / Math.sqrt(MU_SUN);
const LAMBERT: Array<[boolean, number, number, readonly number[], readonly number[]]> = [
  [true, MU_SUN, 210 * DAY, at(eph3d, "earth", T_MARS), at(eph3d, "mars", T_MARS + 210 * DAY)],
  [false, MU_SUN, 210 * DAY, at(eph3d, "earth", T_MARS), at(eph3d, "mars", T_MARS + 210 * DAY)],
  ...[1000, 1500, 2500].map((days): [boolean, number, number, number[], number[]] =>
    [true, MU_SUN, days * DAY, [...at(eph2d, "earth", T_TOUR)], [...at(eph2d, "saturn", T_TOUR + days * DAY)]]),
  [true, MU_SUN, 700 * DAY, at(eph2d, "earth", T_TOUR), at(eph2d, "jupiter", T_TOUR + 700 * DAY)],
  [true, MU_SUN, 40 * DAY, at(eph3d, "earth", T_MARS), at(eph3d, "mars", T_MARS + 40 * DAY)],
  [true, MU_SUN, 5 * DAY, at(eph3d, "earth", T_MARS), at(eph3d, "mars", T_MARS + 5 * DAY)],
  [true, MU_SUN, 120 * DAY, at(eph3d, "earth", T_MARS), at(eph3d, "venus", T_MARS + 120 * DAY)],
  [true, EARTH_GM, 5 * 3600, [7000, 0, 0], [0, 42164, 100]],
  [true, MU_SUN, 300 * DAY, [AU_KM, 0, 0], [-1.5 * AU_KM, 0, 0]],
  [true, MU_SUN, NEAR_PARABOLIC, [n1, 0, 0], [0, n2, 0]],
];
const lambertRows = LAMBERT.map(([prograde, mu, tof, r1, r2]) => {
  const sol = lambert([r1[0]!, r1[1]!, r1[2]!], [r2[0]!, r2[1]!, r2[2]!], tof, mu, prograde);
  return [prograde, [mu, tof, ...r1, ...r2].map(bits), sol ? [...sol.v1, ...sol.v2].map(bits) : null];
});

// Today's Mars window grid in tests/lambert.rs (physics.test.ts): unflattened, 30 launches
// every 4 days from 2026-10-01, flights of 150 + 10k days for k = 0 to 24.
const start = etFromIso("2026-10-01");
const launches = Array.from({ length: 30 }, (_, k) => start + k * 4 * DAY);
const tofs = Array.from({ length: 25 }, (_, k) => (150 + k * 10) * DAY);
const best = bestDirectTransfer(eph3d, "earth", "mars", launches, tofs)!;
const bestRow = [best.launchEt, best.tof, ...best.vInf, best.vInfKmS, best.arrivalVInfKmS];

function physicsJson(): string {
  const rows = (list: unknown[][]) =>
    list.map((row) => `    ${JSON.stringify(row.map((x) => (typeof x === "number" ? bits(x) : x)))}`).join(",\n");
  const section = (name: string, columns: string[], list: unknown[][], last = false) =>
    [`  "${name}_columns": ${JSON.stringify(columns)},`, `  "${name}": [`, rows(list), last ? "  ]" : "  ],"];
  const xyz = (p: string) => [`${p}x`, `${p}y`, `${p}z`];
  const knotColumns = (k: string) => [`${k}.t`, ...xyz(`${k}.r`), ...xyz(`${k}.v`)];
  return [
    "{",
    '  "schema": "starshot.conformance-physics/1",',
    '  "generator": "STARSHOT_WRITE_CONFORMANCE=1 npx vitest run packages/physics/test/conformance.test.ts",',
    ...section("hermite", [...knotColumns("a"), ...knotColumns("b"), "t", ...xyz("r"), ...xyz("v")], hermiteRows),
    ...section("launch", ["vInf", "parkingRadiusKm", "deltaVFromLeo", "c3"], launchRows),
    ...section(
      "acceleration",
      ["et", ...xyz("r"), ...xyz("sunOnly.a"), ...PLANETS.flatMap((id) => xyz(`${id}.r`)), ...xyz("withPlanets.a")],
      accelerationRows,
    ),
    ...section(
      "dopri5",
      ["rtol", "atolPos", "atolVel", "t", "h", "push", ...xyz("y.r"), ...xyz("y.v"), "err1", ...xyz("y1.r"), ...xyz("y1.v"),
        "err2", ...xyz("y2.r"), ...xyz("y2.v")],
      stepRows,
    ),
    ...section("next_step", ["h", "err", "nextStep"], nextStepRows),
    ...section("lambert", ["prograde", "mu, tof, r1, r2", "v1, v2 or null"], lambertRows),
    ...section("best_mars_2026", ["launchEt", "tof", ...xyz("vInf."), "vInfKmS", "arrivalVInfKmS"], [bestRow], true),
    "}",
    "",
  ].join("\n");
}

describe("physics conformance fixture", () => {
  it("covers each solver branch it names", () => {
    expect(lambertRows.filter((row) => row[2] === null)).toHaveLength(1);
    expect(nextStepRows.map((row) => row[2]! / 3600)).toContain(5);
    expect(nextStepRows.map((row) => row[2]! / 3600)).toContain(0.2);
    expect(stepRows.some((row) => row[12]! > 1) && stepRows.some((row) => row[12]! <= 1)).toBe(true);
  });
  it(WRITE ? "writes fixtures/conformance/physics.json" : "equals fixtures/conformance/physics.json exactly", () => {
    const text = physicsJson();
    if (WRITE) {
      mkdirSync(new URL(".", OUT), { recursive: true });
      writeFileSync(OUT, text);
    }
    expect(existsSync(OUT), "missing: run with STARSHOT_WRITE_CONFORMANCE=1").toBe(true);
    expect(readFileSync(OUT, "utf8")).toBe(text);
  });
});
