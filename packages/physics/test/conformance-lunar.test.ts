// Writes or checks fixtures/conformance/lunar.json, the oracle for the Rust lunar model
// (crates/starshot-ephemeris/tests/lunar.rs, PR10) and parking orbit
// (crates/starshot-physics/tests/lunar_parking.rs, PR11) and flight
// (crates/starshot-physics/tests/lunar_flight.rs, PR12). With STARSHOT_WRITE_CONFORMANCE=1
// it writes the file; otherwise the file must equal this output exactly.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rail from "@starshot/ephemeris/moon-rail.json";
import {
  DAY, EARTH_GM, EARTH_RADIUS, FUEL_BUDGET, LAUNCH_ET, LunarModel, MOON_GM, MOON_RADIUS, MOON_SOI_KM, SETTINGS,
  parkingPeriod, parkingPhase, parkingState, requestFor, simulateLunar, type ParkingOrbit, type ShotRequest,
} from "../src/lunar/index";

const OUT = new URL("../../../fixtures/conformance/lunar.json", import.meta.url);
const WRITE = process.env.STARSHOT_WRITE_CONFORMANCE === "1";

// f64 bits as 16 hex digits, as fixtures/math/golden.json stores them.
const view = new DataView(new ArrayBuffer(8));
const bits = (x: number): string => {
  view.setFloat64(0, x);
  return view.getBigUint64(0).toString(16).padStart(16, "0");
};

const model = new LunarModel(rail);
// The fixed frame, a sub-day launch, lunar day 27 and every probe (09-rust-supplement.md).
const MODEL_ETS = [LAUNCH_ET, LAUNCH_ET + 321, LAUNCH_ET + 27 * DAY, ...rail.probes.map((p) => p[0]!)];
const BASES: Array<[number, number]> = [[LAUNCH_ET, 225], [LAUNCH_ET + 321, 225], [LAUNCH_ET + 27 * DAY, 90]];
// Relative-only times spread along the rail, one in each of 64 segments at a golden-ratio
// fraction of it (0 for the first), so every Hermite term is pinned off the knots. Fixed,
// not random, so every run writes the same file.
const KNOTS = rail.knots.length / 7;
const SPREAD_ETS = Array.from({ length: 64 }, (_, i) => {
  const k = 1 + Math.floor((i * (KNOTS - 3)) / 64);
  const t = rail.knots[k * 7]!;
  const f = i * 0.61803398875;
  return t + (rail.knots[(k + 1) * 7]! - t) * (f - Math.floor(f));
});

