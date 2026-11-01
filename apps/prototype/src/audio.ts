export class FlightAudio {
  private context: AudioContext | null = null;
  private lastPull = 0;
  enabled = false;
  play(kind: 'pull' | 'launch' | 'arrive', strength = .5) {
    if (!this.enabled) return;
    const now = performance.now();
    if (kind === 'pull' && now - this.lastPull < 100) return;
    this.lastPull = now;
    this.context ??= new AudioContext();
    void this.context.resume();
    const ctx = this.context, time = ctx.currentTime;
    const tones = kind === 'arrive' ? [440, 554, 660] : [kind === 'launch' ? 110 : 180 + strength * 240];
    tones.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain(), start = time + index * .1;
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * (kind === 'launch' ? 3 : 1.02), start + .2);
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(kind === 'pull' ? .035 : .075, start + .02);
      gain.gain.exponentialRampToValueAtTime(.001, start + (kind === 'launch' ? .6 : .25));
      oscillator.connect(gain).connect(ctx.destination); oscillator.start(start); oscillator.stop(start + .65);
    });
  }
  dispose() { void this.context?.close(); }
}
