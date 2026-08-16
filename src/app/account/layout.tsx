import { redirect } from "next/navigation";
import { AccountVerifyBanner } from "@/modules/auth/components/AccountVerifyBanner";
import { getSessionClaims } from "@/modules/rbac/server";

// Locale/messages are provided globally by the root layout now.
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const claims = await getSessionClaims();
  if (!claims) {
    redirect("/login?next=/account");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-12 sm:px-8">
      {!claims.emailVerified && <AccountVerifyBanner />}
      {children}
    </div>
  );
}
