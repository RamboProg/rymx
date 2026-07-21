"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Table, Td, Th } from "@/components/admin/Table";
import { ROLES, type Permission, type Role, type StaffMember } from "../../schema";
import { revokeStaffAction, updateStaffRoleAction } from "../../server/actions";
import { PermissionCheckboxes } from "./PermissionCheckboxes";

const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== "customer") as Exclude<Role, "customer">[];

function StaffRow({ member, isSelf }: { member: StaffMember; isSelf: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState(member.role);
  const [permissions, setPermissions] = useState<Permission[]>(member.permissions);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setBusy(true);
    setError(null);
    const result = await updateStaffRoleAction({ uid: member.uid, role, permissions });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function onRevoke() {
    setBusy(true);
    setError(null);
    const result = await revokeStaffAction(member.uid);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <tr>
        <Td>
          {member.displayName ?? member.email ?? member.uid}
          {isSelf && <span className="text-rymx-cream/40"> (you)</span>}
        </Td>
        <Td>{member.email}</Td>
        <Td>{member.role}</Td>
        <Td>{member.permissions.length}</Td>
        <Td>
          {!isSelf && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="hover:text-rymx-gold"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onRevoke}
                className="hover:text-red-400"
              >
                Revoke
              </button>
            </div>
          )}
        </Td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={5} className="border-rymx-cream/10 bg-rymx-card border-b p-4">
            <div className="flex flex-col gap-3">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="border-rymx-cream/20 bg-rymx-bg text-rymx-cream focus:border-rymx-gold w-fit rounded-md border px-3 py-2 text-sm outline-none"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <PermissionCheckboxes selected={permissions} onChange={setPermissions} />
              {error && (
                <p role="alert" className="font-mono text-sm text-red-400">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={onSave}
                className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold w-fit rounded-md border px-4 py-2 font-mono text-xs uppercase hover:text-[#12100a] disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function StaffTable({ staff, currentUid }: { staff: StaffMember[]; currentUid: string }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Role</Th>
          <Th>Permissions</Th>
          <Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {staff.map((member) => (
          <StaffRow key={member.uid} member={member} isSelf={member.uid === currentUid} />
        ))}
      </tbody>
    </Table>
  );
}
