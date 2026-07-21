"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/discounts", label: "Discounts" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex w-48 shrink-0 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-2 font-mono text-xs tracking-[0.1em] uppercase transition-colors ${
              isActive
                ? "bg-rymx-card text-rymx-gold"
                : "text-rymx-cream/60 hover:bg-rymx-card hover:text-rymx-cream"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
