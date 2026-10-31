/**
 * Time scales. Starshot's physical time variable is "ET": TDB seconds since
 * J2000.0 (2000-01-01 12:00:00 TDB), the SPICE convention.
 *
 * For a game, TDB is treated as TT = TAI + 32.184 s, and TAI - UTC is the
 * leap-second count (37 s since 2017). The difference between TT and TDB is
 * under 2 ms and is ignored.
 */
export const J2000_JD = 2451545.0;
export const SECONDS_PER_DAY = 86400;
export const DAYS_PER_JULIAN_CENTURY = 36525;
/** Unix epoch (1970-01-01T00:00:00Z) as a Julian date (UTC). */
const UNIX_EPOCH_JD = 2440587.5;

/** Leap seconds (TAI - UTC) from 1972 on, as [unixSeconds, taiMinusUtc]. */
const LEAP_SECONDS: ReadonlyArray<readonly [number, number]> = [
  [63072000, 10], [78796800, 11], [94694400, 12], [126230400, 13], [157766400, 14],
  [189302400, 15], [220924800, 16], [252460800, 17], [283996800, 18], [315532800, 19],
  [362793600, 20], [394329600, 21], [425865600, 22], [489024000, 23], [567993600, 24],
  [631152000, 25], [662688000, 26], [709948800, 27], [741484800, 28], [773020800, 29],
  [820454400, 30], [867715200, 31], [915148800, 32], [1136073600, 33], [1230768000, 34],
  [1341100800, 35], [1435708800, 36], [1483228800, 37],
];

/** TT - UTC in seconds at a Unix time (32.184 s + leap seconds; 42.184 s before 1972). */
export function ttMinusUtc(unixSeconds: number): number {
  let tai = 10;
  for (const [t, n] of LEAP_SECONDS) {
    if (unixSeconds >= t) tai = n;
    else break;
  }
  return 32.184 + tai;
}

/** ET (TDB seconds since J2000) for a JavaScript Date (UTC). */
export function etFromDate(date: Date): number {
  const unix = date.getTime() / 1000;
  const jdUtc = unix / SECONDS_PER_DAY + UNIX_EPOCH_JD;
  return (jdUtc - J2000_JD) * SECONDS_PER_DAY + ttMinusUtc(unix);
}

/** JavaScript Date (UTC) for an ET value. */
export function dateFromEt(et: number): Date {
  // One fixed-point step is exact except within a second of a leap second.
  let unix = (et / SECONDS_PER_DAY + J2000_JD - UNIX_EPOCH_JD) * SECONDS_PER_DAY;
  unix -= ttMinusUtc(unix);
  return new Date(unix * 1000);
}

export const etFromJdTdb = (jdTdb: number): number => (jdTdb - J2000_JD) * SECONDS_PER_DAY;
export const jdTdbFromEt = (et: number): number => J2000_JD + et / SECONDS_PER_DAY;

/** ET for an ISO-8601 UTC string such as "2026-11-15" or "1977-08-20T14:29:00Z". */
export const etFromIso = (iso: string): number =>
  etFromDate(new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) || iso.length <= 10 ? iso : `${iso}Z`));
