// Writes or checks the oracle for the game crate (PR13): fixtures/conformance/shots.json for
// its shot model (crates/starshot-game/tests/conformance_shots.rs). Every request comes from
// the game's own builders, shotRequestFor at launchEtForDay. With
// STARSHOT_WRITE_CONFORMANCE=1 it writes the file; otherwise the file must equal this output
// exactly.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createEphemeris, type PlanetId, type Vec3 } from "@starshot/ephemeris";
import { CAMPAIGN, GRAND_TOUR_HINT, GRAND_TOUR_PAR_SHOT, sandboxLevel, shotRequestFor, type Level } from "../levels.js";
import { analyzeShot, daysBetweenIso, launchEtForDay, simulateShot, vInfFromAim, type ShotAnalysis } from "./shot.js";

const WRITE = process.env.STARSHOT_WRITE_CONFORMANCE === "1";
const GENERATOR = "STARSHOT_WRITE_CONFORMANCE=1 npx vitest run apps/game/src/sim/conformance.test.ts";

// f64 bits as 16 hex digits, as fixtures/math/golden.json stores them.
const view = new DataView(new ArrayBuffer(8));
const bits = (x: number): string => {
  view.setFloat64(0, x);
  return view.getBigUint64(0).toString(16).padStart(16, "0");
};
// Numbers as bits, undefined as null, a flyby as its fields in order; strings and flags stay.
const encode = (x: unknown): unknown => {
  if (typeof x === "number") return bits(x);
  if (x === undefined) return null;
  if (Array.isArray(x)) return x.map(encode);
  return typeof x === "object" && x !== null ? Object.values(x).map(encode) : x;
};
// ShotAnalysis in the Rust struct's field order; the first test fails on a new field.
const ANALYSIS = [
  "hit", "termination", "terminatedBy", "launchEt", "endEt", "flightDays", "targetSoiKm", "captureZoneKm",
  "captureZoneScale", "targetRadiusKm", "closestKm", "closestEt", "periapsisKm", "arrivalSpeedKmS", "bullseye",
  "flybys", "requiredFlybyDone", "vInfKmS", "deltaVKmS", "c3", "beyondEphemerisRange",
] as const satisfies ReadonlyArray<keyof ShotAnalysis>;
const analysisBits = (a: ShotAnalysis) => ANALYSIS.map((key) => encode(a[key]));

// The planets: 30 shots over every campaign level and the sandbox, hits and misses, a
// training-zone hit, bullseyes, Jupiter flybys with and without a hit, an escape and a
// flight past 2050. Each is a level, a day of its window and an excess velocity [km/s].
const eph = createEphemeris({ flatten: true });
const level = (id: string): Level => CAMPAIGN.find((l) => l.id === id)!;
const [FIRST, MORNING, BIG, TOUR] = [level("first-light"), level("morning-star"), level("big-game"), level("grand-tour")];
const sandbox = (target: PlanetId, iso: string) => sandboxLevel(target, new Date(`${iso}T00:00:00Z`));
const aim = (angleDeg: number, speedKmS: number): Vec3 => vInfFromAim({ angleDeg, speedKmS });
const dayOf = (l: Level, iso: string) => daysBetweenIso(l.window.startIso, iso);
const TODAY = "2026-11-02";
const SHOTS: ReadonlyArray<readonly [string, Level, number, Vec3]> = [
  // levels.test.ts's known solutions, copied since a test file exports nothing.
  ["first-light known solution", FIRST, 18, [-1.815327, 2.36578, 0]],
  ["morning-star known solution", MORNING, 45, [0.799577, 2.431928, 0]],
  ["big-game known solution", BIG, 34, [-8.698397, -0.167018, 0]],
  ["grand-tour known solution", TOUR, 10, [2.325702, 9.314028, 0]],
  ["grand-tour hint", TOUR, dayOf(TOUR, GRAND_TOUR_HINT.launchIso), GRAND_TOUR_HINT.vInf],
  ["grand-tour par", TOUR, dayOf(TOUR, GRAND_TOUR_PAR_SHOT.launchIso), GRAND_TOUR_PAR_SHOT.vInf],
  // Passes Mars at 1.1 spheres of influence: a hit only in the training zone.
  ["first-light near miss", FIRST, 18, aim(129.6, 2.982)],
  ["first-light default day", FIRST, 21, aim(127.5, 2.982)],
  ["first-light first day", FIRST, 0, aim(0, 1.8)],
  ["first-light last day", FIRST, 90, aim(300, 6)],
  ["morning-star bullseye", MORNING, 45, aim(72.08, 2.56)],
  ["morning-star default day", MORNING, 12, aim(71.8, 2.56)],
  ["morning-star last day", MORNING, 90, aim(250, 5)],
  ["big-game bullseye", BIG, 34, aim(180.6, 8.7)],
  ["big-game default day", BIG, 11, aim(181.1, 8.7)],
  ["big-game last day", BIG, 90, aim(90, 12)],
  ["grand-tour bullseye", TOUR, 10, aim(75.93, 9.6)],
  // Flies through Jupiter's sphere and misses Saturn.
  ["grand-tour flyby only", TOUR, 0, aim(75.93, 9.8)],
  ["grand-tour last day", TOUR, 30, aim(200, 10.5)],
  ["sandbox mercury", sandbox("mercury", TODAY), 0, aim(200, 7)],
  ["sandbox venus", sandbox("venus", TODAY), 0, aim(150, 3.5)],
  ["sandbox mars", sandbox("mars", TODAY), 0, [-1.815327, 2.36578, 0]],
  ["sandbox jupiter", sandbox("jupiter", TODAY), 0, aim(60, 9)],
  ["sandbox saturn", sandbox("saturn", "2027-05-20"), 0, [3.105828541230249, 11.59110991546882, 0]],
  ["sandbox uranus", sandbox("uranus", TODAY), 0, aim(100, 12)],
  ["sandbox neptune", sandbox("neptune", TODAY), 0, aim(45, 14)],
  ["sandbox neptune past 2050", sandbox("neptune", "2047-06-01"), 0, aim(200, 3)],
  ["sandbox neptune escape", sandbox("neptune", "2026-11-01"), 0, [-12.586407820996746, 15.54291922913942, 0]],
  ["sandbox mars slow departure", sandbox("mars", "2026-11-01"), 0, aim(90, 0.3)],
  ["sandbox mars last day", sandbox("mars", TODAY), 730, aim(30, 4)],
];

