// RFC 4180-ish CSV decoder — handles quoted fields containing commas,
// newlines, and doubled-quote escapes (""), which a naive split(",") breaks
// on. Symmetric counterpart to the encoder in
// modules/analytics/services/csv.ts; kept separate since this one is used by
// catalog's CSV import, not analytics' export.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  function pushField() {
    row.push(field);
    field = "";
  }
  function pushRow() {
    pushField();
    rows.push(row);
    row = [];
  }

  while (i < len) {
    // eslint-disable-next-line security/detect-object-injection -- string character indexing (text[i]), not object property access
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // Flush a trailing field/row when the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

// Keys that would shadow Object.prototype members if assigned directly —
// header names come from an uploaded file, so this guards against a
// prototype-pollution-shaped header like "__proto__" rather than trusting it.
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// First row is treated as the header; every subsequent row becomes an
// object keyed by header name (missing trailing cells become "").
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0]!;
  return rows.slice(1).map((r) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (UNSAFE_KEYS.has(h)) return;
      // eslint-disable-next-line security/detect-object-injection -- h is checked against UNSAFE_KEYS above; record is a fresh plain object, not a shared/prototype-bearing target
      record[h] = r[i] ?? "";
    });
    return record;
  });
}
