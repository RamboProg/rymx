import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Table, Td, Th } from "@/components/admin/Table";
import { InviteStaffForm } from "@/modules/rbac/components/admin/InviteStaffForm";
import { StaffTable } from "@/modules/rbac/components/admin/StaffTable";
import { listStaffUsers } from "@/modules/rbac/server/admin";
import { listAuditLog } from "@/modules/rbac/server/audit";
import { getSessionClaims } from "@/modules/rbac/server";

export const metadata: Metadata = { title: "Staff — Admin — RYMX" };

export default async function AdminStaffPage() {
  const [staff, auditLog, claims, t, locale] = await Promise.all([
    listStaffUsers(),
    listAuditLog(50),
    getSessionClaims(),
    getTranslations("pages.staff"),
    getLocale(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
        <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
      </div>

      <section className="flex flex-col gap-4">
        <StaffTable staff={staff} currentUid={claims!.uid} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">
          {t("inviteHeading")}
        </h2>
        <InviteStaffForm />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">
          {t("auditLogHeading")}
        </h2>
        {auditLog.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noAuditLog")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colWhen")}</Th>
                <Th>{t("colActor")}</Th>
                <Th>{t("colAction")}</Th>
                <Th>{t("colDetails")}</Th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry) => (
                <tr key={entry.id}>
                  <Td>{entry.createdAt.toLocaleString(locale)}</Td>
                  <Td>{entry.actorUid}</Td>
                  <Td>{entry.action}</Td>
                  <Td>{entry.details}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
