// Writes or checks the oracles for the game crate (PR13, PR14): fixtures/conformance/shots.json
// for its shot model (crates/starshot-game/tests/conformance_shots.rs), lunar-shots.json for
// its Moon shot (crates/starshot-game/tests/lunar.rs) and levels.json for its levels
// (crates/starshot-game/tests/levels.rs). Every request comes from the game's
// own builders: shotRequestFor at launchEtForDay for the planets, and for the Moon
// finalRequest on a fresh session, as campaign/lunar.test.ts launches, and lunarRequest.
// With STARSHOT_WRITE_CONFORMANCE=1 it writes the files; otherwise each must equal this
// output exactly.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLANET_IDS, createEphemeris, type PlanetId, type Vec3 } from "@starshot/ephemeris";
import rail from "@starshot/ephemeris/moon-rail.json";
import { LAUNCH_ET, type ParkingOrbit } from "@starshot/physics/lunar";
import { finalRequest } from "../campaign/contracts.js";
import { freshSession } from "../campaign/session.js";
import {
  CAMPAIGN, DEFAULT_PAR_TOLERANCE, GRAND_TOUR_HINT, GRAND_TOUR_PAR_SHOT, SANDBOX_TARGETS, captureZoneScaleOf, framingBodies,
  parToleranceOf, sandboxLevel, shotRequestFor, type Level,
} from "../levels.js";
import { MISSION_ORDER, MOONSHOT, missionNumber, nextMission, type MissionId } from "../missions.js";
import type { KnownShot } from "./hint.js";
import type { LunarShotRequest } from "./flight-request.js";
import { runLunar } from "./lunar.js";
import { lunarRequest } from "./lunar-request.js";
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
// A fixture section's rows, one per line.
const list = (r: unknown[]) => r.map((row) => `    ${JSON.stringify(row)}`).join(",\n");

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

// The Moon: the golden cases of 09-rust-supplement.md for PR13, launched as the campaign
// launches (campaign/lunar.test.ts:29-34): a fresh Moonshot session at its default orbit,
// moved on and paused for the sub-day cases. The two bullseye cases pin its radius from
// both sides: periapses of about 9.6 and 10.6 Moon radii against the bound of 10.
const LUNAR_SHOTS: ReadonlyArray<readonly [string, number, number]> = [
  ["hit", 0, 0], ["miss", 20, 0], ["Earth impact", -20, 0], ["real-SOI graze", 17.33167459468716, 0],
  ["sub-day launch", 0, 8.004], ["sub-day request", 0, 321],
  ["bullseye inside", -2.5, 0], ["bullseye outside", -3, 0],
];
const orbitBits = (o: ParkingOrbit) => [o.frameEt === undefined ? null : bits(o.frameEt), ...[o.epochEt, o.phaseDeg, o.radiusKm].map(bits)];
// lunar.json's request columns, so both lunar fixtures read alike.
const requestBits = (q: LunarShotRequest) => [
  ...[q.launchEt, q.parkingRadiusKm, q.parkingPhaseDeg, q.deltaVKmS, q.burnAngleDeg, q.durationSeconds, q.approachRadiusKm].map(bits),
  q.scope,
  ...[q.settings.rtol, q.settings.atolPos, q.settings.atolVel, q.settings.maxStep, q.settings.maxSteps, q.settings.nearBodyFraction].map(bits),
  orbitBits(q.parking),
  q.stopAtEntry,
];
// lunarRequest's guard, which finalRequest's clamp keeps every player from reaching. The
// orbit is not the default, so the rows show that the request copies its radius and phase.
const PARKING: ParkingOrbit = { frameEt: LAUNCH_ET, epochEt: LAUNCH_ET + 8.004, phaseDeg: 226.5, radiusKm: 6600 };
const ANGLES = [-35.001, -35, 35, 35.001, NaN];

function lunarShotsJson(): string {
  const rows = LUNAR_SHOTS.map(([name, angleDeg, after]) => {
    const save = freshSession();
    save.et += after;
    save.paused = after > 0;
    save.aim = { angleDeg, speedKmS: 3.24 };
    const { aim, shot } = finalRequest(save);
    if (!("kind" in shot)) throw new Error("expected the Moonshot");
    const { result, analysis } = runLunar(shot);
    const knot = (k: { t: number; r: readonly number[]; v: readonly number[] }) => [k.t, ...k.r, ...k.v].map(bits);
    const inputs = [bits(shot.launchEt), bits(aim.angleDeg), bits(aim.speedKmS), orbitBits(shot.parking)];
    return [name, ...inputs, requestBits(shot), analysisBits(analysis), result.steps, knot(result.samples[0]!), knot(result.samples.at(-1)!)];
  });
  const refusals = ANGLES.map((angleDeg) => {
    try {
      return [bits(angleDeg), requestBits(lunarRequest(LAUNCH_ET, { angleDeg, speedKmS: 3.24 }, PARKING)), null];
    } catch (e) {
      return [bits(angleDeg), null, (e as Error).message];
    }
  });
  return [
    "{",
    '  "schema": "starshot.conformance-lunar-shots/1",',
    `  "generator": "${GENERATOR}",`,
    `  "rail": ${JSON.stringify({ sourceSha256: rail.sourceSha256 })},`,
    '  "request_columns": ["launchEt", "parkingRadiusKm", "parkingPhaseDeg", "deltaVKmS", "burnAngleDeg", "durationSeconds",' +
      ' "approachRadiusKm", "scope", "rtol", "atolPos", "atolVel", "maxStep", "maxSteps", "nearBodyFraction", "parking", "stopAtEntry"],',
    `  "analysis_columns": ${JSON.stringify(ANALYSIS)},`,
    '  "shot_columns": ["case", "launchEt", "angleDeg", "speedKmS", "parking", "request", "analysis", "steps", "first", "last"],',
    '  "shots": [',
    list(rows),
    "  ],",
    '  "refusal_columns": ["angleDeg", "request", "message"],',
    '  "refusals": [',
    list(refusals),
    "  ]",
    "}",
    "",
  ].join("\n");
}

