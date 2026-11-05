//! Time scales, as `packages/ephemeris/src/time.ts`. Physics runs on ET: TDB seconds since
//! J2000.0 (2000-01-01 12:00:00 TDB), the SPICE convention. TDB is taken as TT = TAI +
//! 32.184 s, and TAI - UTC is the leap-second count; TT and TDB differ by under 2 ms.
//!
//! UTC enters only through `et_from_iso` and `et_from_unix_ms` and leaves only through
//! `unix_ms_from_et` (AGENTS.md, non-negotiable 1). Each keeps the TypeScript operation
//! order, so the same millisecond gives the same ET bits in Rust and in JavaScript.

use core::fmt;

pub const J2000_JD: f64 = 2451545.0;
pub const SECONDS_PER_DAY: f64 = 86400.0;
pub const DAYS_PER_JULIAN_CENTURY: f64 = 36525.0;
/// Unix epoch (1970-01-01T00:00:00Z) as a Julian date (UTC).
const UNIX_EPOCH_JD: f64 = 2440587.5;
/// The largest time JavaScript's `Date` holds, in ms either side of the Unix epoch.
const MAX_DATE_MS: f64 = 8.64e15;

/// Leap seconds (TAI - UTC) from 1972 on, as (Unix seconds, TAI - UTC), copied from
/// `time.ts`.
const LEAP_SECONDS: [(f64, f64); 28] = [
    (63072000.0, 10.0),
    (78796800.0, 11.0),
    (94694400.0, 12.0),
    (126230400.0, 13.0),
    (157766400.0, 14.0),
    (189302400.0, 15.0),
    (220924800.0, 16.0),
    (252460800.0, 17.0),
    (283996800.0, 18.0),
    (315532800.0, 19.0),
    (362793600.0, 20.0),
    (394329600.0, 21.0),
    (425865600.0, 22.0),
    (489024000.0, 23.0),
    (567993600.0, 24.0),
    (631152000.0, 25.0),
    (662688000.0, 26.0),
    (709948800.0, 27.0),
    (741484800.0, 28.0),
    (773020800.0, 29.0),
    (820454400.0, 30.0),
    (867715200.0, 31.0),
    (915148800.0, 32.0),
    (1136073600.0, 33.0),
    (1230768000.0, 34.0),
    (1341100800.0, 35.0),
    (1435708800.0, 36.0),
    (1483228800.0, 37.0),
];

/// TT - UTC in seconds at a Unix time: 32.184 s plus the leap seconds, 42.184 s before
/// 1972.
pub fn tt_minus_utc(unix_s: f64) -> f64 {
    let mut tai = 10.0;
    for &(t, n) in LEAP_SECONDS.iter() {
        if unix_s >= t {
            tai = n;
        } else {
            break;
        }
    }
    32.184 + tai
}

/// ET for a UTC time in whole milliseconds since the Unix epoch: `etFromDate` for a
/// `Date` whose `getTime()` is `ms`. NaN outside the range a `Date` can hold.
pub fn et_from_unix_ms(ms: i64) -> f64 {
    let ms = ms as f64;
    if ms.abs() > MAX_DATE_MS {
        return f64::NAN;
    }
    let unix = ms / 1000.0;
    let jd_utc = unix / SECONDS_PER_DAY + UNIX_EPOCH_JD;
    (jd_utc - J2000_JD) * SECONDS_PER_DAY + tt_minus_utc(unix)
}

/// UTC milliseconds since the Unix epoch for an ET, as `dateFromEt(et).getTime()`. None
/// for a non-finite ET or a time outside the range a `Date` can hold.
pub fn unix_ms_from_et(et: f64) -> Option<i64> {
    // One fixed-point step looks TT - UTC up at UTC plus TT - UTC, not at UTC. In the last
    // 42.184 to 68.184 s before each leap second (the TT - UTC then in force; 68.184 s
    // before 2017-01-01) the lookup already sees the new second, so a UTC time taken to ET
    // and back returns 1000 ms early. dateFromEt and unix_ms_from_et agree; table1.json
    // records it.
    let mut unix = (et / SECONDS_PER_DAY + J2000_JD - UNIX_EPOCH_JD) * SECONDS_PER_DAY;
    unix -= tt_minus_utc(unix);
    let ms = js_round(unix * 1000.0);
    if !ms.is_finite() || ms.abs() > MAX_DATE_MS {
        return None;
    }
    Some(ms as i64)
}

/// `Math.round`: halves go toward plus infinity. `f64::round` sends -2.5 to -3, and
/// `floor(x + 0.5)` sends 0.49999999999999994 to 1 (09-rust-supplement.md, PR9 edges);
/// times before 1970 are negative, so both would move a printed millisecond.
fn js_round(x: f64) -> f64 {
    let floor = x.floor();
    if x - floor >= 0.5 { floor + 1.0 } else { floor }
}

