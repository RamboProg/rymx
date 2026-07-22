"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { formatEGP } from "@/lib/money";
import type { Order } from "@/modules/orders/schema";
import {
  approveReturnAction,
  createReturnAction,
  rejectReturnAction,
  restockReturnAction,
} from "../server/actions";
import { remainingToReturn } from "../services/refund";
import { RETURN_REASONS, returnReasonLabel, type Return } from "../schema";
import { ReturnItemPicker, type ReturnItemPickerValue } from "./ReturnItemPicker";

const DEFAULT_REASON = RETURN_REASONS[0].value;

function ReturnRow({ ret, onUpdate }: { ret: Return; onUpdate: (r: Return) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundInput, setRefundInput] = useState("");

  async function run(action: () => Promise<{ ok: boolean; error?: string; ret?: Return }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    if (result.ret) onUpdate(result.ret);
  }

  // A customer-initiated return always starts at refundMinor: 0 — staff must
  // set/confirm the refund amount before approving one of those.
  const needsRefundInput = ret.status === "requested" && ret.refundMinor === 0;

  return (
    <li className="border-rymx-cream/10 bg-rymx-card flex flex-col gap-2 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <span className="text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase">
          {ret.status}
        </span>
        <span className="text-rymx-cream/40 font-mono text-xs">
          {ret.createdAt.toLocaleString()}
        </span>
      </div>
      <ul className="text-rymx-cream/80 font-mono text-sm">
        {ret.items.map((item) => (
          <li key={item.variantId}>
            {item.title} × {item.quantity} — {returnReasonLabel(item)}
          </li>
        ))}
      </ul>
      <p className="text-rymx-cream/60 font-mono text-xs">Refund: {formatEGP(ret.refundMinor)}</p>

      <div className="flex flex-wrap items-end gap-3">
        {ret.status === "requested" && (
          <>
            {needsRefundInput && (
              <Field
                id={`refund-${ret.id}`}
                label="Refund amount (EGP)"
                type="number"
                step="0.01"
                value={refundInput}
                onChange={(e) => setRefundInput(e.target.value)}
              />
            )}
            <Button
              type="button"
              disabled={busy}
              className="w-fit justify-center"
              onClick={() =>
                run(() =>
                  approveReturnAction(
                    ret.id,
                    needsRefundInput ? Math.round(Number(refundInput) * 100) || 0 : undefined,
                  ),
                )
              }
            >
              Approve
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => rejectReturnAction({ returnId: ret.id }))}
              className="font-mono text-xs tracking-[0.1em] text-red-400 uppercase hover:text-red-300 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {ret.status === "approved" && (
          <Button
            type="button"
            disabled={busy}
            className="w-fit justify-center"
            onClick={() => run(() => restockReturnAction(ret.id))}
          >
            Restock & record refund
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}

export function ReturnPanel({ order, returns: initial }: { order: Order; returns: Return[] }) {
  const [returns, setReturns] = useState(initial);
  const [values, setValues] = useState<Record<string, ReturnItemPickerValue>>({});
  const [refund, setRefund] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const remaining = useMemo(() => remainingToReturn(order.items, returns), [order.items, returns]);
  const returnableItems = order.items.filter((item) => (remaining.get(item.variantId) ?? 0) > 0);

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
    const result = await createReturnAction({
      orderId: order.id,
      items,
      refundMinor: Math.round(Number(refund) * 100) || 0,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReturns((prev) => [...prev, result.ret]);
    setValues({});
    setRefund("");
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-rymx-cream text-lg font-bold">Returns</h2>

      {returns.length > 0 && (
        <ul className="flex flex-col gap-3">
          {returns.map((ret) => (
            <ReturnRow
              key={ret.id}
              ret={ret}
              onUpdate={(updated) =>
                setReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
              }
            />
          ))}
        </ul>
      )}

      {returnableItems.length > 0 ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <h3 className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
            Log a return
          </h3>
          {returnableItems.map((item) => (
            <ReturnItemPicker
              key={item.variantId}
              title={item.title}
              max={remaining.get(item.variantId) ?? 0}
              value={valueFor(item.variantId)}
              onChange={(value) => setValues((prev) => ({ ...prev, [item.variantId]: value }))}
            />
          ))}
          <Field
            id="return-refund"
            label="Refund amount (EGP)"
            type="number"
            step="0.01"
            value={refund}
            onChange={(e) => setRefund(e.target.value)}
          />
          {error && (
            <p role="alert" className="font-mono text-sm text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" disabled={saving} className="w-fit justify-center">
            {saving ? "Logging…" : "Log return"}
          </Button>
        </form>
      ) : (
        <p className="text-rymx-cream/50 font-mono text-sm">No items remain eligible for return.</p>
      )}
    </section>
  );
}
