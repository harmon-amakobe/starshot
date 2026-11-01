export class EngineDemo {
  charge = .35;
  private releaseAt: number | null = null;
  private releasedCharge = 0;
  set(value: number) { if (!Number.isFinite(value)) return; this.releaseAt = null; this.charge = Math.max(0, Math.min(1, value)); }
  release(now: number, reduced: boolean) {
    this.releasedCharge = this.charge;
    if (reduced) this.set(0); else this.releaseAt = now;
  }
  sample(now: number) {
    if (this.releaseAt !== null) {
      const progress = Math.min(1, (now - this.releaseAt) / 180);
      this.charge = this.releasedCharge * (1 - progress);
      if (progress === 1) this.releaseAt = null;
    }
    return this.charge;
  }
}
