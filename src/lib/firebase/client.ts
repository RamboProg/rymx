import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getClientApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

const app = getClientApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to the local Emulator Suite when explicitly enabled — never on Vercel.
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
  const g = globalThis as unknown as { __rymxEmulatorsConnected?: boolean };
  if (!g.__rymxEmulatorsConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    g.__rymxEmulatorsConnected = true;
  }
}

// Only `auth` is consumed outside this file — every Firestore/Storage read
// goes through the Admin SDK server-side. `db`/`storage` still need to exist
// so the emulator-connection wiring above runs against them.
export { auth };
