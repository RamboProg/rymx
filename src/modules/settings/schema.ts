import { z } from "zod";

export const shippingZoneSchema = z.object({
  // Free-text governorate names, matched case/whitespace-insensitively
  // against the checkout form's own free-text governorate field (Egypt has
  // no fixed enum used elsewhere in this codebase to key off of).
  governorates: z.array(z.string().trim().min(1)).min(1),
  feeMinor: z.number().int().nonnegative(),
});
export type ShippingZone = z.infer<typeof shippingZoneSchema>;

export const shippingSettingsSchema = z.object({
  defaultFeeMinor: z.number().int().nonnegative().default(5000),
  // null = no free-shipping offer at all.
  freeShippingThresholdMinor: z.number().int().positive().nullable().default(300000),
  zones: z.array(shippingZoneSchema).default([]),
});
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(1).default("RYMX"),
  supportEmail: z.email().nullable().default(null),
  codEnabled: z.boolean().default(true),
  codFeeMinor: z.number().int().nonnegative().default(0),
  // null = no cap.
  maxOrderValueMinor: z.number().int().positive().nullable().default(null),
  taxPercent: z.number().min(0).max(100).default(0),
});
export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const policiesSchema = z.object({
  returnsPolicy: z.string().default(""),
  privacyPolicy: z.string().default(""),
  termsPolicy: z.string().default(""),
});
export type Policies = z.infer<typeof policiesSchema>;

// Spliced into the existing hardcoded HTML in notifications/server/index.ts
// rather than a full template engine — enough to let the owner customize
// the human copy without touching code.
export const emailTemplatesSchema = z.object({
  orderConfirmationIntro: z.string().default(""),
  promoCodeIntro: z.string().default(""),
});
export type EmailTemplates = z.infer<typeof emailTemplatesSchema>;
