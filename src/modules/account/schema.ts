import { z } from "zod";

export const profileSchema = z.object({
  email: z.string().nullable().default(null),
  displayName: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
});
export type Profile = z.infer<typeof profileSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(80),
  phone: z.string().trim().max(30).default(""),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const addressSchema = z.object({
  id: z.string(),
  fullName: z.string().min(1),
  phone: z.string().min(8),
  governorate: z.string().min(1),
  city: z.string().min(1),
  addressLine: z.string().min(1),
  isDefault: z.boolean().default(false),
});
export type Address = z.infer<typeof addressSchema>;

export const addAddressSchema = addressSchema.omit({ id: true }).extend({
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().min(8, "Enter a valid phone number"),
  governorate: z.string().trim().min(1, "Governorate is required"),
  city: z.string().trim().min(1, "City is required"),
  addressLine: z.string().trim().min(1, "Address is required"),
});
export type AddAddressInput = z.infer<typeof addAddressSchema>;
