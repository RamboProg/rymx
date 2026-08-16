import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getSessionClaims } from "@/modules/rbac/server";
import { isStaff } from "@/modules/rbac/services/permissions";

// Locale/messages/dir/font are provided globally by the root layout
// (src/app/layout.tsx) now that the whole site is localized.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const claims = await getSessionClaims();
  if (!claims || !isStaff(claims.role)) {
    redirect("/login?next=/admin");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-10 px-6 py-10 sm:px-8">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
