"use client";

import { type FormEvent, useState } from "react";
import { addCustomerTagAction, removeCustomerTagAction } from "../../server/actions";

export function TagEditor({ uid, tags: initial }: { uid: string; tags: string[] }) {
  const [tags, setTags] = useState(initial);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!value.trim()) return;
    setBusy(true);
    const result = await addCustomerTagAction({ uid, tag: value.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTags(result.tags);
    setValue("");
  }

  async function onRemove(tag: string) {
    setBusy(true);
    const result = await removeCustomerTagAction({ uid, tag });
    setBusy(false);
    if (result.ok) setTags(result.tags);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="border-rymx-gold/40 text-rymx-gold flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs uppercase"
          >
            {tag}
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(tag)}
              aria-label={`Remove tag ${tag}`}
              className="hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-rymx-cream/40 font-mono text-xs">No tags yet.</span>
        )}
      </div>
      <form onSubmit={onAdd} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a tag…"
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold rounded-md border px-4 py-2 font-mono text-xs uppercase hover:text-[#12100a] disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
