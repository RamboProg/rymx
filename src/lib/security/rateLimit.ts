// In-memory sliding-window limiter, scoped to a single serverless instance.
// Good enough for local/emulator use and a single long-lived server; on
// Vercel's multi-instance runtime it only bounds abuse per-instance, not
// globally. Phase 9 hardening swaps this for a shared store if needed.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function requestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Shared by every admin-mutation action's permission-gate helper (products,
// collections, orders, shipments, returns, discounts, customers, settings,
// staff, content). Generous on purpose — normal admin usage, even fast
// clicking through a table, is nowhere near this; it's meant to catch a
// compromised staff session or a runaway script, not a busy merchant.
export function checkAdminMutationRateLimit(uid: string): boolean {
  return checkRateLimit(`admin-mutation:${uid}`, 120, 60 * 1000);
}
