import type { LunarModel } from '@starshot/physics/lunar';

/** Where the main thread's Moon model is: not yet asked for, on its way, in hand, or failed. */
export type LunarModelState = 'absent' | 'loading' | 'ready' | 'failed';

/**
 * One memoized load of the Moon model through an injected importer, so tests can fail it.
 * A call while loading shares the pending promise, and a ready model is reused. A failure
 * clears the memo, so the next call retries: a `??=` memo would keep the rejection forever.
 */
export function createLunarModelLoader(importer: () => Promise<{ lunarModel: LunarModel }>) {
  let state: LunarModelState = 'absent', model: LunarModel | null = null;
  let pending: Promise<LunarModel> | null = null;
  return {
    get state() { return state; },
    /** The loaded model, or null until it is ready; a frame reads this synchronously. */
    get model() { return model; },
    load(): Promise<LunarModel> {
      if (!pending) {
        state = 'loading';
        pending = importer().then(
          (module) => { model = module.lunarModel; state = 'ready'; return module.lunarModel; },
          (error: unknown) => { pending = null; state = 'failed'; throw error; });
      }
      return pending;
    },
  };
}

// Only a dynamic import lets the bundler keep the rail out of the main entry, so this module
// must never import `./lunar-model` statically.
export const lunarModelLoader = createLunarModelLoader(() => import('./lunar-model'));
