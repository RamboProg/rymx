import { assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

describe("firestore.rules baseline (deny-by-default)", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("denies unauthenticated reads of any document", async () => {
    const env = await getRulesTestEnv();
    const unauthed = env.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthed.firestore(), "products/example")));
  });

  it("denies unauthenticated writes to any document", async () => {
    const env = await getRulesTestEnv();
    const unauthed = env.unauthenticatedContext();
    await assertFails(setDoc(doc(unauthed.firestore(), "products/example"), { name: "x" }));
  });

  it("denies authenticated writes until a module grants access", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(setDoc(doc(asUser.firestore(), "users/user-1"), { name: "x" }));
  });
});
