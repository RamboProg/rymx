import "server-only";

import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Node-only. Never import this file from `middleware.ts` or any Edge runtime —
// the Admin SDK does not run on the Edge runtime Vercel uses for middleware.

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set");
  }
  return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    // Emulator mode: no real credentials needed, but env host vars must be set
    // (FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST).
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  return initializeApp({
    credential: cert(loadServiceAccount()),
  });
}

const adminApp = getAdminApp();
const adminAuth = getAuth(adminApp);
// Optional non-default Firestore database (e.g. a "rymx-dev" database in the
// same project as prod, used for local dev/e2e/security testing without
// touching prod data). Unset = "(default)", today's behavior, unchanged.
const adminDb = getFirestore(adminApp, process.env.FIRESTORE_DATABASE_ID || "(default)");

export { adminAuth, adminDb };
