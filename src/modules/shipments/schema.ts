import { z } from "zod";

export const shipmentStatusSchema = z.enum(["pending", "shipped", "delivered"]);
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;

export const shipmentItemSchema = z.object({
  variantId: z.string(),
  sku: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
});
export type ShipmentItem = z.infer<typeof shipmentItemSchema>;

export const shipmentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  items: z.array(shipmentItemSchema).min(1),
  carrier: z.string().nullable().default(null),
  trackingNumber: z.string().nullable().default(null),
  status: shipmentStatusSchema.default("pending"),
  createdAt: z.date(),
  shippedAt: z.date().nullable().default(null),
  deliveredAt: z.date().nullable().default(null),
});
export type Shipment = z.infer<typeof shipmentSchema>;

export const createShipmentInputSchema = z.object({
  orderId: z.string().min(1),
  items: z
    .array(z.object({ variantId: z.string().min(1), quantity: z.number().int().positive() }))
    .min(1, "Select at least one item to ship"),
});
export type CreateShipmentInput = z.infer<typeof createShipmentInputSchema>;

export const markShippedInputSchema = z.object({
  shipmentId: z.string().min(1),
  carrier: z.string().trim().min(1, "Carrier is required"),
  trackingNumber: z.string().trim().min(1, "Tracking number is required"),
});
export type MarkShippedInput = z.infer<typeof markShippedInputSchema>;
