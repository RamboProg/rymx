import type { Metadata } from "next";
import { VerifyEmailView } from "@/modules/auth/components/VerifyEmailView";

export const metadata: Metadata = { title: "Verify email — RYMX" };

// Locale/messages/dir are provided globally by the root layout now.
export default function VerifyEmailPage() {
  return <VerifyEmailView />;
}
