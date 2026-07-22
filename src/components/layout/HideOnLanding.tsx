"use client";

import { usePathname } from "next/navigation";

// Server Components passed as `children` here stay Server Components — this
// wrapper only decides whether to render them, it doesn't re-fetch or
// re-mount anything. usePathname() re-runs on every client-side navigation
// (unlike reading the pathname from a request header in a layout, which only
// updates on a full page load), so the header/footer reappear immediately
// when navigating away from "/" without a hard refresh.
export function HideOnLanding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <>{children}</>;
}
