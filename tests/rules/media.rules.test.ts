import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, afterEach, describe, it } from "vitest";
import { getRulesTestEnv } from "./setup";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe("media module: media/{path} storage rules", () => {
  afterEach(async () => {
    const env = await getRulesTestEnv();
    await env.clearStorage();
  });

  afterAll(async () => {
    const env = await getRulesTestEnv();
    await env.cleanup();
  });

  it("allows public read of an uploaded image", async () => {
    const env = await getRulesTestEnv();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), "media/test.png"), PNG_BYTES);
    });
    const unauthed = env.unauthenticatedContext();
    await assertSucceeds(getBytes(ref(unauthed.storage(), "media/test.png")));
  });

  it("denies a direct client upload, even when signed in", async () => {
    const env = await getRulesTestEnv();
    const asUser = env.authenticatedContext("user-1");
    await assertFails(uploadBytes(ref(asUser.storage(), "media/test.png"), PNG_BYTES));
  });

  it("denies read/write outside the media/ path", async () => {
    const env = await getRulesTestEnv();
    const unauthed = env.unauthenticatedContext();
    await assertFails(uploadBytes(ref(unauthed.storage(), "private/test.png"), PNG_BYTES));
    await assertFails(getBytes(ref(unauthed.storage(), "private/test.png")));
  });
});
