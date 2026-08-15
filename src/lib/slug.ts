// Derives a URL-safe slug from a human title: lowercase, non-alphanumeric runs
// collapsed to single hyphens, no leading/trailing hyphens. Matches SLUG_REGEX
// in catalog/schema.ts. Used everywhere a slug is auto-generated from a title
// (products, categories, collections) so the rule lives in exactly one place.
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
