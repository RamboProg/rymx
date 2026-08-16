// Fires a conversion event to whichever pixel(s) are configured (see
// src/components/analytics/PixelScripts.tsx) — safe no-op if neither loaded.
// Not wired into any flow yet; call from conversion points (add-to-cart,
// checkout, order confirmation) as those get a defined event spec.
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq === "function") fbq("track", name, params);

  const ttq = (window as unknown as { ttq?: { track: (...args: unknown[]) => void } }).ttq;
  if (ttq && typeof ttq.track === "function") ttq.track(name, params);
}
