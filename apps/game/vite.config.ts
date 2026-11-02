import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { observatoryAssets } from './observatory-assets.ts';
import { identityFor } from '../../scripts/release/identity.mjs';
import { fileURLToPath } from 'node:url';

// Relative assets keep fork builds portable to subpaths.
export default defineConfig({
  base: "./",
  define: { __STARSHOT_VERSION__: JSON.stringify(identityFor(fileURLToPath(new URL('../..', import.meta.url))).version) },
  plugins: [react(), observatoryAssets()],
  worker: { format: "es" },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
