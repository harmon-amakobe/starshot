//! Flight physics in the Rust core (D16): the port of `@starshot/physics`'s integrator,
//! gravity, patched-conic launch, Lambert solver and `simulate`, and the lunar parking
//! orbit. Units are km, km/s and seconds of ET (TDB past J2000) in the heliocentric
//! ecliptic J2000 frame.
//!
//! The port keeps the TypeScript operation order, so the arithmetic-only paths (Hermite,
//! gravity, launch and one integrator step) give the same bits;
//! `tests/conformance_physics.rs` checks them against the TypeScript and states the
//! bounds of the rest. Every transcendental function comes from `starshot-math`.

#![forbid(unsafe_code)]

pub mod dopri5;
pub mod gravity;
pub mod hermite;
pub mod lambert;
pub mod launch;
pub mod lunar;
pub mod simulate;

pub use dopri5::{Dopri5, State6, StepTolerance};
pub use gravity::acceleration;
pub use hermite::{Knot, hermite};
pub use lambert::{DirectTransfer, best_direct_transfer, lambert};
pub use launch::{LEO_RADIUS_KM, c3, delta_v_from_leo, departure_state};
pub use simulate::{
    Encounter, SimulationConfig, SimulationResult, Termination, sample_at, simulate,
};
