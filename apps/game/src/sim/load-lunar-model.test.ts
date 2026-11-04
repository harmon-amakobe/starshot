/**
 * The main thread's Moon model loader: nothing loads until the first call, callers share one
 * pending load, a ready model is reused, and a failed load is retried, not remembered.
 */
import { describe, expect, it, vi } from 'vitest';
import { LunarModel } from '@starshot/physics/lunar';
import { createLunarModelLoader, lunarModelLoader } from './load-lunar-model';

// Counts evaluations of the rail module, as in lunar-request.test.ts. The factory runs once per
// file, so the count is cumulative; only the default instance's test touches the real rail.
const rail = vi.hoisted(() => ({ loads: 0 }));
vi.mock('@starshot/ephemeris/moon-rail.json', async (importOriginal) => {
  rail.loads++;
  return importOriginal();
});

type Module = { lunarModel: LunarModel };
/** An importer that records each call and lets the test settle it. */
function deferredImporter() {
  const calls: { resolve(module: Module): void; reject(error: Error): void }[] = [];
  const importer = vi.fn((_failures: number) => new Promise<Module>((resolve, reject) => { calls.push({ resolve, reject }); }));
  return { importer, calls };
}
// A stand-in the loader only passes on; it never reads the rail.
const model = new LunarModel({ knots: [], probes: [] });

describe('createLunarModelLoader', () => {
  it('leaves the default instance unloaded on import, then loads the real rail once when asked', async () => {
    // The module is already imported above; a static rail import would have counted by now.
    expect(rail.loads).toBe(0);
    expect(lunarModelLoader.state).toBe('absent');
    const loaded = await lunarModelLoader.load();
    expect(rail.loads).toBe(1);
    expect(loaded.rail.knots.length).toBeGreaterThan(0);
    expect(await lunarModelLoader.load()).toBe(loaded);
    expect(lunarModelLoader.model).toBe(loaded);
    expect(rail.loads).toBe(1);
  });
  it('imports nothing until the first call, then shares the pending load and reuses the ready model', async () => {
    const { importer, calls } = deferredImporter(), loader = createLunarModelLoader(importer);
    expect(importer).not.toHaveBeenCalled();
    expect(loader.state).toBe('absent');
    expect(loader.model).toBeNull();
    const first = loader.load(), second = loader.load();
    expect(second).toBe(first);
    expect(importer).toHaveBeenCalledTimes(1);
    expect(loader.state).toBe('loading');
    expect(loader.model).toBeNull();
    calls[0]!.resolve({ lunarModel: model });
    expect(await first).toBe(model);
    expect(loader.state).toBe('ready');
    expect(loader.model).toBe(model);
    expect(await loader.load()).toBe(model);
    expect(importer).toHaveBeenCalledTimes(1);
  });
  it('marks a failed load and retries on the next call instead of keeping the rejection', async () => {
    const { importer, calls } = deferredImporter(), loader = createLunarModelLoader(importer);
    const failed = loader.load();
    calls[0]!.reject(new Error('offline'));
    await expect(failed).rejects.toThrow('offline');
    expect(loader.state).toBe('failed');
    expect(loader.model).toBeNull();
    const retry = loader.load();
    expect(retry).not.toBe(failed);
    expect(importer).toHaveBeenCalledTimes(2);
    expect(loader.state).toBe('loading');
    // The importer learns how many loads failed, so a retry can ask for a fresh module URL.
    expect(importer.mock.calls).toEqual([[0], [1]]);
    calls[1]!.resolve({ lunarModel: model });
    expect(await retry).toBe(model);
    expect(loader.state).toBe('ready');
    expect(loader.model).toBe(model);
  });
});
