export class EntryPresentation {
  amount = 1;
  private from = 1;
  private target = 1;
  private started = 0;
  private duration = 0;
  setHome(home: boolean, now: number, reduced: boolean) {
    this.from = this.amount;
    this.target = home ? 1 : 0;
    this.started = now;
    this.duration = reduced ? 0 : home ? 650 : 1100;
  }
  sample(now: number) {
    const u = this.duration ? Math.min(1, Math.max(0, (now - this.started) / this.duration)) : 1;
    const eased = u * u * (3 - 2 * u);
    this.amount = this.from + (this.target - this.from) * eased;
    return this.amount;
  }
}
