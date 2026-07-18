import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { addressSchema, profileSchema, type Address, type Profile } from "../schema";

export async function getProfile(uid: string): Promise<Profile> {
  const doc = await adminDb.doc(`users/${uid}`).get();
  const data = doc.data() ?? {};
  return profileSchema.parse({
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    phone: data.phone ?? null,
  });
}

export async function listAddresses(uid: string): Promise<Address[]> {
  const snap = await adminDb.collection(`users/${uid}/addresses`).get();
  return snap.docs.map((d) => addressSchema.parse({ id: d.id, ...d.data() }));
}
