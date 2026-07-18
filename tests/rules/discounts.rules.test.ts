import { assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("discounts module: discounts/{code} + discountRedemptions rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("denies any read of a discount, even when signed in", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "discounts/WELCOME10"), {
        code: "WELCOME10",
        active: true,
      });
    });
    const asUser = env.authenticatedContext("user-1");
    await assertFails(getDoc(doc(asUser.firestore(), "discounts/WELCOME10")));
  });

  it("denies direct client writes to a discount", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(setDoc(doc(asUser.firestore(), "discounts/WELCOME10"), { active: true }));
  });

  it("denies any read of a redemption record", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "discountRedemptions/WELCOME10__user-1"), { count: 1 });
    });
    const asUser = env.authenticatedContext("user-1");
    await assertFails(getDoc(doc(asUser.firestore(), "discountRedemptions/WELCOME10__user-1")));
  });

  it("denies direct client writes to a redemption record", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(
      setDoc(doc(asUser.firestore(), "discountRedemptions/WELCOME10__user-1"), { count: 1 }),
    );
  });
});
