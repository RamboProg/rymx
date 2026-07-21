import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page not found — RYMX" };

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">Page not found</h1>
      <p className="text-rymx-cream/60 font-mono text-sm">
        That page doesn&apos;t exist, or has moved.
      </p>
      <Button href="/shop">Back to shop</Button>
    </div>
  );
}
