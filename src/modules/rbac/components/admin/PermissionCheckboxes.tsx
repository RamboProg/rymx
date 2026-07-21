"use client";

import { PERMISSIONS, type Permission } from "../../schema";

export function PermissionCheckboxes({
  selected,
  onChange,
}: {
  selected: Permission[];
  onChange: (permissions: Permission[]) => void;
}) {
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
        <label
          key={permission}
          className="text-rymx-cream/80 flex items-center gap-2 font-mono text-xs"
        >
          <input
            type="checkbox"
            checked={selected.includes(permission)}
            onChange={() => toggle(permission)}
          />
          {permission}
        </label>
      ))}
    </div>
  );
}
