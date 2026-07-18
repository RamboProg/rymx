import { readFileSync } from "node:fs";
import { type RulesTestEnvironment, initializeTestEnvironment } from "@firebase/rules-unit-testing";

let envPromise: Promise<RulesTestEnvironment> | undefined;

// Shared emulator-backed test environment for Firestore/Storage rules tests.
// Requires `firebase emulators:exec` (or an already-running emulator) — see
// the `test:rules` script in package.json.
export function getRulesTestEnv(): Promise<RulesTestEnvironment> {
  if (!envPromise) {
    envPromise = initializeTestEnvironment({
      projectId: "rymx-rules-test",
      firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
        host: "127.0.0.1",
        port: 8080,
      },
    });
  }
  return envPromise;
}
