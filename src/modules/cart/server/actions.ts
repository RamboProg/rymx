"use server";

import { checkRateLimit } from "@/lib/security/rateLimit";
import { getSessionClaims } from "@/modules/rbac/server";
import { cartItemSchema, type CartItem, type ResolvedCart } from "../schema";
import { addItem, removeItem, updateItemQuantity } from "../services/cart";
import { getCart, resolveCartItems, saveCart } from "./index";

const addInputSchema = cartItemSchema;
const updateInputSchema = cartItemSchema.pick({ variantId: true }).extend({
  quantity: cartItemSchema.shape.quantity.min(0),
});

export type CartActionResult = { ok: true; cart: ResolvedCart } | { ok: false; error: string };

async function requireUid(): Promise<string | null> {
  const claims = await getSessionClaims();
  return claims?.uid ?? null;
}

function rateLimited(uid: string): boolean {
  return !checkRateLimit(`cart:${uid}`, 60, 60 * 1000);
}

export async function getAccountCartAction(): Promise<CartActionResult> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Sign in required" };
  const items = await getCart(uid);
  return { ok: true, cart: await resolveCartItems(items) };
}

export async function resolveCartAction(rawItems: CartItem[]): Promise<CartActionResult> {
  const parsed = cartItemSchema.array().max(100).safeParse(rawItems);
  if (!parsed.success) return { ok: false, error: "Invalid cart" };
  return { ok: true, cart: await resolveCartItems(parsed.data) };
}

export async function addToCartAction(rawInput: unknown): Promise<CartActionResult> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Sign in required" };
  if (rateLimited(uid)) return { ok: false, error: "Too many requests" };

  const parsed = addInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Invalid item" };

  const items = await getCart(uid);
  const next = addItem(items, parsed.data);
  await saveCart(uid, next);
  return { ok: true, cart: await resolveCartItems(next) };
}

export async function updateCartItemAction(rawInput: unknown): Promise<CartActionResult> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Sign in required" };
  if (rateLimited(uid)) return { ok: false, error: "Too many requests" };

  const parsed = updateInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Invalid item" };

  const items = await getCart(uid);
  const next = updateItemQuantity(items, parsed.data.variantId, parsed.data.quantity);
  await saveCart(uid, next);
  return { ok: true, cart: await resolveCartItems(next) };
}

export async function removeFromCartAction(variantId: unknown): Promise<CartActionResult> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Sign in required" };
  if (typeof variantId !== "string" || !variantId) return { ok: false, error: "Invalid item" };

  const items = await getCart(uid);
  const next = removeItem(items, variantId);
  await saveCart(uid, next);
  return { ok: true, cart: await resolveCartItems(next) };
}

// Called once, right after a guest signs in — folds their local cart into
// carts/{uid} so items survive the transition from anonymous to signed-in.
export async function mergeGuestCartAction(rawItems: unknown): Promise<CartActionResult> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Sign in required" };

  const parsed = cartItemSchema.array().max(100).safeParse(rawItems);
  if (!parsed.success) return { ok: false, error: "Invalid cart" };

  const existing = await getCart(uid);
  const merged = parsed.data.reduce((acc, item) => addItem(acc, item), existing);
  await saveCart(uid, merged);
  return { ok: true, cart: await resolveCartItems(merged) };
}
