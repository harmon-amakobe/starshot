// Writes or checks fixtures/conformance/simulate.json, the oracle for the Rust `simulate`
// (crates/starshot-physics/tests/conformance_simulate.rs, PR12). With
// STARSHOT_WRITE_CONFORMANCE=1 it writes the file; otherwise the file must equal this
// output exactly. Each flight starts from departureState(launchEt, vInf) on Table 1,
// flattened as the game's is, and stores its inputs as bits, so Rust flies the same aim.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BODIES,
  PLANET_IDS,
  add,
  createEphemeris,
  etFromIso,
  norm,
  scale,
  sub,
  type PlanetId,
  type Vec3,
} from "@starshot/ephemeris";
import { bestDirectTransfer, departureState, lambert, simulate, type SimulationResult } from "../src/index.js";

const OUT = new URL("../../../fixtures/conformance/simulate.json", import.meta.url);
const WRITE = process.env.STARSHOT_WRITE_CONFORMANCE === "1";

// f64 bits as 16 hex digits, as fixtures/math/golden.json stores them.
const view = new DataView(new ArrayBuffer(8));
const bits = (x: number): string => {
  view.setFloat64(0, x);
  return view.getBigUint64(0).toString(16).padStart(16, "0");
};

const DAY = 86400;
const DEG = Math.PI / 180;
const eph = createEphemeris({ flatten: true });

interface Settings { readonly rtol: number; readonly atolKm: number; readonly maxStep: number; readonly maxSteps: number }
// The game's frozen settings (apps/game/src/sim/shot.ts, D6). A package cannot import the
// game, so they are copied here; apps/game/src/sim/simulate-fixture.test.ts holds them, and
// each level flight's step count, to the game's own.
const SIM_SETTINGS: Settings = { rtol: 1e-10, atolKm: 1, maxStep: 2 * DAY, maxSteps: 20000 };
const OUTER_SIM_SETTINGS: Settings = { rtol: 1e-9, atolKm: 300, maxStep: 10 * DAY, maxSteps: 20000 };

interface Template { readonly target: PlanetId; readonly attractors: readonly PlanetId[]; readonly maxFlightDays: number; readonly sim: Settings }
// The campaign's shot templates and the sandbox's (apps/game/src/levels.ts).
const LEVELS: Readonly<Record<string, Template>> = {
  "first-light": { target: "mars", attractors: ["earth", "mars", "jupiter"], maxFlightDays: 400, sim: SIM_SETTINGS },
  "morning-star": { target: "venus", attractors: ["mercury", "venus", "earth"], maxFlightDays: 300, sim: SIM_SETTINGS },
  "big-game": { target: "jupiter", attractors: ["earth", "mars", "jupiter", "saturn"], maxFlightDays: 1300, sim: SIM_SETTINGS },
  "grand-tour": { target: "saturn", attractors: ["earth", "jupiter", "saturn"], maxFlightDays: 1700, sim: SIM_SETTINGS },
};
const SANDBOX_DAYS: Readonly<Partial<Record<PlanetId, number>>> = { mars: 800, saturn: 2600, neptune: 5000 };
const sandbox = (target: PlanetId): Template =>
  ["jupiter", "saturn", "uranus", "neptune"].includes(target)
    ? { target, attractors: ["earth", "jupiter", "saturn", "uranus", "neptune"], maxFlightDays: SANDBOX_DAYS[target]!, sim: OUTER_SIM_SETTINGS }
    : { target, attractors: PLANET_IDS.filter((p) => p !== "mercury" || target === "mercury"), maxFlightDays: SANDBOX_DAYS[target]!, sim: SIM_SETTINGS };

interface Flight {
  readonly name: string;
  /** The level whose template the flight uses, as the game's simulateShot flies it. */
  readonly level: string | null;
  readonly launchIso: string;
  readonly launchEt: number;
  readonly vInf: Vec3;
  readonly duration: number;
  /** null: simulate's default, every planet. */
  readonly attractors: readonly PlanetId[] | null;
  readonly stopAtSoiOf: PlanetId | null;
  readonly departFrom: "earth" | null;
  /** null: simulate's own defaults, as today's physics tests fly. */
  readonly sim: Settings | null;
}

const vInfFromAim = (angleDeg: number, speedKmS: number): Vec3 =>
  [speedKmS * Math.cos(angleDeg * DEG), speedKmS * Math.sin(angleDeg * DEG), 0];
const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY * 1000).toISOString().slice(0, 10);

/** The config simulateShot builds from a level's template, a launch day and an aim. */
const shot = (name: string, level: string | null, t: Template, launchIso: string, vInf: Vec3): Flight => ({
  name,
  level,
  launchIso,
  launchEt: etFromIso(launchIso),
  vInf,
  duration: t.maxFlightDays * DAY,
  attractors: t.attractors.includes(t.target) ? t.attractors : [...t.attractors, t.target],
  stopAtSoiOf: t.target,
  departFrom: "earth",
  sim: t.sim,
});

