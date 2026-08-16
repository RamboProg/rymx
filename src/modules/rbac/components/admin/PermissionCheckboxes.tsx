"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/Checkbox";
import { PERMISSIONS, type Permission } from "../../schema";

export function PermissionCheckboxes({
  selected,
  onChange,
}: {
  selected: Permission[];
  onChange: (permissions: Permission[]) => void;
}) {
  const t = useTranslations("permission");

  function toggle(permission: Permission) {
    onChange(
      selected.includes(permission)
        ? selected.filter((p) => p !== permission)
        : [...selected, permission],
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PERMISSIONS.map((permission) => (
        <Checkbox
          key={permission}
          id={`permission-${permission}`}
          label={t(permission)}
          checked={selected.includes(permission)}
          onChange={() => toggle(permission)}
        />
      ))}
    </div>
  );
}
