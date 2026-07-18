import type { Metadata } from "next";
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

  const [profile, addresses, personalPromos] = await Promise.all([
    getProfile(uid),
    listAddresses(uid),
    listDiscountsForUid(uid),
  ]);

  return (
    <>
      <div>
        <h1 className="font-display text-rymx-cream text-3xl font-bold">Account</h1>
        <Link
          href="/account/orders"
          className="text-rymx-gold mt-2 inline-block font-mono text-xs tracking-[0.1em] uppercase hover:underline"
        >
          Order history →
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Profile</h2>
        <ProfileForm profile={profile} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Addresses</h2>
        <AddressList addresses={addresses} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Your promo codes</h2>
        <PersonalPromoList discounts={personalPromos} />
      </section>
    </>
  );
}
