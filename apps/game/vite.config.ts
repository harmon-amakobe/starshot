import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { observatoryAssets } from './observatory-assets.ts';
import { identityFor } from '../../scripts/release/identity.mjs';
import { fileURLToPath } from 'node:url';

// Chromium keeps a failed module import for the life of the page, so a retry must import the
// Moon model's chunk under a new query (`src/sim/load-lunar-model.ts`), and only the build
// knows that chunk's hashed name. It fails rather than ship a page whose retry cannot refetch.
const moonChunk = (): Plugin => ({
  name: 'starshot-moon-chunk',
  apply: 'build',
  transformIndexHtml: { order: 'post', handler(_, { bundle }) {
    const chunks = Object.values(bundle ?? {}).filter((chunk) => chunk.type === 'chunk'
      && chunk.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/sim/lunar-model.ts'));
    if (chunks.length !== 1) throw new Error(`Expected one Moon model chunk, found ${chunks.length}.`);
    return [{ tag: 'meta', attrs: { name: 'starshot-moon-chunk', content: `./${chunks[0]!.fileName}` }, injectTo: 'head' }];
  } },
});

// Relative assets keep fork builds portable to subpaths.
export default defineConfig({
  base: "./",
  define: { __STARSHOT_VERSION__: JSON.stringify(identityFor(fileURLToPath(new URL('../..', import.meta.url))).version) },
  plugins: [react(), observatoryAssets(), moonChunk()],
  worker: { format: "es" },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
