"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { NumberField } from "@/components/ui/Input";
import { shippingSettingsSchema, type ShippingSettings, type ShippingZone } from "../../schema";
import { updateShippingSettingsAction } from "../../server/actions";

function zonesToText(zones: ShippingZone[]): string {
  return zones.map((z) => `${z.governorates.join(", ")}: ${z.feeMinor / 100}`).join("\n");
}

function parseZonesText(text: string): ShippingZone[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [governoratesPart, feePart] = line.split(":");
      const governorates = (governoratesPart ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
      const feeMinor = Math.round(Number(feePart) * 100);
      return { governorates, feeMinor };
    })
    .filter((z) => z.governorates.length > 0 && Number.isFinite(z.feeMinor));
}

export function ShippingSettingsForm({ settings }: { settings: ShippingSettings }) {
  const t = useTranslations("shippingSettings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [defaultFee, setDefaultFee] = useState(String(settings.defaultFeeMinor / 100));
  const [freeThreshold, setFreeThreshold] = useState(
    settings.freeShippingThresholdMinor !== null
      ? String(settings.freeShippingThresholdMinor / 100)
      : "",
  );
  const [zonesText, setZonesText] = useState(zonesToText(settings.zones));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = shippingSettingsSchema.safeParse({
      defaultFeeMinor: Math.round(Number(defaultFee) * 100),
      freeShippingThresholdMinor: freeThreshold ? Math.round(Number(freeThreshold) * 100) : null,
      zones: parseZonesText(zonesText),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? tCommon("invalidInput"));
      return;
    }

    setSaving(true);
    const result = await updateShippingSettingsAction(parsed.data);
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
        <NumberField
          id="defaultFee"
          label={t("defaultFee")}
          step="0.01"
          value={defaultFee}
          onChange={(e) => setDefaultFee(e.target.value)}
        />
        <NumberField
          id="freeThreshold"
          label={t("freeThreshold")}
          step="0.01"
          value={freeThreshold}
          onChange={(e) => setFreeThreshold(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="zones"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          {t("zonesLabel")}
        </label>
        <textarea
          id="zones"
          rows={4}
          value={zonesText}
          onChange={(e) => setZonesText(e.target.value)}
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
        {saving ? tCommon("saving") : t("saveShippingSettings")}
      </Button>
    </form>
  );
}
