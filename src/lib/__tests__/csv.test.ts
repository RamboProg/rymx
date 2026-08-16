import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvRecords } from "../csv";

describe("parseCsv", () => {
  it("splits simple comma-separated rows", () => {
    expect(parseCsv("a,b\n1,2\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles quoted fields containing commas and doubled-quote escapes", () => {
    expect(parseCsv('name,note\nAlice,"Say ""hi"", friend"')).toEqual([
      ["name", "note"],
      ["Alice", 'Say "hi", friend'],
    ]);
  });

  it("handles a newline embedded inside a quoted field", () => {
    expect(parseCsv('a,b\n"line one\nline two",2')).toEqual([
      ["a", "b"],
      ["line one\nline two", "2"],
    ]);
  });

  it("handles CRLF line endings and a trailing row with no final newline", () => {
    expect(parseCsv("a,b\r\n1,2\r\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});

describe("parseCsvRecords", () => {
  it("keys each row by the header row", () => {
    expect(parseCsvRecords("Handle,Title\nnile-tee,Nile Tee\nnile-tee,")).toEqual([
      { Handle: "nile-tee", Title: "Nile Tee" },
      { Handle: "nile-tee", Title: "" },
    ]);
  });

  it("ignores a __proto__ header instead of polluting the record's prototype", () => {
    const [record] = parseCsvRecords('__proto__,Title\nx,"Nile Tee"');
    expect(record).toEqual({ Title: "Nile Tee" });
    expect(Object.getPrototypeOf(record)).toBe(Object.prototype);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsvRecords("")).toEqual([]);
  });
});
