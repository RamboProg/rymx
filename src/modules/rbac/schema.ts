import { z } from "zod";

export const ROLES = ["owner", "admin", "staff", "customer"] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const PERMISSIONS = [
  "products:write",
  "collections:write",
  "orders:fulfill",
  "discounts:manage",
  "customers:manage",
  "settings:manage",
  "staff:manage",
] as const;
export const permissionSchema = z.enum(PERMISSIONS);
export type Permission = z.infer<typeof permissionSchema>;

export const claimsSchema = z.object({
  role: roleSchema,
  permissions: z.array(permissionSchema).default([]),
});
export type Claims = z.infer<typeof claimsSchema>;

export const staffMemberSchema = z.object({
  uid: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  role: roleSchema,
  permissions: z.array(permissionSchema).default([]),
  createdAt: z.date().nullable(),
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

export const inviteStaffInputSchema = z.object({
  email: z.email(),
  displayName: z.string().trim().min(1, "Name is required").max(80),
  role: z.enum(["admin", "staff"]),
  permissions: z.array(permissionSchema).default([]),
});
export type InviteStaffInput = z.infer<typeof inviteStaffInputSchema>;

export const updateStaffRoleInputSchema = z.object({
  uid: z.string().min(1),
  role: roleSchema,
  permissions: z.array(permissionSchema).default([]),
});
export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleInputSchema>;

export const auditLogEntrySchema = z.object({
  id: z.string(),
  actorUid: z.string(),
  action: z.string(),
  details: z.string(),
  createdAt: z.date(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
