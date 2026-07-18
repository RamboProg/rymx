export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-rymx-cream/10 bg-rymx-card flex flex-col gap-1 rounded-md border p-5">
      <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
        {label}
      </span>
      <span className="font-display text-rymx-cream text-2xl font-bold">{value}</span>
    </div>
  );
}
