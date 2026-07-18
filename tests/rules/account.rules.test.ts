import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("account module: users/{uid}/addresses rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("lets a user read their own saved address", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/user-1/addresses/a1"), { fullName: "Sara Ahmed" });
    });
    const asUser = env.authenticatedContext("user-1");
    await assertSucceeds(getDoc(doc(asUser.firestore(), "users/user-1/addresses/a1")));
  });

  it("denies reading another user's saved address", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/user-1/addresses/a1"), { fullName: "Sara Ahmed" });
    });
    const asOther = env.authenticatedContext("user-2");
    await assertFails(getDoc(doc(asOther.firestore(), "users/user-1/addresses/a1")));
  });

  it("denies unauthenticated reads", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/user-1/addresses/a1"), { fullName: "Sara Ahmed" });
    });
    const unauthed = env.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthed.firestore(), "users/user-1/addresses/a1")));
  });

  it("denies direct client writes even to your own address", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(
      setDoc(doc(asUser.firestore(), "users/user-1/addresses/a1"), { fullName: "x" }),
    );
  });
});
