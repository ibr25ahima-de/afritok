import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
  ],

  root: path.resolve(import.meta.dirname, "client"),

  envDir: path.resolve(import.meta.dirname),

  publicDir: path.resolve(import.meta.dirname, "client", "public"),

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },

  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },

  server: {
    host: true,
    fs: {
      strict: true,
    },
  },
});
