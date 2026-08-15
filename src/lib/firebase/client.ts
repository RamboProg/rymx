import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getClientApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

const app = getClientApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to the local Emulator Suite when explicitly enabled — never on Vercel.
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
  const g = globalThis as unknown as { __rymxEmulatorsConnected?: boolean };
  if (!g.__rymxEmulatorsConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    g.__rymxEmulatorsConnected = true;
  }
}

// Only `auth` is consumed outside this file — every Firestore read goes through
// the Admin SDK server-side; media now lives on Cloudinary. `db` still needs to
// exist so the emulator-connection wiring above runs against it.
export { auth };
