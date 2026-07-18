"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionClaims } from "@/modules/rbac/server";
import { addAddressSchema, updateProfileSchema } from "../schema";
import { getProfile, listAddresses } from "./index";
import type { Address, Profile } from "../schema";

async function requireUid(): Promise<string | null> {
  const claims = await getSessionClaims();
  return claims?.uid ?? null;
}

export type ProfileActionResult = { ok: true; profile: Profile } | { ok: false; error: string };

export async function updateProfileAction(rawInput: unknown): Promise<ProfileActionResult> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Sign in required" };

  const parsed = updateProfileSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb
    .doc(`users/${uid}`)
    .set(
      { displayName: parsed.data.displayName, phone: parsed.data.phone || null },
      { merge: true },
    );

  revalidatePath("/account");
  return { ok: true, profile: await getProfile(uid) };
}

export type AddressListActionResult =
  { ok: true; addresses: Address[] } | { ok: false; error: string };

export async function addAddressAction(rawInput: unknown): Promise<AddressListActionResult> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Sign in required" };

  const parsed = addAddressSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb.collection(`users/${uid}/addresses`).add(parsed.data);
  revalidatePath("/account");
  return { ok: true, addresses: await listAddresses(uid) };
}

export async function removeAddressAction(rawAddressId: unknown): Promise<AddressListActionResult> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Sign in required" };
  if (typeof rawAddressId !== "string" || !rawAddressId)
    return { ok: false, error: "Invalid address" };

  await adminDb.doc(`users/${uid}/addresses/${rawAddressId}`).delete();
  revalidatePath("/account");
  return { ok: true, addresses: await listAddresses(uid) };
}
