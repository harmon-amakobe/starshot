//! Time scales, as `packages/ephemeris/test/ephemeris.test.ts` (time scales), plus the
//! ISO forms `et_from_iso` accepts and refuses (G17).

use starshot_ephemeris::time::days_from_civil;
use starshot_ephemeris::{
    TimeError, et_from_iso, et_from_jd_tdb, et_from_unix_ms, tt_minus_utc, unix_ms_from_et,
};

const DAY_MS: i64 = 86_400_000;

#[test]
fn j2000_is_2000_01_01t11_58_55_816z() {
    // toBeCloseTo(0, 3): within 0.0005 s.
    assert!(et_from_iso("2000-01-01T11:58:55.816Z").unwrap().abs() < 5e-4);
}

#[test]
fn a_utc_time_round_trips_through_et() {
    let ms = days_from_civil(2026, 10, 31) * DAY_MS + (20 * 60 + 52) * 60_000;
    assert_eq!(unix_ms_from_et(et_from_unix_ms(ms)), Some(ms));
    assert_eq!(
        et_from_iso("2026-10-31T20:52:00Z").unwrap(),
        et_from_unix_ms(ms)
    );
}

#[test]
fn every_utc_midnight_from_1800_to_2050_round_trips_to_the_millisecond() {
    let (first, last) = (
        days_from_civil(1800, 1, 1) * DAY_MS,
        days_from_civil(2050, 1, 1) * DAY_MS,
    );
    let mut checked = 0;
    for ms in (first..=last).step_by(7 * DAY_MS as usize) {
        assert_eq!(unix_ms_from_et(et_from_unix_ms(ms)), Some(ms), "{ms}");
        checked += 1;
    }
    assert_eq!(checked, 13045, "the TypeScript loop's count");
}

#[test]
fn tt_minus_utc_is_69_184_s_in_2026() {
    let et = et_from_iso("2026-10-31T00:00:00Z").unwrap();
    assert!((et - et_from_jd_tdb(2461344.5) - 69.184).abs() < 5e-4);
    assert_eq!(tt_minus_utc(1_790_000_000.0), 69.184);
    assert_eq!(tt_minus_utc(0.0), 42.184, "before 1972");
    assert_eq!(
        tt_minus_utc(f64::NAN),
        42.184,
        "NaN falls through the table, as in TypeScript"
    );
}

/// The UTC days from 1972 on that begin with a new TAI - UTC, as (year, month, TAI - UTC
/// in s), from IERS Bulletin C (<https://hpiers.obspm.fr/iers/bul/bulc/Leap_Second.dat>).
/// Written from the bulletin rather than from `src/time.rs`, so a wrong row there fails.
#[rustfmt::skip]
const BULLETIN_C: [(i64, i64, f64); 28] = [
    (1972, 1, 10.0), (1972, 7, 11.0), (1973, 1, 12.0), (1974, 1, 13.0), (1975, 1, 14.0),
    (1976, 1, 15.0), (1977, 1, 16.0), (1978, 1, 17.0), (1979, 1, 18.0), (1980, 1, 19.0),
    (1981, 7, 20.0), (1982, 7, 21.0), (1983, 7, 22.0), (1985, 7, 23.0), (1988, 1, 24.0),
    (1990, 1, 25.0), (1991, 1, 26.0), (1992, 7, 27.0), (1993, 7, 28.0), (1994, 7, 29.0),
    (1996, 1, 30.0), (1997, 7, 31.0), (1999, 1, 32.0), (2006, 1, 33.0), (2009, 1, 34.0),
    (2012, 7, 35.0), (2015, 7, 36.0), (2017, 1, 37.0),
];

#[test]
fn tt_minus_utc_steps_on_each_bulletin_c_day_and_not_a_millisecond_before() {
    // Before 1972 TAI - UTC was not a whole number of seconds; Starshot holds it at 10 s
    // there, as time.ts does, so the first row's millisecond before checks that offset.
    let mut before = 10.0;
    for (year, month, tai_minus_utc) in BULLETIN_C {
        let at = (days_from_civil(year, month, 1) * 86_400) as f64;
        let day = format!("{year}-{month:02}-01");
        assert_eq!(
            tt_minus_utc(at - 0.001),
            32.184 + before,
            "1 ms before {day}"
        );
        assert_eq!(tt_minus_utc(at), 32.184 + tai_minus_utc, "{day}");
        before = tai_minus_utc;
    }
}

#[test]
fn the_accepted_forms_name_the_same_instant() {
    let utc = et_from_iso("2026-11-02T01:00:00Z").unwrap();
    for text in [
        "2026-11-02T01:00:00",
        "2026-11-02T01:00:00.000Z",
        "2026-11-02T01:00:00.000",
        "2026-11-02T06:30:00+05:30",
        "2026-11-02T06:30:00+0530",
        "2026-11-01T20:00:00-05:00",
        "2026-11-01T20:00:00.000-0500",
    ] {
        assert_eq!(
            et_from_iso(text).map(f64::to_bits),
            Ok(utc.to_bits()),
            "{text}"
        );
    }
    assert_eq!(
        et_from_iso("2026-11-02").unwrap(),
        et_from_unix_ms(days_from_civil(2026, 11, 2) * DAY_MS)
    );
    assert_eq!(unix_ms_from_et(utc), Some(1_793_581_200_000));
    assert!(et_from_iso("2024-02-29").is_ok() && et_from_iso("2000-02-29").is_ok());
}

#[test]
fn every_other_text_is_refused_never_guessed() {
    use TimeError::{Format, Range};
    for (text, why) in [
        ("", Format),
        ("Nov 2 2026", Format),
        ("2026-11", Format),
        ("2026-11-02T01:00", Format),
        ("2026-11-02 01:00:00Z", Format),
        ("2026-11-02t01:00:00Z", Format),
        ("2026-11-02T01:00:00z", Format),
        ("2026-11-02T01:00:00.5Z", Format),
        ("2026-11-02T01:00:00.12345Z", Format),
        ("2026-11-02T01:00:00+05", Format),
        ("2026-11-02T01:00:00Z ", Format),
        ("+002026-11-02", Format),
        ("2026-11-02+05:00", Format),
        ("2026-02-30", Range),
        ("2023-02-29", Range),
        ("1900-02-29", Range),
        ("2026-13-01", Range),
        ("2026-00-10", Range),
        ("2026-11-00", Range),
        ("2026-11-02T24:00:00Z", Range),
        ("2026-11-02T01:60:00Z", Range),
        ("2026-11-02T01:00:60Z", Range),
        ("2026-11-02T01:00:00+24:00", Range),
    ] {
        assert_eq!(et_from_iso(text), Err(why), "{text:?}");
    }
}

#[test]
fn ms_outside_a_date_or_a_non_finite_et_has_no_utc_time() {
    assert!(et_from_unix_ms(8_640_000_000_000_001).is_nan());
    assert_eq!(unix_ms_from_et(f64::NAN), None);
    assert_eq!(unix_ms_from_et(f64::INFINITY), None);
    assert_eq!(unix_ms_from_et(1e16), None);
}
