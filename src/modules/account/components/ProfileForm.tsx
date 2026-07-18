"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { updateProfileSchema, type Profile } from "../schema";
import { updateProfileAction } from "../server/actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = updateProfileSchema.safeParse({ displayName, phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setPending(true);
    const result = await updateProfileAction(parsed.data);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {profile.email && <p className="text-rymx-cream/50 font-mono text-xs">{profile.email}</p>}
      <Field
        id="displayName"
        label="Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <Field
        id="phone"
        label="Phone number"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-rymx-gold font-mono text-sm">Saved</p>}
      <Button type="submit" disabled={pending} className="justify-center">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
