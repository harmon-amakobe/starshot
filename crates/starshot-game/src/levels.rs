//! The campaign's physics, as `apps/game/src/levels.ts`. Every launch window is a real
//! one, found with the Lambert search (`best_direct_transfer`) over JPL's Table 1, and
//! every level carries a known solution that `tests/levels.rs` flies with the level's
//! own settings. A level's copy (number, title, blurb, the par's source text) stays in
//! TypeScript, where the copy gate reads it; `tests/levels.rs` ties every number here to
//! the TypeScript's through `fixtures/conformance/levels.json` (D6).
//!
//! The sandbox, the missions of `missions.ts` and the requests a replay flies live here
//! too. The sandbox takes today's date as an argument, since the core reads no clock.

use crate::aim::Aim;
use crate::days::launch_et_for_day;
use crate::hint::{HintQuery, KnownShot};
use crate::lunar::{BurnAngleError, LunarShotRequest, lunar_request};
use crate::replay::{LunarReplay, Replay};
use crate::settings::{OUTER_SIM_SETTINGS, SIM_SETTINGS, SimSettings, lunar};
use crate::shot::{ShotRequest, ShotTemplate};
use core::fmt;
use starshot_ephemeris::BodyId::{
    Earth, Jupiter, Mars, Mercury, Moon, Neptune, Saturn, Sun, Uranus, Venus,
};
use starshot_ephemeris::time::{TimeError, et_from_iso};
use starshot_ephemeris::{BodyId, PLANET_IDS, Vec3};
use starshot_physics::lunar::{EARTH_RADIUS, FUEL_BUDGET, LAUNCH_ET, LunarSettings, ParkingOrbit};

/// The default efficiency-star tolerance on the par delta-v, as `levels.ts` declares it.
pub const DEFAULT_PAR_TOLERANCE: f64 = 1.1;

/// A level's id, as the TypeScript `LevelId`. The Moonshot is a mission, not a level.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum LevelId {
    FirstLight,
    MorningStar,
    BigGame,
    GrandTour,
    Sandbox,
}

impl LevelId {
    /// The TypeScript id, which saves and replays store.
    pub fn as_str(self) -> &'static str {
        match self {
            LevelId::FirstLight => "first-light",
            LevelId::MorningStar => "morning-star",
            LevelId::BigGame => "big-game",
            LevelId::GrandTour => "grand-tour",
            LevelId::Sandbox => "sandbox",
        }
    }
}

/// The days a level can launch on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LaunchWindow<'a> {
    /// The first launch date (00:00 UTC).
    pub start_iso: &'a str,
    /// Launch days run from 0 to `days`, both included.
    pub days: u32,
}

/// The reference shot a level's efficiency star is measured against.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Par {
    /// Delta-v from a 200 km parking orbit [km/s], rounded to 0.01 as `levels.ts` rounds
    /// it. `tests/levels.rs` rounds each reference speed again to check the literal.
    pub delta_v_km_s: f64,
}

/// One level's physics. The fields TypeScript leaves optional and reads through
/// `parToleranceOf` and `captureZoneScaleOf` carry those defaults here, as `ShotRequest`
/// carries the capture-zone scale.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Level<'a> {
    pub id: LevelId,
    pub window: LaunchWindow<'a>,
    pub default_launch_iso: &'a str,
    pub target: BodyId,
    pub max_flight_days: f64,
    /// Departure excess speed cap, a full slingshot pull [km/s].
    pub v_inf_max_km_s: f64,
    /// Planets whose gravity acts on the probe; the Sun always does.
    pub attractors: &'static [BodyId],
    /// A planet to fly through (inside its sphere of influence) on the way.
    pub required_flyby: Option<BodyId>,
    /// None in the sandbox, which awards no efficiency star.
    pub par: Option<Par>,
    /// The efficiency star needs delta-v up to par times this: `DEFAULT_PAR_TOLERANCE` unless the
    /// speed cap would hand the star to every hit.
    pub par_tolerance: f64,
    /// Capture-zone radius as a multiple of the target's real sphere of influence: 1 but
    /// on the training level, and never below 1, which `simulate_shot` refuses.
    pub capture_zone_scale: f64,
    /// The level's integrator settings: the same for its preview, launch and hint (D6).
    pub sim: SimSettings,
    /// A curated hint, for a level whose answer is not a direct transfer.
    pub hint: Option<KnownShot>,
    pub sandbox: bool,
}

