import path from "path";
import fs from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function copyExtensionManifest() {
  return {
    name: "copy-extension-manifest",
    apply: "build",
    generateBundle() {
      const source = fs.readFileSync(path.resolve(__dirname, "extension/manifest.json"), "utf-8");
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source,
      });
    },
  } as const;
}

export default defineConfig(() => {
  return {
    plugins: [react(), copyExtensionManifest()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: path.resolve(__dirname, "extension/popup.html"),
          background: path.resolve(__dirname, "extension/background.ts"),
        },
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
