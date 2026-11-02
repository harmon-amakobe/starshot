/**
 * Dormand-Prince 5(4) embedded Runge-Kutta for the 6-element state
 * [x, y, z, vx, vy, vz] with adaptive step-size control (Hairer, Norsett &
 * Wanner, "Solving ODEs I", II.4/II.5).
 */
export type State6 = Float64Array;
export type Derivative = (t: number, y: State6, dydt: State6) => void;

const C2 = 1 / 5, C3 = 3 / 10, C4 = 4 / 5, C5 = 8 / 9;
const A21 = 1 / 5;
const A31 = 3 / 40, A32 = 9 / 40;
const A41 = 44 / 45, A42 = -56 / 15, A43 = 32 / 9;
const A51 = 19372 / 6561, A52 = -25360 / 2187, A53 = 64448 / 6561, A54 = -212 / 729;
const A61 = 9017 / 3168, A62 = -355 / 33, A63 = 46732 / 5247, A64 = 49 / 176, A65 = -5103 / 18656;
const A71 = 35 / 384, A73 = 500 / 1113, A74 = 125 / 192, A75 = -2187 / 6784, A76 = 11 / 84;
const E1 = 71 / 57600, E3 = -71 / 16695, E4 = 71 / 1920, E5 = -17253 / 339200, E6 = 22 / 525, E7 = -1 / 40;

export interface StepTolerance {
  /** relative tolerance */
  readonly rtol: number;
  /** absolute tolerance for positions [km] */
  readonly atolPos: number;
  /** absolute tolerance for velocities [km/s] */
  readonly atolVel: number;
}

export class Dopri5 {
  private readonly k1 = new Float64Array(6);
  private readonly k2 = new Float64Array(6);
  private readonly k3 = new Float64Array(6);
  private readonly k4 = new Float64Array(6);
  private readonly k5 = new Float64Array(6);
  private readonly k6 = new Float64Array(6);
  private readonly k7 = new Float64Array(6);
  private readonly tmp = new Float64Array(6);
  readonly yNew = new Float64Array(6);
  private haveK1 = false;

  constructor(private readonly f: Derivative, private readonly tol: StepTolerance) {}

  /** Forget the cached first stage (call after an external state change). */
  reset(): void {
    this.haveK1 = false;
  }

  /**
   * Attempt one step of size h from (t, y). Writes the 5th-order solution to
   * `yNew` and returns the scaled error norm (accept when <= 1).
   */
  attempt(t: number, y: State6, h: number): number {
    const { f, k1, k2, k3, k4, k5, k6, k7, tmp, yNew } = this;
    if (!this.haveK1) {
      f(t, y, k1);
      this.haveK1 = true;
    }
    for (let i = 0; i < 6; i++) tmp[i] = y[i]! + h * A21 * k1[i]!;
    f(t + C2 * h, tmp, k2);
    for (let i = 0; i < 6; i++) tmp[i] = y[i]! + h * (A31 * k1[i]! + A32 * k2[i]!);
    f(t + C3 * h, tmp, k3);
    for (let i = 0; i < 6; i++) tmp[i] = y[i]! + h * (A41 * k1[i]! + A42 * k2[i]! + A43 * k3[i]!);
    f(t + C4 * h, tmp, k4);
    for (let i = 0; i < 6; i++)
      tmp[i] = y[i]! + h * (A51 * k1[i]! + A52 * k2[i]! + A53 * k3[i]! + A54 * k4[i]!);
    f(t + C5 * h, tmp, k5);
    for (let i = 0; i < 6; i++)
      tmp[i] = y[i]! + h * (A61 * k1[i]! + A62 * k2[i]! + A63 * k3[i]! + A64 * k4[i]! + A65 * k5[i]!);
    f(t + h, tmp, k6);
    for (let i = 0; i < 6; i++)
      yNew[i] = y[i]! + h * (A71 * k1[i]! + A73 * k3[i]! + A74 * k4[i]! + A75 * k5[i]! + A76 * k6[i]!);
    f(t + h, yNew, k7);
    let sum = 0;
    for (let i = 0; i < 6; i++) {
      const errI = h * (E1 * k1[i]! + E3 * k3[i]! + E4 * k4[i]! + E5 * k5[i]! + E6 * k6[i]! + E7 * k7[i]!);
      const atol = i < 3 ? this.tol.atolPos : this.tol.atolVel;
      const sc = atol + this.tol.rtol * Math.max(Math.abs(y[i]!), Math.abs(yNew[i]!));
      sum += (errI / sc) ** 2;
    }
    return Math.sqrt(sum / 6);
  }

  /** Call after accepting a step: the last stage becomes the next first stage (FSAL). */
  accept(): void {
    this.k1.set(this.k7);
  }

  /** Suggested next step size from an error norm. */
  static nextStep(h: number, err: number): number {
    const factor = err === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * Math.pow(err, -0.2)));
    return h * factor;
  }
}
