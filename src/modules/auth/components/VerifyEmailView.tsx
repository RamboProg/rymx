"use client";

import { onAuthStateChanged, sendEmailVerification, type User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase/client";
import { getSiteUrl } from "@/lib/siteUrl";

const RESEND_COOLDOWN_SECONDS = 60;

type Status = "idle" | "sending" | "sent" | "error";

// Interstitial shown right after registration (see RegisterForm) and reachable
// any time from the /account nag banner for a still-unverified user. Reads
// auth.currentUser directly — this page never gates access (the account area
// stays reachable for unverified users, only nags), it just surfaces the
// state and lets the user resend the link.
export function VerifyEmailView() {
  const t = useTranslations("verifyEmail");
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!ready || user) return;
    // Not signed in at all (direct nav, expired session) — nothing to verify.
    router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cooldown]);

  async function onResend() {
    if (!auth.currentUser || cooldown > 0 || status === "sending") return;
    setStatus("sending");
    try {
      // Fixed, hardcoded continue URL — never user-supplied — so this can't be
      // used as an open redirect via the verification email link.
      await sendEmailVerification(auth.currentUser, { url: `${getSiteUrl()}/login` });
      setStatus("sent");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setStatus("error");
    }
  }

  if (!user) return null;

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
      <p className="text-rymx-cream/70 text-sm">{t("body", { email: user.email ?? "" })}</p>
      <p className="text-rymx-cream/50 font-mono text-xs">{t("spamNote")}</p>

      {status === "sent" && (
        <p role="status" className="text-sm text-emerald-400">
          {t("resent")}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="text-sm text-red-400">
          {t("resendError")}
        </p>
      )}

      <Button
        type="button"
        onClick={onResend}
        disabled={status === "sending" || cooldown > 0}
        className="justify-center"
      >
        {status === "sending"
          ? t("resending")
          : cooldown > 0
            ? t("resendCooldown", { seconds: cooldown })
            : t("resend")}
      </Button>

      <p className="text-rymx-cream/50 text-center font-mono text-xs">
        <Link href="/account" className="text-rymx-gold hover:text-rymx-gold-hover">
          {t("continue")}
        </Link>
      </p>
    </div>
  );
}
