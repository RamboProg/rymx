import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("auth module: users/{uid} rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("lets a user read their own profile", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/user-1"), {
        email: "a@rymx.test",
        role: "customer",
      });
    });
    const asUser = env.authenticatedContext("user-1");
    await assertSucceeds(getDoc(doc(asUser.firestore(), "users/user-1")));
  });

  it("denies reading another user's profile", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/user-1"), { email: "a@rymx.test" });
    });
    const asOther = env.authenticatedContext("user-2");
    await assertFails(getDoc(doc(asOther.firestore(), "users/user-1")));
  });

  it("denies unauthenticated reads", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/user-1"), { email: "a@rymx.test" });
    });
    const unauthed = env.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthed.firestore(), "users/user-1")));
  });

  it("denies direct client writes even to your own profile", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(setDoc(doc(asUser.firestore(), "users/user-1"), { email: "a@rymx.test" }));
  });
});
