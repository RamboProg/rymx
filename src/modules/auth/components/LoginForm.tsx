"use client";

import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { auth } from "@/lib/firebase/client";
import { loginSchema } from "../schema";

async function establishSession(idToken: string) {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Failed to establish session");
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setPending(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, parsed.data.email, parsed.data.password);
      await establishSession(await cred.user.getIdToken());
      router.push("/account");
      router.refresh();
    } catch {
      setError("Invalid email or password");
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await establishSession(await cred.user.getIdToken());
      router.push("/account");
      router.refresh();
    } catch {
      setError("Google sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4" noValidate>
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        id="password"
        label="Password"
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
      <Button type="submit" disabled={pending} className="justify-center">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <button
        type="button"
        onClick={onGoogle}
        disabled={pending}
        className="border-rymx-cream/20 text-rymx-cream hover:border-rymx-gold hover:text-rymx-gold rounded-full border px-6 py-3 font-mono text-xs tracking-[0.1em] uppercase transition-colors disabled:pointer-events-none disabled:opacity-50"
      >
        Continue with Google
      </button>
    </form>
  );
}
