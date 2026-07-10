import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: "/",
  publicDir: false,
  build: {
    target: "es2022",
    sourcemap: mode !== "production",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/vendor/three.module.js")) return "three-vendor";
          if (id.includes("/src/v4/")) return "gravedad-zero-v4";
          if (id.includes("/src/visual/")) return "visual-pack";
          if (id.includes("/src/world/") || id.includes("/src/meteors/") || id.includes("/src/discovery/")) return "world-systems";
          if (id.includes("/src/combat/") || id.includes("/src/missions/")) return "gameplay-systems";
          return undefined;
        },
      },
    },
  },
}));
