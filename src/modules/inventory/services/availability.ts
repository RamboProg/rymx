export function isInStock(stock: number): boolean {
  return stock > 0;
}

export function totalStock(variants: readonly { stock: number }[]): number {
  return variants.reduce((sum, v) => sum + v.stock, 0);
}
