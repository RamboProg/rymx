import { useTranslations } from "next-intl";
import { useRef, type ComponentPropsWithoutRef } from "react";

export function NumberField({
  label,
  id,
  error,
  description,
  min,
  max,
  step,
  className,
  ...props
}: { label?: string; error?: string; description?: string } & ComponentPropsWithoutRef<"input">) {
  const t = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);

  function nudge(direction: 1 | -1) {
    const input = inputRef.current;
    if (!input) return;
    const stepValue = Number(step) || 1;
    const current = Number(input.value) || 0;
    let next = current + direction * stepValue;
    if (min !== undefined && next < Number(min)) next = Number(min);
    if (max !== undefined && next > Number(max)) next = Number(max);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, String(next));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const atMax = max !== undefined && Number(props.value) >= Number(max);
  const atMin = min !== undefined && Number(props.value) <= Number(min);

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
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          aria-invalid={error ? true : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className={`border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold w-full appearance-none rounded-md border px-4 py-3 pe-9 text-sm outline-none [-moz-appearance:textfield] ${className ?? ""}`}
          {...props}
        />
        <div className="absolute top-1/2 end-1.5 flex -translate-y-1/2 flex-col">
          <button
            type="button"
            tabIndex={-1}
            disabled={atMax}
            onClick={() => nudge(1)}
            aria-label={t("increment")}
            className="text-rymx-cream/50 hover:text-rymx-gold leading-none disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={atMin}
            onClick={() => nudge(-1)}
            aria-label={t("decrement")}
            className="text-rymx-cream/50 hover:text-rymx-gold leading-none disabled:opacity-30"
          >
            ▼
          </button>
        </div>
      </div>
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

export function Field({
  label,
  id,
  error,
  description,
  className,
  ...props
}: { label: string; error?: string; description?: string } & ComponentPropsWithoutRef<"input">) {
  const describedBy =
    [description ? `${id}-desc` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") ||
    undefined;
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
        aria-describedby={describedBy}
        className={`border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none ${props.readOnly ? "cursor-not-allowed opacity-60" : ""} ${className ?? ""}`}
        {...props}
      />
      {description && (
        <p id={`${id}-desc`} className="text-rymx-cream/40 font-sans text-xs">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
