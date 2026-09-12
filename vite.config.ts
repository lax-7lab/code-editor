import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],
  server: {
    watch: {
      ignored: ["**/src-tauri/target/**", "**/src-tauri/gen/**", "**/node_modules/**"],
    },
  },
  optimizeDeps: {
    include: ["monaco-editor"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ["monaco-editor"],
          three: ["three"],
        },
      },
    },
  },
});
