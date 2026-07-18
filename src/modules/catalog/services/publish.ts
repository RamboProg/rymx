import type { ProductStatus } from "../schema";

// The decision /api/cron/publish makes for each draft product: only a draft
// with a publishAt in the past is due. Already-active/archived products and
// products with no publishAt (or a future one) are left alone.
export function isDueToPublish(status: ProductStatus, publishAt: Date | null, now: Date): boolean {
  return status === "draft" && publishAt !== null && publishAt <= now;
}
