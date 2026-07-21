"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { discountInputSchema, type DiscountType } from "@/modules/discounts/schema";
import { createDiscountAction } from "@/modules/discounts/server/actions";

// A thin, customer-scoped wrapper over the same createDiscountAction the
// full discount admin form uses — pre-fills assignedToUid to this customer
// and defaults to a single-use personal code, since that's the only shape
// this entry point needs (full scoping/scheduling options stay on
// /admin/discounts/new for public/bulk codes).
export function IssuePromoForm({ uid, email }: { uid: string; email: string | null }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("percent");
  const [value, setValue] = useState("10");
  const [notify, setNotify] = useState(!!email);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = discountInputSchema.safeParse({
      code,
      type,
      value: Math.round(Number(value)),
      minSpendMinor: 0,
      startsAt: null,
      endsAt: null,
      usageLimit: 1,
      perUserLimit: 1,
      productIds: [],
      collectionIds: [],
      active: true,
      assignedToUid: uid,
      notifyEmail: notify && email ? email : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    const result = await createDiscountAction(parsed.data);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setIssuedCode(result.discount.code);
    setCode("");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field
          id="promo-code"
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="promo-type"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Type
          </label>
          <select
            id="promo-type"
            value={type}
            onChange={(e) => setType(e.target.value as DiscountType)}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount off (EGP)</option>
          </select>
        </div>
        <Field
          id="promo-value"
          label={type === "percent" ? "Value (%)" : "Value (EGP)"}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      {email && (
        <label className="text-rymx-cream/80 flex items-center gap-2 font-mono text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Email the code to {email}
        </label>
      )}
      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {issuedCode && <p className="text-rymx-gold font-mono text-sm">Issued {issuedCode}.</p>}
      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? "Issuing…" : "Issue promo code"}
      </Button>
    </form>
  );
}
