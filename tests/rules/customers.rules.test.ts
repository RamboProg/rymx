import { assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("customers module", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  describe("customerTags/{uid} rules", () => {
    it("denies the customer themselves from reading their own tags", async () => {
      const env = await getRulesTestEnv();
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "customerTags/user-1"), { tags: ["chargeback-risk"] });
      });
      const asOwner = env.authenticatedContext("user-1");
      await assertFails(getDoc(doc(asOwner.firestore(), "customerTags/user-1")));
    });

    it("denies direct client writes", async () => {
      const env = await getRulesTestEnv();
      const asUser = env.authenticatedContext("user-1");
      await assertFails(setDoc(doc(asUser.firestore(), "customerTags/user-1"), { tags: ["vip"] }));
    });
  });

  describe("users/{uid}/notes/{noteId} rules", () => {
    it("denies the user themselves from reading internal notes about them", async () => {
      const env = await getRulesTestEnv();
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "users/user-1/notes/n1"), {
          body: "asked for a discount",
          staffUid: "staff-1",
        });
      });
      const asOwner = env.authenticatedContext("user-1");
      await assertFails(getDoc(doc(asOwner.firestore(), "users/user-1/notes/n1")));
    });

    it("denies direct client writes", async () => {
      const env = await getRulesTestEnv();
      const asUser = env.authenticatedContext("user-1");
      await assertFails(setDoc(doc(asUser.firestore(), "users/user-1/notes/n1"), { body: "x" }));
    });
  });
});
