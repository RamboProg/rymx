import { describe, expect, it } from "vitest";
import { addAddressSchema, updateProfileSchema } from "../schema";

describe("updateProfileSchema", () => {
  it("accepts a name with an optional phone", () => {
    const parsed = updateProfileSchema.safeParse({
      displayName: "Sara Ahmed",
      phone: "01012345678",
    });
    expect(parsed.success).toBe(true);
  });

  it("defaults phone to an empty string when omitted", () => {
    const parsed = updateProfileSchema.safeParse({ displayName: "Sara Ahmed" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.phone).toBe("");
  });

  it("rejects an empty name", () => {
    expect(updateProfileSchema.safeParse({ displayName: "  ", phone: "" }).success).toBe(false);
  });

  it("rejects a name over 80 characters", () => {
    expect(updateProfileSchema.safeParse({ displayName: "a".repeat(81) }).success).toBe(false);
  });
});

describe("addAddressSchema", () => {
  const valid = {
    fullName: "Sara Ahmed",
    phone: "01012345678",
    governorate: "Cairo",
    city: "Maadi",
    addressLine: "12 Nile St.",
  };

  it("accepts a fully filled address", () => {
    expect(addAddressSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing required field", () => {
    expect(addAddressSchema.safeParse({ ...valid, fullName: "" }).success).toBe(false);
    expect(addAddressSchema.safeParse({ ...valid, addressLine: "" }).success).toBe(false);
  });

  it("rejects a phone shorter than 8 characters", () => {
    expect(addAddressSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
  });

  it("trims whitespace-only fields to empty and rejects them", () => {
    expect(addAddressSchema.safeParse({ ...valid, city: "   " }).success).toBe(false);
  });
});
