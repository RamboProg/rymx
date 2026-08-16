import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { adminDb } from "@/lib/firebase/admin";
import {
  catalogDisplaySchema,
  emailTemplatesSchema,
  policiesSchema,
  shippingSettingsSchema,
  storeSettingsSchema,
  type CatalogDisplay,
  type EmailTemplates,
  type Policies,
  type ShippingSettings,
  type StoreSettings,
} from "../schema";

// Every getter parses through its schema even when the doc doesn't exist yet
// (`.data() ?? {}`), so a store that's never touched Settings gets sane
// defaults everywhere (checkout, cart, dashboard) rather than a null-check
// at every call site. Cached across requests; busted via CACHE_TAGS.settings.

export async function getShippingSettings(): Promise<ShippingSettings> {
  return unstable_cache(
    async () => {
      const snap = await adminDb.doc("settings/shipping").get();
      return shippingSettingsSchema.parse(snap.data() ?? {});
    },
    ["settings-shipping"],
    { revalidate: 300, tags: [CACHE_TAGS.settings] },
  )();
}

export async function getStoreSettings(): Promise<StoreSettings> {
  return unstable_cache(
    async () => {
      const snap = await adminDb.doc("settings/store").get();
      return storeSettingsSchema.parse(snap.data() ?? {});
    },
    ["settings-store"],
    { revalidate: 300, tags: [CACHE_TAGS.settings] },
  )();
}

export async function getPolicies(): Promise<Policies> {
  return unstable_cache(
    async () => {
      const snap = await adminDb.doc("settings/policies").get();
      return policiesSchema.parse(snap.data() ?? {});
    },
    ["settings-policies"],
    { revalidate: 300, tags: [CACHE_TAGS.settings] },
  )();
}

export async function getEmailTemplates(): Promise<EmailTemplates> {
  return unstable_cache(
    async () => {
      const snap = await adminDb.doc("settings/emailTemplates").get();
      return emailTemplatesSchema.parse(snap.data() ?? {});
    },
    ["settings-email-templates"],
    { revalidate: 300, tags: [CACHE_TAGS.settings] },
  )();
}

export async function getCatalogDisplay(): Promise<CatalogDisplay> {
  return unstable_cache(
    async () => {
      const snap = await adminDb.doc("settings/catalogDisplay").get();
      return catalogDisplaySchema.parse(snap.data() ?? {});
    },
    ["settings-catalog-display"],
    { revalidate: 120, tags: [CACHE_TAGS.settings] },
  )();
}
