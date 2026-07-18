import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export const metadata: Metadata = { title: "Sign in — RYMX" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-rymx-cream text-2xl font-bold">Sign in</h1>
      <LoginForm />
      <p className="text-rymx-cream/50 text-center font-mono text-xs">
        No account?{" "}
        <Link href="/register" className="text-rymx-gold hover:text-rymx-gold-hover">
          Register
        </Link>
      </p>
      <p className="text-rymx-cream/50 text-center font-mono text-xs">
        <Link href="/reset" className="hover:text-rymx-gold">
          Forgot password?
        </Link>
      </p>
    </>
  );
}
