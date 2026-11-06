//! Replays and their physics version (D16, D43). A replay stores a shot's canonical inputs
//! as exact f64 bits, never decimal text, and names the physics that flew it, so a score
//! is checked only by the settings and data that produced it.

use crate::settings::SimSettings;
use starshot_ephemeris::Vec3;
use starshot_physics::lunar::LunarSettings;

/// The source id of a flight on JPL's Table 1.
pub const TABLE1_SOURCE: &str = "table1";

/// The `sourceSha256` of `packages/ephemeris/data/moon-rail.json`, the knot rail every
/// lunar flight reads in Band B. The core takes the rail as bare knots, so the hash is
/// pinned here; `tests/replay.rs` ties it to the file.
pub const MOON_RAIL_SOURCE_SHA256: &str =
    "f194a198f5c3ae84562af5502775b6a9d1719fc065782f1a4f4f484d7635c567";

/// A planetary shot as D16 replays it: the level, the launch day of its window and the
/// aim. The flat world's excess velocity has z = 0, so only x and y are stored.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Replay {
    pub level_id: String,
    pub launch_day: u32,
    pub v_inf_x_bits: u64,
    pub v_inf_y_bits: u64,
    pub physics_version: String,
}

impl Replay {
    pub const FORMAT: &'static str = "starshot.replay/1";

    /// Records `v_inf`'s x and y bits. Panics on a nonzero z, which the flat world (D6) never
    /// has, rather than drop it.
    pub fn new(level_id: &str, launch_day: u32, v_inf: Vec3, physics_version: String) -> Self {
        assert!(v_inf[2] == 0.0, "a replay's excess velocity has z = 0");
        Replay {
            level_id: level_id.to_owned(),
            launch_day,
            v_inf_x_bits: v_inf[0].to_bits(),
            v_inf_y_bits: v_inf[1].to_bits(),
            physics_version,
        }
    }

    pub fn v_inf(&self) -> Vec3 {
        [
            f64::from_bits(self.v_inf_x_bits),
            f64::from_bits(self.v_inf_y_bits),
            0.0,
        ]
    }
}

/// A Moon shot as D43 replays it. A lunar launch is any ET, so the ET itself is stored:
/// rebuilt from ISO text it would move by up to 171 ulp (findings row 61).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LunarReplay {
    pub mission_id: String,
    pub launch_et_bits: u64,
    /// The departure burn [km/s].
    pub speed_bits: u64,
    /// The burn angle from prograde [degrees].
    pub angle_bits: u64,
    pub physics_version: String,
}

impl LunarReplay {
    pub const FORMAT: &'static str = "starshot.lunar-replay/1";

    pub fn new(
        mission_id: &str,
        launch_et: f64,
        speed_km_s: f64,
        angle_deg: f64,
        physics_version: String,
    ) -> Self {
        LunarReplay {
            mission_id: mission_id.to_owned(),
            launch_et_bits: launch_et.to_bits(),
            speed_bits: speed_km_s.to_bits(),
            angle_bits: angle_deg.to_bits(),
            physics_version,
        }
    }

    pub fn launch_et(&self) -> f64 {
        f64::from_bits(self.launch_et_bits)
    }

    pub fn speed_km_s(&self) -> f64 {
        f64::from_bits(self.speed_bits)
    }

    pub fn angle_deg(&self) -> f64 {
        f64::from_bits(self.angle_bits)
    }
}

/// FNV-1a over 64 bits: fixed, small and free of dependencies, so every runtime prints
/// the same version for the same bytes. It names settings; it guards nothing.
fn fnv1a_64(bytes: &[u8]) -> u64 {
    bytes.iter().fold(0xcbf2_9ce4_8422_2325, |h, &b| {
        (h ^ u64::from(b)).wrapping_mul(0x0000_0100_0000_01b3)
    })
}

fn version(bytes: &[u8], source_id: &str) -> String {
    let crate_version = env!("CARGO_PKG_VERSION");
    format!("{crate_version}+{:016x}+{source_id}", fnv1a_64(bytes))
}

/// `"<crate version>+<FNV-1a 64 of the settings' little-endian bytes in field order, 16
/// hex digits>+<source id>"`, the source being `TABLE1_SOURCE` or `rails_source(build)`.
/// The destructuring names every field, so a new one cannot be left out of the hash.
pub fn physics_version(settings: &SimSettings, source_id: &str) -> String {
    let SimSettings {
        rtol,
        atol_km,
        max_step,
        max_steps,
    } = *settings;
    let mut bytes = Vec::with_capacity(28);
    for x in [rtol, atol_km, max_step] {
        bytes.extend(x.to_le_bytes());
    }
    bytes.extend(max_steps.to_le_bytes());
    version(&bytes, source_id)
}

/// The source id of a flight on the DE440 rails pack with this build.
pub fn rails_source(build: u64) -> String {
    format!("de440s-100km/{build:016x}")
}

/// The lunar physics version (D43): the same form over `LunarSettings`' bytes in field
/// order, with the source `moon-rail/<MOON_RAIL_SOURCE_SHA256>`.
pub fn lunar_physics_version(settings: &LunarSettings) -> String {
    let LunarSettings {
        rtol,
        atol_pos,
        atol_vel,
        max_step,
        max_steps,
        near_body_fraction,
    } = *settings;
    let mut bytes = Vec::with_capacity(44);
    for x in [rtol, atol_pos, atol_vel, max_step] {
        bytes.extend(x.to_le_bytes());
    }
    bytes.extend(max_steps.to_le_bytes());
    bytes.extend(near_body_fraction.to_le_bytes());
    version(&bytes, &format!("moon-rail/{MOON_RAIL_SOURCE_SHA256}"))
}
