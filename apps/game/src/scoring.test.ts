import { describe, expect, it } from "vitest";
import { scoreShot, type ShotFacts } from "./scoring.js";
import {
  EMPTY_PROGRESS,
  PROGRESS_KEY,
  isUnlocked,
  loadProgress,
  totalStars,
  withResult,
} from "./progress.js";

const base: ShotFacts = { hit: true, deltaVKmS: 3.7, bullseye: false, requiredFlybyDone: false, hintUsed: false };
const marsRules = { parDeltaVKmS: 3.66 };

describe("scoreShot", () => {
  it("scores a miss as zero stars, whatever else happened", () => {
    const s = scoreShot(marsRules, { ...base, hit: false, deltaVKmS: 3.0, bullseye: true });
    expect(s.stars).toBe(0);
    expect(s.efficient).toBe(false);
    expect(s.bullseye).toBe(false);
  });

  it("gives one star for a hit and a second within 110% of par", () => {
    expect(scoreShot(marsRules, { ...base, deltaVKmS: 4.5 }).stars).toBe(1);
    expect(scoreShot(marsRules, { ...base, deltaVKmS: 3.66 * 1.1 }).stars).toBe(2);
    expect(scoreShot(marsRules, { ...base, deltaVKmS: 3.66 * 1.1 + 0.001 }).stars).toBe(1);
  });

  it("honours a tighter per-level par tolerance", () => {
    const tour = { parDeltaVKmS: 6.56, parTolerance: 1.05, requiredFlyby: "jupiter" as const };
    expect(scoreShot(tour, { ...base, deltaVKmS: 6.56 * 1.05 }).efficient).toBe(true);
    expect(scoreShot(tour, { ...base, deltaVKmS: 6.56 * 1.05 + 0.001 }).efficient).toBe(false);
    // The default 110% would still have given the star.
    expect(scoreShot({ ...tour, parTolerance: undefined }, { ...base, deltaVKmS: 6.56 * 1.05 + 0.001 }).efficient).toBe(true);
  });

  it("gives the third star for a bullseye", () => {
    const s = scoreShot(marsRules, { ...base, bullseye: true });
    expect(s.stars).toBe(3);
    expect(s.skill).toBe(true);
  });

  it("gives the third star for the required flyby on flyby levels only", () => {
    const tour = { parDeltaVKmS: 6.7, requiredFlyby: "jupiter" as const };
    expect(scoreShot(tour, { ...base, deltaVKmS: 6.8, requiredFlybyDone: true }).stars).toBe(3);
    expect(scoreShot(tour, { ...base, deltaVKmS: 6.8, requiredFlybyDone: false }).stars).toBe(2);
    // A stray flyby on a level that does not ask for one is not a skill star.
    expect(scoreShot(marsRules, { ...base, requiredFlybyDone: true }).stars).toBe(2);
  });

  it("caps hinted shots at two stars and says so", () => {
    const s = scoreShot(marsRules, { ...base, bullseye: true, hintUsed: true });
    expect(s.stars).toBe(2);
    expect(s.uncappedStars).toBe(3);
    expect(s.hintCapped).toBe(true);
    expect(scoreShot(marsRules, { ...base, deltaVKmS: 9, hintUsed: true }).hintCapped).toBe(false);
  });

  it("awards no efficiency star without a par (sandbox)", () => {
    const s = scoreShot({}, { ...base, deltaVKmS: 0.1, bullseye: true });
    expect(s.stars).toBe(2);
  });
});

describe("progress", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
  };

  it("keeps the best stars and lowest hit delta-v, and reads them back from storage", () => {
    let p = withResult(EMPTY_PROGRESS, "first-light", 2, true, 3.9);
    p = withResult(p, "first-light", 1, true, 3.7);
    p = withResult(p, "first-light", 0, false, 1.0);
    expect(p.levels["first-light"]).toEqual({ stars: 2, bestDeltaVKmS: 3.7 });
    const store = memory();
    store.setItem(PROGRESS_KEY, JSON.stringify(p));
    expect(loadProgress(store)).toEqual(p);
    expect(totalStars(p)).toBe(2);
  });

  it("survives corrupt or missing storage", () => {
    const store = memory();
    store.setItem(PROGRESS_KEY, "{not json");
    expect(loadProgress(store)).toEqual(EMPTY_PROGRESS);
    expect(loadProgress(undefined)).toEqual(EMPTY_PROGRESS);
    const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadProgress(throwing)).toEqual(EMPTY_PROGRESS);
  });

  it("ignores the retired coachSeen field in older saved data", () => {
    const store = memory();
    const levels = { "first-light": { stars: 1, bestDeltaVKmS: 3.7 } };
    store.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, levels, coachSeen: true }));
    expect(loadProgress(store)).toEqual({ version: 1, levels });
  });

  it("unlocks each campaign level after a star on the previous one", () => {
    const ids = ["a", "b", "c"];
    expect(isUnlocked(ids, 0, EMPTY_PROGRESS)).toBe(true);
    expect(isUnlocked(ids, 1, EMPTY_PROGRESS)).toBe(false);
    const p = withResult(EMPTY_PROGRESS, "a", 1, true, 4);
    expect(isUnlocked(ids, 1, p)).toBe(true);
    expect(isUnlocked(ids, 2, p)).toBe(false);
  });
});
