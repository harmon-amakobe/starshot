//! Dormand-Prince 5(4), as `packages/physics/src/dopri5.ts`: an embedded Runge-Kutta pair
//! for the state [x, y, z, vx, vy, vz] with adaptive step control (Hairer, Norsett and
//! Wanner, "Solving ODEs I", II.4 and II.5). `attempt` is arithmetic only in the
//! TypeScript order, so it gives the same bits; `next_step` raises to -0.2 through
//! `starshot-math`.

use starshot_math::{pow, sqrt};

/// Position [km], then velocity [km/s].
pub type State6 = [f64; 6];

const C2: f64 = 1.0 / 5.0;
const C3: f64 = 3.0 / 10.0;
const C4: f64 = 4.0 / 5.0;
const C5: f64 = 8.0 / 9.0;
const A21: f64 = 1.0 / 5.0;
const A31: f64 = 3.0 / 40.0;
const A32: f64 = 9.0 / 40.0;
const A41: f64 = 44.0 / 45.0;
const A42: f64 = -56.0 / 15.0;
const A43: f64 = 32.0 / 9.0;
const A51: f64 = 19372.0 / 6561.0;
const A52: f64 = -25360.0 / 2187.0;
const A53: f64 = 64448.0 / 6561.0;
const A54: f64 = -212.0 / 729.0;
const A61: f64 = 9017.0 / 3168.0;
const A62: f64 = -355.0 / 33.0;
const A63: f64 = 46732.0 / 5247.0;
const A64: f64 = 49.0 / 176.0;
const A65: f64 = -5103.0 / 18656.0;
const A71: f64 = 35.0 / 384.0;
const A73: f64 = 500.0 / 1113.0;
const A74: f64 = 125.0 / 192.0;
const A75: f64 = -2187.0 / 6784.0;
const A76: f64 = 11.0 / 84.0;
const E1: f64 = 71.0 / 57600.0;
const E3: f64 = -71.0 / 16695.0;
const E4: f64 = 71.0 / 1920.0;
const E5: f64 = -17253.0 / 339200.0;
const E6: f64 = 22.0 / 525.0;
const E7: f64 = -1.0 / 40.0;

/// The error norm's tolerances: relative, and absolute for positions [km] and
/// velocities [km/s].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StepTolerance {
    pub rtol: f64,
    pub atol_pos: f64,
    pub atol_vel: f64,
}

/// One integrator. The derivative comes with each `attempt` rather than living in the
/// solver, so a caller can change the forces between steps without interior mutability;
/// it must then call `reset`, because the first stage is cached.
#[derive(Debug, Clone)]
pub struct Dopri5 {
    tol: StepTolerance,
    k: [State6; 7],
    tmp: State6,
    /// The fifth-order solution of the last `attempt`.
    pub y_new: State6,
    have_k1: bool,
}

impl Dopri5 {
    pub fn new(tol: StepTolerance) -> Dopri5 {
        Dopri5 {
            tol,
            k: [[0.0; 6]; 7],
            tmp: [0.0; 6],
            y_new: [0.0; 6],
            have_k1: false,
        }
    }

    /// Forget the cached first stage (call after an external change of state or forces).
    pub fn reset(&mut self) {
        self.have_k1 = false;
    }

    /// Attempts one step of size `h` from (`t`, `y`) with the derivative `f(t, y, dydt)`.
    /// Writes the fifth-order solution to `y_new` and returns the scaled error norm: accept
    /// the step when it is at most 1.
    pub fn attempt<F>(&mut self, f: &mut F, t: f64, y: &State6, h: f64) -> f64
    where
        F: FnMut(f64, &State6, &mut State6),
    {
        let Dopri5 {
            tol,
            k: [k1, k2, k3, k4, k5, k6, k7],
            tmp,
            y_new,
            have_k1,
        } = self;
        if !*have_k1 {
            f(t, y, k1);
            *have_k1 = true;
        }
        for i in 0..6 {
            tmp[i] = y[i] + h * A21 * k1[i];
        }
        f(t + C2 * h, tmp, k2);
        for i in 0..6 {
            tmp[i] = y[i] + h * (A31 * k1[i] + A32 * k2[i]);
        }
        f(t + C3 * h, tmp, k3);
        for i in 0..6 {
            tmp[i] = y[i] + h * (A41 * k1[i] + A42 * k2[i] + A43 * k3[i]);
        }
        f(t + C4 * h, tmp, k4);
        for i in 0..6 {
            tmp[i] = y[i] + h * (A51 * k1[i] + A52 * k2[i] + A53 * k3[i] + A54 * k4[i]);
        }
        f(t + C5 * h, tmp, k5);
        for i in 0..6 {
            tmp[i] =
                y[i] + h * (A61 * k1[i] + A62 * k2[i] + A63 * k3[i] + A64 * k4[i] + A65 * k5[i]);
        }
        f(t + h, tmp, k6);
        for i in 0..6 {
            y_new[i] =
                y[i] + h * (A71 * k1[i] + A73 * k3[i] + A74 * k4[i] + A75 * k5[i] + A76 * k6[i]);
        }
        f(t + h, y_new, k7);
        let mut sum = 0.0;
        for i in 0..6 {
            let err_i =
                h * (E1 * k1[i] + E3 * k3[i] + E4 * k4[i] + E5 * k5[i] + E6 * k6[i] + E7 * k7[i]);
            let atol = if i < 3 { tol.atol_pos } else { tol.atol_vel };
            // Math.max: a NaN in either magnitude wins, where f64::max would drop it.
            let (a, b) = (y[i].abs(), y_new[i].abs());
            let sc = atol + tol.rtol * if a >= b || a.is_nan() { a } else { b };
            // `(errI / sc) ** 2` in TypeScript: squaring is correctly rounded either way.
            let q = err_i / sc;
            sum += q * q;
        }
        sqrt(sum / 6.0)
    }

    /// Call after accepting a step: the last stage becomes the next first stage (FSAL).
    pub fn accept(&mut self) {
        self.k[0] = self.k[6];
    }

    /// The suggested next step size from an error norm: 0.9 err^-0.2 times `h`, kept
    /// between 0.2 and 5 times it. `clamp` keeps a NaN, as `Math.min` and `Math.max` do.
    pub fn next_step(h: f64, err: f64) -> f64 {
        let factor = if err == 0.0 {
            5.0
        } else {
            (0.9 * pow(err, -0.2)).clamp(0.2, 5.0)
        };
        h * factor
    }
}
