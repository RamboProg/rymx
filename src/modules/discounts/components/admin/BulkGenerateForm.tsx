"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import type { DiscountType } from "../../schema";
import { bulkGenerateCodesAction } from "../../server/actions";

export function BulkGenerateForm() {
  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState("10");
  const [type, setType] = useState<DiscountType>("percent");
  const [value, setValue] = useState("10");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCodes(null);
    setSaving(true);
    const result = await bulkGenerateCodesAction({
      prefix,
      count: Math.round(Number(count)),
      type,
      value: Math.round(Number(value)),
      perUserLimit: 1,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCodes(result.codes);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border-rymx-cream/10 bg-rymx-card flex flex-col gap-4 rounded-md border p-5"
    >
      <h3 className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
        Bulk-generate single-use codes
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field
          id="bulk-prefix"
          label="Prefix (optional)"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
        />
        <Field
          id="bulk-count"
          label="How many"
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="bulk-type"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Type
          </label>
          <select
            id="bulk-type"
            value={type}
            onChange={(e) => setType(e.target.value as DiscountType)}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount off (EGP)</option>
          </select>
        </div>
        <Field
          id="bulk-value"
          label={type === "percent" ? "Value (%)" : "Value (EGP)"}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {codes && (
        <p className="text-rymx-cream/80 font-mono text-sm break-words">
          Generated: {codes.join(", ")}
        </p>
      )}
      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? "Generating…" : "Generate codes"}
      </Button>
    </form>
  );
}
