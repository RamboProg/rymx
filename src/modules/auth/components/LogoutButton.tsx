"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    await fetch("/api/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      className="text-rymx-cream/70 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase transition-colors disabled:pointer-events-none disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
