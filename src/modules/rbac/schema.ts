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
