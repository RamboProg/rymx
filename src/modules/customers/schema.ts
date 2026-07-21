import { z } from "zod";

export const customerSchema = z.object({
  uid: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  phone: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  createdAt: z.date().nullable(),
  orderCount: z.number().int().nonnegative().default(0),
  lifetimeValueMinor: z.number().int().nonnegative().default(0),
});
export type Customer = z.infer<typeof customerSchema>;

export const customerNoteSchema = z.object({
  id: z.string(),
  body: z.string().min(1),
  staffUid: z.string(),
  createdAt: z.date(),
});
export type CustomerNote = z.infer<typeof customerNoteSchema>;

export const addCustomerNoteInputSchema = z.object({
  uid: z.string().min(1),
  body: z.string().trim().min(1, "Note can't be empty"),
});
export type AddCustomerNoteInput = z.infer<typeof addCustomerNoteInputSchema>;

export const addCustomerTagInputSchema = z.object({
  uid: z.string().min(1),
  tag: z.string().trim().min(1, "Tag can't be empty").max(30, "Tag must be at most 30 characters"),
});
export type AddCustomerTagInput = z.infer<typeof addCustomerTagInputSchema>;

export const removeCustomerTagInputSchema = z.object({
  uid: z.string().min(1),
  tag: z.string().min(1),
});
export type RemoveCustomerTagInput = z.infer<typeof removeCustomerTagInputSchema>;