/// A Voyager-2-like Grand Tour shot, 75.93 degrees at 9.800 km/s on 1977-08-20, as the
/// hint label shows it: a Jupiter flyby on 1979-07-03 and Saturn's capture zone on
/// 1981-07-01 in the flat world, as both engines fly it (levels.ts still says 06-26). The vector is `levels.ts`'s, digit for digit.
pub const GRAND_TOUR_HINT: KnownShot = KnownShot {
    launch_iso: "1977-08-20",
    v_inf: [2.3829478446723424, 9.50586974293102, 0.0],
};

/// The Grand Tour's par shot, 68.43 degrees at 9.100 km/s on 1977-09-02: the cheapest
/// Jupiter-assisted hit `levels.ts` records on its search grid (Saturn after 1,676 days).
pub const GRAND_TOUR_PAR_SHOT: KnownShot = KnownShot {
    launch_iso: "1977-09-02",
    v_inf: [3.345503, 8.462719, 0.0],
};

/// The four campaign levels in `levels.ts`'s order, with its values. Each par is the
/// TypeScript's `par(v)`, rounded from the reference excess speed in its comment.
pub static CAMPAIGN: [Level<'static>; 4] = [
    Level {
        id: LevelId::FirstLight,
        window: LaunchWindow {
            start_iso: "2026-10-15",
            days: 90,
        },
        default_launch_iso: "2026-11-05",
        target: Mars,
        max_flight_days: 400.0,
        v_inf_max_km_s: 6.0,
        attractors: &[Earth, Mars, Jupiter],
        required_flyby: None,
        // 2.982 km/s, the window's cheapest direct transfer (D11).
        par: Some(Par { delta_v_km_s: 3.62 }),
        par_tolerance: DEFAULT_PAR_TOLERANCE,
        // Training: three times Mars's real sphere of influence, as the HUD says.
        capture_zone_scale: 3.0,
        sim: SIM_SETTINGS,
        hint: None,
        sandbox: false,
    },
    Level {
        id: LevelId::MorningStar,
        window: LaunchWindow {
            start_iso: "2028-01-20",
            days: 90,
        },
        default_launch_iso: "2028-02-01",
        target: Venus,
        max_flight_days: 300.0,
        v_inf_max_km_s: 5.0,
        attractors: &[Mercury, Venus, Earth],
        required_flyby: None,
        // 2.528 km/s.
        par: Some(Par { delta_v_km_s: 3.51 }),
        par_tolerance: DEFAULT_PAR_TOLERANCE,
        capture_zone_scale: 1.0,
        sim: SIM_SETTINGS,
        hint: None,
        sandbox: false,
    },
    Level {
        id: LevelId::BigGame,
        window: LaunchWindow {
            start_iso: "2028-11-20",
            days: 90,
        },
        default_launch_iso: "2028-12-01",
        target: Jupiter,
        max_flight_days: 1300.0,
        v_inf_max_km_s: 12.0,
        attractors: &[Earth, Mars, Jupiter, Saturn],
        required_flyby: None,
        // 8.693 km/s.
        par: Some(Par { delta_v_km_s: 6.24 }),
        par_tolerance: DEFAULT_PAR_TOLERANCE,
        capture_zone_scale: 1.0,
        sim: SIM_SETTINGS,
        hint: None,
        sandbox: false,
    },
    Level {
        id: LevelId::GrandTour,
        window: LaunchWindow {
            start_iso: "1977-08-10",
            days: 30,
        },
        default_launch_iso: "1977-08-20",
        target: Saturn,
        max_flight_days: 1700.0,
        v_inf_max_km_s: 10.5,
        attractors: &[Earth, Jupiter, Saturn],
        required_flyby: Some(Jupiter),
        // 9.1 km/s, GRAND_TOUR_PAR_SHOT's speed.
        par: Some(Par { delta_v_km_s: 6.5 }),
        // 105% of par allows up to 9.60 km/s for the star; 110% would allow 10.09, nearly
        // the 10.5 km/s cap.
        par_tolerance: 1.05,
        capture_zone_scale: 1.0,
        sim: SIM_SETTINGS,
        hint: Some(GRAND_TOUR_HINT),
        sandbox: false,
    },
];

