import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/shield-remote-card.ts",
      formats: ["es"],
      fileName: () => "shield-remote-card.js",
    },
    outDir: "dist",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
