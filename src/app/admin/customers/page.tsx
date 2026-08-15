import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Table, Td, Th } from "@/components/admin/Table";
import { formatEGP } from "@/lib/money";
import { listCustomers } from "@/modules/customers/server";

export const metadata: Metadata = { title: "Customers — Admin — RYMX" };

export default async function AdminCustomersPage() {
  const t = await getTranslations("pages.customers");
  const customers = (await listCustomers()).sort(
    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
        <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
      </div>

      {customers.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">No customers yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Tags</Th>
              <Th>Orders</Th>
              <Th>Lifetime value</Th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.uid}>
                <Td>
                  <Link href={`/admin/customers/${customer.uid}`} className="hover:text-rymx-gold">
                    {customer.displayName ?? customer.email ?? customer.uid}
                  </Link>
                </Td>
                <Td>{customer.tags.length > 0 ? customer.tags.join(", ") : "—"}</Td>
                <Td>{customer.orderCount}</Td>
                <Td>{formatEGP(customer.lifetimeValueMinor)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
