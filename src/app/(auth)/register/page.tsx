import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/modules/auth/components/RegisterForm";

export const metadata: Metadata = { title: "Register — RYMX" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="font-display text-rymx-cream text-2xl font-bold">Create an account</h1>
      <RegisterForm />
      <p className="text-rymx-cream/50 text-center font-mono text-xs">
        Already have an account?{" "}
        <Link href="/login" className="text-rymx-gold hover:text-rymx-gold-hover">
          Sign in
        </Link>
      </p>
    </>
  );
}
