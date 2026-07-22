"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Order } from "@/modules/orders/schema";
import { RETURN_REASONS, type Return } from "../schema";
import { requestReturnAction } from "../server/actions";
import { remainingToReturn } from "../services/refund";
import { ReturnItemPicker, type ReturnItemPickerValue } from "./ReturnItemPicker";

const DEFAULT_REASON = RETURN_REASONS[0].value;

// Customer self-service counterpart to ReturnPanel's staff "log a return"
// section — same item/reason picking (via the shared ReturnItemPicker), no
// refund field (the customer never sets their own refund amount) and no
// approve/reject/restock controls (staff-only). Calls requestReturnAction
// instead of createReturnAction.
export function RequestReturnForm({ order, returns }: { order: Order; returns: Return[] }) {
  const router = useRouter();
  const remaining = remainingToReturn(order.items, returns);
  const returnableItems = order.items.filter((item) => (remaining.get(item.variantId) ?? 0) > 0);

  const [values, setValues] = useState<Record<string, ReturnItemPickerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function valueFor(variantId: string): ReturnItemPickerValue {
    // eslint-disable-next-line security/detect-object-injection -- variantId is this order's own item key, not user input
    return values[variantId] ?? { quantity: 0, reasonCategory: DEFAULT_REASON, reasonDetail: "" };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const items = returnableItems
      .map((item) => ({ variantId: item.variantId, ...valueFor(item.variantId) }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) {
      setError("Enter a quantity for at least one item.");
      return;
    }

    setSaving(true);
    const result = await requestReturnAction({ orderId: order.id, items, refundMinor: 0 });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValues({});
    router.refresh();
  }

  if (returnableItems.length === 0) return null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {returnableItems.map((item) => (
        <ReturnItemPicker
          key={item.variantId}
          title={item.title}
          max={remaining.get(item.variantId) ?? 0}
          value={valueFor(item.variantId)}
          onChange={(value) => setValues((prev) => ({ ...prev, [item.variantId]: value }))}
        />
      ))}
      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? "Submitting…" : "Request return"}
      </Button>
    </form>
  );
}
