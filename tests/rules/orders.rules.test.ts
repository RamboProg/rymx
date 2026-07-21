import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

// A single top-level describe for the whole file: getRulesTestEnv() is a
// module-level singleton shared by every test here, so cleanup() must only
// ever fire once, after every test in the file has run. A second top-level
// describe with its own afterAll(cleanup) would destroy the shared env
// after the first describe's tests finish, before the second's ever run.
describe("orders module", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  describe("orders/{orderId} rules", () => {
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

  describe("orders/{orderId}/notes/{noteId} rules", () => {
    it("denies the order's own owner from reading internal notes", async () => {
      const env = await getRulesTestEnv();
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "orders/o1"), { uid: "user-1", totalMinor: 1000 });
        await setDoc(doc(ctx.firestore(), "orders/o1/notes/n1"), {
          body: "called customer",
          staffUid: "staff-1",
        });
      });
      const asOwner = env.authenticatedContext("user-1");
      await assertFails(getDoc(doc(asOwner.firestore(), "orders/o1/notes/n1")));
    });

    it("denies direct client writes to notes", async () => {
      const env = await getRulesTestEnv();
      const asUser = env.authenticatedContext("user-1");
      await assertFails(setDoc(doc(asUser.firestore(), "orders/o1/notes/n1"), { body: "x" }));
    });
  });
});
