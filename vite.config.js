import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The panel is served by the API server at /admin. In development, /api and /uploads are proxied to the
// live API by default; set VITE_API_PROXY (e.g. http://localhost:3013) to use a local backend instead.
const target = process.env.VITE_API_PROXY || "https://tractor.skillinnovex.in";
const proxy = { target, changeOrigin: true, secure: true };

export default defineConfig({
  // Vercel hosts the panel at the domain root (VERCEL=1 during its builds; see vercel.json); the API server hosts it at /admin.
  base: process.env.VERCEL ? "/" : "/admin/",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { "/api": proxy, "/uploads": proxy },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
