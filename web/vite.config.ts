import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base './' keeps every asset and data URL relative, so the build works on
// GitHub Pages under any sub-path (and from a plain static file server).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { target: "es2022", sourcemap: false, chunkSizeWarningLimit: 600 },
  server: { port: 5173 },
  preview: { port: 4173 },
});
