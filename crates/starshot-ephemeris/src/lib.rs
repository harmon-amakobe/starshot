//! Where the planets are, in the Rust core (D16): the port of `@starshot/ephemeris`.
//!
//! Time scales and bodies, which Table 1 and its Kepler solver build on next. Units are
//! km, km/s and seconds of ET (TDB past J2000) in the heliocentric ecliptic J2000 frame.
//!
//! The port keeps the TypeScript operation order. Arithmetic-only paths then give the
//! same bits as the TypeScript. Every transcendental function comes from
//! `starshot-math`, which is this crate's only dependency (D29, stage 3 of the growth
//! path).

#![forbid(unsafe_code)]

pub mod bodies;
pub mod time;
pub mod vec;

pub use bodies::{AU_KM, BodyId, BodyInfo, EARTH_ONLY_GM, PLANET_IDS, sphere_of_influence_km};
pub use time::{
    TimeError, et_from_iso, et_from_jd_tdb, et_from_unix_ms, jd_tdb_from_et, tt_minus_utc,
    unix_ms_from_et,
};
pub use vec::Vec3;
