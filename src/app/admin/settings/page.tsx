import type { Metadata } from "next";
import { ContentSettingsForm } from "@/modules/content/components/admin/ContentSettingsForm";
import { getContentSettings } from "@/modules/content/server";
import { EmailTemplatesForm } from "@/modules/settings/components/admin/EmailTemplatesForm";
import { PoliciesForm } from "@/modules/settings/components/admin/PoliciesForm";
import { ShippingSettingsForm } from "@/modules/settings/components/admin/ShippingSettingsForm";
import { StoreSettingsForm } from "@/modules/settings/components/admin/StoreSettingsForm";
import {
  getEmailTemplates,
  getPolicies,
  getShippingSettings,
  getStoreSettings,
} from "@/modules/settings/server";

export const metadata: Metadata = { title: "Settings — Admin — RYMX" };

export default async function AdminSettingsPage() {
  const [shipping, store, policies, emailTemplates, content] = await Promise.all([
    getShippingSettings(),
    getStoreSettings(),
    getPolicies(),
    getEmailTemplates(),
    getContentSettings(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">Settings</h1>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Shipping</h2>
        <ShippingSettingsForm settings={shipping} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Store &amp; COD</h2>
        <StoreSettingsForm settings={store} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Content</h2>
        <ContentSettingsForm settings={content} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Policies</h2>
        <PoliciesForm policies={policies} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Email templates</h2>
        <EmailTemplatesForm templates={emailTemplates} />
      </section>
    </div>
  );
}
