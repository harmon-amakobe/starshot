//! The campaign's physics, as `apps/game/src/levels.ts`. Every launch window is a real
//! one, found with the Lambert search (`best_direct_transfer`) over JPL's Table 1, and
//! every level carries a known solution that `tests/levels.rs` flies with the level's
//! own settings. A level's copy (number, title, blurb, the par's source text) stays in
//! TypeScript, where the copy gate reads it; `tests/levels.rs` ties every number here to
//! the TypeScript's through `fixtures/conformance/levels.json` (D6).

use crate::hint::{HintQuery, KnownShot};
use crate::settings::{SIM_SETTINGS, SimSettings};
use crate::shot::{ShotRequest, ShotTemplate};
use starshot_ephemeris::BodyId::{Earth, Jupiter, Mars, Mercury, Saturn, Venus};
use starshot_ephemeris::{BodyId, Vec3};

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
/// 1981-06-26 in the flat world. The vector is `levels.ts`'s, digit for digit.
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
