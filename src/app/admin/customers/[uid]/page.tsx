import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Table, Td, Th } from "@/components/admin/Table";
import { formatEGP } from "@/lib/money";
import { CustomerNotes } from "@/modules/customers/components/admin/CustomerNotes";
import { IssuePromoForm } from "@/modules/customers/components/admin/IssuePromoForm";
import { TagEditor } from "@/modules/customers/components/admin/TagEditor";
import { getCustomer, listCustomerNotes } from "@/modules/customers/server";
import { listOrdersByUid } from "@/modules/orders/server";

export const metadata: Metadata = { title: "Customer — Admin — RYMX" };

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const customer = await getCustomer(uid);
  if (!customer) notFound();

  const [orders, notes, t, tOrderStatus, locale] = await Promise.all([
    listOrdersByUid(uid),
    listCustomerNotes(uid),
    getTranslations("pages.customers"),
    getTranslations("orderStatus"),
    getLocale(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">
          {customer.displayName ?? customer.email ?? customer.uid}
        </h1>
        <p className="text-rymx-cream/50 font-mono text-xs">
          {customer.email} {customer.phone ? `· ${customer.phone}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border-rymx-cream/10 bg-rymx-card rounded-md border p-5">
          <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
            {t("colOrders")}
          </span>
          <p className="font-display text-rymx-cream text-2xl font-bold">{customer.orderCount}</p>
        </div>
        <div className="border-rymx-cream/10 bg-rymx-card rounded-md border p-5">
          <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
            {t("colLifetimeValue")}
          </span>
          <p className="font-display text-rymx-cream text-2xl font-bold">
            {formatEGP(customer.lifetimeValueMinor)}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-rymx-cream text-lg font-bold">{t("colTags")}</h2>
        <TagEditor uid={uid} tags={customer.tags} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-rymx-cream text-lg font-bold">{t("orderHistory")}</h2>
        {orders.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noOrders")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colOrder")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th>{t("colTotal")}</Th>
                <Th>{t("colPlaced")}</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <Td>
                    <Link href={`/admin/orders/${order.id}`} className="hover:text-rymx-gold">
                      #{order.id.slice(0, 8)}
                    </Link>
                  </Td>
                  <Td>{tOrderStatus(order.status)}</Td>
                  <Td>{formatEGP(order.totalMinor)}</Td>
                  <Td>{order.createdAt.toLocaleDateString(locale)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-rymx-cream text-lg font-bold">
          {t("issuePromoHeading")}
        </h2>
        <IssuePromoForm uid={uid} email={customer.email} />
      </section>

      <CustomerNotes uid={uid} notes={notes} />
    </div>
  );
}
