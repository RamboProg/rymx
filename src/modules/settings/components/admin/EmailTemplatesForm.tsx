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
  const [orderConfirmedIntro, setOrderConfirmedIntro] = useState(templates.orderConfirmedIntro);
  const [orderShippedIntro, setOrderShippedIntro] = useState(templates.orderShippedIntro);
  const [orderDeliveredIntro, setOrderDeliveredIntro] = useState(templates.orderDeliveredIntro);
  const [orderCancelledIntro, setOrderCancelledIntro] = useState(templates.orderCancelledIntro);
  const [promoCodeIntro, setPromoCodeIntro] = useState(templates.promoCodeIntro);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = emailTemplatesSchema.safeParse({
      orderConfirmationIntro,
      orderConfirmedIntro,
      orderShippedIntro,
      orderDeliveredIntro,
      orderCancelledIntro,
      promoCodeIntro,
    });
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
          htmlFor="orderConfirmedIntro"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          {t("orderConfirmedIntro")}
        </label>
        <textarea
          id="orderConfirmedIntro"
          rows={2}
          value={orderConfirmedIntro}
          onChange={(e) => setOrderConfirmedIntro(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 font-mono text-sm outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="orderShippedIntro"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          {t("orderShippedIntro")}
        </label>
        <textarea
          id="orderShippedIntro"
          rows={2}
          value={orderShippedIntro}
          onChange={(e) => setOrderShippedIntro(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 font-mono text-sm outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="orderDeliveredIntro"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          {t("orderDeliveredIntro")}
        </label>
        <textarea
          id="orderDeliveredIntro"
          rows={2}
          value={orderDeliveredIntro}
          onChange={(e) => setOrderDeliveredIntro(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 font-mono text-sm outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="orderCancelledIntro"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          {t("orderCancelledIntro")}
        </label>
        <textarea
          id="orderCancelledIntro"
          rows={2}
          value={orderCancelledIntro}
          onChange={(e) => setOrderCancelledIntro(e.target.value)}
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
