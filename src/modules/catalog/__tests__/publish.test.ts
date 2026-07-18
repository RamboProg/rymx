import { describe, expect, it } from "vitest";
import { isDueToPublish } from "../services/publish";

describe("isDueToPublish", () => {
  const now = new Date("2026-01-15T00:00:00Z");

  it("is due when draft and publishAt has passed", () => {
    expect(isDueToPublish("draft", new Date("2026-01-14"), now)).toBe(true);
  });

  it("is not due when publishAt is in the future", () => {
    expect(isDueToPublish("draft", new Date("2026-01-16"), now)).toBe(false);
  });

  it("is not due when publishAt is null", () => {
    expect(isDueToPublish("draft", null, now)).toBe(false);
  });

  it("is not due when already active, even with a past publishAt", () => {
    expect(isDueToPublish("active", new Date("2026-01-14"), now)).toBe(false);
  });

  it("is not due when archived", () => {
    expect(isDueToPublish("archived", new Date("2026-01-14"), now)).toBe(false);
  });

  it("is due exactly at publishAt", () => {
    expect(isDueToPublish("draft", now, now)).toBe(true);
  });
});