// PR11: the parking orbit, the departure burn and each refusal. An orbit is stored as
// frameEt (null where it falls back to the epoch), epochEt, phaseDeg and radiusKm.
const GAME: ParkingOrbit = { frameEt: LAUNCH_ET, epochEt: LAUNCH_ET, phaseDeg: 225, radiusKm: EARTH_RADIUS + 200 };
const PERIOD = parkingPeriod(GAME.radiusKm);
const [FROZEN, DAY27] = [LAUNCH_ET + 321, LAUNCH_ET + 27 * DAY];
const LATER = FROZEN + 8 * DAY;
// lunar.test.ts's re-dated orbit: the phase reached at FROZEN becomes the phase at LATER.
const REDATED: ParkingOrbit = { ...GAME, epochEt: LATER, phaseDeg: parkingPhase(GAME, FROZEN) };
const orbitBits = (o: ParkingOrbit) => [o.frameEt === undefined ? null : bits(o.frameEt), ...[o.epochEt, o.phaseDeg, o.radiusKm].map(bits)];
const PARKING: Array<[ParkingOrbit, number]> = [
  ...[0, 0.25, 0.5, 0.75, 1].map((part): [ParkingOrbit, number] => [GAME, LAUNCH_ET + part * PERIOD]),
  [GAME, FROZEN], [GAME, LAUNCH_ET - 1800], [REDATED, LATER], [REDATED, LATER + PERIOD / 4],
  // No frame, so the epoch's plane; and the next double above Earth's radius, the least allowed.
  [{ epochEt: DAY27, phaseDeg: 90, radiusKm: 7000 }, DAY27 + 600],
  [{ ...GAME, radiusKm: EARTH_RADIUS + 2 ** -40 }, LAUNCH_ET],
];
// simulateLunar's sample 0 is the departure (flight.ts:52-58); 60 s flights keep the
// generator quick. The first omits the parking orbit, as requestFor's request does; one
// launches 3 days after its epoch, where flight.ts:53's unwrapped phase passes 360 degrees.
const DEPARTURES: Array<[ParkingOrbit | undefined, number, number, number]> = [
  [undefined, LAUNCH_ET, 3.24, 0], [GAME, LAUNCH_ET, 3.24, 17.33167459468716],
  [GAME, LAUNCH_ET + 8.004, 3.24, 0], [GAME, FROZEN, 3.24, 0], [GAME, LAUNCH_ET + 3 * DAY, 3.24, 0],
  [{ ...GAME, epochEt: DAY27 }, DAY27, 3.1, -20], [REDATED, LATER + 1000, 0.5, 135],
];
const fly = (parking: ParkingOrbit | undefined, launchEt: number, dv: number, angle: number) => {
  const request = { ...requestFor(dv, angle), launchEt, durationSeconds: 60, ...(parking ? { parking } : {}) };
  // flight.ts:52's fallback, so the row stores the orbit the flight used.
  const used = parking ?? { epochEt: launchEt, phaseDeg: request.parkingPhaseDeg, radiusKm: request.parkingRadiusKm };
  return { used, start: simulateLunar(model, request).samples[0]! };
};
const [FIRST, LAST] = [rail.knots[0]!, rail.knots.at(-7)!];
// frameEt is never checked: an infinite one reaches the rail, which refuses it before the radius.
const ERRORS: Array<["parkingState" | "departure", ParkingOrbit, number]> = [
  ["parkingState", { ...GAME, radiusKm: EARTH_RADIUS }, LAUNCH_ET],
  ["parkingState", { ...GAME, epochEt: NaN }, LAUNCH_ET],
  ["parkingState", { ...GAME, phaseDeg: Infinity }, LAUNCH_ET],
  ["parkingState", { ...GAME, radiusKm: NaN }, LAUNCH_ET],
  ["parkingState", GAME, -Infinity],
  ["parkingState", { ...GAME, frameEt: Infinity }, LAUNCH_ET],
  ["parkingState", GAME, FIRST - 1],
  ["parkingState", GAME, LAST + 1],
  ["departure", { ...GAME, radiusKm: 6000 }, LAUNCH_ET],
  ["departure", GAME, LAST + 1],
  ["departure", { epochEt: NaN, phaseDeg: 225, radiusKm: GAME.radiusKm }, LAUNCH_ET],
  ["departure", { ...GAME, frameEt: Infinity, radiusKm: 6000 }, LAUNCH_ET],
  ["departure", { ...GAME, frameEt: NaN, radiusKm: 6000 }, LAUNCH_ET],
];

// PR12: the golden flights of 09-rust-supplement.md, from lunar.test.ts and the prototype's
// flight.test.ts. A request is stored as its seven numbers, scope, six settings, parking
// orbit (or null) and stop flag.
const requestBits = (q: ShotRequest) => [
  ...[q.launchEt, q.parkingRadiusKm, q.parkingPhaseDeg, q.deltaVKmS, q.burnAngleDeg, q.durationSeconds, q.approachRadiusKm].map(bits),
  q.scope,
  ...[q.settings.rtol, q.settings.atolPos, q.settings.atolVel, q.settings.maxStep, q.settings.maxSteps].map(bits),
  bits(q.settings.nearBodyFraction),
  q.parking ? orbitBits(q.parking) : null,
  q.stopAtEntry ?? false,
];
const real = (angle: number, stopAtEntry: boolean): ShotRequest =>
  ({ ...requestFor(3.24, angle), parking: GAME, approachRadiusKm: MOON_SOI_KM, stopAtEntry });