/** The par of a direct level: the window's cheapest Lambert transfer on levels.test.ts's grid. */
function par(id: string, startIso: string, days: number): Flight {
  const t = LEVELS[id]!;
  const isos = Array.from({ length: days + 1 }, (_, k) => addDays(startIso, k));
  const launches = isos.map((iso) => etFromIso(iso));
  const tofs = Array.from({ length: Math.floor((t.maxFlightDays - 40) / 4) + 1 }, (_, k) => (40 + 4 * k) * DAY);
  const best = bestDirectTransfer(eph, "earth", t.target, launches, tofs)!;
  return shot(`${id} par`, id, t, isos[launches.indexOf(best.launchEt)]!, best.vInf);
}

/** A flight of today's physics tests (physics.test.ts), from Earth's centre. */
const physics = (name: string, launchIso: string, launchEt: number, vInf: Vec3, duration: number, rest: Partial<Flight>): Flight => ({
  name, level: null, launchIso, launchEt, vInf, duration, attractors: null, stopAtSoiOf: null, departFrom: null, sim: null, ...rest,
});

const T_NOV20 = etFromIso("2026-11-20");
const EARTH_NOV20 = eph.state("earth", T_NOV20);
const T_TOUR = etFromIso("1977-08-20");
const earthTour = eph.state("earth", T_TOUR);
const marsImpact = lambert(EARTH_NOV20.r, eph.state("mars", T_NOV20 + 220 * DAY).r, 220 * DAY)!;
const jupiter = eph.state("jupiter", T_TOUR + 700 * DAY);
const flybyAim = add(jupiter.r, scale(jupiter.r, (25 * BODIES.jupiter.radiusKm) / norm(jupiter.r)));
const flyby = lambert(earthTour.r, flybyAim, 700 * DAY)!;
const marsStart = etFromIso("2026-10-15");
const marsBest = bestDirectTransfer(
  eph, "earth", "mars",
  Array.from({ length: 20 }, (_, k) => marsStart + k * 3 * DAY),
  Array.from({ length: 30 }, (_, k) => (150 + k * 8) * DAY),
)!;

const L = LEVELS;
const FLIGHTS: readonly Flight[] = [
  // Known solutions (levels.test.ts), pars and the Grand Tour's curated hint (levels.ts).
  shot("first-light known solution", "first-light", L["first-light"]!, "2026-11-02", [-1.815327, 2.36578, 0]),
  shot("morning-star known solution", "morning-star", L["morning-star"]!, "2028-03-05", [0.799577, 2.431928, 0]),
  shot("big-game known solution", "big-game", L["big-game"]!, "2028-12-24", [-8.698397, -0.167018, 0]),
  shot("grand-tour known solution", "grand-tour", L["grand-tour"]!, "1977-08-20", [2.325702, 9.314028, 0]),
  par("first-light", "2026-10-15", 90),
  par("morning-star", "2028-01-20", 90),
  par("big-game", "2028-11-20", 90),
  shot("grand-tour par", "grand-tour", L["grand-tour"]!, "1977-09-02", [3.345503, 8.462719, 0]),
  shot("grand-tour hint", "grand-tour", L["grand-tour"]!, "1977-08-20", [2.3829478446723424, 9.50586974293102, 0]),
  // Misses: First Light's near miss at 1.11 spheres of influence, the Grand Tour without
  // Jupiter (levels.test.ts), and two aims off the known solutions.
  shot("first-light near miss", "first-light", L["first-light"]!, "2026-11-02", [-1.900798, 2.29767, 0]),
  shot("grand-tour without Jupiter", null, { ...L["grand-tour"]!, attractors: ["earth", "saturn"] }, "1977-09-09", vInfFromAim(100, 10.5)),
  shot("morning-star miss", "morning-star", L["morning-star"]!, "2028-03-05", vInfFromAim(80, 2.56)),
  shot("big-game short", "big-game", L["big-game"]!, "2028-12-24", vInfFromAim(181.1, 7)),
  // The sandbox: inner targets on the campaign settings, outer ones on the outer settings.
  shot("sandbox mars", "sandbox", sandbox("mars"), "2026-11-02", [-1.815327, 2.36578, 0]),
  // The slowest departure, 0.3 km/s. Inside 5 spheres of influence its speed relative to
  // Earth stays above 0.886 km/s, 886 times the step cap's 1 m/s floor, so the floor never binds.
  shot("sandbox mars slow departure", "sandbox", sandbox("mars"), "2026-11-01", vInfFromAim(90, 0.3)),
  shot("sandbox saturn", "sandbox", sandbox("saturn"), addDays("2026-11-01", 200), vInfFromAim(75, 12)),
  shot("sandbox neptune past 2050", "sandbox", sandbox("neptune"), "2047-06-01", vInfFromAim(200, 3)),
  shot("sandbox neptune escape", "sandbox", sandbox("neptune"), "2026-11-01", vInfFromAim(129, 20)),
  // Today's physics tests, and a fall into the Sun.
  physics("impact on Mars", "2026-11-20", T_NOV20, sub(marsImpact.v1, EARTH_NOV20.v), 220 * DAY * 1.2, { attractors: ["mars"] }),
  physics("Jupiter flyby", "1977-08-20", T_TOUR, sub(flyby.v1, earthTour.v), 700 * DAY + 200 * DAY, { attractors: ["jupiter"] }),
  physics("Earth switch-on", "2026-11-20", T_NOV20, [0, 3.2, 0], 20 * DAY, { attractors: ["earth"], departFrom: "earth" }),
  physics("Mars 2026 Lambert aim", addDays("2026-10-15", Math.round((marsBest.launchEt - marsStart) / DAY)), marsBest.launchEt,
    marsBest.vInf, marsBest.tof * 1.3, { stopAtSoiOf: "mars", departFrom: "earth" }),
  physics("3-year preview", "2026-11-20", T_NOV20, [-1.5, 3.5, 0], 3 * 365 * DAY,
    { departFrom: "earth", sim: { rtol: 1e-8, atolKm: 50, maxStep: 5 * DAY, maxSteps: 20000 } }),
  physics("Sun dive", "2026-11-20", T_NOV20, scale(EARTH_NOV20.v, -0.97), 200 * DAY, { departFrom: "earth" }),
];

