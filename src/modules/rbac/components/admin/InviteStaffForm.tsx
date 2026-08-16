"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { inviteStaffInputSchema, type Permission } from "../../schema";
import { DEFAULT_ROLE_PERMISSIONS } from "../../services/permissions";
import { inviteStaffAction } from "../../server/actions";
import { PermissionCheckboxes } from "./PermissionCheckboxes";

type InvitableRole = "admin" | "staff";

export function InviteStaffForm() {
  const t = useTranslations("staffAdmin");
  const tRole = useTranslations("role");
  const tCommon = useTranslations("common");
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
      setError(parsed.error.issues[0]?.message ?? tCommon("invalidInput"));
      return;
    }

    setSaving(true);
    const result = await inviteStaffAction(parsed.data);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(t("invited", { email: result.member.email ?? "" }));
    setEmail("");
    setDisplayName("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          id="staff-email"
          label={t("email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          id="staff-name"
          label={t("name")}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Select
          id="staff-role"
          label={t("role")}
          value={role}
          onValueChange={(v) => onRoleChange(v as InvitableRole)}
          options={[
            { value: "staff", label: tRole("staff") },
            { value: "admin", label: tRole("admin") },
          ]}
        />
      </div>

      <PermissionCheckboxes selected={permissions} onChange={setPermissions} />

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-rymx-gold font-mono text-sm">{notice}</p>}
      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? t("inviting") : t("inviteStaffMember")}
      </Button>
    </form>
  );
}
