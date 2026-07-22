import "server-only";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { toDate } from "@/lib/firebase/toDate";
import { listAllOrders } from "@/modules/orders/server";
import { customerNoteSchema, customerSchema, type Customer, type CustomerNote } from "../schema";

// A user counts as "staff" (excluded from the customer directory) once any
// role other than the default "customer" has been set via custom claims —
// same source of truth staff-gating already uses everywhere else.
async function listCustomerUids(): Promise<Set<string>> {
  const staffUids = new Set<string>();
  let pageToken: string | undefined;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const role = (user.customClaims as { role?: string } | undefined)?.role;
      if (role && role !== "customer") staffUids.add(user.uid);
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return staffUids;
}

// Admin-scale: lists every non-staff Auth user, joined with orders (for
// order count / lifetime value) and the Firestore profile doc (for tags).
// Same in-memory-join tradeoff as every other admin listing in this codebase
// (listAllOrders, listAllProducts, ...) — fine while the customer base is
// small, revisit if it stops being true.
export async function listCustomers(): Promise<Customer[]> {
  const [staffUids, orders] = await Promise.all([listCustomerUids(), listAllOrders()]);

  const orderStatsByUid = new Map<string, { orderCount: number; lifetimeValueMinor: number }>();
  for (const order of orders) {
    if (!order.uid || order.status === "cancelled") continue;
    const existing = orderStatsByUid.get(order.uid) ?? { orderCount: 0, lifetimeValueMinor: 0 };
    existing.orderCount += 1;
    existing.lifetimeValueMinor += order.totalMinor;
    orderStatsByUid.set(order.uid, existing);
  }

  const customers: Customer[] = [];
  let pageToken: string | undefined;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    const eligible = page.users.filter((user) => !staffUids.has(user.uid));
    const [profiles, tagDocs] = await Promise.all([
      Promise.all(eligible.map((user) => adminDb.doc(`users/${user.uid}`).get())),
      Promise.all(eligible.map((user) => adminDb.doc(`customerTags/${user.uid}`).get())),
    ]);

    eligible.forEach((user, i) => {
      // eslint-disable-next-line security/detect-object-injection -- i is this forEach's own index, not user input
      const profileData = profiles[i]!.data();
      const stats = orderStatsByUid.get(user.uid) ?? { orderCount: 0, lifetimeValueMinor: 0 };
      customers.push(
        customerSchema.parse({
          uid: user.uid,
          email: user.email ?? null,
          displayName: profileData?.displayName ?? user.displayName ?? null,
          phone: profileData?.phone ?? null,
          // eslint-disable-next-line security/detect-object-injection -- i is this forEach's own index, not user input
          tags: tagDocs[i]!.data()?.tags ?? [],
          createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : null,
          orderCount: stats.orderCount,
          lifetimeValueMinor: stats.lifetimeValueMinor,
        }),
      );
    });
    pageToken = page.pageToken;
  } while (pageToken);

  return customers;
}

export async function getCustomer(uid: string): Promise<Customer | null> {
  const [userRecord, profileSnap, tagSnap, orders] = await Promise.all([
    adminAuth.getUser(uid).catch(() => null),
    adminDb.doc(`users/${uid}`).get(),
    adminDb.doc(`customerTags/${uid}`).get(),
    listAllOrders(),
  ]);
  if (!userRecord) return null;

  const own = orders.filter((o) => o.uid === uid && o.status !== "cancelled");
  const profileData = profileSnap.data();

  return customerSchema.parse({
    uid,
    email: userRecord.email ?? null,
    displayName: profileData?.displayName ?? userRecord.displayName ?? null,
    phone: profileData?.phone ?? null,
    tags: tagSnap.data()?.tags ?? [],
    createdAt: userRecord.metadata.creationTime ? new Date(userRecord.metadata.creationTime) : null,
    orderCount: own.length,
    lifetimeValueMinor: own.reduce((sum, o) => sum + o.totalMinor, 0),
  });
}

export async function listCustomerNotes(uid: string): Promise<CustomerNote[]> {
  const snap = await adminDb.collection(`users/${uid}/notes`).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) =>
    customerNoteSchema.parse({ ...d.data(), id: d.id, createdAt: toDate(d.data().createdAt) }),
  );
}
