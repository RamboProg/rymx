export function Checkbox({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2.5 font-mono text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer appearance-none"
        />
        <span
          aria-hidden="true"
          className={`border-rymx-cream/20 bg-rymx-card peer-focus-visible:outline-rymx-gold pointer-events-none absolute inset-0 rounded border text-xs leading-5 font-bold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${
            checked
              ? "border-rymx-gold bg-rymx-gold text-center text-[#12100a]"
              : "text-transparent"
          }`}
        >
          ✓
        </span>
      </span>
      <span className="text-rymx-cream/80">{label}</span>
    </label>
  );
}
