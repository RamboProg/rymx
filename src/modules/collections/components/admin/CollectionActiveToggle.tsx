"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCollectionActiveAction } from "../../server/actions";

export function CollectionActiveToggle({ id, active }: { id: string; active: boolean }) {
  const t = useTranslations("collections");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const result = await setCollectionActiveAction(id, !active);
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`font-mono text-xs tracking-[0.1em] uppercase disabled:opacity-50 ${
        active ? "text-rymx-cream/60 hover:text-red-400" : "text-rymx-cream/60 hover:text-rymx-gold"
      }`}
    >
      {active ? t("deactivate") : t("activate")}
    </button>
  );
}