/// The level's shot without launch time and aim; the preview, the launch, the hint and
/// the tests all start here.
pub fn shot_template(level: &Level) -> ShotTemplate {
    ShotTemplate {
        target: level.target,
        attractors: level.attractors.to_vec(),
        max_flight_days: level.max_flight_days,
        required_flyby: level.required_flyby,
        sim: level.sim,
        capture_zone_scale: level.capture_zone_scale,
    }
}

/// The level's request for one launch time [s ET] and excess velocity [km/s].
pub fn shot_request_for(level: &Level, launch_et: f64, v_inf: Vec3) -> ShotRequest {
    shot_template(level).request(launch_et, v_inf)
}

/// The hint search for a level, run with the level's own shot settings and the default
/// budget.
pub fn hint_query_for<'a>(level: &Level<'a>) -> HintQuery<'a> {
    HintQuery {
        shot: shot_template(level),
        window_start_iso: level.window.start_iso,
        window_days: level.window.days,
        v_inf_max_km_s: level.v_inf_max_km_s,
        curated: level.hint,
        max_simulations: None,
    }
}

/// Why a level, a mission or a replay's request could not be built.
#[derive(Debug, Clone, PartialEq)]
pub enum LevelError {
    /// A date that is not a real `YYYY-MM-DD` day: today's for the sandbox, or a window's.
    Date(TimeError),
    /// The Sun or the Moon: the sandbox targets planets, and Table 1 has no Moon.
    SandboxTarget(BodyId),
    /// A replay recorded on another level.
    OtherLevel { replay: String, level: LevelId },
    /// A launch day past the window's last.
    LaunchDay { day: u32, days: u32 },
    /// A lunar replay of a mission that is not a Moon mission.
    UnknownMission(String),
    /// A lunar replay's burn more than 35 degrees from prograde.
    BurnAngle(BurnAngleError),
}

impl fmt::Display for LevelError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LevelError::Date(e) => write!(f, "a level date must be a real YYYY-MM-DD day: {e}"),
            LevelError::SandboxTarget(body) => {
                write!(f, "the sandbox targets planets, not the {}", body.name())
            }
            LevelError::OtherLevel { replay, level } => {
                write!(f, "a replay of {replay} cannot fly on {}", level.as_str())
            }
            LevelError::LaunchDay { day, days } => {
                write!(
                    f,
                    "launch day {day} is outside the window's days 0 to {days}"
                )
            }
            LevelError::UnknownMission(id) => write!(f, "no Moon mission is called {id}"),
            LevelError::BurnAngle(e) => e.fmt(f),
        }
    }
}

impl std::error::Error for LevelError {}

/// The sandbox's first and last window start. JPL's Table 1 is valid from 1800 to 2050,
/// so a two-year window opened on the last start still launches inside it; a flight that
/// ends later is flagged, not refused.
pub const SANDBOX_EARLIEST_START: &str = "1800-01-01";
pub const SANDBOX_LATEST_START: &str = "2048-01-01";

/// The planets the sandbox offers: all but Earth, which every shot leaves.
pub const SANDBOX_TARGETS: [BodyId; 7] = [Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune];

/// Targets beyond Mars: 5 to 14 year flights, flown with `OUTER_SIM_SETTINGS`.
const OUTER_TARGETS: [BodyId; 4] = [Jupiter, Saturn, Uranus, Neptune];

/// An outer target's attractors: Earth and the giants. Mercury, Venus and Mars move a 5
/// to 14 year flight to a 48 to 87 million km capture zone far less than the aim
/// resolution does, and leaving them out keeps the preview fast.
const OUTER_ATTRACTORS: [BodyId; 5] = [Earth, Jupiter, Saturn, Uranus, Neptune];

/// An inner target's attractors: every planet but Mercury, which is tiny and the fastest
/// orbit to evaluate. Mercury as the target pulls, through `PLANET_IDS`.
const INNER_ATTRACTORS: [BodyId; 7] = [Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune];

/// A sandbox flight's limit [days], long enough for slow transfers: Voyager 2 took about
/// 8.5 years to Uranus and 12 to Neptune. Earth keeps `levels.ts`'s 800 days, though the
/// sandbox never offers it. None for the Sun and the Moon.
fn sandbox_max_flight_days(target: BodyId) -> Option<f64> {
    match target {
        Mercury | Venus => Some(400.0),
        Earth | Mars => Some(800.0),
        Jupiter => Some(2000.0),
        Saturn => Some(2600.0),
        Uranus => Some(4000.0),
        Neptune => Some(5000.0),
        Sun | Moon => None,
    }
}

