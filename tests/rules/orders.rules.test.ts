import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("orders module: orders/{orderId} rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("lets a user read their own order", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders/o1"), { uid: "user-1", totalMinor: 1000 });
    });
    const asUser = env.authenticatedContext("user-1");
    await assertSucceeds(getDoc(doc(asUser.firestore(), "orders/o1")));
  });

  it("denies reading another user's order", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders/o1"), { uid: "user-1", totalMinor: 1000 });
    });
    const asOther = env.authenticatedContext("user-2");
    await assertFails(getDoc(doc(asOther.firestore(), "orders/o1")));
  });

  it("denies reading a guest order (uid: null) even when signed in", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders/o1"), { uid: null, totalMinor: 1000 });
    });
    const asUser = env.authenticatedContext("user-1");
    await assertFails(getDoc(doc(asUser.firestore(), "orders/o1")));
  });

  it("denies unauthenticated reads", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders/o1"), { uid: "user-1" });
    });
    const unauthed = env.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthed.firestore(), "orders/o1")));
  });

  it("denies direct client writes", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(setDoc(doc(asUser.firestore(), "orders/o1"), { uid: "user-1" }));
  });
});
