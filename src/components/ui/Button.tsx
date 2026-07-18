import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

const baseClasses =
  "group relative isolate inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-rymx-gold px-7.5 py-4 font-mono text-xs font-semibold tracking-[0.15em] text-rymx-gold uppercase transition-colors duration-350 hover:text-[#12100a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rymx-gold disabled:pointer-events-none disabled:opacity-50";

const fillClasses =
  "absolute inset-0 -z-10 -translate-x-full bg-rymx-gold transition-transform duration-400 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-x-0";

export function Button({
  href,
  children,
  className,
  onClick,
  ...props
}: {
  href?: string;
  className?: string;
  onClick?: () => void;
} & Omit<ComponentPropsWithoutRef<"button">, "onClick">) {
  const content = (
    <>
      <span className={fillClasses} aria-hidden="true" />
      <span className="relative z-10 inline-flex items-center gap-2.5">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={`${baseClasses} ${className ?? ""}`}>
        {content}
      </Link>
    );
  }

  return (
    <button className={`${baseClasses} ${className ?? ""}`} onClick={onClick} {...props}>
      {content}
    </button>
  );
}
