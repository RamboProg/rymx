"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { NumberField, Field } from "@/components/ui/Input";
import { storeSettingsSchema, type StoreSettings } from "../../schema";
import { updateStoreSettingsAction } from "../../server/actions";

export function StoreSettingsForm({ settings }: { settings: StoreSettings }) {
  const t = useTranslations("storeSettings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [storeName, setStoreName] = useState(settings.storeName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail ?? "");
  const [codEnabled, setCodEnabled] = useState(settings.codEnabled);
  const [codFee, setCodFee] = useState(String(settings.codFeeMinor / 100));
  const [maxOrderValue, setMaxOrderValue] = useState(
    settings.maxOrderValueMinor !== null ? String(settings.maxOrderValueMinor / 100) : "",
  );
  const [taxPercent, setTaxPercent] = useState(String(settings.taxPercent));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = storeSettingsSchema.safeParse({
      storeName,
      supportEmail: supportEmail.trim() || null,
      codEnabled,
      codFeeMinor: Math.round(Number(codFee) * 100),
      maxOrderValueMinor: maxOrderValue ? Math.round(Number(maxOrderValue) * 100) : null,
      taxPercent: Number(taxPercent),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? tCommon("invalidInput"));
      return;
    }

    setSaving(true);
    const result = await updateStoreSettingsAction(parsed.data);
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="storeName"
          label={t("storeName")}
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />
        <Field
          id="supportEmail"
          label={t("supportEmail")}
          type="email"
          value={supportEmail}
          onChange={(e) => setSupportEmail(e.target.value)}
        />
      </div>

      <Checkbox
        id="codEnabled"
        label={t("codEnabled")}
        checked={codEnabled}
        onChange={setCodEnabled}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberField
          id="codFee"
          label={t("codFee")}
          step="0.01"
          value={codFee}
          onChange={(e) => setCodFee(e.target.value)}
        />
        <NumberField
          id="maxOrderValue"
          label={t("maxOrderValue")}
          value={maxOrderValue}
          onChange={(e) => setMaxOrderValue(e.target.value)}
        />
        <NumberField
          id="taxPercent"
          label={t("taxRate")}
          step="0.01"
          value={taxPercent}
          onChange={(e) => setTaxPercent(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-rymx-gold font-mono text-sm">{tCommon("saved")}</p>}
      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? tCommon("saving") : t("saveStoreSettings")}
      </Button>
    </form>
  );
}
