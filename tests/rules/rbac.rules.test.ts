import { assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("rbac module: auditLog/{entryId} rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("denies reading the audit log, even authenticated", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "auditLog/e1"), { actorUid: "staff-1", action: "test" });
    });
    const asUser = env.authenticatedContext("staff-1");
    await assertFails(getDoc(doc(asUser.firestore(), "auditLog/e1")));
  });

  it("denies direct client writes", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("staff-1");
    await assertFails(setDoc(doc(asUser.firestore(), "auditLog/e1"), { action: "x" }));
  });
});
