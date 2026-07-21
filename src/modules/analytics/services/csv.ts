// Minimal RFC 4180-ish CSV encoder — quotes any field containing a comma,
// quote, or newline, doubling embedded quotes. No external dependency for
// something this small.
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number)[])[],
): string {
  function escapeCell(cell: string | number): string {
    const text = String(cell);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return lines.join("\r\n");
}
