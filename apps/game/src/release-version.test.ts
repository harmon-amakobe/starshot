import { describe, expect, it } from 'vitest';
import { readableVersion } from './release-version';

describe('readable release version', () => {
  const cases: [string, string][] = [
    ['0.1.0-dev', 'Version 0.1.0 · Development'],
    ['0.1.0-beta.41503213617.1', 'Version 0.1.0 · Beta'],
    ['0.2.3-preview.41503213617.2', 'Version 0.2.3 · Preview'],
    ['1.2.3', 'Version 1.2.3'],
    ['0.1.0-experiment.1', 'Version 0.1.0-experiment.1'],
    ['0.1.0-beta-experiment.1', 'Version 0.1.0-beta-experiment.1'],
    ['0.1.0-dev-custom.1', 'Version 0.1.0-dev-custom.1'],
  ];
  it.each(cases)('%s keeps its stable version and readable channel', (version, expected) => {
    expect(readableVersion(version)).toBe(expected);
  });
  it('keeps detailed snapshot identity separate from its label', () => {
    const first = '0.1.0-beta.41503213617.1', next = '0.1.0-beta.41503213617.2';
    expect(first).not.toBe(next);
    expect(readableVersion(first)).toBe(readableVersion(next));
    expect(readableVersion('0.1.1-beta.41503213617.3')).not.toBe(readableVersion(first));
  });
});
