//! Replays and the physics version (D16, D43). The stored hashes were computed apart from
//! this crate, with Python's `struct.pack('<dddI', ...)` and the FNV-1a 64 constants. Each
//! kind of replay rebuilds the request it recorded, bit for bit, and refuses one it cannot.

use serde_json::Value;
use starshot_ephemeris::BodyId::Saturn;
use starshot_game::replay::{MOON_RAIL_SOURCE_SHA256, TABLE1_SOURCE, rails_source};
use starshot_game::settings::{OUTER_SIM_SETTINGS, SIM_SETTINGS, SimSettings, lunar};
use starshot_game::{
    Aim, BurnAngleError, CAMPAIGN, LevelError, LunarReplay, Replay, launch_et_for_day,
    lunar_physics_version, lunar_replay_request, lunar_request, physics_version, replay_request,
    sandbox_level, shot_request_for,
};
use starshot_physics::lunar::{DAY, EARTH_RADIUS, LAUNCH_ET, LunarSettings, ParkingOrbit};

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
    // A sub-day launch from a paused, re-dated parking orbit, as the Moonshot allows (D43).
    let version = lunar_physics_version(&lunar::SETTINGS);
    for x in AWKWARD {
        let launch = LAUNCH_ET + 8.004;
        let (epoch, phase) = (launch - 1234.5, 3.0 * x);
        let r = LunarReplay::new("moonshot", launch, x, -x, epoch, phase, version.clone());
        assert_eq!(r.parking_epoch_et().to_bits(), epoch.to_bits());
        assert_eq!(r.parking_phase_deg().to_bits(), phase.to_bits());
        assert_eq!(r.launch_et().to_bits(), launch.to_bits());
        assert_eq!(r.speed_km_s().to_bits(), x.to_bits());
        assert_eq!(r.angle_deg().to_bits(), (-x).to_bits());
        assert_eq!(
            (r.mission_id.as_str(), r.physics_version.as_str()),
            ("moonshot", version.as_str())
        );
    }
}

#[test]
fn a_planetary_replay_rebuilds_its_request_and_refuses_another_level_or_day() {
    let mut levels = CAMPAIGN.to_vec();
    // An outer sandbox, whose settings differ from the campaign's.
    levels.push(sandbox_level(Saturn, "2027-05-20").expect("a planet on a real day"));
    for level in &levels {
        let id = level.id.as_str();
        let version = physics_version(&level.sim, TABLE1_SOURCE);
        let last = level.window.days;
        for (day, v_inf) in [
            (0, [AWKWARD[0], AWKWARD[1], 0.0]),
            (last, [AWKWARD[3], AWKWARD[4], 0.0]),
        ] {
            let replay = Replay::new(id, day, v_inf, version.clone());
            let et = launch_et_for_day(level.window.start_iso, day).expect("a launch day");
            let want = shot_request_for(level, et, v_inf);
            let got = replay_request(level, &replay).expect("its own level's replay");
            // Debug prints each f64 so that it reads back to the same bits, -0.0 too.
            assert_eq!(format!("{got:?}"), format!("{want:?}"), "{id} day {day}");
        }
        for day in [last + 1, u32::MAX] {
            let late = Replay::new(id, day, [1.0, 2.0, 0.0], version.clone());
            let refused = Err(LevelError::LaunchDay { day, days: last });
            assert_eq!(replay_request(level, &late), refused, "{id}");
        }
        for other in levels.iter().filter(|o| o.id != level.id) {
            let replay = Replay::new(other.id.as_str(), 0, [1.0, 2.0, 0.0], version.clone());
            let refused = Err(LevelError::OtherLevel {
                replay: other.id.as_str().to_owned(),
                level: level.id,
            });
            assert_eq!(replay_request(level, &replay), refused, "{id}");
        }
    }
}

#[test]
fn a_lunar_replay_rebuilds_a_re_dated_shot_bit_for_bit() {
    let version = lunar_physics_version(&lunar::SETTINGS);
    let fresh = ParkingOrbit {
        frame_et: Some(LAUNCH_ET),
        epoch_et: LAUNCH_ET,
        phase_deg: 225.0,
        radius_km: EARTH_RADIUS + 200.0,
    };
    // Paused mid-window, the orbit re-dated to the pause with the phase it had reached,
    // then launched later; and a launch at the re-dated epoch itself (D43's note).
    let launch = LAUNCH_ET + 3.0 * DAY + 8.004;
    let paused = [(launch - 1234.5, 226.53125), (launch, AWKWARD[0])];
    let aim = Aim {
        angle_deg: -17.33167459468716,
        speed_km_s: AWKWARD[3],
    };
    for (epoch_et, phase_deg) in paused {
        let parking = ParkingOrbit {
            epoch_et,
            phase_deg,
            ..fresh
        };
        let want = lunar_request(launch, aim, parking).expect("within 35 degrees");
        let (speed, angle) = (aim.speed_km_s, aim.angle_deg);
        let replay = LunarReplay::new(
            "moonshot",
            launch,
            speed,
            angle,
            epoch_et,
            phase_deg,
            version.clone(),
        );
        let got = lunar_replay_request(&replay).expect("the Moonshot");
        assert_eq!(format!("{got:?}"), format!("{want:?}"), "{epoch_et}");
        // The re-dated orbit reaches the request: from the fresh one it differs.
        assert_ne!(lunar_request(launch, aim, fresh), Ok(got), "{epoch_et}");
    }
    let replay = |mission: &str, angle: f64| {
        let v = version.clone();
        LunarReplay::new(mission, launch, 3.24, angle, launch, 225.0, v)
    };
    for mission in ["first-light", "Moonshot", "sandbox", ""] {
        let refused = Err(LevelError::UnknownMission(mission.to_owned()));
        assert_eq!(lunar_replay_request(&replay(mission, 0.0)), refused);
    }
    let wide = Err(LevelError::BurnAngle(BurnAngleError(35.001)));
    assert_eq!(lunar_replay_request(&replay("moonshot", 35.001)), wide);
}
