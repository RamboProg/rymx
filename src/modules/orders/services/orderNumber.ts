// Human-readable, sequential order IDs — YYYYMMDD-NNN, day boundary in
// Africa/Cairo (the store's actual business day, not UTC — Vercel cron runs
// UTC but that's unrelated; this is what staff/customers see as "today").
// No date library needed: Node/Vercel ship full ICU, so Intl.DateTimeFormat
// handles Egypt's DST history correctly on its own.

export function getCairoDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}${get("month")}${get("day")}`;
}

// Zero-padded to 3 digits. Known limit: past 999 orders in one Cairo day,
// this still produces a unique id (e.g. "20260819-1000") but it's no longer
// lexicographically sortable against that day's earlier 3-digit ids —
// acceptable at MVP scale, not worth engineering around further.
export function formatOrderId(dateKey: string, sequence: number): string {
  return `${dateKey}-${String(sequence).padStart(3, "0")}`;
}
