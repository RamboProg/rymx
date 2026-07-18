import { PERMISSIONS, type Permission, type Role } from "../schema";

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  admin: PERMISSIONS,
  staff: [],
  customer: [],
};

export function hasPermission(
  claims: { role: Role; permissions?: readonly Permission[] } | null | undefined,
  permission: Permission,
): boolean {
  if (!claims) return false;
  if (claims.role === "owner") return true;
  return (claims.permissions ?? []).includes(permission);
}

export function isStaff(role: Role | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "staff";
}
