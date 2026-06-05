import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@leanient/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    setupFiles: ["./src/tests/setup.ts"],
  },
});
