import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("catalog module: products/categories rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("allows public read of an active product", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "products/p1"), { status: "active", title: "Test" });
    });
    const unauthed = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(unauthed.firestore(), "products/p1")));
  });

  it("denies public read of a draft product", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "products/p1"), { status: "draft", title: "Test" });
    });
    const unauthed = env.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthed.firestore(), "products/p1")));
  });

  it("denies direct client writes to a product", async () => {
    const env = await getRulesTestEnv();
    const unauthed = env.unauthenticatedContext();
    await assertFails(setDoc(doc(unauthed.firestore(), "products/p1"), { status: "active" }));
  });

  it("scopes variant reads to the parent product's status", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "products/p1"), { status: "active" });
      await setDoc(doc(ctx.firestore(), "products/p1/variants/v1"), { sku: "X" });
      await setDoc(doc(ctx.firestore(), "products/p2"), { status: "draft" });
      await setDoc(doc(ctx.firestore(), "products/p2/variants/v1"), { sku: "Y" });
    });
    const unauthed = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(unauthed.firestore(), "products/p1/variants/v1")));
    await assertFails(getDoc(doc(unauthed.firestore(), "products/p2/variants/v1")));
  });

  it("allows public read of categories", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "categories/c1"), {
        title: "Outerwear",
        slug: "outerwear",
      });
    });
    const unauthed = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(unauthed.firestore(), "categories/c1")));
  });

  it("denies direct client writes to categories", async () => {
    const env = await getRulesTestEnv();
    const unauthed = env.unauthenticatedContext();
    await assertFails(setDoc(doc(unauthed.firestore(), "categories/c1"), { title: "x" }));
  });
});
