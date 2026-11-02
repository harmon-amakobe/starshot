import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';

// Keep the study portable when served below a repository or preview path.
export default defineConfig({ base: "./", plugins: [react()], worker: { format: "es" } });
