//! The shared lunar model, as `packages/physics/src/lunar/model.ts`: the Moon relative to
//! Earth's centre from the cached Horizons rail (713 knots, five JPL probes within
//! 0.1 km), Earth and Moon split from Table 1's barycentre, and the fixed parking-plane
//! basis of D38. The rest of the lunar flight is the physics crate's (PR11, PR12), which
//! re-exports these items.
//!
//! The rail reaches the core as its flat knot array, 7 numbers per knot (t, x, y, z, vx,
//! vy, vz). The pack's Moon does not replace it: its fit misses the probes (G5).

use crate::bodies::BodyId;
use crate::ephemeris::{Ephemeris, State, Table1Ephemeris};
use crate::hermite::{Knot, hermite};
use crate::vec::{Vec3, add, cross, norm, scale, sub};
use core::f64::consts::PI;
use core::fmt;
use starshot_math::{cos, sin};

// Keep the study's DE440 value: its recorded integration oracle uses these digits. They
// are not `EARTH_ONLY_GM` or the pack's EMRAT, and neither replaces them in Band B.
// MOON_GM is written as `model.ts` writes it, one digit past what an f64 holds; the
// compiler rounds it as JavaScript does.
pub const EARTH_GM: f64 = 398600.43550702266;
#[allow(clippy::excessive_precision)]
pub const MOON_GM: f64 = 4902.8001184575496;
/// The fixed parking-plane reference, 2026-11-02T01:00:00.000Z (D38).
pub const LAUNCH_ET: f64 = 846853269.184;
/// The parking phase `basis` takes by default, in degrees (`model.ts`).
pub const BASIS_PHASE_DEG: f64 = 225.0;

/// Numbers per knot in the rail's flat array.
const STRIDE: usize = 7;

/// Why the lunar rail refused a request or a knot array. `OutsideDates` keeps the
/// TypeScript text; the others are checks TypeScript does not make (logged).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RailError {
    /// Before the first knot or after the last.
    OutsideDates,
    /// A NaN ET, which TypeScript would interpolate into a NaN state.
    NotANumber,
    /// A knot array whose length is not a multiple of 7.
    BadLength(usize),
    /// Fewer than 2 knots.
    TooFewKnots(usize),
    /// A non-finite number, at this index of the flat array.
    NotFinite(usize),
    /// A knot whose time is not after the one before it.
    NotIncreasing(usize),
}

impl fmt::Display for RailError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RailError::OutsideDates => write!(f, "Outside the lunar rail dates"),
            RailError::NotANumber => write!(f, "The lunar rail needs a finite date, not NaN"),
            RailError::BadLength(n) => write!(f, "The lunar rail has {n} numbers, not 7 per knot"),
            RailError::TooFewKnots(n) => write!(f, "The lunar rail has {n} knots, fewer than 2"),
            RailError::NotFinite(i) => write!(f, "The lunar rail's number {i} is not finite"),
            RailError::NotIncreasing(k) => {
                write!(f, "The lunar rail's knot {k} is not after the one before")
            }
        }
    }
}

impl std::error::Error for RailError {}

/// Unit vectors of the parking frame: `up` points from Earth to the craft at the phase,
/// `right` along its prograde motion, `normal` out of the Moon's orbital plane.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Basis {
    pub right: Vec3,
    pub up: Vec3,
    pub normal: Vec3,
}

/// Heliocentric states of Earth's centre and the Moon.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EarthMoon {
    pub earth: State,
    pub moon: State,
}

/// `v` scaled to unit length.
pub fn unit(v: Vec3) -> Vec3 {
    scale(v, 1.0 / norm(v))
}

/// The Moon from its knot rail, and Earth from Table 1's barycentre (never flattened).
#[derive(Debug, Clone)]
pub struct LunarModel {
    knots: Vec<f64>,
    ephemeris: Table1Ephemeris,
}