pub fn et_from_jd_tdb(jd_tdb: f64) -> f64 {
    (jd_tdb - J2000_JD) * SECONDS_PER_DAY
}

pub fn jd_tdb_from_et(et: f64) -> f64 {
    J2000_JD + et / SECONDS_PER_DAY
}

/// Days from 1970-01-01 to a date of the proleptic Gregorian calendar, in integers only
/// (H. Hinnant's days_from_civil), so no floating-point rounding enters a date.
pub const fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = (month + 9) % 12;
    let doy = (153 * mp + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

const fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        2 if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

/// Why `et_from_iso` refused a text.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimeError {
    /// Not one of the accepted forms (see `et_from_iso`).
    Format,
    /// The form is right but a field is not a real time, such as month 13, 30 February,
    /// hour 24 or second 60.
    Range,
}

impl fmt::Display for TimeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            TimeError::Format => "not an ISO 8601 UTC date or date-time Starshot accepts",
            TimeError::Range => "an ISO 8601 field is outside its calendar range",
        })
    }
}

impl std::error::Error for TimeError {}

/// The digits of `text[from..to]` as a number; None if any byte is not an ASCII digit.
fn digits(text: &[u8], from: usize, to: usize) -> Option<i64> {
    let field = text.get(from..to)?;
    field.iter().try_fold(0i64, |n, &b| {
        b.is_ascii_digit().then(|| n * 10 + i64::from(b - b'0'))
    })
}

/// ET for an ISO 8601 UTC text, as `etFromIso`. Accepted (G17, 09-rust-supplement.md):
/// `YYYY-MM-DD`, or `YYYY-MM-DDTHH:MM:SS` with an optional `.sss` (three digits), followed
/// by `Z`, nothing (read as UTC) or an offset `+hh:mm`, `+hhmm`, `-hh:mm` or `-hhmm`.
/// Everything else errs: `Date` reads other texts differently per engine and time zone,
/// and it rolls 30 February into March, so a guess would differ between runtimes.
pub fn et_from_iso(text: &str) -> Result<f64, TimeError> {
    let b = text.as_bytes();
    let sep = |i: usize, c: u8| b.get(i) == Some(&c);
    if b.len() < 10 || !sep(4, b'-') || !sep(7, b'-') {
        return Err(TimeError::Format);
    }
    let (year, month, day) = match (digits(b, 0, 4), digits(b, 5, 7), digits(b, 8, 10)) {
        (Some(y), Some(m), Some(d)) => (y, m, d),
        _ => return Err(TimeError::Format),
    };
    let (mut clock_ms, mut offset_ms, mut range_ok) = (0i64, 0i64, true);
    if b.len() > 10 {
        if !sep(10, b'T') || !sep(13, b':') || !sep(16, b':') {
            return Err(TimeError::Format);
        }
        let (Some(h), Some(mi), Some(s)) =
            (digits(b, 11, 13), digits(b, 14, 16), digits(b, 17, 19))
        else {
            return Err(TimeError::Format);
        };
        let mut at = 19;
        let mut frac = 0;
        if sep(at, b'.') {
            frac = digits(b, at + 1, at + 4).ok_or(TimeError::Format)?;
            at += 4;
        }
        match &b[at.min(b.len())..] {
            [] | [b'Z'] => {}
            [sign @ (b'+' | b'-'), rest @ ..] => {
                let (oh, om) = match rest {
                    [_, _, b':', _, _] => (digits(rest, 0, 2), digits(rest, 3, 5)),
                    [_, _, _, _] => (digits(rest, 0, 2), digits(rest, 2, 4)),
                    _ => (None, None),
                };
                let (Some(oh), Some(om)) = (oh, om) else {
                    return Err(TimeError::Format);
                };
                range_ok &= oh <= 23 && om <= 59;
                offset_ms = (oh * 3_600_000 + om * 60_000) * if *sign == b'-' { -1 } else { 1 };
            }
            _ => return Err(TimeError::Format),
        }
        range_ok &= h <= 23 && mi <= 59 && s <= 59;
        clock_ms = h * 3_600_000 + mi * 60_000 + s * 1000 + frac;
    }
    if !range_ok || !(1..=12).contains(&month) || day < 1 || day > days_in_month(year, month) {
        return Err(TimeError::Range);
    }
    // A local time at offset +hh:mm is that much ahead of UTC, so the offset comes off.
    Ok(et_from_unix_ms(
        days_from_civil(year, month, day) * 86_400_000 + clock_ms - offset_ms,
    ))
}

#[cfg(test)]
mod tests {
    #[test]
    fn js_round_sends_halves_toward_plus_infinity() {
        for (x, want) in [
            (-2.5, -2.0),
            (2.5, 3.0),
            (-0.5, 0.0),
            (0.49999999999999994, 0.0),
            (-1.5000000001, -2.0),
        ] {
            assert_eq!(super::js_round(x), want, "{x}");
        }
    }
}
