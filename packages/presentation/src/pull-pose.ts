export type PullStage = 'rest' | 'drag' | 'held' | 'snap' | 'return';
export interface CameraLock {
  heightKm: number;
  centre: [number, number];
}
export class PullPose {
  stage: PullStage = 'rest';
  offset: [number, number] = [0, 0];
  strength = 0;
  lock: CameraLock | null = null;
  flightLock: CameraLock | null = null;
  travel: number | null = null;
  private start: [number, number] = [0, 0];
  private started = 0;
  private duration = 180;
  begin(lock: CameraLock, travel = 145) {
    this.stage = 'drag';
    this.offset = [0, 0];
    this.lock = lock;
    this.travel = travel;
  }
  move(x: number, y: number, strength: number) {
    this.offset = [x, y];
    this.strength = strength;
  }
  hold() {
    this.stage = 'held';
  }
  snap(now: number, reduced: boolean) {
    this.flightLock = this.lock;
    this.stage = 'snap';
    this.start = [...this.offset];
    this.started = now;
    this.duration = reduced ? 0 : 180;
  }
  cancel(now: number, reduced: boolean) {
    this.stage = 'return';
    this.start = [...this.offset];
    this.started = now;
    this.duration = reduced ? 0 : 120;
    this.strength = 0;
    this.flightLock = null;
  }
  reset() {
    this.stage = 'rest';
    this.offset = [0, 0];
    this.strength = 0;
    this.lock = null;
    this.flightLock = null;
    this.travel = null;
  }
  sample(now: number) {
    let progress = 0,
      snapDone = false;
    if (this.stage === 'snap' || this.stage === 'return') {
      progress =
        this.duration === 0 ? 1 : Math.min(1, Math.max(0, (now - this.started) / this.duration));
      const remaining = (1 - progress) ** 3;
      this.offset = [this.start[0] * remaining, this.start[1] * remaining];
      if (progress === 1) {
        snapDone = this.stage === 'snap';
        const flightLock = snapDone ? this.flightLock : null;
        this.reset();
        this.flightLock = flightLock;
      }
    }
    return { stage: this.stage, offset: [...this.offset] as [number, number], progress, snapDone };
  }
}
export function pullInput(
  start: [number, number],
  pointer: [number, number],
  travel: number,
  prograde = 0,
) {
  const offset: [number, number] = [pointer[0] - start[0], pointer[1] - start[1]];
  const strength = Math.min(1, Math.hypot(...offset) / travel);
  const heading = Math.atan2(offset[1], -offset[0]) - prograde;
  const relative = (Math.atan2(Math.sin(heading), Math.cos(heading)) * 180) / Math.PI;
  const angle = Math.max(-35, Math.min(35, relative));
  return { offset, strength, angle };
}
