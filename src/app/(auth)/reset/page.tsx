import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/modules/auth/components/ResetForm";

export const metadata: Metadata = { title: "Reset password — RYMX" };

export default function ResetPage() {
  return (
    <>
      <h1 className="font-display text-rymx-cream text-2xl font-bold">Reset your password</h1>
      <ResetForm />
      <p className="text-rymx-cream/50 text-center font-mono text-xs">
        <Link href="/login" className="hover:text-rymx-gold">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
