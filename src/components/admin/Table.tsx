import type { ComponentPropsWithoutRef } from "react";

export function Table({ children, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="border-rymx-cream/10 overflow-x-auto rounded-md border">
      <table className="w-full min-w-max text-left" {...props}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, ...props }: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className="border-rymx-cream/10 bg-rymx-card text-rymx-cream/60 border-b px-4 py-3 font-mono text-xs tracking-[0.1em] uppercase"
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ children, ...props }: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className="border-rymx-cream/10 text-rymx-cream/80 border-b px-4 py-3 font-mono text-sm"
      {...props}
    >
      {children}
    </td>
  );
}
