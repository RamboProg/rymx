"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/i18n/actions";
import type { Locale } from "@/i18n/locale";

const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: "en", label: "EN" },
  { locale: "ar", label: "ع" },
];

export function LocaleToggle() {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === active || pending) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div
      className="border-rymx-cream/20 flex overflow-hidden rounded-md border"
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.locale}
          type="button"
          onClick={() => choose(option.locale)}
          aria-pressed={active === option.locale}
          disabled={pending}
          className={`px-2 py-1 font-mono text-xs uppercase transition-colors disabled:opacity-50 ${
            active === option.locale
              ? "bg-rymx-gold text-[#12100a]"
              : "text-rymx-cream/60 hover:text-rymx-cream"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
