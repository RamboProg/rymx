import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — RYMX" };

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">Admin</h1>
      <p className="text-rymx-cream/60 font-mono text-sm">
        Dashboard, products, and merchandising tools ship in Phase 6.
      </p>
    </div>
  );
}
