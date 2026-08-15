"use client";

import * as RadixSelect from "@radix-ui/react-select";

export function Select({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  error,
  description,
  disabled,
}: {
  id?: string;
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          {label}
        </label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold data-[placeholder]:text-rymx-cream/40 flex w-full items-center justify-between gap-2 rounded-md border px-4 py-3 text-left text-sm outline-none disabled:opacity-50"
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon className="text-rymx-cream/60">▾</RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="border-rymx-cream/20 bg-rymx-card z-50 max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-md border shadow-lg"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="text-rymx-cream data-[highlighted]:bg-rymx-gold/10 data-[highlighted]:text-rymx-gold data-[state=checked]:text-rymx-gold cursor-pointer rounded px-3 py-2 text-sm outline-none select-none"
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {description && !error && (
        <p id={id ? `${id}-desc` : undefined} className="text-rymx-cream/40 font-sans text-xs">
          {description}
        </p>
      )}
      {error && (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
