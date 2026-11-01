import { defineConfig } from "vite";

// Keep the study portable when served below a repository or preview path.
export default defineConfig({ base: "./", worker: { format: "es" } });