/// The sandbox's window start for `today_iso`, a strict `YYYY-MM-DD` UTC day the caller
/// reads from its clock, clamped to the sandbox's starts, as `sandboxStartIso`. A
/// date-time, a short field or a day like 30 February errs.
pub fn sandbox_start_iso(today_iso: &str) -> Result<&str, LevelError> {
    // `et_from_iso` also takes a date-time; the sandbox takes the day alone.
    if today_iso.len() != 10 {
        return Err(LevelError::Date(TimeError::Format));
    }
    et_from_iso(today_iso).map_err(LevelError::Date)?;
    // Four-digit years, so the texts compare in date order, as `levels.ts` compares them.
    Ok(today_iso.clamp(SANDBOX_EARLIEST_START, SANDBOX_LATEST_START))
}

/// Free play from today, as `sandboxLevel`: a two-year window, a 20 km/s cap, no par and
/// no hint. Targets beyond Mars fly `OUTER_SIM_SETTINGS` under Earth and the giants; the
/// rest fly `SIM_SETTINGS`, as the campaign does (D6).
pub fn sandbox_level(target: BodyId, today_iso: &str) -> Result<Level<'_>, LevelError> {
    let max_flight_days =
        sandbox_max_flight_days(target).ok_or(LevelError::SandboxTarget(target))?;
    let start_iso = sandbox_start_iso(today_iso)?;
    let outer = OUTER_TARGETS.contains(&target);
    let attractors: &'static [BodyId] = match target {
        _ if outer => &OUTER_ATTRACTORS,
        Mercury => &PLANET_IDS,
        _ => &INNER_ATTRACTORS,
    };
    Ok(Level {
        id: LevelId::Sandbox,
        window: LaunchWindow {
            start_iso,
            days: 730,
        },
        default_launch_iso: start_iso,
        target,
        max_flight_days,
        v_inf_max_km_s: 20.0,
        attractors,
        required_flyby: None,
        par: None,
        par_tolerance: DEFAULT_PAR_TOLERANCE,
        capture_zone_scale: 1.0,
        sim: if outer {
            OUTER_SIM_SETTINGS
        } else {
            SIM_SETTINGS
        },
        hint: None,
        sandbox: true,
    })
}

/// The planets whose orbits frame the view, as `framingBodies`: Earth, the target and any
/// required flyby, each once and in that order.
pub fn framing_bodies(level: &Level) -> Vec<BodyId> {
    let mut bodies = vec![Earth];
    for body in [Some(level.target), level.required_flyby]
        .into_iter()
        .flatten()
    {
        if !bodies.contains(&body) {
            bodies.push(body);
        }
    }
    bodies
}

/// A mission's id, as the TypeScript `MissionId`: a level, or the Moonshot, which `LevelId`
/// leaves out.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MissionId {
    Moonshot,
    Level(LevelId),
}

impl MissionId {
    /// The TypeScript id, which saves and replays store.
    pub fn as_str(self) -> &'static str {
        match self {
            MissionId::Moonshot => "moonshot",
            MissionId::Level(id) => id.as_str(),
        }
    }
}

/// The Moonshot's physics, as `MOONSHOT` in `missions.ts`. It flies the Moon rail with the
/// lunar settings, so it is not a `Level`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LunarLevel {
    pub window: LaunchWindow<'static>,
    pub default_launch_iso: &'static str,
    pub target: BodyId,
    pub max_flight_days: f64,
    /// The largest burn [km/s]: the fuel budget, in the slot of a level's speed cap.
    pub burn_cap_km_s: f64,
    pub attractors: &'static [BodyId],
    pub sim: LunarSettings,
    /// The burn of the measured reference, 3.240 km/s prograde on 2026-11-02 at 01:00 UTC
    /// from phase 225 degrees; not a claimed optimum.
    pub par: Par,
    pub par_tolerance: f64,
}

