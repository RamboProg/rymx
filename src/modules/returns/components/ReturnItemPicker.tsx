"use client";

import { Field, NumberField } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RETURN_REASONS } from "../schema";

export type ReturnItemPickerValue = {
  quantity: number;
  reasonCategory: string;
  reasonDetail: string;
};

const REASON_OPTIONS = RETURN_REASONS.map((r) => ({ value: r.value, label: r.label }));

// Item name + quantity + reason picker for one order line item. Shared by
// the customer-facing RequestReturnForm and the staff "log a return" section
// of ReturnPanel — identical in every field except which action they submit
// to, so extracted here rather than copy-pasted (would immediately drift).
export function ReturnItemPicker({
  title,
  max,
  value,
  onChange,
}: {
  title: string;
  max: number;
  value: ReturnItemPickerValue;
  onChange: (value: ReturnItemPickerValue) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <span className="text-rymx-cream/80 flex-1 font-mono text-sm">
        {title} ({max} eligible)
      </span>
      <NumberField
        aria-label={`Quantity for ${title}`}
        min={0}
        max={max}
        value={String(value.quantity)}
        onChange={(e) =>
          onChange({
            ...value,
            quantity: Math.max(0, Math.min(max, Number(e.target.value))),
          })
        }
        className="sm:w-24"
      />
      <Select
        value={value.reasonCategory}
        onValueChange={(reasonCategory) => onChange({ ...value, reasonCategory })}
        options={REASON_OPTIONS}
        placeholder="Reason"
      />
      {value.reasonCategory === "other" && (
        <div className="sm:w-48">
          <Field
            label="Details"
            placeholder="Describe the reason"
            value={value.reasonDetail}
            onChange={(e) => onChange({ ...value, reasonDetail: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
