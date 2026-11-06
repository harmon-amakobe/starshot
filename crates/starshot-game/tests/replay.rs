//! Replays and the physics version (D16, D43). The stored hashes were computed apart from
//! this crate, with Python's `struct.pack('<dddI', ...)` and the FNV-1a 64 constants.

use serde_json::Value;
use starshot_game::replay::{MOON_RAIL_SOURCE_SHA256, TABLE1_SOURCE, rails_source};
use starshot_game::settings::{OUTER_SIM_SETTINGS, SIM_SETTINGS, SimSettings, lunar};
use starshot_game::{LunarReplay, Replay, lunar_physics_version, physics_version};
use starshot_physics::lunar::{LAUNCH_ET, LunarSettings};

const RAIL: &str = include_str!("../../../packages/ephemeris/data/moon-rail.json");

#[test]
fn versions_equal_their_stored_strings() {
    let table1 = physics_version(&SIM_SETTINGS, TABLE1_SOURCE);
    assert_eq!(
        table1,
        concat!(env!("CARGO_PKG_VERSION"), "+0a48670bdb6aa76b+table1")
    );
    let outer = physics_version(&OUTER_SIM_SETTINGS, &rails_source(0x0123_4567_89ab_cdef));
    assert_eq!(
        outer,
        concat!(
            env!("CARGO_PKG_VERSION"),
            "+9bce1e01c271e555+de440s-100km/0123456789abcdef"
        )
    );
    let moon = lunar_physics_version(&lunar::SETTINGS);
    let source = format!("+27927179948bd894+moon-rail/{MOON_RAIL_SOURCE_SHA256}");
    assert_eq!(moon, format!("{}{source}", env!("CARGO_PKG_VERSION")));
}

#[test]
fn the_lunar_version_names_the_rail_the_flights_read() {
    let rail: Value = serde_json::from_str(RAIL).expect("the rail is valid JSON");
    assert_eq!(rail["sourceSha256"].as_str(), Some(MOON_RAIL_SOURCE_SHA256));
}

#[test]
fn every_setting_changes_the_version() {
    let s = SIM_SETTINGS;
    let base = physics_version(&s, TABLE1_SOURCE);
    let changed = [
        SimSettings {
            rtol: s.rtol.next_up(),
            ..s
        },
        SimSettings {
            atol_km: s.atol_km.next_up(),
            ..s
        },
        SimSettings {
            max_step: s.max_step.next_up(),
            ..s
        },
        SimSettings {
            max_steps: s.max_steps + 1,
            ..s
        },
        SimSettings {
            max_steps: s.max_steps - 1,
            ..s
        },
    ];
    for c in changed {
        assert_ne!(physics_version(&c, TABLE1_SOURCE), base, "{c:?}");
    }
    assert_ne!(physics_version(&s, &rails_source(0)), base);

    let l = lunar::SETTINGS;
    let base = lunar_physics_version(&l);
    let changed = [
        LunarSettings {
            rtol: l.rtol.next_up(),
            ..l
        },
        LunarSettings {
            atol_pos: l.atol_pos.next_up(),
            ..l
        },
        LunarSettings {
            atol_vel: l.atol_vel.next_up(),
            ..l
        },
        LunarSettings {
            max_step: l.max_step.next_up(),
            ..l
        },
        LunarSettings {
            max_steps: l.max_steps + 1,
            ..l
        },
        LunarSettings {
            max_steps: l.max_steps - 1,
            ..l
        },
        LunarSettings {
            near_body_fraction: l.near_body_fraction.next_up(),
            ..l
        },
    ];
    for c in changed {
        assert_ne!(lunar_physics_version(&c), base, "{c:?}");
    }
}

/// Values a 15-digit decimal string would move, a negative zero and the least subnormal.
const AWKWARD: [f64; 6] = [
    0.1 + 0.2,
    -0.0,
    5e-324,
    2.3829478446723424,
    9.50586974293102,
    f64::MAX,
];

#[test]
fn replays_round_trip_exact_bits() {
    assert_eq!(Replay::FORMAT, "starshot.replay/1");
    assert_eq!(LunarReplay::FORMAT, "starshot.lunar-replay/1");
    let version = physics_version(&SIM_SETTINGS, TABLE1_SOURCE);
    for x in AWKWARD {
        for y in AWKWARD {
            let r = Replay::new("grand-tour", 30, [x, y, 0.0], version.clone());
            assert_eq!((r.v_inf_x_bits, r.v_inf_y_bits), (x.to_bits(), y.to_bits()));
            assert_eq!(r.v_inf().map(f64::to_bits), [x.to_bits(), y.to_bits(), 0]);
            assert_eq!((r.level_id.as_str(), r.launch_day), ("grand-tour", 30));
            assert_eq!(r.clone(), r);
        }
    }
    // A sub-day launch, as the Moonshot allows (D43).
    let version = lunar_physics_version(&lunar::SETTINGS);
    for x in AWKWARD {
        let launch = LAUNCH_ET + 8.004;
        let r = LunarReplay::new("moonshot", launch, x, -x, version.clone());
        assert_eq!(r.launch_et().to_bits(), launch.to_bits());
        assert_eq!(r.speed_km_s().to_bits(), x.to_bits());
        assert_eq!(r.angle_deg().to_bits(), (-x).to_bits());
        assert_eq!(
            (r.mission_id.as_str(), r.physics_version.as_str()),
            ("moonshot", version.as_str())
        );
    }
}
