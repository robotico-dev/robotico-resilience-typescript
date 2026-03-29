import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "**/index.ts",
        "**/breaker-state.ts",
        "**/circuit-breaker-settings.ts",
        "**/retry-options.ts",
        "**/retry-is-retryable.ts",
      ],
      thresholds: { branches: 95, functions: 95, lines: 95, statements: 95 },
    },
  },
});