/// The first mission: from a 200 km Earth orbit to the Moon's sphere of influence.
pub static MOONSHOT: LunarLevel = LunarLevel {
    window: LaunchWindow {
        start_iso: "2026-11-02",
        days: 27,
    },
    default_launch_iso: "2026-11-02",
    target: Moon,
    max_flight_days: 7.0,
    burn_cap_km_s: FUEL_BUDGET,
    attractors: &[Earth],
    sim: lunar::SETTINGS,
    par: Par { delta_v_km_s: 3.24 },
    par_tolerance: DEFAULT_PAR_TOLERANCE,
};

/// A mission: the Moonshot or a campaign level.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Mission {
    Lunar(&'static LunarLevel),
    Planetary(&'static Level<'static>),
}

impl Mission {
    pub fn id(self) -> MissionId {
        match self {
            Mission::Lunar(_) => MissionId::Moonshot,
            Mission::Planetary(level) => MissionId::Level(level.id),
        }
    }
}

/// The campaign order (D33). Mission numbers and the next mission come from it, never
/// from a list position.
pub const MISSION_ORDER: [MissionId; 5] = [
    MissionId::Moonshot,
    MissionId::Level(LevelId::FirstLight),
    MissionId::Level(LevelId::MorningStar),
    MissionId::Level(LevelId::BigGame),
    MissionId::Level(LevelId::GrandTour),
];

/// The mission with this id; none for the sandbox, which is built for a target and a day.
pub fn mission(id: MissionId) -> Option<Mission> {
    match id {
        MissionId::Moonshot => Some(Mission::Lunar(&MOONSHOT)),
        MissionId::Level(id) => CAMPAIGN.iter().find(|l| l.id == id).map(Mission::Planetary),
    }
}

/// A mission's place in the order from 1, as `missionNumber`; 0 for the sandbox.
pub fn mission_number(id: MissionId) -> usize {
    MISSION_ORDER
        .iter()
        .position(|&m| m == id)
        .map_or(0, |i| i + 1)
}

/// The mission after this one in the order, as `nextMission`; none after the last and
/// none for the sandbox.
pub fn next_mission(id: MissionId) -> Option<Mission> {
    let index = MISSION_ORDER.iter().position(|&m| m == id)?;
    mission(*MISSION_ORDER.get(index + 1)?)
}

/// The request a planetary replay flies on `level` (D16): its launch day's ET and its
/// aim's exact bits. Another level's replay and a day past the window are refused; the
/// aim's cap and finiteness, which `campaign/session.ts` checks in saves, are not yet
/// (findings table, for PR32). A sandbox replay stores neither target nor start, so it
/// cannot say which sandbox flight it was; the caller must know.
pub fn replay_request(level: &Level, replay: &Replay) -> Result<ShotRequest, LevelError> {
    if replay.level_id != level.id.as_str() {
        return Err(LevelError::OtherLevel {
            replay: replay.level_id.clone(),
            level: level.id,
        });
    }
    let days = level.window.days;
    if replay.launch_day > days {
        return Err(LevelError::LaunchDay {
            day: replay.launch_day,
            days,
        });
    }
    let launch_et =
        launch_et_for_day(level.window.start_iso, replay.launch_day).map_err(LevelError::Date)?;
    Ok(shot_request_for(level, launch_et, replay.v_inf()))
}

/// The Moon shot a lunar replay flies (D43): its launch ET, its aim, and its parking
/// orbit's epoch and phase, each from exact bits, through `lunar_request`. The plane is
/// the one fixed at `LAUNCH_ET` and the radius the game's 200 km orbit, since a save with
/// any other is refused. A mission other than the Moonshot is refused, and so is a burn
/// more than 35 degrees from prograde; the launch window, fuel budget, phase range and
/// finiteness that `session.ts` checks are not yet (findings table, for PR32).
pub fn lunar_replay_request(replay: &LunarReplay) -> Result<LunarShotRequest, LevelError> {
    if replay.mission_id != MissionId::Moonshot.as_str() {
        return Err(LevelError::UnknownMission(replay.mission_id.clone()));
    }
    let parking = ParkingOrbit {
        frame_et: Some(LAUNCH_ET),
        epoch_et: replay.parking_epoch_et(),
        phase_deg: replay.parking_phase_deg(),
        radius_km: EARTH_RADIUS + 200.0,
    };
    let aim = Aim {
        angle_deg: replay.angle_deg(),
        speed_km_s: replay.speed_km_s(),
    };
    lunar_request(replay.launch_et(), aim, parking).map_err(LevelError::BurnAngle)
}
