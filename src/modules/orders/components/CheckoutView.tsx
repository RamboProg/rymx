"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatEGP } from "@/lib/money";
import type { Address, Profile } from "@/modules/account/schema";
import { useCart } from "@/modules/cart/hooks/useCart";
import { previewDiscountAction } from "@/modules/discounts/server/actions";
import type { ShippingSettings, StoreSettings } from "@/modules/settings/schema";
import { resolveShippingFeeMinor } from "@/modules/settings/services/shipping";
import { computeTaxMinor, computeTotalMinor } from "../services/pricing";
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

function shippingFromAddress(address: Address): ShippingAddress {
  return {
    fullName: address.fullName,
    phone: address.phone,
    governorate: address.governorate,
    city: address.city,
    addressLine: address.addressLine,
    notes: "",
  };
}

// Prefill priority for a signed-in customer: their default saved address, else
// the first saved address, else just their profile name/phone with the rest
// left blank. Every field stays editable afterwards — this is a starting
// point for the customer to confirm, not a locked-in value.
function initialShipping(profile: Profile | null, addresses: Address[]): ShippingAddress {
  if (addresses.length > 0) {
    const preferred = addresses.find((a) => a.isDefault) ?? addresses[0]!;
    return shippingFromAddress(preferred);
  }
  if (profile && (profile.displayName || profile.phone)) {
    return { ...EMPTY_SHIPPING, fullName: profile.displayName ?? "", phone: profile.phone ?? "" };
  }
  return EMPTY_SHIPPING;
}

export function CheckoutView({
  shippingSettings,
  storeSettings,
  profile,
  addresses,
}: {
  shippingSettings: ShippingSettings;
  storeSettings: StoreSettings;
  profile: Profile | null;
  addresses: Address[];
}) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const { cart, loading, signedIn, clear } = useCart();
  const [shipping, setShipping] = useState<ShippingAddress>(() =>
    initialShipping(profile, addresses),
  );
  const defaultAddressId = addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "";
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddressId);
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

  function onSelectAddress(addressId: string) {
    setSelectedAddressId(addressId);
    const address = addresses.find((a) => a.id === addressId);
    if (address) setShipping((s) => ({ ...shippingFromAddress(address), notes: s.notes }));
  }

  const shippingFeeMinor = useMemo(
    () => resolveShippingFeeMinor(cart.subtotalMinor, shipping.governorate, shippingSettings),
    [cart.subtotalMinor, shipping.governorate, shippingSettings],
  );
  const discountMinor = appliedDiscount?.discountMinor ?? 0;
  const taxMinor = useMemo(
    () =>
      computeTaxMinor(Math.max(0, cart.subtotalMinor - discountMinor), storeSettings.taxPercent),
    [cart.subtotalMinor, discountMinor, storeSettings.taxPercent],
  );
  const codFeeMinor = storeSettings.codFeeMinor;
  const totalMinor = useMemo(
    () =>
      computeTotalMinor({
        subtotalMinor: cart.subtotalMinor,
        discountMinor,
        shippingFeeMinor,
        taxMinor,
        codFeeMinor,
      }),
    [cart.subtotalMinor, discountMinor, shippingFeeMinor, taxMinor, codFeeMinor],
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
      setSubmitError(t("emailRequired"));
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
    return <p className="text-rymx-cream/60 font-mono text-sm">{t("loadingCart")}</p>;
  }

  if (cart.lines.length === 0) {
    return <p className="text-rymx-cream/60 font-mono text-sm">{t("emptyCart")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <h2 className="font-display text-rymx-cream text-lg font-bold">{t("shippingDetails")}</h2>

        {signedIn && addresses.length > 1 && (
          <Select
            id="shipTo"
            label={t("shipTo")}
            value={selectedAddressId}
            onValueChange={onSelectAddress}
            options={addresses.map((a) => ({
              value: a.id,
              label: a.isDefault ? t("addressOptionDefault", { name: a.fullName }) : a.fullName,
            }))}
          />
        )}

        {!signedIn && (
          <Field
            id="guestEmail"
            label={t("email")}
            type="email"
            autoComplete="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />
        )}
        <Field
          id="fullName"
          label={t("fullName")}
          autoComplete="name"
          value={shipping.fullName}
          error={formErrors.fullName}
          onChange={(e) => setShipping((s) => ({ ...s, fullName: e.target.value }))}
        />
        <Field
          id="phone"
          label={t("phone")}
          type="tel"
          autoComplete="tel"
          value={shipping.phone}
          error={formErrors.phone}
          onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            id="governorate"
            label={t("governorate")}
            value={shipping.governorate}
            error={formErrors.governorate}
            onChange={(e) => setShipping((s) => ({ ...s, governorate: e.target.value }))}
          />
          <Field
            id="city"
            label={t("city")}
            value={shipping.city}
            error={formErrors.city}
            onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
          />
        </div>
        <Field
          id="addressLine"
          label={t("address")}
          autoComplete="street-address"
          value={shipping.addressLine}
          error={formErrors.addressLine}
          onChange={(e) => setShipping((s) => ({ ...s, addressLine: e.target.value }))}
        />
        <Field
          id="notes"
          label={t("notesOptional")}
          value={shipping.notes}
          onChange={(e) => setShipping((s) => ({ ...s, notes: e.target.value }))}
        />

        <p className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          {t("paymentCod")}
        </p>

        {!storeSettings.codEnabled && (
          <p role="alert" className="font-mono text-sm text-red-400">
            {t("codDisabled")}
          </p>
        )}

        {submitError && (
          <p role="alert" className="font-mono text-sm text-red-400">
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting || !storeSettings.codEnabled}
          className="justify-center"
        >
          {submitting ? t("placingOrder") : t("placeOrder")}
        </Button>
      </form>

      <div className="border-rymx-cream/10 bg-rymx-card flex h-fit flex-col gap-4 rounded-md border p-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="promoCode"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            {t("promoCode")}
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
              {t("apply")}
            </button>
          </div>
          {promoError && (
            <p role="alert" className="font-mono text-xs text-red-400">
              {promoError}
            </p>
          )}
          {appliedDiscount && (
            <p className="text-rymx-gold font-mono text-xs">
              {t("codeApplied", { code: appliedDiscount.code })}
            </p>
          )}
        </div>

        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>{t("subtotal")}</span>
          <span>{formatEGP(cart.subtotalMinor)}</span>
        </div>
        {appliedDiscount && (
          <div className="text-rymx-gold flex justify-between font-mono text-sm">
            <span>{t("discount")}</span>
            <span>-{formatEGP(appliedDiscount.discountMinor)}</span>
          </div>
        )}
        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>{t("shipping")}</span>
          <span>{shippingFeeMinor === 0 ? t("free") : formatEGP(shippingFeeMinor)}</span>
        </div>
        {taxMinor > 0 && (
          <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
            <span>{t("tax", { percent: storeSettings.taxPercent })}</span>
            <span>{formatEGP(taxMinor)}</span>
          </div>
        )}
        {codFeeMinor > 0 && (
          <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
            <span>{t("codFee")}</span>
            <span>{formatEGP(codFeeMinor)}</span>
          </div>
        )}
        <div className="border-rymx-cream/10 text-rymx-cream flex justify-between border-t pt-4 font-mono text-sm font-semibold">
          <span>{t("total")}</span>
          <span>{formatEGP(totalMinor)}</span>
        </div>
      </div>
    </div>
  );
}
