"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { policiesSchema, type Policies } from "../../schema";
import { updatePoliciesAction } from "../../server/actions";

function TextAreaField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 font-mono text-sm outline-none"
      />
    </div>
  );
}

export function PoliciesForm({ policies }: { policies: Policies }) {
  const t = useTranslations("policies");
  const tSettings = useTranslations("policiesAdmin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [returnsPolicy, setReturnsPolicy] = useState(policies.returnsPolicy);
  const [privacyPolicy, setPrivacyPolicy] = useState(policies.privacyPolicy);
  const [termsPolicy, setTermsPolicy] = useState(policies.termsPolicy);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = policiesSchema.safeParse({ returnsPolicy, privacyPolicy, termsPolicy });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? tCommon("invalidInput"));
      return;
    }

    setSaving(true);
    const result = await updatePoliciesAction(parsed.data);
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
      <TextAreaField
        id="returnsPolicy"
        label={t("returns")}
        value={returnsPolicy}
        onChange={setReturnsPolicy}
      />
      <TextAreaField
        id="privacyPolicy"
        label={t("privacy")}
        value={privacyPolicy}
        onChange={setPrivacyPolicy}
      />
      <TextAreaField
        id="termsPolicy"
        label={t("terms")}
        value={termsPolicy}
        onChange={setTermsPolicy}
      />
      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-rymx-gold font-mono text-sm">{tCommon("saved")}</p>}
      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? tCommon("saving") : tSettings("savePolicies")}
      </Button>
    </form>
  );
}
