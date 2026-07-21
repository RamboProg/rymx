import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("returns module: returns/{returnId} rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("lets a user read a return belonging to their own order", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders/o1"), { uid: "user-1", totalMinor: 1000 });
      await setDoc(doc(ctx.firestore(), "returns/r1"), { orderId: "o1", status: "requested" });
    });
    const asOwner = env.authenticatedContext("user-1");
    await assertSucceeds(getDoc(doc(asOwner.firestore(), "returns/r1")));
  });

  it("denies reading a return belonging to another user's order", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders/o1"), { uid: "user-1", totalMinor: 1000 });
      await setDoc(doc(ctx.firestore(), "returns/r1"), { orderId: "o1", status: "requested" });
    });
    const asOther = env.authenticatedContext("user-2");
    await assertFails(getDoc(doc(asOther.firestore(), "returns/r1")));
  });

  it("denies direct client writes", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(
      setDoc(doc(asUser.firestore(), "returns/r1"), { orderId: "o1", status: "requested" }),
    );
  });
});