function shotsJson(): string {
  const rows = SHOTS.map(([name, l, day, vInf]) => {
    const shot = shotRequestFor(l, launchEtForDay(l.window.startIso, day), vInf);
    const result = simulateShot(eph, shot);
    const analysis = analyzeShot(eph, shot, result);
    expect(Object.keys(analysis).sort()).toEqual([...ANALYSIS].sort());
    const { rtol, atolKm, maxStep, maxSteps } = shot.sim;
    const request = [shot.target, shot.attractors, ...[shot.launchEt, ...shot.vInf, shot.maxFlightDays].map(bits),
      shot.requiredFlyby ?? null, ...[rtol, atolKm, maxStep].map(bits), maxSteps, bits(shot.captureZoneScale!)];
    return [name, l.id, l.window.startIso, day, request, analysisBits(analysis), result.steps];
  });
  return [
    "{",
    '  "schema": "starshot.conformance-shots/1",',
    `  "generator": "${GENERATOR}",`,
    '  "ephemeris": "table1-flattened",',
    '  "request_columns": ["target", "attractors", "launchEt", "vx", "vy", "vz", "maxFlightDays", "requiredFlyby",' +
      ' "rtol", "atolKm", "maxStep", "maxSteps", "captureZoneScale"],',
    `  "analysis_columns": ${JSON.stringify(ANALYSIS)},`,
    '  "flyby_columns": ["body", "t", "distanceKm", "relativeSpeedKmS"],',
    '  "shot_columns": ["name", "level", "windowStartIso", "day", "request", "analysis", "steps"],',
    '  "shots": [',
    rows.map((row) => `    ${JSON.stringify(row)}`).join(",\n"),
    "  ]",
    "}",
    "",
  ].join("\n");
}

describe("game shot conformance fixtures", () => {
  const files: Array<[string, () => string]> = [["shots.json", shotsJson]];
  for (const [file, text] of files) {
    const out = new URL(`../../../../fixtures/conformance/${file}`, import.meta.url);
    it(WRITE ? `writes fixtures/conformance/${file}` : `equals fixtures/conformance/${file} exactly`, () => {
      const json = text();
      if (WRITE) writeFileSync(out, json);
      expect(existsSync(out), "missing: run with STARSHOT_WRITE_CONFORMANCE=1").toBe(true);
      expect(readFileSync(out, "utf8")).toBe(json);
    });
  }
});
