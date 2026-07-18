import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("collections module rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("allows reading a collection with no publishAt", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "collections/c1"), { title: "Launch", publishAt: null });
    });
    const unauthed = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(unauthed.firestore(), "collections/c1")));
  });

  it("allows reading a collection whose publishAt has already passed", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "collections/c1"), {
        title: "Launch",
        publishAt: new Date(Date.now() - 60_000),
      });
    });
    const unauthed = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(unauthed.firestore(), "collections/c1")));
  });

  it("denies reading a collection scheduled in the future", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "collections/c1"), {
        title: "Launch",
        publishAt: new Date(Date.now() + 60 * 60 * 1000),
      });
    });
    const unauthed = env.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthed.firestore(), "collections/c1")));
  });

  it("denies direct client writes to a collection", async () => {
    const env = await getRulesTestEnv();
    const unauthed = env.unauthenticatedContext();
    await assertFails(setDoc(doc(unauthed.firestore(), "collections/c1"), { title: "x" }));
  });
});
