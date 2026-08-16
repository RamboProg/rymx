"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { auth } from "@/lib/firebase/client";
import { authErrorMessage } from "../lib/authErrors";
import { establishSession } from "../lib/establishSession";
import { completeGoogleRedirectIfPresent, signInWithGoogle } from "../lib/googleSignIn";
import { loginSchema } from "../schema";

export function LoginForm() {
  const t = useTranslations("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          setError(authErrorMessage(err, t("googleSignInFailed")));
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
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("invalidInput"));
      return;
    }
    setPending(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, parsed.data.email, parsed.data.password);
      const destination = await establishSession(await cred.user.getIdToken());
      router.push(destination);
      router.refresh();
    } catch {
      setError(t("invalidCredentials"));
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    try {
      const result = await signInWithGoogle();
      if (result.kind === "redirecting") return; // full-page nav to Google
      router.push(result.destination);
      router.refresh();
    } catch (err) {
      const message = authErrorMessage(err, t("googleSignInFailed"));
      if (message) console.error("[auth] Google sign-in failed", err);
      setError(message);
    } finally {
      setPending(false);
    }
  }

  // method="post" so that if the form is ever submitted natively (e.g. before
  // hydration attaches onSubmit), credentials go in the request body, never the
  // URL query string — OWASP: never transmit credentials in a URL. The submit
  // is also gated on `hydrated` so the native path effectively can't fire.
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
      {/* Never give the password input a `name`: a native submit would then
          serialize it into the URL. It's driven by React state only. */}
      <Field
        id="password"
        label={t("password")}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || !hydrated} className="justify-center">
        {pending ? t("signingIn") : t("signIn")}
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
