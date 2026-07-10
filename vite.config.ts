import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: "/",
  publicDir: false,
  build: {
    target: "es2022",
    sourcemap: mode !== "production",
    assetsInlineLimit: 0,
  },
}));
