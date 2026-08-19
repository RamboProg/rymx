"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { auth } from "@/lib/firebase/client";
import { resetSchema } from "../schema";

export function ResetForm() {
  const t = useTranslations("reset");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const hydrated = useHydrated();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = resetSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("invalidInput"));
      return;
    }
    setPending(true);
    try {
      await sendPasswordResetEmail(auth, parsed.data.email);
    } catch {
      // Firebase intentionally reveals nothing distinguishing "no such
      // account" from success here, to avoid leaking which emails are
      // registered. Treat any outcome as sent.
    } finally {
      setPending(false);
      setSent(true);
    }
  }

  if (sent) {
    return <p className="text-rymx-cream/70 font-mono text-sm">{t("sentMessage", { email })}</p>;
  }

  // method="post" + hydration-gated submit so the email is never placed in the
  // URL by a native (pre-hydration) submission.
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
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || !hydrated} className="justify-center">
        {pending ? t("sending") : t("sendResetLink")}
      </Button>
    </form>
  );
}
