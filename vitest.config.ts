import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

// Two workers keep the memory of the unit suite near 250 MB, per ADR-0110.
export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      "server-only": path("./tests/empty.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    maxWorkers: 2,
  },
});
