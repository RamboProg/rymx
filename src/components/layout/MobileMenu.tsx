"use client";

import { useState } from "react";

// Hamburger toggle for the primary nav links (Shop/Collections/Dashboard),
// which are hidden below the `sm` breakpoint in HeaderNav — without this,
// mobile visitors would have no way to reach them at all. `children` is the
// already-translated set of <Link>s from HeaderNav, just re-laid-out here
// for a stacked mobile dropdown.
export function MobileMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
        className="text-rymx-cream/70 hover:text-rymx-gold flex flex-col gap-1.5 p-1"
      >
        <span
          aria-hidden="true"
          className={`block h-0.5 w-5 bg-current transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
        />
        <span
          aria-hidden="true"
          className={`block h-0.5 w-5 bg-current transition-opacity ${open ? "opacity-0" : ""}`}
        />
        <span
          aria-hidden="true"
          className={`block h-0.5 w-5 bg-current transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
        />
      </button>
      {open && (
        <nav
          aria-label={label}
          className="border-rymx-cream/10 bg-rymx-bg absolute inset-x-0 top-full flex flex-col gap-1 border-t px-6 py-4 sm:px-8"
          onClick={() => setOpen(false)}
        >
          {children}
        </nav>
      )}
    </div>
  );
}
