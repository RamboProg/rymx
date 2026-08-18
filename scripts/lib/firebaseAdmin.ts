// Shared bootstrap for standalone scripts (run via tsx/node, not Next's
// server bundle) — deliberately does NOT import src/lib/firebase/admin.ts,
// which is guarded by the "server-only" package and throws outside Next.
import { cert, type App, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export function getScriptAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0]!;

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set");
  return initializeApp({
    credential: cert(JSON.parse(Buffer.from(raw, "base64").toString("utf8"))),
  });
}

// Same optional-database override as src/lib/firebase/admin.ts — set
// FIRESTORE_DATABASE_ID to point a script at a non-default database (e.g.
// "rymx-dev", for seeding/testing without touching prod data). Unset =
// "(default)", today's behavior, unchanged.
export function getScriptDb(app: App): Firestore {
  return getFirestore(app, process.env.FIRESTORE_DATABASE_ID || "(default)");
}
