//! The sandbox, the framing bodies and the missions, as the sandbox cases of
//! `apps/game/src/levels.test.ts` and the mission order of `campaign/lunar.test.ts`: the
//! sandbox starts on today clamped to Table 1's range, flies the outer settings beyond
//! Mars only and flags a flight past 2050. `tests/levels.rs` ties the same values to the
//! TypeScript through `fixtures/conformance/levels.json` (D6).

use starshot_ephemeris::BodyId::{
    self, Earth, Jupiter, Mars, Mercury, Moon, Neptune, Saturn, Sun, Uranus, Venus,
};
use starshot_ephemeris::time::{TimeError, et_from_iso};
use starshot_ephemeris::{PLANET_IDS, Table1Ephemeris, Vec3};
use starshot_game::LevelId::{self, FirstLight, GrandTour, Sandbox};
use starshot_game::{
    Aim, CAMPAIGN, Level, LevelError, MISSION_ORDER, MOONSHOT, Mission, MissionId,
    OUTER_SIM_SETTINGS, SIM_SETTINGS, ShotAnalysis, analyze_shot, framing_bodies,
    launch_et_for_day, mission, mission_number, next_mission, sandbox_level, sandbox_start_iso,
    shot_request_for, simulate_shot, v_inf_from_aim,
};

const EPH: Table1Ephemeris = Table1Ephemeris { flatten: true };

fn by_id(id: LevelId) -> &'static Level<'static> {
    CAMPAIGN
        .iter()
        .find(|l| l.id == id)
        .expect("a campaign level")
}

/// The level's shot on day `day` of its window, flown and analysed.
fn fly(level: &Level, day: u32, v_inf: Vec3) -> ShotAnalysis {
    let et = launch_et_for_day(level.window.start_iso, day).expect("a launch day");
    let shot = shot_request_for(level, et, v_inf);
    let result = simulate_shot(&EPH, &shot).expect("a zone at least the real sphere");
    analyze_shot(&EPH, &shot, &result)
}

const TODAY: &str = "2026-11-02";

fn sandbox(target: BodyId, today_iso: &str) -> Level<'_> {
    sandbox_level(target, today_iso).expect("a planet on a real day")
}

#[test]
fn the_sandbox_starts_today_clamped_to_the_table_and_targets_planets_only() {
    let s = sandbox(Neptune, "2026-10-31");
    assert_eq!((s.window.start_iso, s.window.days), ("2026-10-31", 730));
    assert_eq!(s.default_launch_iso, "2026-10-31");
    assert!(s.par.is_none() && s.hint.is_none() && s.sandbox && s.id == Sandbox);
    assert!(s.attractors.contains(&Neptune) && s.capture_zone_scale == 1.0);
    let clamps = [
        ("2077-01-01", "2048-01-01"),
        ("9999-12-31", "2048-01-01"),
        ("2048-01-02", "2048-01-01"),
        ("2048-01-01", "2048-01-01"),
        ("1800-01-01", "1800-01-01"),
        ("1799-12-31", "1800-01-01"),
        ("0000-01-01", "1800-01-01"),
    ];
    for (today, start) in clamps {
        assert_eq!(sandbox_start_iso(today), Ok(start), "{today}");
    }
    // Today is a day alone, and a real one: no clock time and no rolled-over 30 February.
    let format = Err(LevelError::Date(TimeError::Format));
    for today in [
        "2026-11-02T00:00:00Z",
        "2026-11-2",
        "20261102",
        "",
        "2026/11/02",
    ] {
        assert_eq!(sandbox_level(Mars, today), format, "{today}");
    }
    let range = Err(LevelError::Date(TimeError::Range));
    for today in ["2026-02-30", "2026-13-01", "2026-00-10"] {
        assert_eq!(sandbox_level(Mars, today), range, "{today}");
    }
    for body in [Sun, Moon] {
        assert_eq!(
            sandbox_level(body, TODAY),
            Err(LevelError::SandboxTarget(body))
        );
    }
}

#[test]
fn the_sandbox_flies_the_outer_settings_beyond_mars_only() {
    for target in [Mercury, Venus, Mars] {
        let s = sandbox(target, TODAY);
        assert_eq!(s.sim, SIM_SETTINGS, "{target:?}");
        assert!(s.attractors.contains(&Venus), "{target:?}");
    }
    for target in [Jupiter, Saturn, Uranus, Neptune] {
        let s = sandbox(target, TODAY);
        assert_eq!(s.sim, OUTER_SIM_SETTINGS, "{target:?}");
        assert_eq!(s.attractors, [Earth, Jupiter, Saturn, Uranus, Neptune]);
    }
    // Mercury pulls only when it is the target.
    assert_eq!(sandbox(Mercury, TODAY).attractors, PLANET_IDS);
    assert!(!sandbox(Venus, TODAY).attractors.contains(&Mercury));
}

#[test]
fn a_sandbox_flight_past_2050_is_flagged() {
    let late = sandbox(Neptune, "2047-06-01");
    let aim = Aim {
        angle_deg: 200.0,
        speed_km_s: 3.0,
    };
    let a = fly(&late, 0, v_inf_from_aim(aim));
    let limit = et_from_iso("2050-01-01").expect("a date");
    assert!(a.end_et > limit && a.beyond_ephemeris_range, "{a:?}");
    // `levels.test.ts`'s First Light known solution, 2026-11-02, ends inside the table.
    let first = fly(by_id(FirstLight), 18, [-1.815327, 2.36578, 0.0]);
    assert!(first.hit && !first.beyond_ephemeris_range, "{first:?}");
}

#[test]
fn framing_bodies_are_earth_the_target_and_the_flyby_once_each() {
    assert_eq!(framing_bodies(by_id(GrandTour)), [Earth, Saturn, Jupiter]);
    assert_eq!(framing_bodies(by_id(FirstLight)), [Earth, Mars]);
    assert_eq!(framing_bodies(&sandbox(Earth, TODAY)), [Earth]);
    let flyby_is_target = Level {
        required_flyby: Some(Saturn),
        ..*by_id(GrandTour)
    };
    assert_eq!(framing_bodies(&flyby_is_target), [Earth, Saturn]);
}

#[test]
fn missions_run_from_the_moonshot_through_the_campaign() {
    assert_eq!(
        mission(MissionId::Moonshot),
        Some(Mission::Lunar(&MOONSHOT))
    );
    for (level, id) in CAMPAIGN.iter().zip(&MISSION_ORDER[1..]) {
        assert_eq!(mission(*id), Some(Mission::Planetary(level)));
    }
    let sandbox = MissionId::Level(Sandbox);
    assert_eq!((mission(sandbox), next_mission(sandbox)), (None, None));
    assert_eq!(mission_number(sandbox), 0);
    let next = next_mission(MissionId::Moonshot).map(Mission::id);
    assert_eq!(next, Some(MissionId::Level(FirstLight)));
    assert_eq!(next_mission(MissionId::Level(GrandTour)), None);
    // The Moonshot's par is its reference burn, at the default tolerance.
    assert_eq!(
        (MOONSHOT.par.delta_v_km_s, MOONSHOT.par_tolerance),
        (3.24, 1.1)
    );
    assert_eq!((MOONSHOT.target, MOONSHOT.attractors), (Moon, &[Earth][..]));
}
