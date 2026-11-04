import type { LunarModel } from '@starshot/physics/lunar';

/** Where the main thread's Moon model is: not yet asked for, on its way, in hand, or failed. */
export type LunarModelState = 'absent' | 'loading' | 'ready' | 'failed';

/**
 * One memoized load of the Moon model through an injected importer, so tests can fail it.
 * A call while loading shares the pending promise, and a ready model is reused. A failure
 * clears the memo, so the next call retries: a `??=` memo would keep the rejection forever.
 */
export function createLunarModelLoader(importer: (failures: number) => Promise<{ lunarModel: LunarModel }>) {
  let state: LunarModelState = 'absent', model: LunarModel | null = null;
  let pending: Promise<LunarModel> | null = null, failures = 0;
  return {
    get state() { return state; },
    /** The loaded model, or null until it is ready; a frame reads this synchronously. */
    get model() { return model; },
    load(): Promise<LunarModel> {
      if (!pending) {
        state = 'loading';
        pending = importer(failures).then(
          (module) => { model = module.lunarModel; state = 'ready'; return module.lunarModel; },
          (error: unknown) => { pending = null; state = 'failed'; failures++; throw error; });
      }
      return pending;
    },
  };
}

/**
 * Chromium keeps a failed module import for the life of the page and never asks the network for
 * that URL again, so a retry imports the same chunk under a new query. The build names the chunk
 * in a meta tag (`vite.config.ts`); without one, in development and tests, a retry imports the
 * module as the first try did.
 */
function importModel(failures: number) {
  const chunk = failures ? globalThis.document?.querySelector<HTMLMetaElement>('meta[name="starshot-moon-chunk"]')?.content : '';
  return chunk ? import(/* @vite-ignore */ new URL(`${chunk}?retry=${failures}`, document.baseURI).href) : import('./lunar-model');
}

// Only a dynamic import lets the bundler keep the rail out of the main entry, so this module
// must never import `./lunar-model` statically.
export const lunarModelLoader = createLunarModelLoader(importModel);
