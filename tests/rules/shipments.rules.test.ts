import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("shipments module: shipments/{shipmentId} rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("lets a user read a shipment belonging to their own order", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders/o1"), { uid: "user-1", totalMinor: 1000 });
      await setDoc(doc(ctx.firestore(), "shipments/s1"), { orderId: "o1", status: "pending" });
    });
    const asOwner = env.authenticatedContext("user-1");
    await assertSucceeds(getDoc(doc(asOwner.firestore(), "shipments/s1")));
  });

  it("denies reading a shipment belonging to another user's order", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders/o1"), { uid: "user-1", totalMinor: 1000 });
      await setDoc(doc(ctx.firestore(), "shipments/s1"), { orderId: "o1", status: "pending" });
    });
    const asOther = env.authenticatedContext("user-2");
    await assertFails(getDoc(doc(asOther.firestore(), "shipments/s1")));
  });

  it("denies direct client writes", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(
      setDoc(doc(asUser.firestore(), "shipments/s1"), { orderId: "o1", status: "pending" }),
    );
  });
});
