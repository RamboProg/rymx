import { assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("inventory module: inventoryAdjustments/{id} rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("denies any read of an adjustment, even when signed in as staff", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "inventoryAdjustments/a1"), { delta: -1 });
    });
    const asStaff = env.authenticatedContext("staff-1");
    await assertFails(getDoc(doc(asStaff.firestore(), "inventoryAdjustments/a1")));
  });

  it("denies direct client writes to an adjustment", async () => {
    const env = await getRulesTestEnv();
    const asStaff = env.authenticatedContext("staff-1");
    await assertFails(setDoc(doc(asStaff.firestore(), "inventoryAdjustments/a1"), { delta: -1 }));
  });
});
