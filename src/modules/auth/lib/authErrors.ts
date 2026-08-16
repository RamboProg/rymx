// Maps Firebase Auth / session-setup failures to short UI copy. Callers should
// still `console.error` the raw error so the code is visible in DevTools —
// empty catch blocks were hiding every Google sign-in failure.

export function authErrorMessage(err: unknown, fallback: string): string | null {
  const code = (err as { code?: string }).code;
  const message = err instanceof Error ? err.message : "";

  // User dismissed the popup — not an error worth alarming about.
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return null;
  }

  switch (code) {
    case "auth/unauthorized-domain":
      return "This domain isn't authorized for Google sign-in. Add it under Firebase Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in isn't enabled for this Firebase project.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup. Allow popups for this site and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/network-request-failed":
      return "Network error during Google sign-in. Check your connection and try again.";
    default:
      break;
  }

  if (message === "Failed to establish session") {
    return "Google signed you in, but creating the app session failed. Try again in a moment.";
  }

  return fallback;
}
