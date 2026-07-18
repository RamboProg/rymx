import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("cart module: carts/{uid} rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("lets a user read their own cart", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "carts/user-1"), { items: [] });
    });
    const asUser = env.authenticatedContext("user-1");
    await assertSucceeds(getDoc(doc(asUser.firestore(), "carts/user-1")));
  });

  it("denies reading another user's cart", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "carts/user-1"), { items: [] });
    });
    const asOther = env.authenticatedContext("user-2");
    await assertFails(getDoc(doc(asOther.firestore(), "carts/user-1")));
  });

  it("denies unauthenticated reads", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "carts/user-1"), { items: [] });
    });
    const unauthed = env.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthed.firestore(), "carts/user-1")));
  });

  it("denies direct client writes even to your own cart", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(setDoc(doc(asUser.firestore(), "carts/user-1"), { items: [] }));
  });
});
