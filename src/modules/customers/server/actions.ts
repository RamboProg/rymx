"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminPermission } from "@/modules/rbac/server";
import {
  addCustomerNoteInputSchema,
  addCustomerTagInputSchema,
  removeCustomerTagInputSchema,
} from "../schema";
import { listCustomerNotes } from "./index";

async function requireCustomersManage(): Promise<string | null> {
  return (await requireAdminPermission("customers:manage"))?.uid ?? null;
}

export type TagActionResult = { ok: true; tags: string[] } | { ok: false; error: string };

export async function addCustomerTagAction(rawInput: unknown): Promise<TagActionResult> {
  if (!(await requireCustomersManage())) return { ok: false, error: "Forbidden" };

  const parsed = addCustomerTagInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const ref = adminDb.doc(`customerTags/${parsed.data.uid}`);
  const snap = await ref.get();
  const tags = new Set<string>((snap.data()?.tags as string[] | undefined) ?? []);
  tags.add(parsed.data.tag);
  const nextTags = Array.from(tags);
  await ref.set({ tags: nextTags }, { merge: true });

  revalidatePath(`/admin/customers/${parsed.data.uid}`);
  return { ok: true, tags: nextTags };
}

export async function removeCustomerTagAction(rawInput: unknown): Promise<TagActionResult> {
  if (!(await requireCustomersManage())) return { ok: false, error: "Forbidden" };

  const parsed = removeCustomerTagInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const ref = adminDb.doc(`customerTags/${parsed.data.uid}`);
  const snap = await ref.get();
  const nextTags = ((snap.data()?.tags as string[] | undefined) ?? []).filter(
    (t) => t !== parsed.data.tag,
  );
  await ref.set({ tags: nextTags }, { merge: true });

  revalidatePath(`/admin/customers/${parsed.data.uid}`);
  return { ok: true, tags: nextTags };
}

export type CustomerNotesResult =
  { ok: true; notes: Awaited<ReturnType<typeof listCustomerNotes>> } | { ok: false; error: string };

export async function addCustomerNoteAction(rawInput: unknown): Promise<CustomerNotesResult> {
  const staffUid = await requireCustomersManage();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const parsed = addCustomerNoteInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb.collection(`users/${parsed.data.uid}/notes`).add({
    body: parsed.data.body,
    staffUid,
    createdAt: new Date(),
  });

  revalidatePath(`/admin/customers/${parsed.data.uid}`);
  return { ok: true, notes: await listCustomerNotes(parsed.data.uid) };
}
