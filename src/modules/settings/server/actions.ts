"use server";

import { revalidatePath } from "next/cache";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache/tags";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminPermission } from "@/modules/rbac/server";
import {
  catalogDisplaySchema,
  emailTemplatesSchema,
  policiesSchema,
  shippingSettingsSchema,
  storeSettingsSchema,
} from "../schema";

async function requireSettingsManage(): Promise<boolean> {
  return (await requireAdminPermission("settings:manage")) !== null;
}

async function requireProductsWrite(): Promise<boolean> {
  return (await requireAdminPermission("products:write")) !== null;
}

export type SettingsActionResult = { ok: true } | { ok: false; error: string };

export async function updateShippingSettingsAction(
  rawInput: unknown,
): Promise<SettingsActionResult> {
  if (!(await requireSettingsManage())) return { ok: false, error: "Forbidden" };
  const parsed = shippingSettingsSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb.doc("settings/shipping").set(parsed.data);
  invalidateCacheTags(CACHE_TAGS.settings);
  revalidatePath("/admin/settings");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function updateStoreSettingsAction(rawInput: unknown): Promise<SettingsActionResult> {
  if (!(await requireSettingsManage())) return { ok: false, error: "Forbidden" };
  const parsed = storeSettingsSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb.doc("settings/store").set(parsed.data);
  invalidateCacheTags(CACHE_TAGS.settings);
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function updatePoliciesAction(rawInput: unknown): Promise<SettingsActionResult> {
  if (!(await requireSettingsManage())) return { ok: false, error: "Forbidden" };
  const parsed = policiesSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb.doc("settings/policies").set(parsed.data);
  invalidateCacheTags(CACHE_TAGS.settings);
  revalidatePath("/admin/settings");
  revalidatePath("/policies/returns");
  revalidatePath("/policies/privacy");
  revalidatePath("/policies/terms");
  return { ok: true };
}

export async function updateEmailTemplatesAction(rawInput: unknown): Promise<SettingsActionResult> {
  if (!(await requireSettingsManage())) return { ok: false, error: "Forbidden" };
  const parsed = emailTemplatesSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb.doc("settings/emailTemplates").set(parsed.data);
  invalidateCacheTags(CACHE_TAGS.settings);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function updateCatalogDisplayAction(
  rawInput: unknown,
): Promise<SettingsActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };
  const parsed = catalogDisplaySchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb.doc("settings/catalogDisplay").set(parsed.data);
  invalidateCacheTags(CACHE_TAGS.settings);
  revalidatePath("/admin/merchandising");
  revalidatePath("/shop");
  return { ok: true };
}
