// Writes or checks fixtures/conformance/table1.json, the oracle the Rust ephemeris crate is
// held to (crates/starshot-ephemeris/tests/conformance_table1.rs, PR9). With
// STARSHOT_WRITE_CONFORMANCE=1 it writes the file; otherwise the file must equal this
// output exactly, so a change to Table 1, the solver or the time scales shows up here.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLANET_IDS, dateFromEt, etFromDate, etFromIso, etFromJdTdb, planetState } from "../src/index.js";

const OUT = new URL("../../../fixtures/conformance/table1.json", import.meta.url);
const WRITE = process.env.STARSHOT_WRITE_CONFORMANCE === "1";

// f64 bits as 16 hex digits, as fixtures/math/golden.json stores them: a decimal round
// trip through JSON could move a last bit on the way to Rust.
const view = new DataView(new ArrayBuffer(8));
const bits = (x: number): string => {
  view.setFloat64(0, x);
  return view.getBigUint64(0).toString(16).padStart(16, "0");
};

// The five Horizons fixture epochs (JD TDB), then 35 dates from 1800 to 2049.
const FIXTURE_JD = [2443375.5, 2451545.0, 2461344.5, 2466154.5, 2469807.5];
const DATES = [
  "1800-01-01", "1812-06-24", "1825-03-10", "1838-11-05", "1850-07-01", "1863-01-01", "1876-08-20",
  "1889-03-31", "1899-12-31", "1900-01-01", "1910-05-18", "1923-09-01", "1930-02-18", "1945-07-16",
  "1957-10-04", "1961-04-12", "1969-07-20", "1972-01-01", "1977-09-05", "1986-01-24", "1989-08-25",
  "1997-10-15", "2004-01-04", "2006-01-19", "2012-08-06", "2015-07-14", "2020-07-30", "2024-02-29",
  "2026-11-02", "2030-06-21", "2035-12-31", "2040-02-29", "2044-07-01", "2047-03-15", "2049-12-31",
];
// Every form et_from_iso accepts (G17): a date, or a date-time with optional milliseconds
// followed by Z, nothing or an offset written either way. Leap-second edges included.
const ISO = [
  "2026-11-15", "1977-08-20T14:29:00Z", "2000-01-01T11:58:55.816Z", "2026-11-02T01:00:00Z",
  "2026-11-02T01:00:00", "2026-11-02T01:00:00.000Z", "2026-11-02T06:30:00+05:30", "2026-11-02T06:30:00+0530",
  "2026-11-01T20:00:00-05:00", "1800-01-01", "1899-12-31T23:59:59.999Z", "1969-12-31T23:59:59.999Z",
  "1970-01-01", "1972-01-01T00:00:00Z", "1972-06-30T23:59:59Z", "2016-12-31T23:59:59.500Z",
  "2017-01-01T00:00:00Z", "2024-02-29T12:00:00-0800", "2049-12-31T23:59:59Z", "2050-01-01",
];

// The 28 UTC days from 1972 on that begin with a new TAI - UTC (IERS Bulletin C), written
// as dates rather than copied from time.ts. A leap second moved by a day or a second, or a
// wrong count, in either language's table then no longer matches the fixture.
const LEAP_DATES = [
  "1972-01-01", "1972-07-01", "1973-01-01", "1974-01-01", "1975-01-01", "1976-01-01", "1977-01-01",
  "1978-01-01", "1979-01-01", "1980-01-01", "1981-07-01", "1982-07-01", "1983-07-01", "1985-07-01",
  "1988-01-01", "1990-01-01", "1991-01-01", "1992-07-01", "1993-07-01", "1994-07-01", "1996-01-01",
  "1997-07-01", "1999-01-01", "2006-01-01", "2009-01-01", "2012-07-01", "2015-07-01", "2017-01-01",
];

// 200 UTC times to the millisecond from 1800 to 2050, from a fixed-seed mulberry32, so
// etFromDate's operation order is checked off the round midnights and ISO texts too. Then
// each leap-second instant and the millisecond before it.
function unixTimes(): number[] {
  let seed = 0x5eed;
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const [first, last] = [Date.UTC(1800, 0, 1), Date.UTC(2050, 0, 1)];
  const seeded = Array.from({ length: 200 }, () => first + Math.floor(next() * (last - first)));
  return [...seeded, ...LEAP_DATES.flatMap((day) => [Date.parse(day) - 1, Date.parse(day)])];
}

function table1Json(): string {
  const ets = [...FIXTURE_JD.map(etFromJdTdb), ...DATES.map(etFromIso)];
  const states = ets.flatMap((et) =>
    PLANET_IDS.map((id) => {
      const s = planetState(id, et);
      return [id, bits(et), ...s.r.map(bits), ...s.v.map(bits)];
    }),
  );
  const utc = ets.map((et) => [bits(et), dateFromEt(et).getTime()]);
  const iso = ISO.map((text) => {
    const et = etFromIso(text);
    return [text, bits(et), dateFromEt(et).getTime()];
  });
  const unix = unixTimes().map((ms) => {
    const et = etFromDate(new Date(ms));
    return [ms, bits(et), dateFromEt(et).getTime()];
  });
  const rows = (list: unknown[]) => list.map((row) => `    ${JSON.stringify(row)}`).join(",\n");
  return [
    "{",
    '  "schema": "starshot.conformance-table1/1",',
    '  "generator": "STARSHOT_WRITE_CONFORMANCE=1 npx vitest run packages/ephemeris/test/conformance.test.ts",',
    '  "states_columns": ["body", "et", "rx", "ry", "rz", "vx", "vy", "vz"],',
    '  "states": [',
    rows(states),
    "  ],",
    '  "utc_columns": ["et", "dateFromEt ms"],',
    '  "utc": [',
    rows(utc),
    "  ],",
    '  "iso_columns": ["text", "etFromIso", "dateFromEt ms"],',
    '  "iso": [',
    rows(iso),
    "  ],",
    '  "unix_columns": ["ms", "etFromDate", "dateFromEt ms"],',
    '  "unix": [',
    rows(unix),
    "  ]",
    "}",
    "",
  ].join("\n");
}

describe("Table 1 conformance fixture", () => {
  it("lists 40 dates, 20 ISO texts and 256 UTC times", () => {
    expect(FIXTURE_JD.length + DATES.length).toBe(40);
    expect(new Set(DATES).size).toBe(35);
    expect(ISO.length).toBe(20);
    expect(new Set(LEAP_DATES).size).toBe(28);
    expect(new Set(unixTimes()).size).toBe(256);
  });
  it(WRITE ? "writes fixtures/conformance/table1.json" : "equals fixtures/conformance/table1.json exactly", () => {
    const text = table1Json();
    if (WRITE) {
      mkdirSync(new URL(".", OUT), { recursive: true });
      writeFileSync(OUT, text);
    }
    expect(existsSync(OUT), "missing: run with STARSHOT_WRITE_CONFORMANCE=1").toBe(true);
    expect(readFileSync(OUT, "utf8")).toBe(text);
  });
});
