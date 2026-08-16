"use client";

import { useSyncExternalStore } from "react";

// Returns false during SSR and the initial hydration render, then true once the
// client has hydrated. Credential forms use this to keep the submit button
// disabled until their onSubmit handler is attached — a pre-hydration submit
// would otherwise fall back to the browser's native form submission and bypass
// the client-side validation + Firebase auth flow entirely.
//
// Implemented with useSyncExternalStore (the React-recommended pattern) rather
// than a mount effect, so the server/client snapshots differ deterministically
// without a setState-in-effect.
const noopSubscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true, // client snapshot
    () => false, // server snapshot
  );
}
