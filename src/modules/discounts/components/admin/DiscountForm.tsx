"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { discountInputSchema, type Discount, type DiscountType } from "../../schema";
import { createDiscountAction, updateDiscountAction } from "../../server/actions";

function toDateTimeLocal(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseIdsText(text: string): string[] {
  return text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function DiscountForm({ discount }: { discount?: Discount }) {
  const router = useRouter();
  const [code, setCode] = useState(discount?.code ?? "");
  const [type, setType] = useState<DiscountType>(discount?.type ?? "percent");
  const [value, setValue] = useState(discount ? String(discount.value) : "");
  const [minSpend, setMinSpend] = useState(discount ? String(discount.minSpendMinor / 100) : "0");
  const [startsAt, setStartsAt] = useState(toDateTimeLocal(discount?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toDateTimeLocal(discount?.endsAt ?? null));
  const [usageLimit, setUsageLimit] = useState(
    discount?.usageLimit ? String(discount.usageLimit) : "",
  );
  const [perUserLimit, setPerUserLimit] = useState(discount ? String(discount.perUserLimit) : "1");
  const [productIdsText, setProductIdsText] = useState((discount?.productIds ?? []).join(", "));
  const [collectionIdsText, setCollectionIdsText] = useState(
    (discount?.collectionIds ?? []).join(", "),
  );
  const [active, setActive] = useState(discount?.active ?? true);
  const [assignedToUid, setAssignedToUid] = useState(discount?.assignedToUid ?? "");
  const [notifyEmail, setNotifyEmail] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = discountInputSchema.safeParse({
      code,
      type,
      value: Math.round(Number(value)),
      minSpendMinor: Math.round(Number(minSpend) * 100),
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      usageLimit: usageLimit ? Math.round(Number(usageLimit)) : null,
      perUserLimit: Math.round(Number(perUserLimit)),
      productIds: parseIdsText(productIdsText),
      collectionIds: parseIdsText(collectionIdsText),
      active,
      assignedToUid: assignedToUid.trim() || null,
      notifyEmail: notifyEmail.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    const result = discount
      ? await updateDiscountAction(parsed.data)
      : await createDiscountAction(parsed.data);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!discount) {
      router.push(`/admin/discounts/${result.discount.code}`);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          id="code"
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={!!discount}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="type"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as DiscountType)}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount off (EGP)</option>
          </select>
        </div>
        <Field
          id="value"
          label={type === "percent" ? "Value (%)" : "Value (EGP)"}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          id="minSpend"
          label="Minimum spend (EGP)"
          type="number"
          step="0.01"
          value={minSpend}
          onChange={(e) => setMinSpend(e.target.value)}
        />
        <Field
          id="usageLimit"
          label="Total usage limit (blank = unlimited)"
          type="number"
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
        />
        <Field
          id="perUserLimit"
          label="Per-customer limit"
          type="number"
          value={perUserLimit}
          onChange={(e) => setPerUserLimit(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="startsAt"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Starts at (optional)
          </label>
          <input
            id="startsAt"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="endsAt"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Ends at (optional)
          </label>
          <input
            id="endsAt"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
          />
        </div>
      </div>

      <Field
        id="productIds"
        label="Scoped product IDs (comma-separated, blank = any product)"
        value={productIdsText}
        onChange={(e) => setProductIdsText(e.target.value)}
      />
      <Field
        id="collectionIds"
        label="Scoped collection IDs (comma-separated, blank = any collection)"
        value={collectionIdsText}
        onChange={(e) => setCollectionIdsText(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="assignedToUid"
          label="Assign to customer uid (blank = public code)"
          value={assignedToUid}
          onChange={(e) => setAssignedToUid(e.target.value)}
        />
        {!discount && (
          <Field
            id="notifyEmail"
            label="Email the code to (optional, requires assignment above)"
            type="email"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
          />
        )}
      </div>

      <label className="text-rymx-cream/80 flex items-center gap-2 font-mono text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Active
      </label>

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-rymx-gold font-mono text-sm">Saved</p>}

      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? "Saving…" : discount ? "Save discount" : "Create discount"}
      </Button>
    </form>
  );
}
