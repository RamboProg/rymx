"use client";

import { useTranslations } from "next-intl";
import { Field, NumberField } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RETURN_REASONS } from "../schema";

export type ReturnItemPickerValue = {
  quantity: number;
  reasonCategory: string;
  reasonDetail: string;
};

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
  const t = useTranslations("returns");
  const reasonOptions = RETURN_REASONS.map((r) => ({ value: r.value, label: t(`reasons.${r.value}`) }));

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <span className="text-rymx-cream/80 flex-1 font-mono text-sm">
        {t("eligibleCount", { title, count: max })}
      </span>
      <NumberField
        aria-label={t("quantityFor", { title })}
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
        ariaLabel={t("reasonFor", { title })}
        value={value.reasonCategory}
        onValueChange={(reasonCategory) => onChange({ ...value, reasonCategory })}
        options={reasonOptions}
        placeholder={t("reasonPlaceholder")}
      />
      {value.reasonCategory === "other" && (
        <div className="sm:w-48">
          <Field
            label={t("details")}
            placeholder={t("detailsPlaceholder")}
            value={value.reasonDetail}
            onChange={(e) => onChange({ ...value, reasonDetail: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
