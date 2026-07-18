"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { formatEGP } from "@/lib/money";
import { useCart } from "@/modules/cart/hooks/useCart";
import { previewDiscountAction } from "@/modules/discounts/server/actions";
import { computeShippingFeeMinor, computeTotalMinor } from "../services/pricing";
import { checkoutAction } from "../server/checkout";
import { shippingAddressSchema, type ShippingAddress } from "../schema";

const EMPTY_SHIPPING: ShippingAddress = {
  fullName: "",
  phone: "",
  governorate: "",
  city: "",
  addressLine: "",
  notes: "",
};

export function CheckoutView() {
  const router = useRouter();
  const { cart, loading, signedIn, clear } = useCart();
  const [shipping, setShipping] = useState<ShippingAddress>(EMPTY_SHIPPING);
  const [guestEmail, setGuestEmail] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountMinor: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, setPromoPending] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  const shippingFeeMinor = computeShippingFeeMinor(cart.subtotalMinor);
  const totalMinor = useMemo(
    () =>
      computeTotalMinor({
        subtotalMinor: cart.subtotalMinor,
        discountMinor: appliedDiscount?.discountMinor ?? 0,
        shippingFeeMinor,
      }),
    [cart.subtotalMinor, appliedDiscount, shippingFeeMinor],
  );

  async function onApplyPromo() {
    setPromoError(null);
    if (!promoCode.trim()) return;
    setPromoPending(true);
    const result = await previewDiscountAction({
      code: promoCode,
      items: cart.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
      })),
      guestEmail: signedIn ? undefined : guestEmail || undefined,
    });
    setPromoPending(false);
    if (!result.ok) {
      setAppliedDiscount(null);
      setPromoError(result.error);
      return;
    }
    setAppliedDiscount({ code: result.code, discountMinor: result.discountMinor });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsedShipping = shippingAddressSchema.safeParse(shipping);
    if (!parsedShipping.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsedShipping.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    if (!signedIn && !guestEmail.trim()) {
      setSubmitError("Email is required for guest checkout.");
      return;
    }

    setSubmitting(true);
    const result = await checkoutAction({
      idempotencyKey: idempotencyKey.current,
      items: cart.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
      })),
      shipping: parsedShipping.data,
      discountCode: appliedDiscount?.code,
      guestEmail: signedIn ? undefined : guestEmail,
    });
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    window.sessionStorage.setItem(`rymx_order_${result.order.id}`, JSON.stringify(result.order));
    await clear();
    router.push(`/checkout/confirmation?order=${result.order.id}`);
  }

  if (loading) {
    return <p className="text-rymx-cream/60 font-mono text-sm">Loading your cart…</p>;
  }

  if (cart.lines.length === 0) {
    return <p className="text-rymx-cream/60 font-mono text-sm">Your cart is empty.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Shipping details</h2>

        {!signedIn && (
          <Field
            id="guestEmail"
            label="Email"
            type="email"
            autoComplete="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />
        )}
        <Field
          id="fullName"
          label="Full name"
          autoComplete="name"
          value={shipping.fullName}
          error={formErrors.fullName}
          onChange={(e) => setShipping((s) => ({ ...s, fullName: e.target.value }))}
        />
        <Field
          id="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          value={shipping.phone}
          error={formErrors.phone}
          onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            id="governorate"
            label="Governorate"
            value={shipping.governorate}
            error={formErrors.governorate}
            onChange={(e) => setShipping((s) => ({ ...s, governorate: e.target.value }))}
          />
          <Field
            id="city"
            label="City"
            value={shipping.city}
            error={formErrors.city}
            onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
          />
        </div>
        <Field
          id="addressLine"
          label="Address"
          autoComplete="street-address"
          value={shipping.addressLine}
          error={formErrors.addressLine}
          onChange={(e) => setShipping((s) => ({ ...s, addressLine: e.target.value }))}
        />
        <Field
          id="notes"
          label="Notes (optional)"
          value={shipping.notes}
          onChange={(e) => setShipping((s) => ({ ...s, notes: e.target.value }))}
        />

        <p className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          Payment: Cash on delivery
        </p>

        {submitError && (
          <p role="alert" className="font-mono text-sm text-red-400">
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="justify-center">
          {submitting ? "Placing order…" : "Place order (COD)"}
        </Button>
      </form>

      <div className="border-rymx-cream/10 bg-rymx-card flex h-fit flex-col gap-4 rounded-md border p-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="promoCode"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Promo code
          </label>
          <div className="flex gap-2">
            <input
              id="promoCode"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="border-rymx-cream/20 bg-rymx-bg text-rymx-cream focus:border-rymx-gold min-w-0 flex-1 rounded-md border px-3 py-2 font-mono text-xs outline-none"
            />
            <button
              type="button"
              disabled={promoPending}
              onClick={onApplyPromo}
              className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold rounded-md border px-3 py-2 font-mono text-xs uppercase hover:text-[#12100a] disabled:pointer-events-none disabled:opacity-50"
            >
              Apply
            </button>
          </div>
          {promoError && (
            <p role="alert" className="font-mono text-xs text-red-400">
              {promoError}
            </p>
          )}
          {appliedDiscount && (
            <p className="text-rymx-gold font-mono text-xs">Code {appliedDiscount.code} applied</p>
          )}
        </div>

        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>Subtotal</span>
          <span>{formatEGP(cart.subtotalMinor)}</span>
        </div>
        {appliedDiscount && (
          <div className="text-rymx-gold flex justify-between font-mono text-sm">
            <span>Discount</span>
            <span>-{formatEGP(appliedDiscount.discountMinor)}</span>
          </div>
        )}
        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>Shipping</span>
          <span>{shippingFeeMinor === 0 ? "Free" : formatEGP(shippingFeeMinor)}</span>
        </div>
        <div className="border-rymx-cream/10 text-rymx-cream flex justify-between border-t pt-4 font-mono text-sm font-semibold">
          <span>Total</span>
          <span>{formatEGP(totalMinor)}</span>
        </div>
      </div>
    </div>
  );
}
