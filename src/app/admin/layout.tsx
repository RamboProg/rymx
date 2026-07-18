import { redirect } from "next/navigation";
import { getSessionClaims } from "@/modules/rbac/server";
import { isStaff } from "@/modules/rbac/services/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const claims = await getSessionClaims();
  if (!claims || !isStaff(claims.role)) {
    redirect("/login?next=/admin");
  }

  return <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-8">{children}</div>;
}
