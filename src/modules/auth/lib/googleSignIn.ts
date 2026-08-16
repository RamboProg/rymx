import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { establishSession } from "./establishSession";

const provider = new GoogleAuthProvider();

export type GoogleSignInResult =
  | { kind: "session"; destination: string }
  | { kind: "redirecting" };

// Completes a redirect-based Google sign-in if the user just returned from
// Google. Returns the post-login destination, or null when there was no
// pending redirect (normal page load).
export async function completeGoogleRedirectIfPresent(): Promise<string | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return establishSession(await result.user.getIdToken());
}

// Prefer popup; fall back to full-page redirect when the browser blocks it
// (common on mobile / strict popup policies). Redirect completion is handled
// by completeGoogleRedirectIfPresent() on the next page load.
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    const cred = await signInWithPopup(auth, provider);
    return {
      kind: "session",
      destination: await establishSession(await cred.user.getIdToken()),
    };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return { kind: "redirecting" };
    }
    throw err;
  }
}
