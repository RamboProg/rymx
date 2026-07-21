import { z } from "zod";
import { cartItemSchema } from "@/modules/cart/schema";

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(8, "Enter a valid phone number"),
  governorate: z.string().min(1, "Governorate is required"),
  city: z.string().min(1, "City is required"),
  addressLine: z.string().min(1, "Address is required"),
  notes: z.string().default(""),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const orderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  sku: z.string(),
  title: z.string(),
  optionValues: z.record(z.string(), z.string()).default({}),
  quantity: z.number().int().positive(),
  unitPriceMinor: z.number().int().nonnegative(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

// pending: just placed, awaiting admin confirmation.
// confirmed: reviewed, ready to fulfill (also set automatically once the
// first shipment is created — see shipments/server/actions.ts).
// shipped: at least one shipment has left the building.
// delivered: every shipment for the order has been marked delivered.
// cancelled: terminal; cancelOrderAction restocks everything first.
export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderSchema = z.object({
  id: z.string(),
  uid: z.string().nullable(),
  email: z.email().nullable(),
  shipping: shippingAddressSchema,
  items: z.array(orderItemSchema).min(1),
  subtotalMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative().default(0),
  discountCode: z.string().nullable().default(null),
  shippingFeeMinor: z.number().int().nonnegative().default(0),
  totalMinor: z.number().int().nonnegative(),
  status: orderStatusSchema.default("pending"),
  paymentMethod: z.literal("cod").default("cod"),
  createdAt: z.date(),
});
export type Order = z.infer<typeof orderSchema>;

// What the client actually sends. Deliberately carries no price — every
// price/stock fact is re-derived server-side from productId/variantId.
export const checkoutInputSchema = z.object({
  idempotencyKey: z.uuid(),
  items: z.array(cartItemSchema).min(1).max(100),
  shipping: shippingAddressSchema,
  discountCode: z.string().trim().min(1).optional(),
  // Required for guest checkout (no session to derive it from); ignored for
  // signed-in checkout, which uses the session's email.
  guestEmail: z.email().optional(),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const orderNoteSchema = z.object({
  id: z.string(),
  body: z.string().min(1),
  staffUid: z.string(),
  createdAt: z.date(),
});
export type OrderNote = z.infer<typeof orderNoteSchema>;

export const addOrderNoteInputSchema = z.object({
  orderId: z.string().min(1),
  body: z.string().trim().min(1, "Note can't be empty"),
});
export type AddOrderNoteInput = z.infer<typeof addOrderNoteInputSchema>;
