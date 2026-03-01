import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "frontend",
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      // Allow imports from ../shared.
      allow: [".."]
    },
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true
      },
      "/health": {
        target: "http://localhost:8787",
        changeOrigin: true
      }
    }
  }
});
