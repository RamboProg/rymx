import type { ShippingSettings } from "../schema";

function normalize(governorate: string): string {
  return governorate.trim().toLowerCase();
}

// Governorate-agnostic estimate — used where the customer hasn't entered a
// shipping address yet (the cart page, before checkout).
export function computeShippingFeeMinor(
  subtotalMinor: number,
  settings: Pick<ShippingSettings, "defaultFeeMinor" | "freeShippingThresholdMinor">,
): number {
  if (
    settings.freeShippingThresholdMinor !== null &&
    subtotalMinor >= settings.freeShippingThresholdMinor
  ) {
    return 0;
  }
  return settings.defaultFeeMinor;
}

// Authoritative fee once a governorate is known — checks zone overrides
// before falling back to the flat default. The free-shipping threshold
// still wins over any zone fee.
export function resolveShippingFeeMinor(
  subtotalMinor: number,
  governorate: string,
  settings: ShippingSettings,
): number {
  if (
    settings.freeShippingThresholdMinor !== null &&
    subtotalMinor >= settings.freeShippingThresholdMinor
  ) {
    return 0;
  }

  const normalized = normalize(governorate);
  const zone = settings.zones.find((z) => z.governorates.some((g) => normalize(g) === normalized));
  return zone ? zone.feeMinor : settings.defaultFeeMinor;
}
