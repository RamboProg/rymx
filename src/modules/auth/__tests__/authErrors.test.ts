import { describe, expect, it } from "vitest";
import { authErrorMessage } from "../authErrors";

describe("authErrorMessage", () => {
  it("returns null when the user closes the popup", () => {
    expect(authErrorMessage({ code: "auth/popup-closed-by-user" }, "fallback")).toBeNull();
    expect(authErrorMessage({ code: "auth/cancelled-popup-request" }, "fallback")).toBeNull();
  });

  it("explains unauthorized domains", () => {
    expect(authErrorMessage({ code: "auth/unauthorized-domain" }, "fallback")).toMatch(
      /Authorized domains/i,
    );
  });

  it("explains session setup failure after Google succeeds", () => {
    expect(authErrorMessage(new Error("Failed to establish session"), "fallback")).toMatch(
      /creating the app session failed/i,
    );
  });

  it("falls back for unknown errors", () => {
    expect(authErrorMessage({ code: "auth/internal-error" }, "Google sign-in failed")).toBe(
      "Google sign-in failed",
    );
  });
});
