import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, resetSchema } from "../schema";

describe("auth schemas", () => {
  it("registerSchema accepts a valid email + 8+ char password", () => {
    expect(registerSchema.safeParse({ email: "a@rymx.test", password: "password1" }).success).toBe(
      true,
    );
  });

  it("registerSchema rejects a short password", () => {
    const result = registerSchema.safeParse({ email: "a@rymx.test", password: "short" });
    expect(result.success).toBe(false);
  });

  it("registerSchema rejects an invalid email", () => {
    const result = registerSchema.safeParse({ email: "not-an-email", password: "password1" });
    expect(result.success).toBe(false);
  });

  it("loginSchema rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "a@rymx.test", password: "" });
    expect(result.success).toBe(false);
  });

  it("resetSchema requires a valid email", () => {
    expect(resetSchema.safeParse({ email: "a@rymx.test" }).success).toBe(true);
    expect(resetSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
