import { z } from "zod";

export const contentSettingsSchema = z.object({
  announcementEnabled: z.boolean().default(false),
  announcementText: z.string().trim().default(""),
  // Optional — an empty string renders the bar as plain text, not a link.
  announcementHref: z.string().trim().default(""),
  heroEyebrow: z.string().trim().min(1).default("RYMX — CAIRO / SS26"),
  heroHeadline: z.string().trim().min(1).default("Reveal your mistakes."),
  heroCta: z.string().trim().min(1).default("Reveal the collection"),
});
export type ContentSettings = z.infer<typeof contentSettingsSchema>;
