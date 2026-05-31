import { defineConfig } from "vitest/config";

export default defineConfig({
  // Tauri expects a fixed dev port
  server: { port: 1420, strictPort: true },
  clearScreen: false,
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
