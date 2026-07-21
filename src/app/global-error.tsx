"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body className="bg-rymx-bg text-rymx-cream flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center font-sans">
        <h1 className="font-display text-2xl font-bold">Something went wrong.</h1>
        <p className="text-rymx-cream/60 font-mono text-sm">
          We&apos;ve been notified. Try again, or come back in a moment.
        </p>
        <button
          onClick={reset}
          className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold rounded-full border px-6 py-3 font-mono text-xs uppercase hover:text-[#12100a]"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
