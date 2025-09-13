// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Keep any top-level-await imports you had originally (if any).
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.url.replace("file://", ""), "client", "src"),
      "@shared": path.resolve(import.meta.url.replace("file://", ""), "shared"),
      "@assets": path.resolve(import.meta.url.replace("file://", ""), "attached_assets"),
    },
  },
  root: path.resolve(import.meta.url.replace("file://", ""), "client"),
  build: {
    outDir: path.resolve(import.meta.url.replace("file://", ""), "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // <-- add this proxy so client dev server forwards /api to backend
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
