// Writes or checks fixtures/conformance/lunar.json, the oracle for the Rust lunar model
// (crates/starshot-ephemeris/tests/lunar.rs, PR10). With STARSHOT_WRITE_CONFORMANCE=1 it
// writes the file; otherwise the file must equal this output exactly. PR11 and PR12 add
// parking, departure and flight cases to the same file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rail from "@starshot/ephemeris/moon-rail.json";
import { DAY, LAUNCH_ET, LunarModel } from "../src/lunar/index";

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

function lunarJson(): string {
  const modelRows = MODEL_ETS.flatMap((et) => {
    const relative = model.relative(et);
    const { earth, moon } = model.bodies(et);
    const states = [["relative", relative], ["earth", earth], ["moon", moon]] as const;
    return states.map(([kind, s]) => [kind, bits(et), ...s.r.map(bits), ...s.v.map(bits)]);
  });
  const basisRows = BASES.flatMap(([et, phase]) => {
    const b = model.basis(et, phase);
    return (["right", "up", "normal"] as const).map((k) => [k, bits(et), bits(phase), ...b[k].map(bits)]);
  });
  const rows = (list: unknown[]) => list.map((row) => `    ${JSON.stringify(row)}`).join(",\n");
  return [
    "{",
    '  "schema": "starshot.conformance-lunar/1",',
    '  "generator": "STARSHOT_WRITE_CONFORMANCE=1 npx vitest run packages/physics/test/conformance-lunar.test.ts",',
    `  "rail": ${JSON.stringify({ sourceSha256: rail.sourceSha256, knots: rail.knots.length / 7 })},`,
    '  "model_columns": ["kind", "et", "rx", "ry", "rz", "vx", "vy", "vz"],',
    '  "model": [',
    rows(modelRows),
    "  ],",
    '  "basis_columns": ["vector", "et", "phaseDeg", "x", "y", "z"],',
    '  "basis": [',
    rows(basisRows),
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
