import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("settings module: settings/{settingsId} rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  for (const docId of ["shipping", "store", "policies"]) {
    it(`lets an unauthenticated visitor read settings/${docId}`, async () => {
      const env = await getRulesTestEnv();
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), `settings/${docId}`), { seeded: true });
      });
      const unauthed = env.unauthenticatedContext();
      await assertSucceeds(getDoc(doc(unauthed.firestore(), `settings/${docId}`)));
    });
  }

  it("denies reading settings/emailTemplates", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "settings/emailTemplates"), { seeded: true });
    });
    const unauthed = env.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthed.firestore(), "settings/emailTemplates")));
  });

  it("denies direct client writes", async () => {
    const env = await getRulesTestEnv();
    const unauthed = env.unauthenticatedContext();
    await assertFails(
      setDoc(doc(unauthed.firestore(), "settings/shipping"), { defaultFeeMinor: 1 }),
    );
  });
});
