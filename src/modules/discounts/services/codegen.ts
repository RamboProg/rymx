import { randomBytes } from "node:crypto";

const SUFFIX_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids misread codes
const SUFFIX_LENGTH = 6;

function randomSuffix(): string {
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    // eslint-disable-next-line security/detect-object-injection -- index is a random byte modulo the alphabet length, not user input
    suffix += SUFFIX_ALPHABET[bytes[i]! % SUFFIX_ALPHABET.length];
  }
  return suffix;
}

// Generates `count` unique codes of the form `PREFIX-XXXXXX` (or just
// `XXXXXX` with no prefix). Collision-checked against `existing` (and within
// the batch itself) so a caller can pass currently-taken codes and get back
// a set guaranteed not to clash with them.
export function generateBulkCodes(
  prefix: string,
  count: number,
  existing: ReadonlySet<string> = new Set(),
): string[] {
  const normalizedPrefix = prefix.trim().toUpperCase();
  const taken = new Set(existing);
  const codes: string[] = [];

  while (codes.length < count) {
    const code = normalizedPrefix ? `${normalizedPrefix}-${randomSuffix()}` : randomSuffix();
    if (taken.has(code)) continue;
    taken.add(code);
    codes.push(code);
  }

  return codes;
}
