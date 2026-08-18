import { describe, expect, it } from "vitest";
import { formatOrderId, getCairoDateKey } from "../services/orderNumber";

describe("getCairoDateKey", () => {
  it("resolves a UTC instant to the Cairo-local calendar day", () => {
    // 2026-08-18T21:30:00Z is already 2026-08-19 in Cairo (UTC+3 in August).
    expect(getCairoDateKey(new Date("2026-08-18T21:30:00Z"))).toBe("20260819");
  });

  it("stays on the same UTC day when Cairo hasn't rolled over yet", () => {
    // 2026-08-19T05:00:00Z is 2026-08-19T08:00 in Cairo — same calendar day.
    expect(getCairoDateKey(new Date("2026-08-19T05:00:00Z"))).toBe("20260819");
  });
});

describe("formatOrderId", () => {
  it("zero-pads the sequence to 3 digits", () => {
    expect(formatOrderId("20260819", 1)).toBe("20260819-001");
    expect(formatOrderId("20260819", 12)).toBe("20260819-012");
    expect(formatOrderId("20260819", 123)).toBe("20260819-123");
  });

  it("stays unique (unpadded) past 999", () => {
    expect(formatOrderId("20260819", 1000)).toBe("20260819-1000");
  });
});
