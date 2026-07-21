"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">Something went wrong</h1>
      <p className="text-rymx-cream/60 font-mono text-sm">
        We&apos;ve been notified. Try again, or head back to the shop.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold rounded-full border px-6 py-3 font-mono text-xs uppercase hover:text-[#12100a]"
        >
          Try again
        </button>
        <Button href="/shop">Back to shop</Button>
      </div>
    </div>
  );
}
