import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../levels';
import { launchEtForDay } from '../sim/shot';
import { finalRequest } from './contracts';
import { secondDeviceSession } from './cloud';
import { freshSession, validSession } from './session';

describe('Cloud demo second-device edits', () => {
  it('keeps repeated lunar edits within the aim bounds and preserves the frozen departure', () => {
    const saved = freshSession(); saved.et += 321; saved.paused = true;
    saved.preferences.releaseMode = 'hail-mary';
    const before = structuredClone(saved);
    let next = saved;
    for (let i = 0; i < 20; i++) {
      const previousAngle = next.aim.angleDeg;
      next = secondDeviceSession(next);
      expect(validSession(next)).toBe(true);
      expect(next.aim.angleDeg).not.toBe(previousAngle);
      expect(next.et).toBe(saved.et);
      expect(next.parking).toEqual(saved.parking);
      expect(next.preferences).toEqual(saved.preferences);
    }
    expect(saved).toEqual(before);
  });
  it.each(['flight', 'result'] as const)('returns a late lunar %s to its exact departure before editing', phase => {
    const saved = freshSession(); saved.day = 27;
    saved.launchEt = launchEtForDay(saved.windowStart, saved.day) + 1234;
    saved.et = saved.launchEt + 2 * 86400; saved.phase = phase;
    expect(validSession(saved)).toBe(true);
    const before = structuredClone(saved), next = secondDeviceSession(saved);
    expect(validSession(next)).toBe(true);
    expect(next.phase).toBe('aim'); expect(next.paused).toBe(true);
    expect(next.et).toBe(saved.launchEt);
    expect(finalRequest(next, saved.aim).shot).toEqual(finalRequest(saved).shot);
    expect(saved).toEqual(before);
  });
  it('preserves a planetary departure and wraps its angle', () => {
    const saved = freshSession(CAMPAIGN[0]!); saved.phase = 'result';
    saved.et += 200 * 86400; saved.aim = { ...saved.aim, angleDeg: 350 };
    expect(validSession(saved)).toBe(true);
    const next = secondDeviceSession(saved);
    expect(validSession(next)).toBe(true);
    expect(next.aim.angleDeg).toBe(10);
    expect(next.et).toBe(launchEtForDay(saved.windowStart, saved.day));
    expect(finalRequest(next, saved.aim).shot).toEqual(finalRequest(saved).shot);
  });
});
