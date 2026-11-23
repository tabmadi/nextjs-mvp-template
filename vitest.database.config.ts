import { defineConfig, mergeConfig } from "vitest/config";
import unit from "./vitest.config";

// The database tests share one database, so one file runs at a time.
export default mergeConfig(
  unit,
  defineConfig({
    test: {
      include: ["tests/integration/**/*.test.ts"],
      setupFiles: ["./tests/setup.database.ts"],
      fileParallelism: false,
      testTimeout: 60_000,
      hookTimeout: 60_000,
    },
  }),
  true,
);
