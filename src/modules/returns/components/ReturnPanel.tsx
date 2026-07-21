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
import type { Return } from "../schema";

function ReturnRow({ ret, onUpdate }: { ret: Return; onUpdate: (r: Return) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            {item.title} × {item.quantity} — {item.reason}
          </li>
        ))}
      </ul>
      <p className="text-rymx-cream/60 font-mono text-xs">Refund: {formatEGP(ret.refundMinor)}</p>

      <div className="flex flex-wrap gap-3">
        {ret.status === "requested" && (
          <>
            <Button
              type="button"
              disabled={busy}
              className="w-fit justify-center"
              onClick={() => run(() => approveReturnAction(ret.id))}
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
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [refund, setRefund] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const remaining = useMemo(() => remainingToReturn(order.items, returns), [order.items, returns]);
  const returnableItems = order.items.filter((item) => (remaining.get(item.variantId) ?? 0) > 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([variantId, quantity]) => ({
        variantId,
        quantity,
        // eslint-disable-next-line security/detect-object-injection -- variantId is this order's own item key, not user input
        reason: (reasons[variantId] ?? "").trim(),
      }));
    if (items.length === 0) {
      setError("Enter a quantity for at least one item.");
      return;
    }
    if (items.some((item) => item.reason.length === 0)) {
      setError("A reason is required for every item being returned.");
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
    setQuantities({});
    setReasons({});
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
          {returnableItems.map((item) => {
            const max = remaining.get(item.variantId) ?? 0;
            return (
              <div key={item.variantId} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <span className="text-rymx-cream/80 flex-1 font-mono text-sm">
                  {item.title} ({max} eligible)
                </span>
                <input
                  type="number"
                  min={0}
                  max={max}
                  value={quantities[item.variantId] ?? 0}
                  onChange={(e) =>
                    setQuantities((prev) => ({
                      ...prev,
                      [item.variantId]: Math.max(0, Math.min(max, Number(e.target.value))),
                    }))
                  }
                  className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold w-20 rounded-md border px-3 py-2 text-sm outline-none"
                />
                <input
                  type="text"
                  placeholder="Reason"
                  value={reasons[item.variantId] ?? ""}
                  onChange={(e) =>
                    setReasons((prev) => ({ ...prev, [item.variantId]: e.target.value }))
                  }
                  className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-3 py-2 text-sm outline-none sm:w-48"
                />
              </div>
            );
          })}
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
