// Resolution order: an explicit NEXT_PUBLIC_SITE_URL (set once rymx-prod has
// a real domain) → Vercel's auto-provided VERCEL_URL (previews/staging,
// always http-less and needs a scheme) → localhost for local dev.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
