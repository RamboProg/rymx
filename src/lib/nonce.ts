import "server-only";

import { headers } from "next/headers";

// Reads the per-request CSP nonce set in src/proxy.ts (`x-nonce`). Any
// third-party <script> (a Meta/TikTok pixel loader, etc.) must pass this as
// its `nonce` prop via next/script, or the strict-dynamic CSP silently blocks
// it — see the comment above buildCsp() in src/proxy.ts.
export async function getNonce(): Promise<string | undefined> {
  const store = await headers();
  return store.get("x-nonce") ?? undefined;
}
