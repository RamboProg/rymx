"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setDiscountActiveAction } from "../../server/actions";

export function DiscountActiveToggle({ code, active }: { code: string; active: boolean }) {
  const t = useTranslations("discounts");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const result = await setDiscountActiveAction(code, !active);
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
