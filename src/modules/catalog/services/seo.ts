// SEO title/description are derived from the product's own title and
// description rather than staff-entered fields — admin only handles the
// business side (title, price, stock, category); search-engine copy is
// generated automatically so nobody has to duplicate that work.
export function productSeoTitle(title: string): string {
  return `${title} — RYMX`;
}

export function productSeoDescription(title: string, description: string): string {
  const trimmed = description.trim();
  if (trimmed) return trimmed;
  return `${title} — shop it now at RYMX.`;
}
