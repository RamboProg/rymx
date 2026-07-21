"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { inviteStaffInputSchema, type Permission } from "../../schema";
import { DEFAULT_ROLE_PERMISSIONS } from "../../services/permissions";
import { inviteStaffAction } from "../../server/actions";
import { PermissionCheckboxes } from "./PermissionCheckboxes";

type InvitableRole = "admin" | "staff";

export function InviteStaffForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<InvitableRole>("staff");
  const [permissions, setPermissions] = useState<Permission[]>([...DEFAULT_ROLE_PERMISSIONS.staff]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function onRoleChange(next: InvitableRole) {
    setRole(next);
    // eslint-disable-next-line security/detect-object-injection -- next is narrowed to the InvitableRole union, not user input
    setPermissions([...DEFAULT_ROLE_PERMISSIONS[next]]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const parsed = inviteStaffInputSchema.safeParse({ email, displayName, role, permissions });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    const result = await inviteStaffAction(parsed.data);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(`Invited ${result.member.email}. A temporary password was emailed to them.`);
    setEmail("");
    setDisplayName("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          id="staff-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          id="staff-name"
          label="Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="staff-role"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Role
          </label>
          <select
            id="staff-role"
            value={role}
            onChange={(e) => onRoleChange(e.target.value as InvitableRole)}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <PermissionCheckboxes selected={permissions} onChange={setPermissions} />

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-rymx-gold font-mono text-sm">{notice}</p>}
      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? "Inviting…" : "Invite staff member"}
      </Button>
    </form>
  );
}
