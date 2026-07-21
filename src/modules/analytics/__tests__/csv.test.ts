import { describe, expect, it } from "vitest";
import { toCsv } from "../services/csv";

describe("toCsv", () => {
  it("joins headers and rows with commas and CRLF", () => {
    expect(
      toCsv(
        ["a", "b"],
        [
          [1, 2],
          [3, 4],
        ],
      ),
    ).toBe("a,b\r\n1,2\r\n3,4");
  });

  it("quotes and escapes a field containing a comma, quote, or newline", () => {
    expect(toCsv(["name"], [['Say "hi", friend']])).toBe('name\r\n"Say ""hi"", friend"');
  });
});
