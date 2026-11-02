import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { observatoryAssets } from './observatory-assets.ts';

// base "./" keeps every asset URL relative, so the build works on GitHub Pages
// under any repository name and from any sub-path (decision D7: fully static).
export default defineConfig({
  base: "./",
  plugins: [react(), observatoryAssets()],
  worker: { format: "es" },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
