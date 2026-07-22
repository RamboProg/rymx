"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCollectionAction } from "../../server/actions";

export function CollectionDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm("Delete this collection? This cannot be undone.")) return;
    setBusy(true);
    const result = await deleteCollectionAction(id);
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase hover:text-red-400 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
