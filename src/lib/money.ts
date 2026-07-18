// Prices are stored as integers in minor units (piastres); currency is EGP.
export function formatEGP(minorUnits: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
  }).format(minorUnits / 100);
}
