//! The aim, its grid and the launch-day grid. Each expected value is what the TypeScript
//! (`apps/game/src/sim/shot.ts`) returns on Node 22, but for the refusals: Rust refuses
//! dates that do not exist, partial dates and years outside 0 to 9999, which V8 rolls over.

use starshot_ephemeris::time::{TimeError, et_from_iso};
use starshot_game::{
    Aim, add_days_iso, aim_from_v_inf, days_between_iso, launch_et_for_day, normalize_deg,
    round_aim, v_inf_from_aim,
};

fn aim(angle_deg: f64, speed_km_s: f64) -> Aim {
    Aim {
        angle_deg,
        speed_km_s,
    }
}

#[test]
fn angles_normalize_into_one_turn() {
    for (deg, want) in [
        (-90.0, 270.0),
        (360.0, 0.0),
        (725.0, 5.0),
        (-0.0, 0.0),
        (359.5, 359.5),
    ] {
        assert_eq!(normalize_deg(deg).to_bits(), f64::to_bits(want), "{deg}");
    }
}

#[test]
fn round_aim_lands_on_the_controls_grid() {
    // The Grand Tour's hint vector reads 75.927 degrees and 9.8 km/s; the label shows the
    // grid's 75.93, the same double as the typed text.
    let hint = aim_from_v_inf([2.3829478446723424, 9.50586974293102, 0.0]);
    assert_eq!(round_aim(hint), aim("75.93".parse().unwrap(), 9.8));
    assert_eq!(round_aim(aim(75.9300001, 9.8000004)), aim(75.93, 9.8));
    // Within half a hundredth of a full turn wraps to 0; negative angles turn positive.
    assert_eq!(round_aim(aim(359.996, 1.0)), aim(0.0, 1.0));
    assert_eq!(round_aim(aim(-0.004, 1.0)), aim(0.0, 1.0));
    assert_eq!(round_aim(aim(-90.0, 1.0)), aim(270.0, 1.0));
    // Math.round sends halves toward plus infinity: -2.5 thousandths is -0.002, where
    // f64::round would give -0.003, and -0.5 thousandths is -0.
    let speeds = [
        (-0.0025, -0.002),
        (-0.0035, -0.003),
        (0.0005, 0.001),
        (-1.0005, -1.0),
    ];
    for (speed, want) in speeds {
        assert_eq!(round_aim(aim(0.0, speed)).speed_km_s, want, "{speed}");
    }
    assert_eq!(
        round_aim(aim(0.0, -0.0005)).speed_km_s.to_bits(),
        (-0.0f64).to_bits()
    );
    // Every grid angle is a fixed point.
    for h in 0..36000 {
        let a = aim(f64::from(h) / 100.0, 3.24);
        assert_eq!(round_aim(a), a);
    }
}

#[test]
fn aims_round_trip_through_the_excess_velocity() {
    for h in (0..36000).step_by(7) {
        for speed in [0.5, 2.982, 9.8, 20.0] {
            let a = aim(f64::from(h) / 100.0, speed);
            let v = v_inf_from_aim(a);
            assert_eq!(v[2].to_bits(), 0);
            let back = aim_from_v_inf(v);
            assert!((0.0..360.0).contains(&back.angle_deg), "{back:?}");
            assert_eq!(round_aim(back), a, "{a:?} came back as {back:?}");
            let turn = (back.angle_deg - a.angle_deg + 180.0).rem_euclid(360.0) - 180.0;
            assert!(
                turn.abs() < 1e-11 && (back.speed_km_s - speed).abs() < 1e-14,
                "{a:?}"
            );
        }
    }
}

#[test]
fn whole_days_are_counted_in_utc() {
    let cases = [
        ("2026-11-05", 1, "2026-11-06"),
        ("2028-02-28", 1, "2028-02-29"),
        ("2100-02-28", 1, "2100-03-01"),
        ("2026-01-01", -1, "2025-12-31"),
        ("2026-11-05T23:59:59Z", 0, "2026-11-05"),
        ("1977-08-10", 30, "1977-09-09"),
    ];
    for (from, days, want) in cases {
        assert_eq!(
            add_days_iso(from, days).as_deref(),
            Ok(want),
            "{from} + {days}"
        );
    }
    assert_eq!(add_days_iso("2026-02-30", 0), Err(TimeError::Range));
    assert_eq!(add_days_iso("9999-12-31", 1), Err(TimeError::Range));
    assert_eq!(add_days_iso("0001-01-01", -1), Ok("0000-12-31".to_owned()));
    assert_eq!(add_days_iso("0000-01-01", -1), Err(TimeError::Range));
    assert_eq!(add_days_iso("2026-11", 0), Err(TimeError::Format));
    assert_eq!(add_days_iso("2026-11-05", i64::MAX), Err(TimeError::Range));

    assert_eq!(days_between_iso("2026-10-15", "2026-11-02"), Ok(18));
    assert_eq!(days_between_iso("2026-11-02", "2026-10-15"), Ok(-18));
    assert_eq!(days_between_iso("2028-01-01", "2029-01-01"), Ok(366));
    assert_eq!(
        days_between_iso("2026-13-01", "2026-11-02"),
        Err(TimeError::Range)
    );
}

#[test]
fn launch_days_start_at_midnight_utc() {
    let et = launch_et_for_day("2026-10-15", 18).unwrap();
    assert_eq!(et.to_bits(), et_from_iso("2026-11-02").unwrap().to_bits());
    // UTC comes in through et_from_iso: the day that ends in a leap second lasts 86401 s.
    let leap =
        launch_et_for_day("2016-12-31", 1).unwrap() - launch_et_for_day("2016-12-31", 0).unwrap();
    assert_eq!(leap, 86401.0);
    assert_eq!(launch_et_for_day("2026-02-30", 0), Err(TimeError::Range));
}
