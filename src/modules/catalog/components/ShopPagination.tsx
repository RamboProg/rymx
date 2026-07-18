"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ShopPagination({ page, hasMore }: { page: number; hasMore: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (page === 1 && !hasMore) return null;

  function goTo(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-center gap-4 font-mono text-xs uppercase">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
        className="text-rymx-cream/70 hover:text-rymx-gold disabled:pointer-events-none disabled:opacity-30"
      >
        Previous
      </button>
      <span className="text-rymx-cream/40">Page {page}</span>
      <button
        type="button"
        disabled={!hasMore}
        onClick={() => goTo(page + 1)}
        className="text-rymx-cream/70 hover:text-rymx-gold disabled:pointer-events-none disabled:opacity-30"
      >
        Next
      </button>
    </div>
  );
}
