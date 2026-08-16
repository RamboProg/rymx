"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { NumberField, Field } from "@/components/ui/Input";
import type { Order } from "@/modules/orders/schema";
import { createShipmentAction, markDeliveredAction, markShippedAction } from "../server/actions";
import { remainingToFulfill } from "../services/fulfillment";
import type { Shipment } from "../schema";

function ShipmentRow({
  shipment,
  onUpdate,
}: {
  shipment: Shipment;
  onUpdate: (s: Shipment) => void;
}) {
  const t = useTranslations("shipments");
  const locale = useLocale();
  const router = useRouter();
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onMarkShipped(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await markShippedAction({ shipmentId: shipment.id, carrier, trackingNumber });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUpdate(result.shipment);
    // These actions can flip the parent order's status (e.g. shipped once
    // the first shipment ships) — the order-status panel is a sibling
    // component seeded once from the server-rendered order, so it needs an
    // explicit refresh to pick that up.
    router.refresh();
  }

  async function onMarkDelivered() {
    setBusy(true);
    setError(null);
    const result = await markDeliveredAction(shipment.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUpdate(result.shipment);
    router.refresh();
  }

  return (
    <li className="border-rymx-cream/10 bg-rymx-card flex flex-col gap-2 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <span className="text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase">
          {t(`status.${shipment.status}`)}
        </span>
        <span className="text-rymx-cream/40 font-mono text-xs">
          {shipment.createdAt.toLocaleString(locale)}
        </span>
      </div>
      <ul className="text-rymx-cream/80 font-mono text-sm">
        {shipment.items.map((item) => (
          <li key={item.variantId}>
            {item.title} × {item.quantity}
          </li>
        ))}
      </ul>

      {shipment.status === "pending" && (
        <form onSubmit={onMarkShipped} className="flex flex-wrap items-end gap-3">
          <Field
            id={`carrier-${shipment.id}`}
            label={t("carrier")}
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />
          <Field
            id={`tracking-${shipment.id}`}
            label={t("trackingNumber")}
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-fit justify-center">
            {t("markShipped")}
          </Button>
        </form>
      )}

      {shipment.status === "shipped" && (
        <div className="flex items-center justify-between">
          <p className="text-rymx-cream/60 font-mono text-xs">
            {shipment.carrier} — {shipment.trackingNumber}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onMarkDelivered}
            className="text-rymx-cream/60 hover:text-rymx-cream font-mono text-xs tracking-[0.1em] uppercase disabled:opacity-50"
          >
            {t("markDelivered")}
          </button>
        </div>
      )}

      {shipment.status === "delivered" && (
        <p className="text-rymx-cream/60 font-mono text-xs">
          {shipment.carrier} — {shipment.trackingNumber} —{" "}
          {t("deliveredMeta", {
            when: shipment.deliveredAt ? shipment.deliveredAt.toLocaleString(locale) : "",
          })}
        </p>
      )}

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}

export function ShipmentPanel({
  order,
  shipments: initial,
}: {
  order: Order;
  shipments: Shipment[];
}) {
  const t = useTranslations("shipments");
  const router = useRouter();
  const [shipments, setShipments] = useState(initial);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const remaining = useMemo(
    () => remainingToFulfill(order.items, shipments),
    [order.items, shipments],
  );
  const fulfillableItems = order.items.filter((item) => (remaining.get(item.variantId) ?? 0) > 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity }));
    if (items.length === 0) {
      setError(t("enterQuantity"));
      return;
    }

    setSaving(true);
    const result = await createShipmentAction({ orderId: order.id, items });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShipments((prev) => [...prev, result.shipment]);
    setQuantities({});
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-rymx-cream text-lg font-bold">{t("heading")}</h2>

      {shipments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {shipments.map((shipment) => (
            <ShipmentRow
              key={shipment.id}
              shipment={shipment}
              onUpdate={(updated) =>
                setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
              }
            />
          ))}
        </ul>
      )}

      {fulfillableItems.length > 0 ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <h3 className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
            {t("createHeading")}
          </h3>
          {fulfillableItems.map((item) => {
            const max = remaining.get(item.variantId) ?? 0;
            return (
              <div key={item.variantId} className="flex items-center justify-between gap-4">
                <span className="text-rymx-cream/80 font-mono text-sm">
                  {t("unfulfilledCount", { title: item.title, count: max })}
                </span>
                <div className="w-20">
                  <NumberField
                    min={0}
                    max={max}
                    value={String(quantities[item.variantId] ?? 0)}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.variantId]: Math.max(0, Math.min(max, Number(e.target.value))),
                      }))
                    }
                  />
                </div>
              </div>
            );
          })}
          {error && (
            <p role="alert" className="font-mono text-sm text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" disabled={saving} className="w-fit justify-center">
            {saving ? t("creating") : t("createShipment")}
          </Button>
        </form>
      ) : (
        <p className="text-rymx-cream/50 font-mono text-sm">{t("allShipped")}</p>
      )}
    </section>
  );
}
