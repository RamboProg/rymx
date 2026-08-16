"use client";

import { useLocale, useTranslations } from "next-intl";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDisplay(date: Date, locale: string): string {
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Weekday initials for the header row, in the active locale's own week order
// and script (next-intl's locale, not the browser's) — Su/Mo/... in English,
// أحد/إثنين/... initials in Arabic, rather than a hardcoded English row.
function weekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  // Jan 4 1970 was a Sunday — start there so index 0..6 walks Sun..Sat,
  // matching Date#getDay()/leadingBlanks below regardless of locale.
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(1970, 0, 4 + i)));
}

export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id?: string;
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  error?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("common");
  const resolvedPlaceholder = placeholder ?? t("notSet");
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value ?? new Date()));

  function pickDay(day: number) {
    const base = value ?? new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day, 0, 0);
    onChange(
      new Date(
        viewMonth.getFullYear(),
        viewMonth.getMonth(),
        day,
        base.getHours(),
        base.getMinutes(),
      ),
    );
  }

  function setTime(timeValue: string) {
    const [hours, minutes] = timeValue.split(":").map(Number);
    const base = value ?? new Date();
    onChange(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes));
  }

  const leadingBlanks = startOfMonth(viewMonth).getDay();
  const total = daysInMonth(viewMonth);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        htmlFor={id}
      >
        {label}
      </label>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            aria-describedby={error && id ? `${id}-error` : undefined}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold flex items-center justify-between gap-2 rounded-md border px-4 py-3 text-start text-sm outline-none"
          >
            <span className={value ? "" : "text-rymx-cream/40"}>
              {value ? formatDisplay(value, locale) : resolvedPlaceholder}
            </span>
            {value && (
              <span
                role="button"
                tabIndex={0}
                aria-label={t("clearDate")}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className="text-rymx-cream/40 hover:text-red-400"
              >
                ×
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            className="border-rymx-cream/20 bg-rymx-card z-50 flex w-72 flex-col gap-3 rounded-md border p-4 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="text-rymx-cream/60 hover:text-rymx-gold px-2"
                aria-label={t("previousMonth")}
              >
                <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
                  ←
                </span>
              </button>
              <span className="text-rymx-cream font-mono text-xs tracking-[0.1em] uppercase">
                {viewMonth.toLocaleString(locale, { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="text-rymx-cream/60 hover:text-rymx-gold px-2"
                aria-label={t("nextMonth")}
              >
                <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
                  →
                </span>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdayLabels(locale).map((wd, i) => (
                <span key={i} className="text-rymx-cream/40 font-mono text-[10px] uppercase">
                  {wd}
                </span>
              ))}
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: total }).map((_, i) => {
                const day = i + 1;
                const dayDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                const selected = value ? isSameDay(dayDate, value) : false;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pickDay(day)}
                    className={`rounded font-mono text-xs ${
                      selected
                        ? "bg-rymx-gold text-[#12100a]"
                        : "text-rymx-cream/80 hover:bg-rymx-gold/10 hover:text-rymx-gold"
                    } py-1.5`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <input
              type="time"
              value={value ? formatTimeInput(value) : "00:00"}
              onChange={(e) => setTime(e.target.value)}
              className="border-rymx-cream/20 bg-rymx-bg text-rymx-cream focus:border-rymx-gold rounded-md border px-3 py-2 text-sm outline-none"
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {error && (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
