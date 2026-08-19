"use client";

import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { auth } from "@/lib/firebase/client";
import { getSiteUrl } from "@/lib/siteUrl";
import { authErrorMessage } from "../lib/authErrors";
import { establishSession } from "../lib/establishSession";
import { completeGoogleRedirectIfPresent, signInWithGoogle } from "../lib/googleSignIn";
import { registerSchema } from "../schema";

export function RegisterForm() {
  const t = useTranslations("register");
  const router = useRouter();
  const registerFormSchema = registerSchema
    .extend({ confirmPassword: z.string() })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  // Finish Google redirect sign-in if the user just returned from accounts.google.com.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const destination = await completeGoogleRedirectIfPresent();
        if (cancelled || !destination) return;
        router.push(destination);
        router.refresh();
      } catch (err) {
        console.error("[auth] Google redirect completion failed", err);
        if (!cancelled) {
          setError(authErrorMessage(err, t("googleSignUpFailed")));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = registerFormSchema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("invalidInput"));
      return;
    }
    setPending(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        parsed.data.email,
        parsed.data.password,
      );
      // Fixed, hardcoded continue URL — never user-supplied — so this can't be
      // used as an open redirect via the verification email link.
      await sendEmailVerification(cred.user, { url: `${getSiteUrl()}/login` });
      await establishSession(await cred.user.getIdToken());
      router.push("/verify-email");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === "auth/email-already-in-use" ? t("emailInUse") : t("registrationFailed"));
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    try {
      // Google accounts are pre-verified by Google — no interstitial needed.
      const result = await signInWithGoogle();
      if (result.kind === "redirecting") return; // full-page nav to Google
      router.push(result.destination);
      router.refresh();
    } catch (err) {
      const message = authErrorMessage(err, t("googleSignUpFailed"));
      if (message) console.error("[auth] Google sign-up failed", err);
      setError(message);
    } finally {
      setPending(false);
    }
  }

  // method="post" + hydration-gated submit so credentials never end up in the
  // URL via a native (pre-hydration) form submission — OWASP: never transmit
  // credentials in a URL.
  return (
    <form onSubmit={onSubmit} method="post" className="flex w-full flex-col gap-4" noValidate>
      <Field
        id="email"
        label={t("email")}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {/* Password inputs must never have a `name` — a native submit would then
          serialize them into the URL. React state only. */}
      <Field
        id="password"
        label={t("password")}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        id="confirmPassword"
        label={t("confirmPassword")}
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || !hydrated} className="justify-center">
        {pending ? t("creatingAccount") : t("createAccount")}
      </Button>
      <button
        type="button"
        onClick={onGoogle}
        disabled={pending}
        className="border-rymx-cream/20 text-rymx-cream hover:border-rymx-gold hover:text-rymx-gold rounded-full border px-6 py-3 font-mono text-xs tracking-[0.1em] uppercase transition-colors disabled:pointer-events-none disabled:opacity-50"
      >
        {t("continueWithGoogle")}
      </button>
    </form>
  );
}
