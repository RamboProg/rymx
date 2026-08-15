"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleToggle } from "./LocaleToggle";

const NAV_ITEMS = [
  { href: "/admin", key: "dashboard" },
  { href: "/admin/products", key: "products" },
  { href: "/admin/categories", key: "categories" },
  { href: "/admin/collections", key: "collections" },
  { href: "/admin/inventory", key: "inventory" },
  { href: "/admin/orders", key: "orders" },
  { href: "/admin/discounts", key: "discounts" },
  { href: "/admin/customers", key: "customers" },
  { href: "/admin/settings", key: "settings" },
  { href: "/admin/staff", key: "staff" },
  { href: "/admin/analytics", key: "analytics" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav aria-label={t("label")} className="flex w-48 shrink-0 flex-col gap-1">
      <div className="mb-3 flex justify-end">
        <LocaleToggle />
      </div>
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
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