impl LunarModel {
    /// Copies and checks the flat knot array: 7 numbers per knot, at least 2 knots, all
    /// finite, times strictly increasing.
    pub fn new(knots: &[f64]) -> Result<LunarModel, RailError> {
        if !knots.len().is_multiple_of(STRIDE) {
            return Err(RailError::BadLength(knots.len()));
        }
        if knots.len() < 2 * STRIDE {
            return Err(RailError::TooFewKnots(knots.len() / STRIDE));
        }
        if let Some(i) = knots.iter().position(|x| !x.is_finite()) {
            return Err(RailError::NotFinite(i));
        }
        if let Some(k) =
            (1..knots.len() / STRIDE).find(|&k| knots[k * STRIDE] <= knots[(k - 1) * STRIDE])
        {
            return Err(RailError::NotIncreasing(k));
        }
        Ok(LunarModel {
            knots: knots.to_vec(),
            ephemeris: Table1Ephemeris { flatten: false },
        })
    }

    fn knot(&self, i: usize) -> Knot {
        let k = &self.knots[i * STRIDE..(i + 1) * STRIDE];
        Knot {
            t: k[0],
            r: [k[1], k[2], k[3]],
            v: [k[4], k[5], k[6]],
        }
    }

    /// The first and last knot times.
    pub fn dates(&self) -> (f64, f64) {
        (self.knots[0], self.knots[self.knots.len() - STRIDE])
    }

    /// The Moon relative to Earth's centre [km, km/s] at ET, by Hermite interpolation
    /// between the knots around it. A knot's own time takes the segment it starts.
    pub fn relative(&self, et: f64) -> Result<State, RailError> {
        if et.is_nan() {
            return Err(RailError::NotANumber);
        }
        let (mut lo, mut hi) = (0, self.knots.len() / STRIDE - 1);
        if et < self.knots[0] || et > self.knots[hi * STRIDE] {
            return Err(RailError::OutsideDates);
        }
        while hi - lo > 1 {
            let mid = (lo + hi) >> 1;
            if self.knots[mid * STRIDE] <= et {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        Ok(hermite(&self.knot(lo), &self.knot(hi), et))
    }

    /// Heliocentric Earth and Moon at ET: Table 1's barycentre split with the study's GMs.
    pub fn bodies(&self, et: f64) -> Result<EarthMoon, RailError> {
        let relative = self.relative(et)?;
        let emb = self.ephemeris.state(BodyId::Earth, et);
        let fraction = MOON_GM / (EARTH_GM + MOON_GM);
        let earth = State {
            r: sub(emb.r, scale(relative.r, fraction)),
            v: sub(emb.v, scale(relative.v, fraction)),
        };
        let moon = State {
            r: add(earth.r, relative.r),
            v: add(earth.v, relative.v),
        };
        Ok(EarthMoon { earth, moon })
    }

    /// The parking frame at `et`, the plane of the Moon's orbit then, rotated by
    /// `phase_deg` within it. The game fixes `et` at `LAUNCH_ET` (D38).
    pub fn basis(&self, et: f64, phase_deg: f64) -> Result<Basis, RailError> {
        let relative = self.relative(et)?;
        let first = unit(relative.r);
        let normal = unit(cross(relative.r, relative.v));
        let second = cross(normal, first);
        // `phaseDeg * Math.PI / 180`: multiply first, then divide, as written.
        let phase = phase_deg * PI / 180.0;
        let up = add(scale(first, cos(phase)), scale(second, sin(phase)));
        let right = add(scale(first, -sin(phase)), scale(second, cos(phase)));
        Ok(Basis {
            right,
            up,
            normal: cross(right, up),
        })
    }

    /// `basis()` with the TypeScript defaults: `LAUNCH_ET` and 225 degrees.
    pub fn default_basis(&self) -> Result<Basis, RailError> {
        self.basis(LAUNCH_ET, BASIS_PHASE_DEG)
    }
}
