const SIZE_KEYS = new Set(["size", "sizes", "المقاس", "مقاس"]);

export function isSizeOptionKey(key: string): boolean {
  return SIZE_KEYS.has(key.trim().toLowerCase());
}

export function sizeFromOptions(optionValues: Record<string, string>): string {
  for (const [key, value] of Object.entries(optionValues)) {
    if (isSizeOptionKey(key)) return value;
  }
  return "—";
}
