import type { ComponentPropsWithoutRef } from "react";

export function Field({
  label,
  id,
  error,
  ...props
}: { label: string; error?: string } & ComponentPropsWithoutRef<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
