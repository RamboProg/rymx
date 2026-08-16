"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  cancelOrderAction,
  confirmOrderAction,
  resendConfirmationAction,
} from "../../server/actions";
import type { Order } from "../../schema";

export function OrderStatusActions({ order }: { order: Order }) {
  const t = useTranslations("ordersAdmin");
  const tStatus = useTranslations("orderStatus");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Shipment/return actions on sibling panels can change this order's status
  // (e.g. auto-confirm on first shipment) and call router.refresh() — that
  // re-renders this Server Component subtree with a fresh `order` prop, but
  // doesn't reset this component's own useState. Resyncing during render
  // (React's documented pattern for "adjusting state when a prop changes")
  // rather than in an effect avoids an extra cascading render.
  const [prevOrderStatus, setPrevOrderStatus] = useState(order.status);
  if (order.status !== prevOrderStatus) {
    setPrevOrderStatus(order.status);
    setStatus(order.status);
  }

  async function run(action: () => Promise<{ ok: boolean; error?: string; order?: Order }>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? tCommon("somethingWentWrong"));
      return;
    }
    if (result.order) setStatus(result.order.status);
    router.refresh();
  }

  const canCancel = status === "pending" || status === "confirmed";

  async function onResend() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await resendConfirmationAction(order.id);
    setBusy(false);
    if (!result.ok) setError(result.error ?? tCommon("somethingWentWrong"));
    else setNotice(t("confirmationResent"));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          {tCommon("status")}
        </span>
        <span className="text-rymx-gold font-mono text-sm">{tStatus(status)}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {status === "pending" && (
          <Button
            type="button"
            disabled={busy}
            className="w-fit justify-center"
            onClick={() => run(() => confirmOrderAction(order.id))}
          >
            {t("confirmOrder")}
          </Button>
        )}
        {canCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => cancelOrderAction(order.id))}
            className="font-mono text-xs tracking-[0.1em] text-red-400 uppercase hover:text-red-300 disabled:opacity-50"
          >
            {t("cancelOrder")}
          </button>
        )}
        {order.email && (
          <button
            type="button"
            disabled={busy}
            onClick={onResend}
            className="text-rymx-cream/60 hover:text-rymx-cream font-mono text-xs tracking-[0.1em] uppercase disabled:opacity-50"
          >
            {t("resendConfirmation")}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-rymx-cream/60 font-mono text-sm">{notice}</p>}
    </div>
  );
}
