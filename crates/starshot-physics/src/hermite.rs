//! Cubic Hermite interpolation between knots, the physics path of
//! `packages/physics/src/hermite.ts`. The one copy lives in `starshot-ephemeris`, whose
//! lunar model needs it and which cannot depend on this crate (G6).

pub use starshot_ephemeris::hermite::{Knot, hermite};