// The levels' physics fields with levels.ts's defaults filled in, as the Rust levels carry
// them, so a number changed on one side alone fails the Rust tie (D6). The sandbox rows
// cover every planet on one day and each side of both date clamps, each with its framing.
const LEVEL_COLUMNS = ["id", "windowStartIso", "windowDays", "defaultLaunchIso", "target", "maxFlightDays", "vInfMaxKmS",
  "attractors", "requiredFlyby", "parDeltaVKmS", "parTolerance", "captureZoneScale", "sim", "hint", "sandbox"];
const knownBits = (k: KnownShot) => [k.launchIso, k.vInf.map(bits)];
const levelRow = (l: Level) => [
  l.id, l.window.startIso, l.window.days, l.defaultLaunchIso, l.target, bits(l.maxFlightDays), bits(l.vInfMaxKmS),
  l.attractors, l.requiredFlyby ?? null, l.par ? bits(l.par.deltaVKmS) : null, bits(parToleranceOf(l)),
  bits(captureZoneScaleOf(l)), [bits(l.sim.rtol), bits(l.sim.atolKm), bits(l.sim.maxStep), l.sim.maxSteps],
  l.hint ? knownBits(l.hint) : null, l.sandbox ?? false,
];
const SANDBOX_DAYS: ReadonlyArray<readonly [PlanetId, string]> = [
  ...PLANET_IDS.map((t) => [t, TODAY] as const),
  ["mars", "2048-01-01"], ["mars", "2048-01-02"], ["mars", "2077-01-01"], ["neptune", "1800-01-01"], ["neptune", "1799-12-31"],
];
// The Moonshot's physics fields, its burn cap in the speed cap's slot and its six lunar settings as bits.
const MOONSHOT_COLUMNS = ["id", "windowStartIso", "windowDays", "defaultLaunchIso", "target", "maxFlightDays", "vInfMaxKmS",
  "attractors", "parDeltaVKmS", "parTolerance", "sim"];
function levelsJson(): string {
  const rows = CAMPAIGN.map(levelRow);
  const sandboxRows = SANDBOX_DAYS.map(([target, iso]) => {
    const l = sandbox(target, iso);
    return [iso, levelRow(l), framingBodies(l)];
  });
  const ids: MissionId[] = [...MISSION_ORDER, "sandbox"];
  const missions = ids.map((id) => [id, missionNumber(id), nextMission(id)?.id ?? null]);
  const m = MOONSHOT, s = MOONSHOT.sim;
  const moonshot = [m.id, m.window.startIso, m.window.days, m.defaultLaunchIso, m.target, bits(m.maxFlightDays),
    bits(m.vInfMaxKmS), m.attractors, m.par ? bits(m.par.deltaVKmS) : null, bits(m.parTolerance ?? DEFAULT_PAR_TOLERANCE),
    [s.rtol, s.atolPos, s.atolVel, s.maxStep, s.maxSteps, s.nearBodyFraction].map(bits)];
  return [
    "{",
    '  "schema": "starshot.conformance-levels/1",',
    `  "generator": "${GENERATOR}",`,
    `  "grand_tour_par_shot": ${JSON.stringify(knownBits(GRAND_TOUR_PAR_SHOT))},`,
    `  "level_columns": ${JSON.stringify(LEVEL_COLUMNS)},`,
    '  "levels": [',
    list(rows),
    "  ],",
    `  "campaign_framing": ${JSON.stringify(CAMPAIGN.map(framingBodies))},`,
    `  "sandbox_targets": ${JSON.stringify(SANDBOX_TARGETS)},`,
    '  "sandbox_columns": ["today", "level", "framing"],',
    '  "sandbox": [',
    list(sandboxRows),
    "  ],",
    '  "mission_columns": ["id", "number", "next"],',
    `  "missions": ${JSON.stringify(missions)},`,
    `  "moonshot_columns": ${JSON.stringify(MOONSHOT_COLUMNS)},`,
    `  "moonshot": ${JSON.stringify(moonshot)}`,
    "}",
    "",
  ].join("\n");
}

describe("game shot conformance fixtures", () => {
  const files: Array<[string, () => string]> = [
    ["shots.json", shotsJson], ["lunar-shots.json", lunarShotsJson], ["levels.json", levelsJson],
  ];
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
