import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getProfile, listAddresses } from "@/modules/account/server";
import { CheckoutView } from "@/modules/orders/components/CheckoutView";
import { getSessionClaims } from "@/modules/rbac/server";
import { getShippingSettings, getStoreSettings } from "@/modules/settings/server";

export const metadata: Metadata = { title: "Checkout — RYMX" };

export default async function CheckoutPage() {
  const claims = await getSessionClaims();
  const [shippingSettings, storeSettings, profile, addresses] = await Promise.all([
    getShippingSettings(),
    getStoreSettings(),
    claims ? getProfile(claims.uid) : Promise.resolve(null),
    claims ? listAddresses(claims.uid) : Promise.resolve([]),
  ]);
  const t = await getTranslations("checkout");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">{t("title")}</h1>
      <CheckoutView
        shippingSettings={shippingSettings}
        storeSettings={storeSettings}
        profile={profile}
        addresses={addresses}
      />
    </div>
  );
}
