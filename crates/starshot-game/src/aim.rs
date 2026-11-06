//! The player's aim and the grid the controls set it on, as the aim section of
//! `apps/game/src/sim/shot.ts`. Every trigonometric call goes through `starshot-math`.

use starshot_ephemeris::Vec3;
use starshot_math::{DEG, atan2, cos, hypot, sin};

/// A launch direction in the ecliptic plane and a departure excess speed.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Aim {
    /// Direction of travel, degrees counter-clockwise from the vernal equinox (+x), from
    /// 0 to under 360.
    pub angle_deg: f64,
    pub speed_km_s: f64,
}

/// An angle in degrees brought into 0 to under 360, as `((deg % 360) + 360) % 360`. Rust's
/// `%` on f64 is the same exact remainder as JavaScript's.
pub fn normalize_deg(deg: f64) -> f64 {
    ((deg % 360.0) + 360.0) % 360.0
}

/// The excess velocity [km/s] of an aim, with z = 0 in the flat world (D6).
pub fn v_inf_from_aim(aim: Aim) -> Vec3 {
    let a = aim.angle_deg * DEG;
    [aim.speed_km_s * cos(a), aim.speed_km_s * sin(a), 0.0]
}

/// The aim of an excess velocity; z is ignored.
pub fn aim_from_v_inf(v: Vec3) -> Aim {
    Aim {
        angle_deg: normalize_deg(atan2(v[1], v[0]) / DEG),
        speed_km_s: hypot(v[0], v[1]),
    }
}

/// An aim on the finest grid the controls show and set (the Fine buttons' smallest
/// steps): 0.01 degree and 0.001 km/s, angle from 0 to under 360. Integer hundredths and
/// thousandths are divided once, which gives the same double as typing "75.93".
pub fn round_aim(aim: Aim) -> Aim {
    let hundredths = js_round(normalize_deg(aim.angle_deg) * 100.0) % 36000.0;
    Aim {
        angle_deg: hundredths / 100.0,
        speed_km_s: js_round(aim.speed_km_s * 1000.0) / 1000.0,
    }
}

/// `Math.round`: a half goes toward plus infinity, and a zero result keeps the sign of
/// `x`. `f64::round` sends -2.5 to -3 where JavaScript gives -2.
fn js_round(x: f64) -> f64 {
    let floor = x.floor();
    let r = if x - floor >= 0.5 { floor + 1.0 } else { floor };
    if r == 0.0 { 0.0f64.copysign(x) } else { r }
}
