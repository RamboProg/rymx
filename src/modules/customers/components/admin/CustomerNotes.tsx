"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { addCustomerNoteAction } from "../../server/actions";
import type { CustomerNote } from "../../schema";

export function CustomerNotes({
  uid,
  notes: initialNotes,
}: {
  uid: string;
  notes: CustomerNote[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await addCustomerNoteAction({ uid, body });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotes(result.notes);
    setBody("");
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-rymx-cream text-lg font-bold">Internal notes</h2>

      {notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="border-rymx-cream/10 bg-rymx-card rounded-md border p-3">
              <p className="text-rymx-cream/80 font-mono text-sm whitespace-pre-wrap">
                {note.body}
              </p>
              <p className="text-rymx-cream/40 mt-1 font-mono text-xs">
                {note.createdAt.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a note…"
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
        />
        {error && (
          <p role="alert" className="font-mono text-sm text-red-400">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={saving || body.trim().length === 0}
          className="w-fit justify-center"
        >
          {saving ? "Saving…" : "Add note"}
        </Button>
      </form>
    </section>
  );
}
