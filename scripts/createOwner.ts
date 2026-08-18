// One-off/reusable bootstrap: create (or promote) a production owner
// account. Owner is the one role nothing in the admin UI can grant on its
// own (only an existing owner can grant "owner" — see
// src/modules/rbac/server/actions.ts) — this script exists to break that
// chicken-and-egg for the very first owner. Safe to re-run: if the email
// already exists in Firebase Auth, its claims/Firestore doc get re-stamped
// to owner without touching its password.
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { DEFAULT_ROLE_PERMISSIONS } from "../src/modules/rbac/services/permissions";
import { getScriptAdminApp } from "./lib/firebaseAdmin";

const [, , email, password, displayName] = process.argv;

if (!email || !password) {
  console.error('Usage: pnpm owner:create <email> <password> ["Display Name"]');
  process.exit(1);
}

async function main() {
  const app = getScriptAdminApp();
  const adminAuth = getAuth(app);
  const db = getFirestore(app);

  const existing = await adminAuth.getUserByEmail(email!).catch(() => null);
  let uid: string;
  if (existing) {
    console.warn(`User ${email} already exists (uid=${existing.uid}) — updating to owner role.`);
    uid = existing.uid;
  } else {
    const created = await adminAuth.createUser({
      email,
      password,
      displayName: displayName ?? "Owner",
      emailVerified: true,
    });
    uid = created.uid;
  }

  await adminAuth.setCustomUserClaims(uid, {
    role: "owner",
    permissions: DEFAULT_ROLE_PERMISSIONS.owner,
  });
  await db.doc(`users/${uid}`).set(
    {
      email,
      displayName: displayName ?? "Owner",
      role: "owner",
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );
  console.log(`Owner account ready: ${email} (uid=${uid}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