const fly = (f: Flight): SimulationResult => {
  const start = departureState(eph, f.launchEt, f.vInf);
  return simulate({
    ephemeris: eph,
    ...(f.attractors && { attractors: f.attractors }),
    t0: f.launchEt,
    r0: start.r,
    v0: start.v,
    duration: f.duration,
    ...(f.stopAtSoiOf && { stopAtSoiOf: f.stopAtSoiOf }),
    ...(f.departFrom && { departFrom: f.departFrom }),
    ...f.sim,
  });
};
const RESULTS = FLIGHTS.map(fly);

function simulateJson(): string {
  const rows = FLIGHTS.map((f, i) => {
    const res = RESULTS[i]!;
    const last = res.samples[res.samples.length - 1]!;
    const closest = Object.entries(res.closest).map(([id, e]) =>
      [id, bits(e.t), bits(e.distanceKm), bits(e.relativeSpeedKmS), e.insideSoi, e.impact]);
    const sim = f.sim && { rtol: bits(f.sim.rtol), atolKm: bits(f.sim.atolKm), maxStep: bits(f.sim.maxStep), maxSteps: f.sim.maxSteps };
    const input = { name: f.name, level: f.level, launchIso: f.launchIso, launchEt: bits(f.launchEt), vInf: f.vInf.map(bits),
      duration: bits(f.duration), attractors: f.attractors, stopAtSoiOf: f.stopAtSoiOf, departFrom: f.departFrom, sim };
    const output = { termination: res.termination, terminatedBy: res.terminatedBy ?? null, steps: res.steps,
      samples: res.samples.length, encounters: res.encounters.length, endTime: bits(res.endTime),
      last: [last.t, ...last.r, ...last.v].map(bits), closest };
    return `    ${JSON.stringify({ input, output })}`;
  });
  return [
    "{",
    '  "schema": "starshot.conformance-simulate/1",',
    '  "generator": "STARSHOT_WRITE_CONFORMANCE=1 npx vitest run packages/physics/test/conformance-simulate.test.ts",',
    '  "ephemeris": "table1-flattened",',
    '  "closest_columns": ["body", "t", "distanceKm", "relativeSpeedKmS", "insideSoi", "impact"],',
    '  "flights": [',
    rows.join(",\n"),
    "  ]",
    "}",
    "",
  ].join("\n");
}

describe("simulate conformance fixture", () => {
  it("flies 24 flights: every known solution reaches, and every ending but the step limit shows", () => {
    expect(FLIGHTS).toHaveLength(24);
    for (const [i, f] of FLIGHTS.entries()) {
      if (f.name.endsWith("known solution")) expect(RESULTS[i]!.terminatedBy, f.name).toBe(f.stopAtSoiOf);
    }
    const endings = new Set(RESULTS.map((r) => r.termination));
    expect([...endings].sort()).toEqual(["duration", "escape", "impact", "soi-reached", "sun"]);
    expect(FLIGHTS.filter((f) => f.sim === OUTER_SIM_SETTINGS).length).toBeGreaterThanOrEqual(2);
  });
  it(WRITE ? "writes fixtures/conformance/simulate.json" : "equals fixtures/conformance/simulate.json exactly", () => {
    const text = simulateJson();
    if (WRITE) {
      mkdirSync(new URL(".", OUT), { recursive: true });
      writeFileSync(OUT, text);
    }
    expect(existsSync(OUT), "missing: run with STARSHOT_WRITE_CONFORMANCE=1").toBe(true);
    expect(readFileSync(OUT, "utf8")).toBe(text);
  });
});
