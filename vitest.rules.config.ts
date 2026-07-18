import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    // All rules test files share one real Firestore emulator instance (not
    // per-file isolated), and each file's afterEach clears the whole
    // database — running files in parallel lets one file's clearFirestore()
    // wipe fixtures another file just wrote mid-test. Sequential is the only
    // safe option here.
    fileParallelism: false,
  },
});
