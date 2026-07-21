import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import {
  emailTemplatesSchema,
  policiesSchema,
  shippingSettingsSchema,
  storeSettingsSchema,
  type EmailTemplates,
  type Policies,
  type ShippingSettings,
  type StoreSettings,
} from "../schema";

// Every getter parses through its schema even when the doc doesn't exist yet
// (`.data() ?? {}`), so a store that's never touched Settings gets sane
// defaults everywhere (checkout, cart, dashboard) rather than a null-check
// at every call site.
export async function getShippingSettings(): Promise<ShippingSettings> {
  const snap = await adminDb.doc("settings/shipping").get();
  return shippingSettingsSchema.parse(snap.data() ?? {});
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const snap = await adminDb.doc("settings/store").get();
  return storeSettingsSchema.parse(snap.data() ?? {});
}

export async function getPolicies(): Promise<Policies> {
  const snap = await adminDb.doc("settings/policies").get();
  return policiesSchema.parse(snap.data() ?? {});
}

export async function getEmailTemplates(): Promise<EmailTemplates> {
  const snap = await adminDb.doc("settings/emailTemplates").get();
  return emailTemplatesSchema.parse(snap.data() ?? {});
}
