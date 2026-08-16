"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { auth } from "@/lib/firebase/client";
import { cartItemSchema, type CartItem, type ResolvedCart } from "../schema";
import { addItem, removeItem, updateItemQuantity } from "../services/cart";
import {
  addToCartAction,
  getAccountCartAction,
  mergeGuestCartAction,
  removeFromCartAction,
  resolveCartAction,
  updateCartItemAction,
} from "../server/actions";

const GUEST_CART_KEY = "rymx_guest_cart";
const EMPTY_CART: ResolvedCart = { lines: [], subtotalMinor: 0, itemCount: 0, issues: [] };

function readGuestItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = cartItemSchema.array().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function writeGuestItems(items: CartItem[]): void {
  window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

// Server errors are internal/technical (see cart/server/actions.ts) — map the
// couple that are actionable to a specific translated message, and fold
// everything else into one generic, customer-service-friendly message rather
// than surfacing raw error strings.
const KNOWN_CART_ERRORS: Record<string, string> = {
  "Sign in required": "signInRequired",
  "Too many requests": "tooManyRequests",
};

function cartErrorKey(error: string): string {
  // eslint-disable-next-line security/detect-object-injection -- error is one of a fixed set of literal strings returned by our own server actions, not user input
  return KNOWN_CART_ERRORS[error] ?? "generic";
}

export type CartState = ReturnType<typeof useCartState>;

// The stateful implementation, instantiated once by CartProvider. Every
// consumer reads the same instance via useCart() below — calling this
// directly from more than one component would give each its own cart state,
// so a mutation in one (e.g. checkout) wouldn't be reflected in another
// (e.g. the header's cart badge).
export function useCartState() {
  const [signedIn, setSignedIn] = useState(false);
  const [cart, setCart] = useState<ResolvedCart>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const t = useTranslations("cart");

  const reportError = useCallback(
    (error: string) => toast.error(t(`errors.${cartErrorKey(error)}`)),
    [toast, t],
  );

  const refresh = useCallback(async (isSignedIn: boolean) => {
    const result = isSignedIn
      ? await getAccountCartAction()
      : await resolveCartAction(readGuestItems());
    setCart(result.ok ? result.cart : EMPTY_CART);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fires immediately on mount with the current auth state, then again on
    // every sign-in/sign-out — this is also where a guest cart gets folded
    // into the account cart right after login, since Header (and this hook)
    // is mounted on every route including /login.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const isSignedIn = !!user;
      if (isSignedIn) {
        const guestItems = readGuestItems();
        if (guestItems.length > 0) {
          await mergeGuestCartAction(guestItems);
          writeGuestItems([]);
        }
      }
      setSignedIn(isSignedIn);
      await refresh(isSignedIn);
    });
    return unsubscribe;
  }, [refresh]);

  // Each mutator returns whether it actually succeeded — callers (e.g.
  // VariantSelector's "Added to cart" state) should only react to a real
  // result rather than assuming success once the request is fired.
  const add = useCallback(
    async (input: { productId: string; variantId: string; quantity: number }): Promise<boolean> => {
      setPending(true);
      try {
        if (signedIn) {
          const result = await addToCartAction(input);
          if (result.ok) {
            setCart(result.cart);
            return true;
          }
          reportError(result.error);
          return false;
        }
        const next = addItem(readGuestItems(), input);
        writeGuestItems(next);
        const result = await resolveCartAction(next);
        if (result.ok) {
          setCart(result.cart);
          return true;
        }
        reportError(result.error);
        return false;
      } finally {
        setPending(false);
      }
    },
    [signedIn, reportError],
  );

  const updateQuantity = useCallback(
    async (variantId: string, quantity: number): Promise<boolean> => {
      setPending(true);
      try {
        if (signedIn) {
          const result = await updateCartItemAction({ variantId, quantity });
          if (result.ok) {
            setCart(result.cart);
            return true;
          }
          reportError(result.error);
          return false;
        }
        const next = updateItemQuantity(readGuestItems(), variantId, quantity);
        writeGuestItems(next);
        const result = await resolveCartAction(next);
        if (result.ok) {
          setCart(result.cart);
          return true;
        }
        reportError(result.error);
        return false;
      } finally {
        setPending(false);
      }
    },
    [signedIn, reportError],
  );

  const remove = useCallback(
    async (variantId: string): Promise<boolean> => {
      setPending(true);
      try {
        if (signedIn) {
          const result = await removeFromCartAction(variantId);
          if (result.ok) {
            setCart(result.cart);
            return true;
          }
          reportError(result.error);
          return false;
        }
        const next = removeItem(readGuestItems(), variantId);
        writeGuestItems(next);
        const result = await resolveCartAction(next);
        if (result.ok) {
          setCart(result.cart);
          return true;
        }
        reportError(result.error);
        return false;
      } finally {
        setPending(false);
      }
    },
    [signedIn, reportError],
  );

  const clear = useCallback(() => {
    if (!signedIn) writeGuestItems([]);
    return refresh(signedIn);
  }, [signedIn, refresh]);

  return {
    cart,
    loading,
    pending,
    signedIn,
    add,
    updateQuantity,
    remove,
    clear,
    refresh: () => refresh(signedIn),
  };
}

// Defined here (rather than a separate context module) to avoid a circular
// import with CartState, which is itself derived from useCartState's return
// type. CartProvider is the only other consumer of this export.
export const CartContext = createContext<CartState | null>(null);

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