const TIGHT = { ...SETTINGS, rtol: 1e-12, atolPos: 0.0001, atolVel: 1e-10, maxStep: 600 };
const FLIGHTS: Array<[string, ShotRequest]> = [
  ["real-SOI stop", real(0, true)], ["SOI graze", real(17.33167459468716, false)],
  ["SOI graze, stopped", real(17.33167459468716, true)], ["study hit", requestFor(3.24, 0)],
  ["study miss", requestFor(3.24, 20)], ["study impact", requestFor(3.24, -20)],
  ["study graze", requestFor(3.24, 17.210867496829703)], ["tighter settings", { ...requestFor(3.24, 0), settings: TIGHT }],
  ...[0, 0.05, 0.2, 0.5].map((dv): [string, ShotRequest] => [`weak pull ${dv}`, requestFor(dv, 0)]),
  // A Moon impact; stopped at a zone 0.1 km up, the same burn enters it first in that step.
  ["Moon impact", requestFor(3.24, 2)], ["Moon impact, stopped", { ...requestFor(3.24, 2), approachRadiusKm: 1737.5, stopAtEntry: true }],
];
// requestFor's clamp and windows: the call's burn and angle, then the request it builds.
// 2.864 km/s reaches about 95,000 km, inside flight.ts:28's 100,000 km local threshold.
const REQUESTS = [[3.24, 0], [3.24, -20], [0, 0], [0.05, 0], [0.2, 0], [0.5, 0], [-1, 0], [5, 0], [NaN, 0], [1, 90], [2.864, 0]];
// Each refusal of simulateLunar. The horizon is launch plus 7 days past the rail's end
// (lunar.test.ts:54-57); a burn straight down hits Earth within the rail, so only the check
// refuses the second.
const BASE = requestFor(3.24, 0);
const FLIGHT_ERRORS: Array<[string, ShotRequest]> = [
  ["over budget", { ...BASE, deltaVKmS: 3.5500000000000003 }], ["negative burn", { ...BASE, deltaVKmS: -1e-9 }],
  ["NaN burn", { ...BASE, deltaVKmS: NaN }], ["infinite angle", { ...BASE, burnAngleDeg: Infinity }],
  ["NaN launch", { ...BASE, launchEt: NaN }], ["NaN phase", { ...BASE, parkingPhaseDeg: NaN }],
  ["Earth-radius parking", { ...BASE, parkingRadiusKm: EARTH_RADIUS }], ["no time", { ...BASE, durationSeconds: 0 }],
  ["endless time", { ...BASE, durationSeconds: Infinity }], ["rail horizon", { ...BASE, launchEt: LAST - DAY }],
  ["rail horizon, early impact", { ...BASE, burnAngleDeg: -90, launchEt: LAST - DAY }],
  ["unsettled", { ...BASE, settings: { ...SETTINGS, rtol: 0, atolPos: 1e-300, atolVel: 1e-300, maxSteps: 1 } }],
  ["step budget", { ...BASE, settings: { ...SETTINGS, maxSteps: 5 } }],
];
const refusal = (run: () => unknown): string => {
  try {
    run();
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected a refusal");
};

function lunarJson(): string {
  const modelRows = MODEL_ETS.flatMap((et) => {
    const relative = model.relative(et);
    const { earth, moon } = model.bodies(et);
    const states = [["relative", relative], ["earth", earth], ["moon", moon]] as const;
    return states.map(([kind, s]) => [kind, bits(et), ...s.r.map(bits), ...s.v.map(bits)]);
  });
  const spreadRows = SPREAD_ETS.map((et) => {
    const s = model.relative(et);
    return ["relative", bits(et), ...s.r.map(bits), ...s.v.map(bits)];
  });
  // model.ts's exports as bits, so the Rust constants cannot drift by a digit unseen.
  const constants = { EARTH_GM: bits(EARTH_GM), MOON_GM: bits(MOON_GM), LAUNCH_ET: bits(LAUNCH_ET) };
  const basisRows = BASES.flatMap(([et, phase]) => {
    const b = model.basis(et, phase);
    return (["right", "up", "normal"] as const).map((k) => [k, bits(et), bits(phase), ...b[k].map(bits)]);
  });
  // The constants starshot_physics::lunar holds, MOON_SOI_KM among them, as bits.
  const physics = { DAY, EARTH_RADIUS, MOON_RADIUS, FUEL_BUDGET, MOON_SOI_KM };
  const physicsConstants = Object.fromEntries(Object.entries(physics).map(([k, v]) => [k, bits(v)]));
  const parkingRows = PARKING.map(([orbit, et]) => {
    const s = parkingState(model, orbit, et);
    return [...orbitBits(orbit), bits(et), bits(parkingPhase(orbit, et)), ...s.r.map(bits), ...s.v.map(bits)];
  });
  const departureRows = DEPARTURES.map(([parking, launchEt, dv, angle]) => {
    const { used, start } = fly(parking, launchEt, dv, angle);
    return [...orbitBits(used), ...[launchEt, dv, angle, ...start.r, ...start.v].map(bits)];
  });
  const errorRows = ERRORS.map(([fn, orbit, et]) => {
    const run = fn === "parkingState" ? () => parkingState(model, orbit, et) : () => fly(orbit, et, 3.24, 0);
    return [fn, ...orbitBits(orbit), bits(et), refusal(run)];
  });
  const knotBits = (k: { t: number; r: readonly number[]; v: readonly number[] }) => [k.t, ...k.r, ...k.v].map(bits);
  const flightRows = FLIGHTS.map(([name, request]) => {
    const f = simulateLunar(model, request);
    const outputs = [f.entryEt === null ? null : bits(f.entryEt), f.impact, ...[f.closestKm, f.closestEt, f.endEt].map(bits)];
    return [name, requestBits(request), ...outputs, f.steps, knotBits(f.samples[0]!), knotBits(f.samples.at(-1)!)];
  });
  const requestRows = REQUESTS.map(([dv, angle]) => [bits(dv!), bits(angle!), requestBits(requestFor(dv!, angle!))]);
  const flightErrorRows = FLIGHT_ERRORS.map(([name, q]) => [name, requestBits(q), refusal(() => simulateLunar(model, q))]);
  const rows = (list: unknown[]) => list.map((row) => `    ${JSON.stringify(row)}`).join(",\n");
  return [
    "{",
    '  "schema": "starshot.conformance-lunar/1",',
    '  "generator": "STARSHOT_WRITE_CONFORMANCE=1 npx vitest run packages/physics/test/conformance-lunar.test.ts",',
    `  "rail": ${JSON.stringify({ sourceSha256: rail.sourceSha256, knots: KNOTS })},`,
    `  "constants": ${JSON.stringify(constants)},`,
    '  "model_columns": ["kind", "et", "rx", "ry", "rz", "vx", "vy", "vz"],',
    '  "model": [',
    rows([...modelRows, ...spreadRows]),
    "  ],",
    '  "basis_columns": ["vector", "et", "phaseDeg", "x", "y", "z"],',
    '  "basis": [',
    rows(basisRows),
    "  ],",
    `  "physics_constants": ${JSON.stringify(physicsConstants)},`,
    '  "parking_columns": ["frameEt", "epochEt", "phaseDeg", "radiusKm", "et", "phase", "rx", "ry", "rz", "vx", "vy", "vz"],',
    '  "parking": [',
    rows(parkingRows),
    "  ],",
    '  "departure_columns": ["frameEt", "epochEt", "phaseDeg", "radiusKm", "launchEt", "deltaVKmS", "burnAngleDeg", "rx", "ry", "rz", "vx", "vy", "vz"],',
    '  "departure": [',
    rows(departureRows),
    "  ],",
    '  "errors_columns": ["function", "frameEt", "epochEt", "phaseDeg", "radiusKm", "et", "message"],',
    '  "errors": [',
    rows(errorRows),
    "  ],",
    '  "request_columns": ["launchEt", "parkingRadiusKm", "parkingPhaseDeg", "deltaVKmS", "burnAngleDeg", "durationSeconds",' +
      ' "approachRadiusKm", "scope", "rtol", "atolPos", "atolVel", "maxStep", "maxSteps", "nearBodyFraction", "parking", "stopAtEntry"],',
    '  "flight_columns": ["case", "request", "entryEt", "impact", "closestKm", "closestEt", "endEt", "steps", "first", "last"],',
    '  "flights": [',
    rows(flightRows),
    "  ],",
    '  "requests_columns": ["deltaVKmS", "burnAngleDeg", "request"],',
    '  "requests": [',
    rows(requestRows),
    "  ],",
    '  "flight_errors_columns": ["case", "request", "message"],',
    '  "flight_errors": [',
    rows(flightErrorRows),
    "  ]",
    "}",
    "",
  ].join("\n");
}

describe("lunar model conformance fixture", () => {
  it("covers the launch reference, a sub-day time, day 27 and five probes", () => {
    expect(MODEL_ETS.length).toBe(8);
    expect(model.basis()).toEqual(model.basis(LAUNCH_ET, 225));
  });
  it(WRITE ? "writes fixtures/conformance/lunar.json" : "equals fixtures/conformance/lunar.json exactly", () => {
    const text = lunarJson();
    if (WRITE) {
      mkdirSync(new URL(".", OUT), { recursive: true });
      writeFileSync(OUT, text);
    }
    expect(existsSync(OUT), "missing: run with STARSHOT_WRITE_CONFORMANCE=1").toBe(true);
    expect(readFileSync(OUT, "utf8")).toBe(text);
  });
});
