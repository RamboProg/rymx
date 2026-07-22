"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { NumberField, Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { discountInputSchema, type Discount, type DiscountType } from "../../schema";
import { createDiscountAction, updateDiscountAction } from "../../server/actions";

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
  const [startsAt, setStartsAt] = useState<Date | null>(discount?.startsAt ?? null);
  const [endsAt, setEndsAt] = useState<Date | null>(discount?.endsAt ?? null);
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
      startsAt,
      endsAt,
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
        <Select
          id="type"
          label="Type"
          value={type}
          onValueChange={(v) => setType(v as DiscountType)}
          options={[
            { value: "percent", label: "Percent off" },
            { value: "fixed", label: "Fixed amount off (EGP)" },
          ]}
        />
        <NumberField
          id="value"
          label={type === "percent" ? "Value (%)" : "Value (EGP)"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberField
          id="minSpend"
          label="Minimum spend (EGP)"
          step="0.01"
          value={minSpend}
          onChange={(e) => setMinSpend(e.target.value)}
        />
        <NumberField
          id="usageLimit"
          label="Total usage limit (blank = unlimited)"
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
        />
        <NumberField
          id="perUserLimit"
          label="Per-customer limit"
          value={perUserLimit}
          onChange={(e) => setPerUserLimit(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateTimePicker
          id="startsAt"
          label="Starts at (optional)"
          value={startsAt}
          onChange={setStartsAt}
        />
        <DateTimePicker
          id="endsAt"
          label="Ends at (optional)"
          value={endsAt}
          onChange={setEndsAt}
        />
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

      <Checkbox id="active" label="Active" checked={active} onChange={setActive} />

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
