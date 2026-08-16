"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { emailTemplatesSchema, type EmailTemplates } from "../../schema";
import { updateEmailTemplatesAction } from "../../server/actions";

export function EmailTemplatesForm({ templates }: { templates: EmailTemplates }) {
  const t = useTranslations("emailTemplates");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [orderConfirmationIntro, setOrderConfirmationIntro] = useState(
    templates.orderConfirmationIntro,
  );
  const [promoCodeIntro, setPromoCodeIntro] = useState(templates.promoCodeIntro);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = emailTemplatesSchema.safeParse({ orderConfirmationIntro, promoCodeIntro });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? tCommon("invalidInput"));
      return;
    }

    setSaving(true);
    const result = await updateEmailTemplatesAction(parsed.data);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="orderConfirmationIntro"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          {t("orderConfirmationIntro")}
        </label>
        <textarea
          id="orderConfirmationIntro"
          rows={2}
          value={orderConfirmationIntro}
          onChange={(e) => setOrderConfirmationIntro(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 font-mono text-sm outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="promoCodeIntro"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          {t("promoCodeIntro")}
        </label>
        <textarea
          id="promoCodeIntro"
          rows={2}
          value={promoCodeIntro}
          onChange={(e) => setPromoCodeIntro(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 font-mono text-sm outline-none"
        />
      </div>
      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-rymx-gold font-mono text-sm">{tCommon("saved")}</p>}
      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? tCommon("saving") : t("saveEmailTemplates")}
      </Button>
    </form>
  );
}
