import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Minimal Vitest config for the Phase 1 server-function integration tests.
// Runs in a Node environment; server fns are exercised directly with the
// _client / cookie helpers mocked (NOT a live Django).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
