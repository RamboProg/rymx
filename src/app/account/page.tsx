import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getProfile, listAddresses } from "@/modules/account/server";
import { AddressList } from "@/modules/account/components/AddressList";
import { ProfileForm } from "@/modules/account/components/ProfileForm";
import { PersonalPromoList } from "@/modules/discounts/components/PersonalPromoList";
import { listDiscountsForUid } from "@/modules/discounts/server";
import { getSessionClaims } from "@/modules/rbac/server";

export const metadata: Metadata = { title: "Account — RYMX" };

export default async function AccountPage() {
  const claims = await getSessionClaims();
  const uid = claims!.uid;

  const [profile, addresses, personalPromos, t] = await Promise.all([
    getProfile(uid),
    listAddresses(uid),
    listDiscountsForUid(uid),
    getTranslations("account"),
  ]);

  return (
    <>
      <div>
        <h1 className="font-display text-rymx-cream text-3xl font-bold">{t("title")}</h1>
        <Link
          href="/account/orders"
          className="text-rymx-gold mt-2 inline-block font-mono text-xs tracking-[0.1em] uppercase hover:underline"
        >
          {t("orderHistory")} →
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">{t("profile")}</h2>
        <ProfileForm profile={profile} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">{t("addresses")}</h2>
        <AddressList addresses={addresses} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">{t("yourPromoCodes")}</h2>
        <PersonalPromoList discounts={personalPromos} />
      </section>
    </>
  );
}
