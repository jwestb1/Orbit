import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/orbit-remote-card.ts",
      formats: ["es"],
      fileName: () => "orbit-remote-card.js",
    },
    outDir: "dist",
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
});
