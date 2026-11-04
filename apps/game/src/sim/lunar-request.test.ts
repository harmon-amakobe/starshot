/**
 * Who may load the Moon rail. A request is built from constants alone; only `lunar-model.ts`
 * imports the rail, and only the main-thread loader and the worker's runner import that module.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { LAUNCH_ET, SETTINGS } from '@starshot/physics/lunar';
import { lunarRequest } from './lunar-request';

// Counts evaluations of the rail module. The factory runs once per file and vi.resetModules
// does not rerun it, so the count is cumulative: it is never reset and is read in one test.
const rail = vi.hoisted(() => ({ loads: 0 }));
vi.mock('@starshot/ephemeris/moon-rail.json', async (importOriginal) => {
  rail.loads++;
  return importOriginal();
});

const root = new URL('..', import.meta.url);
/** Every non-test source under apps/game/src, with Windows separators made portable. */
const sources = readdirSync(root, { recursive: true, encoding: 'utf8' })
  .map((file) => file.replaceAll('\\', '/'))
  .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
  .sort()
  .map((file) => [file, readFileSync(new URL(file, root), 'utf8')] as const);
const holders = (pattern: { test(text: string): boolean }) =>
  sources.filter(([, text]) => pattern.test(text)).map(([file]) => file);

/** A quoted specifier of either module, with or without an extension. */
const OWNED = String.raw`['"][^'"]*\/lunar-(?:model|request)(?:\.[jt]s)?['"]`;
const DIRECT = new RegExp(String.raw`export\s+(?:type\s+)?(?:\*|\{[^}]*\})[^;'"]*from\s*${OWNED}`);
const IMPORTED = new RegExp(String.raw`import\s+(?:type\s+)?(?:\{([^}]*)\}|\*\s+as\s+(\w+))\s*from\s*${OWNED}`, 'g');
/**
 * A re-export of either module: directly, or a binding imported from one and exported again
 * by name, as the default or as a new constant. Using a binding is not a re-export.
 */
function reexports(text: string): boolean {
  if (DIRECT.test(text)) return true;
  const names = [...text.matchAll(IMPORTED)].flatMap(([, list = '', namespace]) => namespace ? [namespace]
    : list.split(',').map((name) => name.trim().split(/\s+/).at(-1)!).filter(Boolean));
  return names.some((name) => new RegExp(String.raw`export\s*(?:\{[^}]*\b${name}\b|default\s+${name}\b`
    + String.raw`|(?:const|let|var)\s+\w+\s*(?::[^=;]+)?=\s*${name}\s*[;,\n])`).test(text));
}

describe('the Moon rail enters only through sim/lunar-model.ts', () => {
  it('stays out of the request, scene and worker-handler graphs until the model is imported', async () => {
    // These entries go first, in this one test. The count cannot say which entry loaded the
    // rail, only that one of them did before the control below.
    await import('../campaign/contracts');
    await import('../campaign/scene');
    await import('./worker-handler');
    expect(rail.loads).toBe(0);
    // Live control: the mock does see the module that owns the rail, and passes real data on.
    const { lunarModel } = await import('./lunar-model');
    expect(rail.loads).toBe(1);
    expect(lunarModel.rail.knots.length).toBeGreaterThan(0);
  });
  it('recognises each re-export form it guards against, and plain use as none', () => {
    const use = "import { lunarModel } from './lunar-model';\n";
    expect(reexports("export { lunarModel } from './lunar-model';")).toBe(true);
    expect(reexports("export * from '../sim/lunar-request';")).toBe(true);
    expect(reexports(`${use}export { lunarModel };`)).toBe(true);
    expect(reexports(`${use}export const model = lunarModel;`)).toBe(true);
    expect(reexports(`${use}export const model: typeof lunarModel = lunarModel;`)).toBe(true);
    expect(reexports(`${use}export default lunarModel;`)).toBe(true);
    expect(reexports("import * as model from './lunar-model';\nexport { model };")).toBe(true);
    expect(reexports(`${use}export function draw() { return lunarModel; }`)).toBe(false);
    expect(reexports("export { ephemeris, rotate } from './world';")).toBe(false);
  });
  it('has one rail importer and model builder, and the loader and runner as its only users', () => {
    expect(holders(/['"][^'"]*moon-rail\.json['"]/)).toEqual(['sim/lunar-model.ts']);
    expect(holders(/new\s+LunarModel\s*\(/)).toEqual(['sim/lunar-model.ts']);
    // Pins who loads: on the main thread only the loader, by its dynamic import, which counts as
    // an importer, so the rail stays out of the entry; and the runner in the worker's lazy chunk.
    expect(holders(/['"][^'"]*\/lunar-model(?:\.[jt]s)?['"]/))
      .toEqual(['sim/load-lunar-model.ts', 'sim/lunar.ts']);
    expect(holders({ test: reexports })).toEqual([]);
    // The runner carries the model, so it stays in the worker graph: its importers are the
    // worker's lazy modules and the tests' shared harness, never a main-thread module.
    expect(holders(/['"]\.{1,2}\/(?:[^'"]*\/)?lunar(?:\.[jt]s)?['"]/))
      .toEqual(['campaign/owner-harness.test-support.ts', 'sim/lunar-hint.ts', 'sim/worker-handler.ts']);
  });
});

describe('lunarRequest', () => {
  const parking = { frameEt: LAUNCH_ET, epochEt: LAUNCH_ET, phaseDeg: 225, radiusKm: 6571 };
  const at = (angleDeg: number) => lunarRequest(LAUNCH_ET, { angleDeg, speedKmS: 3.24 }, parking);
  it('accepts burns up to 35 degrees either side of prograde and refuses any beyond', () => {
    // No other test reaches the guard: finalRequest clamps to 35 and the guide grid stays within 25.
    expect(at(-35).burnAngleDeg).toBe(-35);
    expect(at(35).burnAngleDeg).toBe(35);
    expect(() => at(-35.001)).toThrow(RangeError);
    expect(() => at(35.001)).toThrow(RangeError);
  });
  it('carries the one frozen settings object, so preview and launch integrate alike (D6)', () => {
    expect(at(0).settings).toBe(SETTINGS);
  });
});
